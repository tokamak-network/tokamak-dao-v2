import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const TABLES = ["delegate_profiles", "sc_action_classifications"] as const;

/** DELETE — clean up data for a specific network (requires secret) */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const network = searchParams.get("network");
  const table = searchParams.get("table"); // specific table or "all"

  // Authenticate
  const expectedSecret = process.env.ADMIN_CLEANUP_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!network) {
    return NextResponse.json(
      { error: "network parameter is required" },
      { status: 400 }
    );
  }

  const networkId = parseInt(network, 10);
  if (isNaN(networkId)) {
    return NextResponse.json(
      { error: "network must be a valid number" },
      { status: 400 }
    );
  }

  const tablesToClean =
    table && table !== "all"
      ? [table as (typeof TABLES)[number]]
      : [...TABLES];

  const results: Record<string, { success: boolean; error?: string }> = {};

  for (const t of tablesToClean) {
    const { error } = await supabase.from(t).delete().eq("network", networkId);

    results[t] = error
      ? { success: false, error: error.message }
      : { success: true };
  }

  const allSuccess = Object.values(results).every((r) => r.success);

  return NextResponse.json(
    { network: networkId, results },
    { status: allSuccess ? 200 : 207 }
  );
}
