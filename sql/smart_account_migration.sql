-- Add smart_account_address column to agents table
-- This stores the deterministic ERC-4337 Smart Account address derived from the agent's EOA
-- Owner sends ETH to this address to fund gas for agent voting transactions
ALTER TABLE agents ADD COLUMN smart_account_address TEXT;
