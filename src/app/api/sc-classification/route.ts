import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  getDefaultClassification,
  mergeWithOverrides,
} from "@/lib/sc-action-classification";

const TABLE = "sc_action_classifications";

/** GET — return merged classifications (defaults + overrides) scoped by network */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const network = searchParams.get("network");
  const networkId = network ? parseInt(network, 10) : 11155111;

  const defaults = getDefaultClassification();

  const { data: overrides, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("network", networkId);

  if (error) {
    // Return defaults even if Supabase fails
    return NextResponse.json({ classifications: defaults, overrides: [] });
  }

  const classifications = mergeWithOverrides(defaults, overrides ?? []);
  return NextResponse.json({ classifications, overrides: overrides ?? [] });
}

/** PUT — upsert a classification override (scoped by network) */
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const {
    contract_id,
    contract_name,
    function_signature,
    function_name,
    path,
    updated_by,
    network,
  } = body;

  if (!contract_id || !function_signature || !path) {
    return NextResponse.json(
      { error: "contract_id, function_signature, and path are required" },
      { status: 400 }
    );
  }

  if (path !== "veto-only" && path !== "direct-execution") {
    return NextResponse.json(
      { error: "path must be 'veto-only' or 'direct-execution'" },
      { status: 400 }
    );
  }

  const networkId = network ?? 11155111;

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      {
        contract_id,
        contract_name,
        function_signature,
        function_name,
        path,
        updated_by,
        network: networkId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "contract_id,function_signature,network" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

/** DELETE — remove an override (restore to default), scoped by network */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contractId = searchParams.get("contract_id");
  const functionSignature = searchParams.get("function_signature");
  const network = searchParams.get("network");
  const networkId = network ? parseInt(network, 10) : 11155111;

  if (!contractId || !functionSignature) {
    return NextResponse.json(
      { error: "contract_id and function_signature are required" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("contract_id", contractId)
    .eq("function_signature", functionSignature)
    .eq("network", networkId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
