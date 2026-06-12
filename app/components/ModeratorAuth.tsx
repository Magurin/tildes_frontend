"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export type ClientRole = "user" | "moderator" | "admin";

/**
 * Auth session + role for client components.
 *
 * The role comes from `app_metadata.role` in the JWT — set only via the
 * admin API, so the client can trust it for showing/hiding UI. Every
 * mutating request still carries the JWT and is re-checked server-side.
 */
export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const metaRole = session?.user.app_metadata?.role;
  const role: ClientRole =
    metaRole === "admin" || metaRole === "moderator" ? metaRole : "user";

  return {
    session,
    role,
    isModerator: role === "moderator" || role === "admin",
    isAdmin: role === "admin",
    loading,
    /** Header for mutating API calls; {} while signed out. */
    authHeader: session
      ? { Authorization: `Bearer ${session.access_token}` }
      : ({} as Record<string, string>),
    signOut: () => getSupabaseBrowser().auth.signOut(),
  };
}

/** Backward-compatible alias (pre-roles name). */
export const useModeratorSession = useAuthSession;

/** The вход/регистрация form lives in its own file; re-export for callers. */
export { default as AuthForm } from "./AuthForm";
