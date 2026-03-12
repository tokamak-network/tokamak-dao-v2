import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { ok: false, error: "Token is required" },
        { status: 400 }
      );
    }

    const res = await fetch(
      `https://api.telegram.org/bot${token}/getMe`
    );
    const data = await res.json();

    if (data.ok && data.result) {
      return NextResponse.json({
        ok: true,
        botName: data.result.username ?? data.result.first_name,
      });
    }

    return NextResponse.json({
      ok: false,
      error: "Invalid bot token",
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to verify token" },
      { status: 500 }
    );
  }
}
