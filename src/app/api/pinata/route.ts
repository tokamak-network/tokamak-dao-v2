import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const jwt = process.env.PINATA_JWT;

  if (!jwt) {
    return NextResponse.json(
      { error: "IPFS pinning service is not configured." },
      { status: 503 }
    );
  }

  try {
    const metadata = await req.json();

    const jsonStr = JSON.stringify(metadata);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const file = new File([blob], `agent-${metadata.name || "unnamed"}.json`, {
      type: "application/json",
    });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("network", "public");

    const res = await fetch("https://uploads.pinata.cloud/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Pinata error:", res.status, errorText);
      return NextResponse.json(
        { error: "Failed to upload to IPFS." },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json({ cid: data.data.cid });
  } catch (err) {
    console.error("Pinata upload error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
