import { createClient } from "@supabase/supabase-js";

// Separate Supabase client for the ERC-8004 agent registry
// (shared with tokamak-agent-scan)
const url = process.env.NEXT_PUBLIC_AGENT_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_AGENT_SUPABASE_KEY!;
const serviceKey = process.env.AGENT_SUPABASE_SERVICE_KEY;

// Use service role key on server (bypasses RLS), anon key on client
export const agentSupabase = createClient(url, serviceKey || anonKey);
