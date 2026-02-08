import { NextResponse } from "next/server";
import { destroyMachine, getMachine } from "../../lib/fly";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ machineId: string }> }
) {
  const { machineId } = await params;

  try {
    const machine = await getMachine(machineId);
    return NextResponse.json({ alive: machine.state === "started", state: machine.state });
  } catch {
    // Machine doesn't exist or Fly API error → not alive
    return NextResponse.json({ alive: false, state: "unknown" });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ machineId: string }> }
) {
  const { machineId } = await params;

  try {
    await destroyMachine(machineId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to destroy machine",
      },
      { status: 500 }
    );
  }
}
