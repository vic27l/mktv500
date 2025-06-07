import { pgTable, text, timestamp, uuid, boolean, integer, jsonb, decimal } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Campaigns table
export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('draft'),
  budget: decimal('budget', { precision: 10, scale: 2 }),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  userId: uuid('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Creatives table
export const creatives = pgTable('creatives', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'image', 'video', 'text'
  content: text('content'),
  url: text('url'),
  campaignId: uuid('campaign_id').references(() => campaigns.id),
  userId: uuid('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Landing Pages table
export const landingPages = pgTable('landing_pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  content: jsonb('content'),
  isActive: boolean('is_active').default(true),
  campaignId: uuid('campaign_id').references(() => campaigns.id),
  userId: uuid('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Metrics table
export const metrics = pgTable('metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => campaigns.id).notNull(),
  impressions: integer('impressions').default(0),
  clicks: integer('clicks').default(0),
  conversions: integer('conversions').default(0),
  cost: decimal('cost', { precision: 10, scale: 2 }).default('0'),
  date: timestamp('date').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// WhatsApp Connections table
export const whatsappConnections = pgTable('whatsapp_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  phoneNumber: text('phone_number').notNull(),
  status: text('status').notNull().default('disconnected'),
  qrCode: text('qr_code'),
  sessionData: jsonb('session_data'),
  userId: uuid('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Integrations table
export const integrations = pgTable('integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'facebook', 'google', 'zapier', etc.
  config: jsonb('config'),
  isActive: boolean('is_active').default(true),
  userId: uuid('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Zod schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertCampaignSchema = createInsertSchema(campaigns);
export const selectCampaignSchema = createSelectSchema(campaigns);
export const insertCreativeSchema = createInsertSchema(creatives);
export const selectCreativeSchema = createSelectSchema(creatives);
export const insertLandingPageSchema = createInsertSchema(landingPages);
export const selectLandingPageSchema = createSelectSchema(landingPages);
export const insertMetricSchema = createInsertSchema(metrics);
export const selectMetricSchema = createSelectSchema(metrics);
export const insertWhatsappConnectionSchema = createInsertSchema(whatsappConnections);
export const selectWhatsappConnectionSchema = createSelectSchema(whatsappConnections);
export const insertIntegrationSchema = createInsertSchema(integrations);
export const selectIntegrationSchema = createSelectSchema(integrations);

// Export types
export type User = z.infer<typeof selectUserSchema>;
export type NewUser = z.infer<typeof insertUserSchema>;
export type Campaign = z.infer<typeof selectCampaignSchema>;
export type NewCampaign = z.infer<typeof insertCampaignSchema>;
export type Creative = z.infer<typeof selectCreativeSchema>;
export type NewCreative = z.infer<typeof insertCreativeSchema>;
export type LandingPage = z.infer<typeof selectLandingPageSchema>;
export type NewLandingPage = z.infer<typeof insertLandingPageSchema>;
export type Metric = z.infer<typeof selectMetricSchema>;
export type NewMetric = z.infer<typeof insertMetricSchema>;
export type WhatsappConnection = z.infer<typeof selectWhatsappConnectionSchema>;
export type NewWhatsappConnection = z.infer<typeof insertWhatsappConnectionSchema>;
export type Integration = z.infer<typeof selectIntegrationSchema>;
export type NewIntegration = z.infer<typeof insertIntegrationSchema>;