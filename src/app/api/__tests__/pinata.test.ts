import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

function createRequest(body: unknown) {
  return new NextRequest(new URL("http://localhost/api/pinata"), {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/pinata", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.stubEnv("PINATA_JWT", "test-jwt");
    ({ POST } = await import("@/app/api/pinata/route"));
  });

  it("returns 503 when PINATA_JWT is not set", async () => {
    vi.stubEnv("PINATA_JWT", "");

    const res = await POST(createRequest({ name: "test" }));
    expect(res.status).toBe(503);
  });

  it("returns cid on successful upload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { cid: "Qm123" } }),
      })
    );

    const res = await POST(createRequest({ name: "my-agent" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ cid: "Qm123" });
  });

  it("returns 502 on Pinata API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve("bad request"),
      })
    );

    const res = await POST(createRequest({ name: "test" }));
    expect(res.status).toBe(502);
  });

  it("returns 500 on fetch exception", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new Error("network error"))
    );

    const res = await POST(createRequest({ name: "test" }));
    expect(res.status).toBe(500);
  });
});
