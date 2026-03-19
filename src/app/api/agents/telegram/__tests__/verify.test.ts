import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

function createRequest(body: unknown) {
  return new NextRequest(new URL("http://localhost/api/agents/telegram/verify"), {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/agents/telegram/verify", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    ({ POST } = await import("@/app/api/agents/telegram/verify/route"));
  });

  it("returns 400 when token is missing", async () => {
    const res = await POST(createRequest({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "Token is required" });
  });

  it("returns 400 when token is not a string", async () => {
    const res = await POST(createRequest({ token: 12345 }));
    expect(res.status).toBe(400);
  });

  it("returns ok with botName for valid token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        json: () =>
          Promise.resolve({ ok: true, result: { username: "TestBot" } }),
      })
    );

    const res = await POST(createRequest({ token: "valid-token" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, botName: "TestBot" });
  });

  it("returns ok: false for invalid token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        json: () =>
          Promise.resolve({ ok: false, description: "Not Found" }),
      })
    );

    const res = await POST(createRequest({ token: "bad-token" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: false, error: "Invalid bot token" });
  });

  it("returns 500 on fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new Error("network down"))
    );

    const res = await POST(createRequest({ token: "tok" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "Failed to verify token" });
  });
});
