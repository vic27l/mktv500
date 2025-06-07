/*
  # Initial Schema Setup for Marketing Automation System

  1. New Tables
    - `users` - User accounts with authentication
    - `campaigns` - Marketing campaigns
    - `creatives` - Campaign creative assets
    - `landing_pages` - Landing page configurations
    - `metrics` - Campaign performance metrics
    - `whatsapp_connections` - WhatsApp integration connections
    - `integrations` - Third-party service integrations

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Admin users can access all data

  3. Features
    - UUID primary keys for all tables
    - Timestamps for audit trails
    - JSON fields for flexible configuration storage
    - Proper foreign key relationships
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  budget decimal(10,2),
  start_date timestamptz,
  end_date timestamptz,
  user_id uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Creatives table
CREATE TABLE IF NOT EXISTS creatives (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  type text NOT NULL,
  content text,
  url text,
  campaign_id uuid REFERENCES campaigns(id),
  user_id uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Landing Pages table
CREATE TABLE IF NOT EXISTS landing_pages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  url text NOT NULL,
  content jsonb,
  is_active boolean DEFAULT true,
  campaign_id uuid REFERENCES campaigns(id),
  user_id uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Metrics table
CREATE TABLE IF NOT EXISTS metrics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid REFERENCES campaigns(id) NOT NULL,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  conversions integer DEFAULT 0,
  cost decimal(10,2) DEFAULT 0,
  date timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- WhatsApp Connections table
CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  phone_number text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected',
  qr_code text,
  session_data jsonb,
  user_id uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Integrations table
CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  type text NOT NULL,
  config jsonb,
  is_active boolean DEFAULT true,
  user_id uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text OR EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
  ));

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text OR EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
  ));

-- RLS Policies for campaigns table
CREATE POLICY "Users can manage own campaigns"
  ON campaigns
  FOR ALL
  TO authenticated
  USING (user_id::text = auth.uid()::text OR EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
  ));

-- RLS Policies for creatives table
CREATE POLICY "Users can manage own creatives"
  ON creatives
  FOR ALL
  TO authenticated
  USING (user_id::text = auth.uid()::text OR EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
  ));

-- RLS Policies for landing_pages table
CREATE POLICY "Users can manage own landing pages"
  ON landing_pages
  FOR ALL
  TO authenticated
  USING (user_id::text = auth.uid()::text OR EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
  ));

-- RLS Policies for metrics table
CREATE POLICY "Users can view own campaign metrics"
  ON metrics
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = metrics.campaign_id 
    AND (campaigns.user_id::text = auth.uid()::text OR EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
    ))
  ));

CREATE POLICY "Users can insert metrics for own campaigns"
  ON metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = metrics.campaign_id 
    AND (campaigns.user_id::text = auth.uid()::text OR EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
    ))
  ));

-- RLS Policies for whatsapp_connections table
CREATE POLICY "Users can manage own WhatsApp connections"
  ON whatsapp_connections
  FOR ALL
  TO authenticated
  USING (user_id::text = auth.uid()::text OR EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
  ));

-- RLS Policies for integrations table
CREATE POLICY "Users can manage own integrations"
  ON integrations
  FOR ALL
  TO authenticated
  USING (user_id::text = auth.uid()::text OR EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
  ));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_creatives_user_id ON creatives(user_id);
CREATE INDEX IF NOT EXISTS idx_creatives_campaign_id ON creatives(campaign_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_user_id ON landing_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_campaign_id ON landing_pages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_metrics_campaign_id ON metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON metrics(date);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_user_id ON whatsapp_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);