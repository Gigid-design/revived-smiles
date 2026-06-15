"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { getSupabase } from "@/lib/supabase";

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  // Supabase sends the user here with a hash fragment containing the access token.
  // The Supabase client auto-detects the hash and establishes a session.
  // We need to wait for that to complete before allowing the password update.
  useEffect(() => {
    const supabase = getSupabase();

    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setSessionReady(true);
        }
      }
    );

    // Also check if we already have a session (user may have refreshed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        // Give Supabase a moment to process the hash fragment
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (s) {
              setSessionReady(true);
            } else {
              setSessionError(true);
            }
          });
        }, 2000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabase();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      setSuccess(true);

      // Redirect to home after a short delay
      setTimeout(() => router.push("/"), 3000);
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : "Something went wrong";
      if (msg.includes("same_password")) msg = "New password must be different from your current password.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      {/* Background */}
      <div className={styles.bgWrap} aria-hidden="true">
        <Image
          src="/assets/images/hero-card-bg.png"
          alt=""
          fill
          style={{ objectFit: "cover", objectPosition: "center top" }}
          priority
          sizes="430px"
        />
      </div>

      <div className={styles.content} id="main-content">

        {/* Session error — invalid or expired link */}
        {sessionError && !sessionReady && (
          <div className={styles.centeredState}>
            <div className={styles.stateIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h1 className={styles.heading}>Link expired</h1>
            <p className={styles.subtitle}>
              This password reset link has expired or is invalid. Please request a new one.
            </p>
            <Link href="/forgot-password" className={styles.submitBtn} style={{ textDecoration: "none", marginTop: "1.5em" }}>
              REQUEST NEW LINK
            </Link>
          </div>
        )}

        {/* Loading session */}
        {!sessionReady && !sessionError && (
          <div className={styles.centeredState}>
            <div className={styles.spinner} />
            <p className={styles.subtitle}>Verifying your reset link…</p>
          </div>
        )}

        {/* Success state */}
        {success && (
          <div className={styles.centeredState}>
            <div className={styles.stateIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h1 className={styles.heading}>Password updated!</h1>
            <p className={styles.subtitle}>
              Your password has been changed successfully. Redirecting you to sign in…
            </p>
          </div>
        )}

        {/* Password form */}
        {sessionReady && !success && (
          <>
            <h1 className={styles.heading}>Set new password</h1>
            <p className={styles.subtitle}>
              Enter your new password below. Must be at least 6 characters.
            </p>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.inputWrapper}>
                <input
                  id="new-password"
                  type="password"
                  placeholder=" "
                  className={styles.input}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <label htmlFor="new-password" className={styles.floatingLabel}>
                  New password
                </label>
              </div>

              <div className={styles.inputWrapper}>
                <input
                  id="confirm-password"
                  type="password"
                  placeholder=" "
                  className={styles.input}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                />
                <label htmlFor="confirm-password" className={styles.floatingLabel}>
                  Confirm new password
                </label>
              </div>

              {error && <p className={styles.errorText}>{error}</p>}

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? "UPDATING…" : "UPDATE PASSWORD"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
