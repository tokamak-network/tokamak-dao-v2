import { NextResponse } from "next/server";
import { fundWallet } from "../../../lib/fly";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ machineId: string }> }
) {
  const { machineId } = await params;
  const { address } = await request.json();

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json(
      { error: "Valid address required" },
      { status: 400 }
    );
  }

  try {
    await fundWallet(machineId, address);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fund wallet",
      },
      { status: 500 }
    );
  }
}
