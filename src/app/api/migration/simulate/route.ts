import { NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";
import { promises as fs } from "fs";
import { parseBroadcastJson } from "@/lib/migration";

const ANVIL_RPC = "http://127.0.0.1:8545";
const DEPLOYER_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const BROADCAST_RELATIVE_PATH =
  "broadcast/MigrationSimulation.s.sol/1337/run-latest.json";

async function isAnvilRunning(): Promise<boolean> {
  try {
    const res = await fetch(ANVIL_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_chainId",
        params: [],
        id: 1,
      }),
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST() {
  // 1. Check Anvil is running
  const anvilUp = await isAnvilRunning();
  if (!anvilUp) {
    return NextResponse.json(
      { error: "Anvil is not running. Run 'npm run anvil' first." },
      { status: 503 }
    );
  }

  const contractsDir = path.join(process.cwd(), "contracts");
  const broadcastPath = path.join(contractsDir, BROADCAST_RELATIVE_PATH);
  const startTime = Date.now();

  // 2. Run forge script
  try {
    execSync(
      [
        "forge script",
        "script/MigrationSimulation.s.sol:MigrationSimulationScript",
        `--rpc-url ${ANVIL_RPC}`,
        "--broadcast",
        "-vvvv",
        `--private-key ${DEPLOYER_KEY}`,
      ].join(" "),
      {
        cwd: contractsDir,
        timeout: 120_000,
        stdio: ["pipe", "pipe", "pipe"],
      }
    );
  } catch (err: unknown) {
    const stderr =
      err instanceof Error && "stderr" in err
        ? String((err as { stderr: unknown }).stderr)
        : "Unknown forge error";
    return NextResponse.json(
      { error: "Forge script failed", details: stderr },
      { status: 500 }
    );
  }

  const executionTimeMs = Date.now() - startTime;

  // 3. Parse broadcast JSON
  try {
    await fs.access(broadcastPath);
  } catch {
    return NextResponse.json(
      {
        error:
          "Broadcast JSON not found. The forge script may not have produced output.",
        path: broadcastPath,
      },
      { status: 500 }
    );
  }

  try {
    const result = await parseBroadcastJson(broadcastPath);
    result.executionTimeMs = executionTimeMs;
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to parse broadcast JSON";
    return NextResponse.json(
      { error: "Failed to parse migration results", details: message },
      { status: 500 }
    );
  }
}
