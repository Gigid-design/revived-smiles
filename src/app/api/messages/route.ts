import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** GET /api/messages?submissionId={id} — fetch messages for a submission
 *  GET /api/messages?unreadCounts=id1,id2,id3 — batch unread counts (patient→admin) */
export async function GET(req: NextRequest) {
  const unreadCountsParam = req.nextUrl.searchParams.get("unreadCounts");

  if (unreadCountsParam) {
    // Batch mode: return unread patient→admin message counts per submission
    const ids = unreadCountsParam.split(",").filter(Boolean);
    const { data, error } = await supabase
      .from("messages")
      .select("submission_id")
      .in("submission_id", ids)
      .eq("sender_role", "patient")
      .is("read_at", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.submission_id] = (counts[row.submission_id] || 0) + 1;
    }
    return NextResponse.json({ counts });
  }

  // Single mode: fetch all messages for a submission
  const submissionId = req.nextUrl.searchParams.get("submissionId");
  if (!submissionId) {
    return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}

/** POST /api/messages — send a message */
export async function POST(req: NextRequest) {
  try {
    const { submissionId, body, senderRole, senderName } = await req.json();

    if (!submissionId || !body?.trim() || !senderRole || !senderName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["admin", "patient"].includes(senderRole)) {
      return NextResponse.json({ error: "Invalid senderRole" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        submission_id: submissionId,
        sender_role: senderRole,
        sender_name: senderName,
        body: body.trim(),
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

/** PATCH /api/messages — mark messages as read */
export async function PATCH(req: NextRequest) {
  try {
    const { submissionId, markRole } = await req.json();

    if (!submissionId || !markRole) {
      return NextResponse.json({ error: "Missing submissionId or markRole" }, { status: 400 });
    }

    // Mark all messages FROM the other party as read
    const { error } = await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("submission_id", submissionId)
      .eq("sender_role", markRole)
      .is("read_at", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
