import { NextRequest } from "next/server";

const AGENT_URL = "https://tokamak-dao-agent.fly.dev/api/chat";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { messages, screenContext } = body;

  // Build system message with screen context
  const systemMessage = screenContext
    ? `You are a helpful companion for the Tokamak DAO governance platform. The user is currently viewing: "${screenContext.pageTitle}" (${screenContext.route}). ${screenContext.description}. Help them understand and interact with the DAO.`
    : "You are a helpful companion for the Tokamak DAO governance platform. Help users understand and interact with the DAO.";

  const forwardBody: Record<string, unknown> = {
    messages: [{ role: "system", content: systemMessage }, ...messages],
  };
  if (screenContext?.mode) {
    forwardBody.mode = screenContext.mode;
  }

  const response = await fetch(AGENT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(forwardBody),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    return new Response(
      JSON.stringify({ error: `Agent responded with ${response.status}` }),
      { status: response.status, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!response.body) {
    return new Response(
      JSON.stringify({ error: "No response body from agent" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // SSE passthrough — no buffering
  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
