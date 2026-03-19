import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

function createRequest(body: unknown) {
  return new NextRequest(new URL("http://localhost/api/chat"), {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    ({ POST } = await import("@/app/api/chat/route"));
  });

  it("forwards messages with system context for default chat mode", async () => {
    const stream = new ReadableStream();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        body: stream,
      })
    );

    const res = await POST(
      createRequest({
        messages: [{ role: "user", content: "hello" }],
        screenContext: {
          pageTitle: "Dashboard",
          route: "/",
          description: "Main page",
        },
      })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    // Verify the forwarded body includes system message
    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const sentBody = JSON.parse(fetchCall[1].body);
    expect(sentBody.messages[0].role).toBe("system");
    expect(sentBody.messages[0].content).toContain("Tokamak DAO");
  });

  it("injects agenda-draft system message for make_proposal mode", async () => {
    const stream = new ReadableStream();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: true, body: stream })
    );

    const res = await POST(
      createRequest({
        messages: [{ role: "user", content: "create proposal" }],
        screenContext: { mode: "make_proposal" },
      })
    );
    expect(res.status).toBe(200);

    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const sentBody = JSON.parse(fetchCall[1].body);
    expect(sentBody.mode).toBe("make_proposal");
    expect(sentBody.messages[0].content).toContain("agenda-draft");
  });

  it("passes proposalData context for forum_proposal mode", async () => {
    const stream = new ReadableStream();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: true, body: stream })
    );

    await POST(
      createRequest({
        messages: [{ role: "user", content: "analyze" }],
        screenContext: {
          mode: "forum_proposal",
          proposalData: {
            title: "Test Proposal",
            id: "1",
            status: "Active",
            forVotes: "100",
            againstVotes: "0",
            abstainVotes: "10",
            totalVoters: 5,
            description: "A test proposal",
          },
        },
      })
    );

    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const sentBody = JSON.parse(fetchCall[1].body);
    // forum_proposal should include proposal context but no agenda-draft instruction
    const systemMsg = sentBody.messages.find(
      (m: { role: string; content: string }) =>
        m.role === "system" && m.content.includes("Test Proposal")
    );
    expect(systemMsg).toBeDefined();
  });

  it("returns agent error status on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: false, status: 429 })
    );

    const res = await POST(
      createRequest({
        messages: [{ role: "user", content: "hi" }],
      })
    );
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain("429");
  });

  it("returns 502 when response body is null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: true, body: null })
    );

    const res = await POST(
      createRequest({
        messages: [{ role: "user", content: "hi" }],
      })
    );
    expect(res.status).toBe(502);
  });
});
