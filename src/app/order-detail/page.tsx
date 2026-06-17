"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Order Detail is now the "My Order" tab inside the Dashboard.
 * Redirect any direct navigation here to /dashboard.
 */
export default function OrderDetail() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return null;
}
