"use client";

// TODO: Replace with Supabase Auth — another agent is setting this up.
// Demo auth: admin@revivedsmiles.com / demo1234

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./page.module.css";

const DEMO_EMAIL = "admin@revivedsmiles.com";
const DEMO_PASSWORD = "demo1234";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // TODO: Replace with Supabase Auth validation
    if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
      const session = {
        name: "Admin User",
        email: DEMO_EMAIL,
        role: "Inpatient Representative",
        loggedInAt: new Date().toISOString(),
      };
      sessionStorage.setItem("rs_admin_session", JSON.stringify(session));
      router.push("/admin");
    } else {
      setError("Invalid email or password");
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

          {/* TODO: Wire forgot password flow with Supabase Auth */}
          <a href="#" className={styles.forgotLink} onClick={(e) => e.preventDefault()}>
            Forgot password?
          </a>
        </form>

        <div className={styles.demoHint}>
          Demo credentials: <strong>{DEMO_EMAIL}</strong> / <strong>{DEMO_PASSWORD}</strong>
        </div>
      </div>
    </div>
  );
}
