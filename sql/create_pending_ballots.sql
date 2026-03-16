-- pending_ballots: stores signed ballots when VoteRelayFund has insufficient balance
-- Delegates can submit these from the frontend using castVoteBySig directly.

CREATE TABLE IF NOT EXISTS pending_ballots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id INTEGER NOT NULL,
  agent_address TEXT NOT NULL,
  proposal_id TEXT NOT NULL,
  support SMALLINT NOT NULL,
  v SMALLINT NOT NULL,
  r TEXT NOT NULL,
  s TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | submitted | expired
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ
);

-- Index for querying pending ballots by agent
CREATE INDEX IF NOT EXISTS idx_pending_ballots_agent_status
  ON pending_ballots (agent_id, status);
