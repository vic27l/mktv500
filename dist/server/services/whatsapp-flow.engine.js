// server/services/whatsapp-flow.engine.ts
import { storage } from '../storage.js';
import { WhatsappConnectionService } from './whatsapp-connection.service.js';
import { externalDataService } from './external-data.service.js';
import { getSimpleAiResponse } from '../mcp_handler.js';
import { logger } from '../logger.js';
export class WhatsappFlowEngine {
    constructor() {
        this.findStartNode = (flow) => flow.elements.nodes.find((n) => !flow.elements.edges.some((e) => e.target === n.id));
        this.findNodeById = (flow, nodeId) => flow.elements.nodes.find((n) => n.id === nodeId);
        this.isWaitingNode = (type) => ['buttonMessage', 'waitInput'].includes(type || '');
    }
    interpolate(text, variables) {
        if (!text)
            return '';
        return text.replace(/\{\{([a-zA-Z0-9_.-]+)\}\}/g, (match, key) => {
            const value = key.split('.').reduce((o, i) => (o ? o[i] : undefined), variables);
            return value !== undefined ? String(value) : match;
        });
    }
    async processMessage(userId, contactJid, messageContent) {
        logger.info({ contactJid, userId, messageContent }, `Processando mensagem.`);
        let userState = await storage.getFlowUserState(userId, contactJid);
        let flow;
        let isNewSession = false;
        if (!userState) {
            isNewSession = true;
            const triggerFlow = await storage.findTriggerFlow(userId, messageContent);
            if (!triggerFlow || !triggerFlow.elements || triggerFlow.elements.nodes.length === 0) {
                logger.warn({ userId }, `Nenhum fluxo de gatilho ativo ou válido encontrado.`);
                return;
            }
            flow = triggerFlow;
            const firstNode = this.findStartNode(flow);
            if (!firstNode) {
                logger.error({ flowId: flow.id }, `Fluxo não possui um nó inicial.`);
                return;
            }
            userState = await storage.createFlowUserState({ userId, contactJid, activeFlowId: flow.id, currentNodeId: firstNode.id, flowVariables: {} });
            logger.info({ contactJid, flowId: flow.id, startNodeId: firstNode.id }, `Novo estado criado. Iniciando fluxo.`);
        }
        else {
            if (!userState.activeFlowId) {
                await storage.deleteFlowUserState(userState.id);
                logger.error({ contactJid }, `Estado de usuário órfão encontrado. Estado limpo.`);
                return;
            }
            flow = await storage.getFlow(userState.activeFlowId, userId);
        }
        if (!flow || !userState.currentNodeId) {
            logger.error({ contactJid }, `Estado inválido. Fluxo ou nó não encontrado. Resetando.`);
            if (userState)
                await storage.deleteFlowUserState(userState.id);
            return;
        }
        let currentNode = this.findNodeById(flow, userState.currentNodeId);
        let nextNodeId = currentNode?.id ?? null;
        if (currentNode && this.isWaitingNode(currentNode.type) && !isNewSession) {
            logger.info({ contactJid, node: currentNode.id }, `Processando input para o nó de espera.`);
            const updatedState = await storage.getFlowUserState(userId, contactJid);
            nextNodeId = await this.processInput(updatedState, currentNode, flow.elements.edges, messageContent);
        }
        while (nextNodeId) {
            const nodeToExecute = this.findNodeById(flow, nextNodeId);
            if (!nodeToExecute) {
                logger.error({ flowId: flow.id, nodeId: nextNodeId }, `Próximo nó não encontrado. Encerrando.`);
                break;
            }
            const currentState = await storage.getFlowUserState(userId, contactJid);
            if (!currentState) {
                logger.warn({ contactJid }, "Estado do usuário foi removido durante a execução. Encerrando.");
                return;
            }
            if (this.isWaitingNode(nodeToExecute.type)) {
                logger.info({ contactJid, nodeId: nodeToExecute.id }, `Atingiu nó de espera. Pausando.`);
                await storage.updateFlowUserState(currentState.id, { currentNodeId: nodeToExecute.id });
                await this.executeWaitingNode(currentState, nodeToExecute);
                return;
            }
            logger.info({ contactJid, nodeId: nodeToExecute.id, type: nodeToExecute.type }, `Executando nó de ação.`);
            nextNodeId = await this.executeActionNode(currentState, nodeToExecute, flow.elements.edges);
        }
        if (nextNodeId === null) {
            logger.info({ contactJid }, `Fim do fluxo ou caminho sem saída.`);
            if (userState)
                await storage.deleteFlowUserState(userState.id);
        }
    }
    async processInput(userState, node, edges, messageContent) {
        let nextNodeId = null;
        try {
            switch (node.type) {
                case 'buttonMessage': {
                    const button = node.data.buttons.find((b) => b.text === messageContent);
                    if (button) {
                        const edge = edges.find(e => e.source === node.id && e.sourceHandle === button.id);
                        nextNodeId = edge?.target || null;
                    }
                    break;
                }
                case 'waitInput': {
                    const variableName = node.data.variableName;
                    if (variableName) {
                        const currentVariables = typeof userState.flowVariables === 'object' && userState.flowVariables !== null ? userState.flowVariables : {};
                        const newVariables = { ...currentVariables, [variableName]: messageContent };
                        await storage.updateFlowUserState(userState.id, { flowVariables: newVariables });
                        logger.info({ contactJid: userState.contactJid, variable: variableName }, `Variável salva.`);
                    }
                    const edge = edges.find(e => e.source === node.id);
                    nextNodeId = edge?.target || null;
                    break;
                }
            }
        }
        catch (err) {
            logger.error({ contactJid: userState.contactJid, nodeId: node.id, error: err.message }, "Erro ao processar input.");
        }
        return nextNodeId;
    }
    async executeWaitingNode(userState, node) {
        try {
            switch (node.type) {
                case 'buttonMessage': {
                    const interpolatedText = node.data.text ? this.interpolate(node.data.text, userState.flowVariables) : 'Escolha uma opção:';
                    const buttonPayload = {
                        text: interpolatedText, footer: node.data.footer,
                        buttons: node.data.buttons.map((btn) => ({ buttonId: btn.id, buttonText: { displayText: btn.text }, type: 1 })),
                        headerType: 1
                    };
                    await WhatsappConnectionService.sendMessageForUser(userState.userId, userState.contactJid, buttonPayload);
                    break;
                }
                case 'waitInput': {
                    const promptMessage = node.data.message ? this.interpolate(node.data.message, userState.flowVariables) : '';
                    if (promptMessage) {
                        await WhatsappConnectionService.sendMessageForUser(userState.userId, userState.contactJid, { text: promptMessage });
                    }
                    break;
                }
            }
        }
        catch (err) {
            logger.error({ contactJid: userState.contactJid, nodeId: node.id, error: err.message }, "Erro ao executar nó de espera.");
        }
    }
    async executeActionNode(userState, node, edges) {
        let success = true;
        try {
            switch (node.type) {
                case 'textMessage': {
                    const messageText = this.interpolate(node.data.text || '...', userState.flowVariables);
                    await WhatsappConnectionService.sendMessageForUser(userState.userId, userState.contactJid, { text: messageText });
                    break;
                }
                case 'apiCall': {
                    const { apiUrl, method, headers, body, saveResponseTo } = node.data;
                    const interpolatedUrl = this.interpolate(apiUrl, userState.flowVariables);
                    const interpolatedHeaders = headers ? JSON.parse(this.interpolate(headers, userState.flowVariables)) : undefined;
                    const interpolatedBody = body ? JSON.parse(this.interpolate(body, userState.flowVariables)) : undefined;
                    const response = await externalDataService.request(interpolatedUrl, { method, headers: interpolatedHeaders, body: interpolatedBody });
                    if (saveResponseTo) {
                        const currentVariables = typeof userState.flowVariables === 'object' && userState.flowVariables !== null ? userState.flowVariables : {};
                        const newVariables = { ...currentVariables, [saveResponseTo]: response.data };
                        await storage.updateFlowUserState(userState.id, { flowVariables: newVariables });
                    }
                    break;
                }
                case 'gptQuery': {
                    const { prompt, systemMessage, saveResponseTo } = node.data;
                    const interpolatedPrompt = this.interpolate(prompt, userState.flowVariables);
                    const aiResponse = await getSimpleAiResponse(interpolatedPrompt, systemMessage);
                    if (saveResponseTo) {
                        const currentVariables = typeof userState.flowVariables === 'object' && userState.flowVariables !== null ? userState.flowVariables : {};
                        const newVariables = { ...currentVariables, [saveResponseTo]: aiResponse };
                        await storage.updateFlowUserState(userState.id, { flowVariables: newVariables });
                    }
                    break;
                }
                default: {
                    logger.warn({ type: node.type }, "Tipo de nó de ação não implementado.");
                    return null;
                }
            }
        }
        catch (err) {
            logger.error({ contactJid: userState.contactJid, nodeId: node.id, error: err.message }, "Erro ao executar nó de ação.");
            success = false;
        }
        const sourceHandleId = success ? 'source-success' : 'source-error';
        const edge = edges.find(e => e.source === node.id && e.sourceHandle === sourceHandleId) || edges.find(e => e.source === node.id && !e.sourceHandle);
        return edge?.target || null;
    }
}
//# sourceMappingURL=whatsapp-flow.engine.js.map