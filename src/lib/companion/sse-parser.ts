import type { SSEEvent } from "./types";

export async function* parseSSEStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<SSEEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) continue;

        if (trimmed.startsWith("data: ")) {
          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            yield { type: "done" };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const event = mapToSSEEvent(parsed);
            if (event) yield event;
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith("data: ")) {
        const data = trimmed.slice(6);
        if (data === "[DONE]") {
          yield { type: "done" };
        } else {
          try {
            const parsed = JSON.parse(data);
            const event = mapToSSEEvent(parsed);
            if (event) yield event;
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function mapToSSEEvent(data: Record<string, unknown>): SSEEvent | null {
  const type = data.type as string;

  switch (type) {
    case "text_delta":
    case "content_block_delta":
      return {
        type: "text_delta",
        text:
          (data.content as string) ||
          (data.text as string) ||
          (data.delta as { text?: string })?.text ||
          "",
      };
    case "tool_use":
    case "tool_call":
      return {
        type: "tool_use",
        id: (data.tool_id as string) || (data.id as string) || "",
        name: (data.name as string) || "",
        input: (data.input as Record<string, unknown>) || {},
      };
    case "tool_result":
      return {
        type: "tool_result",
        id: (data.tool_id as string) || (data.id as string) || "",
        result: (data.result as string) || "",
        isError: (data.is_error as boolean) ?? (data.isError as boolean | undefined),
      };
    case "thinking":
      return { type: "thinking", text: (data.text as string) || "" };
    case "error":
      return { type: "error", message: (data.message as string) || "Unknown error" };
    case "done":
    case "message_stop":
      return { type: "done" };
    default:
      return null;
  }
}
