"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./page.module.css";
import { api, ApiError } from "@/lib/api";

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

    /* The backend decides who counts as an admin and starts the session. */
    try {
      await api.auth.signInAdmin(email, password);
      router.push("/admin");
    } catch (err) {
      console.error("Admin login failed:", err);
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <Image
            src="/assets/images/logo-revived-smiles-dark.png"
            alt="Revived Smiles"
            width={200}
            height={47}
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

        <div className={styles.demoHint}>
          Demo credentials:<br />
          <strong>admin@revivedsmiles.com</strong> / <strong>any password</strong>
        </div>
      </div>
    </div>
  );
}
