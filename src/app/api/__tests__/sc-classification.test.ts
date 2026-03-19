import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Supabase mock ──────────────────────────────────────────────────────────────
const mockSingle = vi.fn();
const mockDelete = vi.fn(() => ({
  eq: vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));
const mockSelect = vi.fn(() => ({
  eq: vi.fn().mockResolvedValue({ data: [], error: null }),
  single: mockSingle,
}));
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  upsert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })),
  delete: mockDelete,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { from: mockFrom },
}));

// ── sc-action-classification mock ──────────────────────────────────────────────
const mockDefaults = [{ contractId: "c1", functionName: "fn1", path: "veto-only" }];
vi.mock("@/lib/sc-action-classification", () => ({
  getDefaultClassification: vi.fn(() => mockDefaults),
  mergeWithOverrides: vi.fn((defaults: unknown[], overrides: unknown[]) => [
    ...defaults as unknown[],
    ...overrides as unknown[],
  ]),
}));

function createRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost"), init);
}

describe("GET /api/sc-classification", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ GET } = await import("@/app/api/sc-classification/route"));
  });

  it("returns merged classifications + overrides", async () => {
    const overrides = [{ contractId: "c2", path: "direct-execution" }];
    mockSelect.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValue({ data: overrides, error: null }),
    });

    const res = await GET(createRequest("http://localhost/api/sc-classification"));
    const body = await res.json();
    expect(body.classifications).toBeDefined();
    expect(body.overrides).toEqual(overrides);
  });

  it("returns defaults only on Supabase error (graceful degradation)", async () => {
    mockSelect.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: "fail" } }),
    });

    const res = await GET(createRequest("http://localhost/api/sc-classification"));
    const body = await res.json();
    expect(body.classifications).toEqual(mockDefaults);
    expect(body.overrides).toEqual([]);
  });
});

describe("PUT /api/sc-classification", () => {
  let PUT: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ PUT } = await import("@/app/api/sc-classification/route"));
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await PUT(
      createRequest("http://localhost/api/sc-classification", {
        method: "PUT",
        body: JSON.stringify({ contract_id: "c1" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid path value", async () => {
    const res = await PUT(
      createRequest("http://localhost/api/sc-classification", {
        method: "PUT",
        body: JSON.stringify({
          contract_id: "c1",
          function_signature: "fn()",
          path: "invalid",
        }),
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("path must be");
  });

  it("returns data on successful upsert", async () => {
    const row = { contract_id: "c1", path: "veto-only" };
    mockSingle.mockResolvedValueOnce({ data: row, error: null });

    const res = await PUT(
      createRequest("http://localhost/api/sc-classification", {
        method: "PUT",
        body: JSON.stringify({
          contract_id: "c1",
          function_signature: "fn()",
          path: "veto-only",
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(row);
  });
});

describe("DELETE /api/sc-classification", () => {
  let DELETE: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ DELETE } = await import("@/app/api/sc-classification/route"));
  });

  it("returns 400 when required params are missing", async () => {
    const res = await DELETE(
      createRequest("http://localhost/api/sc-classification")
    );
    expect(res.status).toBe(400);
  });

  it("returns success on delete", async () => {
    const res = await DELETE(
      createRequest(
        "http://localhost/api/sc-classification?contract_id=c1&function_signature=fn()"
      )
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });
});
