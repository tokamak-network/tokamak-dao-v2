/**
 * Lightweight Claude API wrapper using fetch.
 * Uses ANTHROPIC_BASE_URL + ANTHROPIC_API_KEY env vars.
 */

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface CallClaudeOptions {
  system: string;
  messages: Message[];
  maxTokens?: number;
}

export async function callClaude({
  system,
  messages,
  maxTokens = 1024,
}: CallClaudeOptions): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const baseUrl = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(
    /\/$/,
    ""
  );

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Claude API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();

  // Extract text from content blocks
  const textBlocks = data.content?.filter(
    (block: { type: string }) => block.type === "text"
  );
  return textBlocks?.map((b: { text: string }) => b.text).join("") || "";
}
