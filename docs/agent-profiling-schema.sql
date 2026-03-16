-- Agent Profiling & Conversation Schema
-- Run these on the Agent Supabase instance

-- 1. New table: agent_profiles
-- Profiles start with default traits (0.5) and evolve through proposal discussions.
CREATE TABLE IF NOT EXISTS agent_profiles (
  agent_id INTEGER PRIMARY KEY,
  traits JSONB NOT NULL DEFAULT '{
    "treasury_philosophy": 0.5,
    "inflation_tolerance": 0.5,
    "governance_accessibility": 0.5,
    "security_priority": 0.5,
    "expansion_stance": 0.5,
    "skin_in_game": 0.5,
    "delegation_style": 0.5
  }',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. New table: agent_conversations
CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id INTEGER NOT NULL,
  context_type TEXT NOT NULL,  -- 'proposal_analysis'
  context_id TEXT,             -- proposal_id
  messages JSONB NOT NULL DEFAULT '[]',
  trait_deltas JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_conv_agent ON agent_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_conv_context ON agent_conversations(agent_id, context_type, context_id);

-- 3. Add webhook_token_hash to existing agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS webhook_token_hash TEXT;

-- 4. Add agent wallet columns for on-chain voting
ALTER TABLE agents ADD COLUMN IF NOT EXISTS agent_wallet_address TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS encrypted_private_key TEXT;
