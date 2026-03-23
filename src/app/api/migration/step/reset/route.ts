import { NextResponse } from "next/server";

const ANVIL_RPC = "http://127.0.0.1:8545";

export async function POST() {
  try {
    const res = await fetch(ANVIL_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "anvil_reset",
        params: [],
        id: 1,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to reset Anvil" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Anvil is not running" },
      { status: 503 },
    );
  }
}
