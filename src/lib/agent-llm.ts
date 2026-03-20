/**
 * LLM API wrapper using LiteLLM (OpenAI-compatible).
 * Uses ANTHROPIC_BASE_URL + ANTHROPIC_API_KEY env vars.
 */

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CallClaudeOptions {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
  model?: string;
}

export async function callClaude({
  system,
  messages,
  maxTokens = 1024,
  model = "gpt-5.2",
}: CallClaudeOptions): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const baseUrl = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(
    /\/$/,
    ""
  );

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const fullMessages: Message[] = [
    { role: "system", content: system },
    ...messages,
  ];

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: fullMessages,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`LLM API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();

  return data.choices?.[0]?.message?.content || "";
}
