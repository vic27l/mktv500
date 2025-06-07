// server/storage.ts
import { db } from './db.js';
import * as schema from '../shared/schema.js';
import { eq, and, sql, desc, isNull } from 'drizzle-orm';
import bcrypt from 'bcrypt';
export const storage = {
    // User
    async getUser(id) {
        return await db.query.users.findFirst({ where: eq(schema.users.id, id) });
    },
    async getUserByEmail(email) {
        return await db.query.users.findFirst({ where: eq(schema.users.email, email) });
    },
    async createUser(userData) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const [newUser] = await db.insert(schema.users).values({ ...userData, password: hashedPassword }).returning();
        return newUser;
    },
    async validatePassword(password, hash) {
        return await bcrypt.compare(password, hash);
    },
    // Dashboard
    async getDashboardData(userId) {
        const campaigns = await this.getCampaigns(userId);
        const funnels = await this.getFunnels(userId);
        const creatives = await this.getCreatives(userId);
        return {
            campaignsCount: campaigns.length,
            funnelsCount: funnels.length,
            creativesCount: creatives.length,
        };
    },
    // Campaigns
    async getCampaigns(userId) {
        return await db.query.campaigns.findMany({ where: eq(schema.campaigns.userId, userId), orderBy: [desc(schema.campaigns.createdAt)] });
    },
    async getCampaign(id, userId) {
        return await db.query.campaigns.findFirst({ where: and(eq(schema.campaigns.id, id), eq(schema.campaigns.userId, userId)) });
    },
    async createCampaign(campaignData) {
        const [newCampaign] = await db.insert(schema.campaigns).values(campaignData).returning();
        return newCampaign;
    },
    async updateCampaign(id, campaignData, userId) {
        const [updatedCampaign] = await db.update(schema.campaigns).set(campaignData).where(and(eq(schema.campaigns.id, id), eq(schema.campaigns.userId, userId))).returning();
        return updatedCampaign;
    },
    async deleteCampaign(id, userId) {
        await db.delete(schema.campaigns).where(and(eq(schema.campaigns.id, id), eq(schema.campaigns.userId, userId)));
    },
    // Creatives
    async getCreatives(userId, campaignId) {
        const conditions = [eq(schema.creatives.userId, userId)];
        if (campaignId) {
            conditions.push(eq(schema.creatives.campaignId, campaignId));
        }
        else if (campaignId === null) {
            conditions.push(isNull(schema.creatives.campaignId));
        }
        return await db.query.creatives.findMany({ where: and(...conditions), orderBy: [desc(schema.creatives.createdAt)] });
    },
    async createCreative(creativeData) {
        const [newCreative] = await db.insert(schema.creatives).values(creativeData).returning();
        return newCreative;
    },
    async updateCreative(id, creativeData, userId) {
        const [updatedCreative] = await db.update(schema.creatives).set(creativeData).where(and(eq(schema.creatives.id, id), eq(schema.creatives.userId, userId))).returning();
        return updatedCreative;
    },
    async deleteCreative(id, userId) {
        await db.delete(schema.creatives).where(and(eq(schema.creatives.id, id), eq(schema.creatives.userId, userId)));
    },
    // Funnels
    async getFunnels(userId) {
        return await db.query.funnels.findMany({ where: eq(schema.funnels.userId, userId), orderBy: [desc(schema.funnels.createdAt)] });
    },
    async createFunnel(funnelData) {
        const [newFunnel] = await db.insert(schema.funnels).values(funnelData).returning();
        return newFunnel;
    },
    // Copies
    async getCopies(userId, campaignId, phase, purpose, search) {
        let query = db.select().from(schema.copies).where(eq(schema.copies.userId, userId));
        if (campaignId)
            query = query.where(eq(schema.copies.campaignId, campaignId));
        if (phase)
            query = query.where(eq(schema.copies.phase, phase));
        if (purpose)
            query = query.where(eq(schema.copies.purpose, purpose));
        if (search)
            query = query.where(sql `"text" ILIKE ${'%' + search + '%'}`);
        return await query.orderBy(desc(schema.copies.createdAt));
    },
    async createCopy(copyData) {
        const [newCopy] = await db.insert(schema.copies).values(copyData).returning();
        return newCopy;
    },
    async deleteCopy(id, userId) {
        await db.delete(schema.copies).where(and(eq(schema.copies.id, id), eq(schema.copies.userId, userId)));
    },
    // Landing Pages
    async getLandingPages(userId) {
        return await db.query.landingPages.findMany({ where: eq(schema.landingPages.userId, userId), orderBy: [desc(schema.landingPages.createdAt)] });
    },
    async getLandingPageBySlug(slug) {
        return await db.query.landingPages.findFirst({ where: eq(schema.landingPages.slug, slug) });
    },
    async getLandingPageByStudioProjectId(studioProjectId, userId) {
        return await db.query.landingPages.findFirst({ where: and(eq(schema.landingPages.studioProjectId, studioProjectId), eq(schema.landingPages.userId, userId)) });
    },
    async createLandingPage(lpData) {
        const [newLp] = await db.insert(schema.landingPages).values(lpData).returning();
        return newLp;
    },
    async updateLandingPage(id, lpData, userId) {
        const [updatedLp] = await db.update(schema.landingPages).set(lpData).where(and(eq(schema.landingPages.id, id), eq(schema.landingPages.userId, userId))).returning();
        return updatedLp;
    },
    async deleteLandingPage(id, userId) {
        await db.delete(schema.landingPages).where(and(eq(schema.landingPages.id, id), eq(schema.landingPages.userId, userId)));
    },
    // Budgets
    async getBudgets(userId) {
        return await db.query.budgets.findMany({ where: eq(schema.budgets.userId, userId), orderBy: [desc(schema.budgets.createdAt)] });
    },
    async createBudget(budgetData) {
        const [newBudget] = await db.insert(schema.budgets).values(budgetData).returning();
        return newBudget;
    },
    // Alerts
    async getAlerts(userId, unreadOnly = false) {
        const conditions = [eq(schema.alerts.userId, userId)];
        if (unreadOnly)
            conditions.push(eq(schema.alerts.isRead, false));
        return await db.query.alerts.findMany({ where: and(...conditions), orderBy: [desc(schema.alerts.createdAt)] });
    },
    async markAlertAsRead(id, userId) {
        await db.update(schema.alerts).set({ isRead: true }).where(and(eq(schema.alerts.id, id), eq(schema.alerts.userId, userId)));
    },
    // Flows
    async getFlow(id, userId) {
        return await db.query.flows.findFirst({ where: and(eq(schema.flows.id, id), eq(schema.flows.userId, userId)) });
    },
    async getFlows(userId, campaignId) {
        const conditions = [eq(schema.flows.userId, userId)];
        if (campaignId) {
            conditions.push(eq(schema.flows.campaignId, campaignId));
        }
        else if (campaignId === null) {
            conditions.push(isNull(schema.flows.campaignId));
        }
        return await db.query.flows.findMany({ where: and(...conditions), orderBy: [desc(schema.flows.createdAt)] });
    },
    async createFlow(flowData) {
        const [newFlow] = await db.insert(schema.flows).values(flowData).returning();
        return newFlow;
    },
    async updateFlow(id, flowData, userId) {
        const [updatedFlow] = await db.update(schema.flows).set(flowData).where(and(eq(schema.flows.id, id), eq(schema.flows.userId, userId))).returning();
        return updatedFlow;
    },
    async deleteFlow(id, userId) {
        await db.delete(schema.flows).where(and(eq(schema.flows.id, id), eq(schema.flows.userId, userId)));
    },
    // WhatsApp
    async getContacts(userId) {
        return await db.selectDistinct({ jid: schema.whatsappMessages.contactNumber })
            .from(schema.whatsappMessages)
            .where(eq(schema.whatsappMessages.userId, userId));
    },
    async getMessages(userId, contactNumber) {
        return await db.query.whatsappMessages.findMany({
            where: and(eq(schema.whatsappMessages.userId, userId), eq(schema.whatsappMessages.contactNumber, contactNumber)),
            orderBy: [desc(schema.whatsappMessages.timestamp)]
        });
    },
    async createMessage(messageData) {
        const [newMessage] = await db.insert(schema.whatsappMessages).values(messageData).returning();
        return newMessage;
    },
    async getWhatsappTemplates(userId) {
        return await db.query.whatsappMessageTemplates.findMany({ where: eq(schema.whatsappMessageTemplates.userId, userId) });
    },
    async createWhatsappTemplate(templateData) {
        const [newTemplate] = await db.insert(schema.whatsappMessageTemplates).values(templateData).returning();
        return newTemplate;
    },
    async updateWhatsappTemplate(id, templateData, userId) {
        const [updatedTemplate] = await db.update(schema.whatsappMessageTemplates).set(templateData).where(and(eq(schema.whatsappMessageTemplates.id, id), eq(schema.whatsappMessageTemplates.userId, userId))).returning();
        return updatedTemplate;
    },
    async deleteWhatsappTemplate(id, userId) {
        const result = await db.delete(schema.whatsappMessageTemplates).where(and(eq(schema.whatsappMessageTemplates.id, id), eq(schema.whatsappMessageTemplates.userId, userId)));
        return result.rowCount > 0;
    },
    // Chat / MCP
    async getChatSessions(userId) {
        return await db.query.chatSessions.findMany({ where: eq(schema.chatSessions.userId, userId), orderBy: [desc(schema.chatSessions.createdAt)] });
    },
    async createChatSession(userId, title) {
        const [newSession] = await db.insert(schema.chatSessions).values({ userId, title: title || 'Nova Conversa' }).returning();
        return newSession;
    },
    async getChatMessages(sessionId, userId) {
        return await db.query.chatMessages.findMany({ where: and(eq(schema.chatMessages.sessionId, sessionId), eq(schema.chatMessages.userId, userId)), orderBy: [schema.chatMessages.createdAt] });
    },
    async createChatMessage(messageData) {
        const [newMessage] = await db.insert(schema.chatMessages).values(messageData).returning();
        return newMessage;
    },
    async updateChatSessionTitle(sessionId, userId, newTitle) {
        const [updatedSession] = await db.update(schema.chatSessions).set({ title: newTitle }).where(and(eq(schema.chatSessions.id, sessionId), eq(schema.chatSessions.userId, userId))).returning();
        return updatedSession;
    },
    async deleteChatSession(sessionId, userId) {
        await db.delete(schema.chatSessions).where(and(eq(schema.chatSessions.id, sessionId), eq(schema.chatSessions.userId, userId)));
    }
};
//# sourceMappingURL=storage.js.map