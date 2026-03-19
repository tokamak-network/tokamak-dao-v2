import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Agent Supabase mock ────────────────────────────────────────────────────────
const mockSingle = vi.fn();
// Chainable eq: each .eq() returns another object with .eq() and .single()
const makeEqChain = () => {
  const chain: Record<string, unknown> = {};
  chain.eq = vi.fn(() => chain);
  chain.single = (...args: unknown[]) => mockSingle(...args);
  return chain;
};
const mockSelectFields = vi.fn(() => makeEqChain());
const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }));
const mockUpdate = vi.fn(() => ({
  eq: vi.fn(() => ({
    select: vi.fn().mockResolvedValue({ data: [{ agent_id: 1 }], error: null }),
  })),
}));
const mockFrom = vi.fn(() => ({
  select: mockSelectFields,
  insert: mockInsert,
  update: mockUpdate,
}));

vi.mock("@/lib/agent-supabase", () => ({
  agentSupabase: { from: mockFrom },
}));

// ── Agent wallet mock ──────────────────────────────────────────────────────────
vi.mock("@/lib/agent-wallet", () => ({
  generateAgentWallet: vi.fn(() => ({
    address: "0xWALLET",
    encryptedPrivateKey: "enc-key",
  })),
  decryptPrivateKey: vi.fn(() => "0xPRIVATE"),
  getSmartAccountAddress: vi.fn().mockResolvedValue("0xSMART"),
}));

// ── Telegram mock ──────────────────────────────────────────────────────────────
const mockDeleteWebhook = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/telegram", () => ({
  deleteWebhook: (...args: unknown[]) => mockDeleteWebhook(...args),
}));

function createRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost"), init);
}

// ═════════════════════════════════════════════════════════════════════════════
// GET
// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/agents", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ GET } = await import("@/app/api/agents/route"));
  });

  it("returns 400 when neither agentId nor owner provided", async () => {
    const res = await GET(createRequest("http://localhost/api/agents"));
    expect(res.status).toBe(400);
  });

  it("returns agent data by agentId", async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        agent_id: 1,
        owner: "0xabc",
        telegram_bot_token: "tok",
        telegram_chat_id: "123",
        agent_wallet_address: "0xW",
        smart_account_address: "0xS",
        created_at: "2024-01-01",
      },
      error: null,
    });

    const res = await GET(createRequest("http://localhost/api/agents?agentId=1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(1);
    expect(body.telegramConnected).toBe(true);
  });

  it("returns telegramConnected: false on error", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: "fail" } });

    const res = await GET(createRequest("http://localhost/api/agents?owner=0xabc"));
    const body = await res.json();
    expect(body.telegramConnected).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST
// ═════════════════════════════════════════════════════════════════════════════
describe("POST /api/agents", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ POST } = await import("@/app/api/agents/route"));
  });

  it("returns 400 when owner is missing", async () => {
    const res = await POST(
      createRequest("http://localhost/api/agents", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns existing agent (idempotent)", async () => {
    // First .single() call = existing check
    mockSingle.mockResolvedValueOnce({
      data: {
        agent_id: 42,
        agent_wallet_address: "0xW",
        smart_account_address: "0xS",
        created_at: "2024-01-01",
      },
      error: null,
    });

    const res = await POST(
      createRequest("http://localhost/api/agents", {
        method: "POST",
        body: JSON.stringify({ owner: "0xABC" }),
      })
    );
    const body = await res.json();
    expect(body.existing).toBe(true);
    expect(body.id).toBe(42);
  });

  it("creates new agent with wallet", async () => {
    // existing check returns nothing
    mockSingle
      .mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } })
      // insert result
      .mockResolvedValueOnce({
        data: { agent_id: 99, created_at: "2024-01-02" },
        error: null,
      });

    const res = await POST(
      createRequest("http://localhost/api/agents", {
        method: "POST",
        body: JSON.stringify({ owner: "0xdef" }),
      })
    );
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.existing).toBe(false);
    expect(body.agentWalletAddress).toBe("0xWALLET");
    expect(body.smartAccountAddress).toBe("0xSMART");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PATCH
// ═════════════════════════════════════════════════════════════════════════════
describe("PATCH /api/agents", () => {
  let PATCH: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ PATCH } = await import("@/app/api/agents/route"));
  });

  it("returns 400 when agentId is missing", async () => {
    const res = await PATCH(
      createRequest("http://localhost/api/agents", {
        method: "PATCH",
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns success on update", async () => {
    const res = await PATCH(
      createRequest("http://localhost/api/agents", {
        method: "PATCH",
        body: JSON.stringify({ agentId: 1, telegramBotToken: "tok" }),
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("calls deleteWebhook when telegramBotToken is provided", async () => {
    await PATCH(
      createRequest("http://localhost/api/agents", {
        method: "PATCH",
        body: JSON.stringify({ agentId: 1, telegramBotToken: "my-token" }),
      })
    );
    expect(mockDeleteWebhook).toHaveBeenCalledWith("my-token");
  });

  it("returns 404 when agent not found", async () => {
    mockUpdate.mockReturnValueOnce({
      eq: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    });

    const res = await PATCH(
      createRequest("http://localhost/api/agents", {
        method: "PATCH",
        body: JSON.stringify({ agentId: 999 }),
      })
    );
    expect(res.status).toBe(404);
  });
});
