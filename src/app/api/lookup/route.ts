import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ found: false });
  }

  // Return the most recent non-draft submission; if none, return any draft
  let { data: row, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("email", email)
    .neq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // If no completed submission, check for a draft to resume
  if (!row && !error) {
    const draft = await supabase
      .from("submissions")
      .select("*")
      .eq("email", email)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    row = draft.data;
    error = draft.error;
  }

  if (error || !row) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({ found: true, submission: row });
}
