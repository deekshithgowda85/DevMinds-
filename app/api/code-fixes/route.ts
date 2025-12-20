import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/code-fixes - Get all code fixes for user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    let query = supabase
      .from("code_fixes")
      .select("*, debug_sessions(session_name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (sessionId) {
      query = query.eq("session_id", sessionId);
    }

    const { data: fixes, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ fixes });
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/code-fixes - Create new code fix
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      session_id,
      file_path,
      error_type,
      error_message,
      fix_description,
      code_before,
      code_after,
      status,
    } = body;

    const { data: fix, error } = await supabase
      .from("code_fixes")
      .insert({
        user_id: user.id,
        session_id,
        file_path,
        error_type,
        error_message,
        fix_description,
        code_before,
        code_after,
        status: status || "pending",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ fix });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/code-fixes - Update code fix status
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, applied_at } = body;

    if (!id) {
      return NextResponse.json({ error: "Fix ID required" }, { status: 400 });
    }

    const updateData: Record<string, string | number | null> = { status };
    if (applied_at) {
      updateData.applied_at = applied_at;
    }

    const { data: fix, error } = await supabase
      .from("code_fixes")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ fix });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
