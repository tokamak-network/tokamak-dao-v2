import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Separate Supabase client for the ERC-8004 agent registry
// (shared with tokamak-agent-scan)
// Lazily initialized to avoid build-time errors when env vars are not set

let _client: SupabaseClient | null = null;

function getAgentSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_AGENT_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_AGENT_SUPABASE_KEY!;
    const serviceKey = process.env.AGENT_SUPABASE_SERVICE_KEY;
    if (!serviceKey) {
      console.warn("[agent-supabase] AGENT_SUPABASE_SERVICE_KEY is not set, falling back to anon key — writes may fail due to RLS");
    }
    _client = createClient(url, serviceKey || anonKey);
  }
  return _client;
}

export const agentSupabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getAgentSupabase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
