"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./page.module.css";
import { getSupabase } from "@/lib/supabase";

/** Emails allowed to access the admin portal.
 *  Extend this list or replace with a DB lookup as the team grows. */
const ADMIN_EMAILS = [
  "admin@revivedsmiles.com",
  "ivan.lomelin@unosquare.com",
];

function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const trimmedEmail = email.trim().toLowerCase();

    /* 1. Gate: only allowed admin emails */
    if (!isAdminEmail(trimmedEmail)) {
      setError("This account does not have admin access.");
      setLoading(false);
      return;
    }

    /* 2. Authenticate via Supabase Auth */
    try {
      const supabase = getSupabase();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (authError) {
        let msg = authError.message;
        if (msg.includes("Invalid login credentials")) msg = "Incorrect email or password.";
        setError(msg);
        setLoading(false);
        return;
      }

      /* 3. Fetch the user profile for display name */
      const { data: { user } } = await supabase.auth.getUser();
      const displayName = user?.user_metadata?.full_name
        || user?.user_metadata?.name
        || trimmedEmail.split("@")[0];

      /* 4. Persist admin session metadata for the auth guard */
      const session = {
        name: displayName,
        email: trimmedEmail,
        role: "Admin",
        loggedInAt: new Date().toISOString(),
      };
      sessionStorage.setItem("rs_admin_session", JSON.stringify(session));

      router.push("/admin");
    } catch (err) {
      console.error("Admin login failed:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <Image
            src="/assets/images/logo-revived-smiles.png"
            alt="Revived Smiles"
            width={160}
            height={48}
            style={{ objectFit: "contain" }}
            priority
          />
        </div>
        <h1 className={styles.heading}>Admin Portal</h1>
        <p className={styles.subheading}>Sign in to manage submissions</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.errorMsg}>{error}</div>}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              className={styles.input}
              placeholder="you@revivedsmiles.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
