"use client";

// TODO: Replace with Supabase Auth session validation

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

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
      setChecked(true);
      return;
    }

    // TODO: Replace with Supabase Auth session check
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const session = JSON.parse(raw) as AdminUser;
        setUser(session);
        setChecked(true);
      } else {
        router.replace("/admin/login");
      }
    } catch {
      router.replace("/admin/login");
    }
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

/** Sign out: clear session and redirect to login */
export function signOut() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = "/admin/login";
}
