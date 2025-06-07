// server/mcp_handler.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { storage } from './storage.js';
import { GEMINI_API_KEY } from "./config.js";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
export async function handleMCPConversation(userId, message, sessionId, attachmentUrl) {
    let currentSessionId = sessionId;
    if (!currentSessionId) {
        const newSession = await storage.createChatSession(userId, message.substring(0, 30));
        currentSessionId = newSession.id;
    }
    await storage.createChatMessage({
        sessionId: currentSessionId,
        sender: 'user',
        text: message
    });
    const history = await storage.getChatMessages(currentSessionId, userId);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const chat = model.startChat({
        history: history.map(msg => ({
            role: msg.sender,
            parts: [{ text: msg.text || '' }]
        })),
    });
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();
    const modelMessage = await storage.createChatMessage({
        sessionId: currentSessionId,
        sender: 'agent',
        text: text
    });
    return {
        response: text,
        sessionId: currentSessionId,
        userMessage: { sender: 'user', text: message },
        modelMessage: modelMessage,
    };
}
//# sourceMappingURL=mcp_handler.js.map