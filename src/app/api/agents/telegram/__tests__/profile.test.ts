import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Agent Supabase mock ────────────────────────────────────────────────────────
const mockSingle = vi.fn();
vi.mock("@/lib/agent-supabase", () => ({
  agentSupabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
    })),
  },
}));

function createRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost"));
}

describe("GET /api/agents/telegram/profile", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ GET } = await import("@/app/api/agents/telegram/profile/route"));
  });

  it("returns 400 when agentId is missing", async () => {
    const res = await GET(
      createRequest("http://localhost/api/agents/telegram/profile")
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "agentId is required" });
  });

  it("returns profile data when it exists", async () => {
    const profileData = { agent_id: 1, traits: { style: "formal" } };
    mockSingle.mockResolvedValueOnce({ data: profileData, error: null });

    const res = await GET(
      createRequest("http://localhost/api/agents/telegram/profile?agentId=1")
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, profile: profileData });
  });

  it("returns null profile when not found", async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "not found" },
    });

    const res = await GET(
      createRequest("http://localhost/api/agents/telegram/profile?agentId=999")
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, profile: null });
  });
});
