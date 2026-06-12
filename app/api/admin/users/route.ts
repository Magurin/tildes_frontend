import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole, roleOf } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Service-key client: the only place app_metadata can be changed. */
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** GET — list users with their roles (admins only). */
export async function GET(request: Request) {
  const denied = await requireRole(request, "admin");
  if (denied) return denied;

  const { data, error } = await adminClient().auth.admin.listUsers({
    page: 1,
    perPage: 500,
  });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const users = data.users
    .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      role: roleOf(u),
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
    }))
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  return NextResponse.json({ users });
}

/** PATCH {user_id, role: "user" | "moderator"} — grant/revoke moderator. */
export async function PATCH(request: Request) {
  const denied = await requireRole(request, "admin");
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const userId = body?.user_id as string | undefined;
  const role = body?.role as string | undefined;
  if (!userId || (role !== "user" && role !== "moderator"))
    return NextResponse.json(
      { error: "user_id и role (user | moderator) обязательны" },
      { status: 400 },
    );

  const admin = adminClient();
  // Bootstrap admins (MODERATOR_EMAILS) and admins are not demotable here.
  const { data: target } = await admin.auth.admin.getUserById(userId);
  if (!target?.user)
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  if (roleOf(target.user) === "admin")
    return NextResponse.json(
      { error: "Роль администратора меняется только вручную" },
      { status: 400 },
    );

  const { data, error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    user: { id: data.user.id, email: data.user.email, role: roleOf(data.user) },
  });
}
