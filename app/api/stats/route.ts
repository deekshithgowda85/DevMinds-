import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/stats - Get user statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get projects count
    const { count: projectsCount } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Get debug sessions count
    const { count: debugSessionsCount } = await supabase
      .from("debug_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Get code fixes count
    const { count: codeFixesCount } = await supabase
      .from("code_fixes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Get repositories count
    const { count: repositoriesCount } = await supabase
      .from("repositories")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    return NextResponse.json({
      stats: {
        projects: projectsCount || 0,
        debugSessions: debugSessionsCount || 0,
        codeFixes: codeFixesCount || 0,
        repositories: repositoriesCount || 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
