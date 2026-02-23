import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const TABLE = "delegate_profiles";

/** GET — fetch delegate profile by address + network */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const network = searchParams.get("network");

  if (!address) {
    return NextResponse.json(
      { error: "address parameter is required" },
      { status: 400 }
    );
  }

  const networkId = network ? parseInt(network, 10) : 11155111;

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("address", address.toLowerCase())
    .eq("network", networkId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = "not found" — that's okay, return null
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data ?? null });
}

/** PUT — upsert a delegate profile (scoped by network) */
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { address, network, ...profileData } = body;

  if (!address) {
    return NextResponse.json(
      { error: "address is required" },
      { status: 400 }
    );
  }

  const networkId = network ?? 11155111;

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      {
        address: address.toLowerCase(),
        network: networkId,
        ...profileData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "address,network" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
