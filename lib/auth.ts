import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Moderator check for mutating route handlers.
 *
 * Moderators are Supabase Auth users whose email is in the MODERATOR_EMAILS
 * env (comma-separated). The client sends its session JWT in the
 * Authorization header; anyone can self-sign-up in Supabase, so the
 * allowlist — not the mere presence of an account — is what grants rights.
 */

function moderatorEmails(): Set<string> {
  return new Set(
    (process.env.MODERATOR_EMAILS ?? "")
      .toLowerCase()
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean),
  );
}

/** Null when the request is from a moderator; an error response otherwise. */
export async function requireModerator(
  request: Request,
): Promise<NextResponse | null> {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!token)
    return NextResponse.json(
      { error: "Требуется вход модератора" },
      { status: 401 },
    );

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await supabase.auth.getUser(token);
  const email = data?.user?.email?.toLowerCase();
  if (error || !email)
    return NextResponse.json(
      { error: "Сессия недействительна — войдите заново" },
      { status: 401 },
    );
  if (!moderatorEmails().has(email))
    return NextResponse.json(
      { error: "Доступно только модераторам" },
      { status: 403 },
    );
  return null;
}
