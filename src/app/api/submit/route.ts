import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { data: row, error } = await supabase
      .from("submissions")
      .insert({
        email: body.email ?? "",
        name: body.name ?? "",
        state: body.state ?? "",
        user_id: body.userId ?? null,
        products: body.products ?? [],
        white_shade: body.whiteShade ?? null,
        gum_shade: body.gumShade ?? null,
        selected_teeth: body.selectedTeeth ?? [],
        teeth_not_sure: body.teethNotSure ?? false,
        impression_photos: body.impressionPhotos ?? [],
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Submission insert failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: row.id });
  } catch (err) {
    console.error("Submit API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
