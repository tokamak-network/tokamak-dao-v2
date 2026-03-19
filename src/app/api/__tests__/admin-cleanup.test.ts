import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Supabase mock ──────────────────────────────────────────────────────────────
const mockDeleteResult = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn(() => ({
  delete: vi.fn(() => ({
    eq: vi.fn(() => mockDeleteResult()),
  })),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { from: mockFrom },
}));

function createRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost"));
}

describe("DELETE /api/admin/cleanup", () => {
  let DELETE: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv("ADMIN_CLEANUP_SECRET", "test-secret");
    ({ DELETE } = await import("@/app/api/admin/cleanup/route"));
  });

  it("returns 401 when secret is missing", async () => {
    const res = await DELETE(
      createRequest("http://localhost/api/admin/cleanup?network=11155111")
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when secret is wrong", async () => {
    const res = await DELETE(
      createRequest("http://localhost/api/admin/cleanup?secret=wrong&network=11155111")
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when network is missing", async () => {
    const res = await DELETE(
      createRequest("http://localhost/api/admin/cleanup?secret=test-secret")
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when network is not a number", async () => {
    const res = await DELETE(
      createRequest("http://localhost/api/admin/cleanup?secret=test-secret&network=abc")
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "network must be a valid number" });
  });

  it("cleans all tables and returns 200", async () => {
    mockDeleteResult.mockResolvedValue({ error: null });

    const res = await DELETE(
      createRequest("http://localhost/api/admin/cleanup?secret=test-secret&network=11155111")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.network).toBe(11155111);
    expect(body.results.delegate_profiles.success).toBe(true);
    expect(body.results.sc_action_classifications.success).toBe(true);
  });

  it("cleans specific table only", async () => {
    const res = await DELETE(
      createRequest(
        "http://localhost/api/admin/cleanup?secret=test-secret&network=11155111&table=delegate_profiles"
      )
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.delegate_profiles).toBeDefined();
    expect(body.results.sc_action_classifications).toBeUndefined();
  });

  it("returns 207 on partial failure", async () => {
    let callCount = 0;
    mockDeleteResult.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return { error: null };
      return { error: { message: "table error" } };
    });

    const res = await DELETE(
      createRequest("http://localhost/api/admin/cleanup?secret=test-secret&network=11155111")
    );
    expect(res.status).toBe(207);
  });
});
