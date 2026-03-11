import { createClient } from "@supabase/supabase-js";

// Separate Supabase client for the ERC-8004 agent registry
// (shared with tokamak-agent-scan)
const url = process.env.NEXT_PUBLIC_AGENT_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_AGENT_SUPABASE_KEY!;

export const agentSupabase = createClient(url, key);
