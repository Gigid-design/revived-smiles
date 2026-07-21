"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { AdminUser } from "@/lib/api";

export type { AdminUser } from "@/lib/api";

const AdminUserContext = createContext<AdminUser | null>(null);

export function useAdminUser(): AdminUser | null {
  return useContext(AdminUserContext);
}

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
        /* The backend decides who counts as an admin — the browser only asks. */
        const admin = await api.auth.getAdminUser();

        if (!admin) {
          router.replace("/admin/login");
          return;
        }

        setUser(admin);
        setChecked(true);
      } catch {
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

/** Sign out: end the admin session, redirect to login */
export async function signOut() {
  try {
    await api.auth.signOutAdmin();
  } catch (err) {
    console.error("Sign out error:", err);
  }
  window.location.href = "/admin/login";
}
