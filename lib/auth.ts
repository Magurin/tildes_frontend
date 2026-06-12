import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";

/**
 * Role-based auth for mutating route handlers.
 *
 * The role lives in Supabase Auth `app_metadata.role` — it is embedded in
 * the JWT and can only be changed with the service key (the /api/admin
 * routes), never from the client. Sign-up gives a plain "user"; admins
 * grant "moderator" in the админка. Emails in MODERATOR_EMAILS are admins
 * regardless (bootstrap so the админка can never lock itself out).
 */

export type Role = "user" | "moderator" | "admin";

const RANK: Record<Role, number> = { user: 0, moderator: 1, admin: 2 };

function bootstrapAdmins(): Set<string> {
  return new Set(
    (process.env.MODERATOR_EMAILS ?? "")
      .toLowerCase()
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean),
  );
}

export function roleOf(user: User): Role {
  if (bootstrapAdmins().has(user.email?.toLowerCase() ?? "")) return "admin";
  const role = user.app_metadata?.role;
  return role === "admin" || role === "moderator" ? role : "user";
}

/** The request's user, or null when the token is missing/invalid. */
export async function userFromRequest(request: Request): Promise<User | null> {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : (data.user ?? null);
}

/** Null when the request carries at least `min` role; an error response otherwise. */
export async function requireRole(
  request: Request,
  min: Exclude<Role, "user">,
): Promise<NextResponse | null> {
  const user = await userFromRequest(request);
  if (!user)
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  if (RANK[roleOf(user)] < RANK[min])
    return NextResponse.json(
      {
        error:
          min === "admin"
            ? "Доступно только администраторам"
            : "Доступно только модераторам",
      },
      { status: 403 },
    );
  return null;
}
