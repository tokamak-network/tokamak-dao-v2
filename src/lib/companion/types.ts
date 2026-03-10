export interface CompanionMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  timestamp: number;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: string;
  status: "pending" | "running" | "done" | "error";
}

export interface ScreenContext {
  route: string;
  pageTitle: string;
  description: string;
  suggestedQuestions: string[];
  mode?: "chat" | "make_proposal" | "analyze_proposal" | "forum_proposal";
}

export type SSEEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; id: string; result: string; isError?: boolean }
  | { type: "thinking"; text: string }
  | { type: "error"; message: string }
  | { type: "done" };
