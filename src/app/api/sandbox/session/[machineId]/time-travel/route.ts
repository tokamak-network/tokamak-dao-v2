import { NextResponse } from "next/server";
import { anvilRpc } from "../../../lib/fly";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ machineId: string }> }
) {
  const { machineId } = await params;
  const { seconds } = await request.json();

  if (typeof seconds !== "number" || seconds <= 0) {
    return NextResponse.json(
      { error: "seconds must be a positive number" },
      { status: 400 }
    );
  }

  try {
    await anvilRpc(machineId, "anvil_increaseTime", [seconds]);
    await anvilRpc(machineId, "anvil_mine", [1]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to time travel",
      },
      { status: 500 }
    );
  }
}
