import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/prompts — list prompt configs
 *   ?photoType=X  → active config + version history for that type
 *   ?active=true  → all active configs (one per photo type)
 *   (no params)   → all configs grouped by photo type
 */
export async function GET(req: NextRequest) {
  const photoType = req.nextUrl.searchParams.get("photoType");
  const activeOnly = req.nextUrl.searchParams.get("active") === "true";

  if (photoType) {
    // Get all versions for this photo type, newest first
    const { data, error } = await supabase
      .from("prompt_configs")
      .select("*")
      .eq("photo_type", photoType)
      .order("version", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ configs: data ?? [] });
  }

  if (activeOnly) {
    const { data, error } = await supabase
      .from("prompt_configs")
      .select("*")
      .eq("is_active", true)
      .order("photo_type");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ configs: data ?? [] });
  }

  // All configs grouped by photo type
  const { data, error } = await supabase
    .from("prompt_configs")
    .select("*")
    .order("photo_type")
    .order("version", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by photo_type
  const grouped: Record<string, typeof data> = {};
  for (const config of data ?? []) {
    if (!grouped[config.photo_type]) grouped[config.photo_type] = [];
    grouped[config.photo_type].push(config);
  }

  return NextResponse.json({ configs: grouped });
}

/**
 * POST /api/prompts — create a new version of a prompt config
 * Body: { photoType, label, poseDescription, contentChecks, qualityChecks?, changeNotes, createdBy? }
 *
 * Auto-increments version and sets as active (deactivates previous).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      photoType,
      label,
      poseDescription,
      contentChecks,
      qualityChecks,
      changeNotes,
      createdBy,
    } = body;

    if (!photoType || !label || !poseDescription || !contentChecks) {
      return NextResponse.json(
        { error: "Missing required fields: photoType, label, poseDescription, contentChecks" },
        { status: 400 }
      );
    }

    // Get current max version for this photo type
    const { data: existing } = await supabase
      .from("prompt_configs")
      .select("version")
      .eq("photo_type", photoType)
      .order("version", { ascending: false })
      .limit(1);

    const nextVersion = (existing?.[0]?.version ?? 0) + 1;

    // Deactivate all existing versions for this photo type
    await supabase
      .from("prompt_configs")
      .update({ is_active: false })
      .eq("photo_type", photoType);

    // Insert new version as active
    const insertData: Record<string, unknown> = {
      photo_type: photoType,
      version: nextVersion,
      label,
      pose_description: poseDescription,
      content_checks: contentChecks,
      is_active: true,
      change_notes: changeNotes || null,
      created_by: createdBy || null,
    };

    if (qualityChecks) {
      insertData.quality_checks = qualityChecks;
    }

    const { data: newConfig, error } = await supabase
      .from("prompt_configs")
      .insert(insertData)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ config: newConfig });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

/**
 * PATCH /api/prompts — activate a specific version
 * Body: { id, photoType }
 */
export async function PATCH(req: NextRequest) {
  try {
    const { id, photoType } = await req.json();

    if (!id || !photoType) {
      return NextResponse.json({ error: "Missing id and photoType" }, { status: 400 });
    }

    // Deactivate all versions for this type
    await supabase
      .from("prompt_configs")
      .update({ is_active: false })
      .eq("photo_type", photoType);

    // Activate the specified version
    const { error } = await supabase
      .from("prompt_configs")
      .update({ is_active: true })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
