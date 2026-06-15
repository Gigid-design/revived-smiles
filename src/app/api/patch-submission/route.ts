import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(req: NextRequest) {
  try {
    const { submissionId, fields } = await req.json();

    if (!submissionId || !fields || typeof fields !== "object") {
      return NextResponse.json({ error: "Missing submissionId or fields" }, { status: 400 });
    }

    const { error } = await supabase
      .from("submissions")
      .update(fields)
      .eq("id", submissionId);

    if (error) {
      console.error("Patch failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Patch submission error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
