import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Supabase mock ──────────────────────────────────────────────────────────────
const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockEq2 = vi.fn(() => ({ single: mockSingle }));
const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
const mockFrom = vi.fn(() => ({
  select: vi.fn(() => ({ eq: mockEq1 })),
  upsert: vi.fn(() => ({ select: mockSelect })),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { from: mockFrom },
}));

// ── Helpers ────────────────────────────────────────────────────────────────────
function createRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost"), init);
}

// ── Tests ──────────────────────────────────────────────────────────────────────
describe("GET /api/delegate-profile", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ GET } = await import("@/app/api/delegate-profile/route"));
  });

  it("returns 400 when address is missing", async () => {
    const res = await GET(createRequest("http://localhost/api/delegate-profile"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "address parameter is required" });
  });

  it("returns profile on success", async () => {
    const profile = { address: "0xabc", name: "Alice" };
    mockSingle.mockResolvedValueOnce({ data: profile, error: null });

    const res = await GET(
      createRequest("http://localhost/api/delegate-profile?address=0xABC")
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ profile });
  });

  it("returns null profile for PGRST116 (not found)", async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "not found" },
    });

    const res = await GET(
      createRequest("http://localhost/api/delegate-profile?address=0x000")
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ profile: null });
  });

  it("returns 500 on Supabase error", async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: "OTHER", message: "db down" },
    });

    const res = await GET(
      createRequest("http://localhost/api/delegate-profile?address=0xabc")
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "db down" });
  });

  it("defaults network to 11155111", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null });

    await GET(
      createRequest("http://localhost/api/delegate-profile?address=0xabc")
    );

    // Check the second .eq() was called with 11155111
    expect(mockEq2).toHaveBeenCalledWith("network", 11155111);
  });
});

describe("PUT /api/delegate-profile", () => {
  let PUT: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ PUT } = await import("@/app/api/delegate-profile/route"));
  });

  it("returns 400 when address is missing", async () => {
    const res = await PUT(
      createRequest("http://localhost/api/delegate-profile", {
        method: "PUT",
        body: JSON.stringify({ name: "Alice" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns data on success", async () => {
    const row = { address: "0xabc", name: "Alice" };
    mockSingle.mockResolvedValueOnce({ data: row, error: null });

    const res = await PUT(
      createRequest("http://localhost/api/delegate-profile", {
        method: "PUT",
        body: JSON.stringify({ address: "0xABC", name: "Alice" }),
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(row);
  });

  it("returns 500 on Supabase error", async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "upsert failed" },
    });

    const res = await PUT(
      createRequest("http://localhost/api/delegate-profile", {
        method: "PUT",
        body: JSON.stringify({ address: "0xabc" }),
      })
    );
    expect(res.status).toBe(500);
  });
});
