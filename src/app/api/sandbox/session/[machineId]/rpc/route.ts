import { NextResponse, type NextRequest } from "next/server";
import { proxyRpc } from "../../../lib/fly";

export async function POST(request: NextRequest) {
  // Only one machine exists at a time — Fly.io auto-routes to it.

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      },
      { status: 400 }
    );
  }

  try {
    const response = await proxyRpc(null, body);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const isTimeout =
      error instanceof DOMException && error.name === "TimeoutError";
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: (body as { id?: unknown })?.id ?? null,
        error: {
          code: -32603,
          message: isTimeout
            ? "Sandbox RPC timeout — the machine may have expired"
            : error instanceof Error
              ? error.message
              : "Internal error",
        },
      },
      { status: 504 }
    );
  }
}
