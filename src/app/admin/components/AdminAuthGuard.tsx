"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export interface AdminUser {
  name: string;
  email: string;
  role: string;
  loggedInAt: string;
}

const AdminUserContext = createContext<AdminUser | null>(null);

export function useAdminUser(): AdminUser | null {
  return useContext(AdminUserContext);
}

const SESSION_KEY = "rs_admin_session";

/** Emails allowed to access the admin portal */
const ADMIN_EMAILS = [
  "admin@revivedsmiles.com",
  "ivan.lomelin@unosquare.com",
];

/** Public pages that don't require auth */
const PUBLIC_PATHS = ["/admin/login"];

export function AdminAuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Skip auth check on public pages
    if (PUBLIC_PATHS.includes(pathname)) {
      setChecked(true); // eslint-disable-line react-hooks/set-state-in-effect -- syncing auth state
      return;
    }

    async function verifySession() {
      try {
        /* 1. Quick check: do we have local session metadata? */
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) {
          router.replace("/admin/login");
          return;
        }

        const session = JSON.parse(raw) as AdminUser;

        /* 2. Verify the Supabase auth session is still valid */
        const supabase = getSupabase();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser || !ADMIN_EMAILS.includes(authUser.email?.toLowerCase() ?? "")) {
          // Session expired or not an admin — clean up and redirect
          sessionStorage.removeItem(SESSION_KEY);
          router.replace("/admin/login");
          return;
        }

        setUser(session);
        setChecked(true);
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
        router.replace("/admin/login");
      }
    }

    verifySession();
  }, [pathname, router]);

  // On public pages, render children directly (no auth needed)
  if (PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  // Still checking — show nothing to avoid flash
  if (!checked) return null;

  // Not logged in — redirecting
  if (!user) return null;

  return (
    <AdminUserContext.Provider value={user}>
      {children}
    </AdminUserContext.Provider>
  );
}

/** Sign out: clear Supabase session + local metadata, redirect to login */
export async function signOut() {
  try {
    const supabase = getSupabase();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("Sign out error:", err);
  }
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = "/admin/login";
}
