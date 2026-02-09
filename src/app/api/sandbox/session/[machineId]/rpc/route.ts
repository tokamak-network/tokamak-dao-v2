import { NextResponse, type NextRequest } from "next/server";
import { proxyRpc } from "../../../lib/fly";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ machineId: string }> }
) {
  const { machineId: pathMachineId } = await params;
  // Prefer cookie machine ID (always current) over URL param (may be stale
  // due to MetaMask caching old RPC URLs for already-registered chains)
  const machineId = request.cookies.get("sandbox-machine-id")?.value ?? pathMachineId ?? null;

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
    const response = await proxyRpc(machineId, body);
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
