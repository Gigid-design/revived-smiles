"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import styles from "./page.module.css";
import { useSubmission } from "./context/SubmissionContext";
import { supabase } from "../lib/supabase";

gsap.registerPlugin(useGSAP);

export default function Home() {
  const router = useRouter();
  const { update, createDraft } = useSubmission();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading URL params on mount
    if (params.get("mode") === "signup") setMode("signup");
  }, []);
  const screenRef = useRef<HTMLElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const { contextSafe } = useGSAP(() => {}, { scope: screenRef });

  async function signInWithOAuth(provider: "google" | "azure") {
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (oauthError) setError(oauthError.message);
  }

  // eslint-disable-next-line react-hooks/refs -- GSAP contextSafe requires render-time wrapping
  const animateOut = contextSafe((destination: string) => {
    const tl = gsap.timeline({
      onComplete: () => router.push(destination),
    });
    tl.to(screenRef.current, {
      filter: "blur(18px)",
      opacity: 0,
      scale: 1.04,
      duration: 0.55,
      ease: "power2.in",
    });
  });

  // eslint-disable-next-line react-hooks/refs -- GSAP contextSafe requires render-time wrapping
  const handleSubmit = contextSafe(async (e: FormEvent) => {
    e.preventDefault();
    // Read DOM values as fallback for browser autofill (which skips onChange)
    const emailValue = (email || emailRef.current?.value || "").trim();
    const passwordValue = (password || passwordRef.current?.value || "").trim();
    if (!emailValue || !passwordValue) return;
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: emailValue,
          password: passwordValue,
        });
        if (signUpError) throw signUpError;

        // Supabase returns a user with no session when the email already exists
        // (security: doesn't reveal whether an account exists)
        if (!signUpData.session) {
          setError("An account with this email may already exist. Try signing in instead.");
          setLoading(false);
          return;
        }

        update({ email: emailValue });
        const userId = signUpData.user?.id;
        if (userId) await createDraft(emailValue, userId);
        animateOut("/dashboard");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: emailValue,
          password: passwordValue,
        });
        if (signInError) throw signInError;
        update({ email: emailValue });

        // Check if user has an existing submission
        const res = await fetch(`/api/lookup?email=${encodeURIComponent(emailValue)}`);
        const lookupData = await res.json();

        if (lookupData.found) {
          const s = lookupData.submission;
          if (s.status === 'draft') {
            // Resume draft — restore context so the dashboard reflects saved progress
            update({
              submissionId: s.id,
              email: emailValue,
              name: s.name || '',
              state: s.state || '',
              products: s.products || [],
              whiteShade: s.white_shade || null,
              gumShade: s.gum_shade || null,
              selectedTeeth: s.selected_teeth || [],
              teethNotSure: s.teeth_not_sure || false,
            });
            try { sessionStorage.setItem('rs_submission_id', s.id); } catch {}
          }
          animateOut("/dashboard");
        } else {
          // No submission found — create a new draft
          const user = (await supabase.auth.getUser()).data.user;
          if (user) await createDraft(emailValue, user.id);
          animateOut("/dashboard");
        }
      }
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : "Something went wrong";
      // Make Supabase error messages more user-friendly
      if (msg.includes("Invalid login credentials")) msg = "Incorrect email or password. Please try again.";
      if (msg.includes("Password should be")) msg = "Password must be at least 6 characters.";
      setError(msg);
      setLoading(false);
    }
  });

  return (
    <main className={styles.screen} ref={screenRef}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <div className={styles.card} id="main-content">
        <Image
          src="/assets/images/logo-revived-smiles.png"
          alt="Revived Smiles"
          width={168}
          height={44}
          className={styles.logo}
          priority
        />

        <h1 className={styles.heading}>Your smile journey<br />starts here</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            ref={emailRef}
            id="email"
            type="email"
            placeholder="Enter Email"
            className={styles.input}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            ref={passwordRef}
            id="password"
            type="password"
            placeholder="Password"
            className={styles.input}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className={styles.errorText}>{error}</p>}
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Please wait…" : "SUBMIT"}
          </button>
        </form>

        <div className={styles.divider}>
          <span className={styles.dividerText}>or sign in with</span>
        </div>

        <div className={styles.socialRow}>
          <button
            type="button"
            className={styles.socialBtn}
            aria-label="Sign in with Microsoft"
            onClick={() => signInWithOAuth("azure")}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="1" y="1" width="10" height="10" fill="#F25022" />
              <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
              <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
              <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
            </svg>
          </button>

          <button
            type="button"
            className={styles.socialBtn}
            aria-label="Sign in with Shopify"
            onClick={() => setError("Shopify sign-in isn’t set up yet.")}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#95BF47" d="M17.6 5.3c-.02-.12-.13-.19-.22-.2-.09-.01-1.86-.14-1.86-.14s-1.24-1.23-1.37-1.37c-.14-.13-.4-.09-.5-.06 0 0-.26.08-.69.21-.43-1.23-1.18-2.36-2.5-2.36h-.11C9.98.79 9.54.6 9.16.6 6.2.6 4.79 4.3 4.34 6.18c-1.15.36-1.97.61-2.07.65-.64.2-.66.22-.74.83C1.46 8.11 0 19.4 0 19.4l11.4 2.14 6.18-1.34S17.63 5.42 17.6 5.3zM12.2 3.98c-.34.1-.72.22-1.14.35v-.24c0-.74-.1-1.34-.27-1.81.68.09 1.13.86 1.41 1.7zM9.98 2.6c.18.46.3 1.11.3 2v.13c-.74.23-1.55.48-2.36.73C8.38 4 9.24 2.98 9.98 2.6zM9.1 1.77c.13 0 .27.05.4.13-.98.46-2.03 1.62-2.47 3.94l-1.86.58C5.68 4.7 6.88 1.77 9.1 1.77z" />
              <path fill="#5E8E3E" d="M17.38 5.1c-.09-.01-1.86-.14-1.86-.14s-1.24-1.23-1.37-1.37a.3.3 0 0 0-.17-.08L11.4 21.54l6.18-1.34S17.63 5.42 17.6 5.3a.25.25 0 0 0-.22-.2z" />
              <path fill="#fff" d="M11.6 8.2l-.76 2.27s-.67-.36-1.48-.36c-1.2 0-1.26.75-1.26 1 0 1.3 3.42 1.8 3.42 4.88 0 2.42-1.53 3.98-3.6 3.98-2.48 0-3.75-1.54-3.75-1.54l.66-2.2s1.3 1.12 2.4 1.12c.72 0 1.01-.57 1.01-.98 0-1.7-2.8-1.78-2.8-4.6 0-2.37 1.7-4.66 5.13-4.66 1.32 0 1.97.38 1.97.38z" />
            </svg>
          </button>

          <button
            type="button"
            className={styles.socialBtn}
            aria-label="Sign in with Google"
            onClick={() => signInWithOAuth("google")}
          >
            <svg width="24" height="24" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z" />
            </svg>
          </button>
        </div>

        <div className={styles.footerLinks}>
          <Link href="/forgot-password" className={styles.footerLink}>
            Forgot your password?
          </Link>
          <button
            type="button"
            className={styles.footerLink}
            onClick={() => {
              const next = mode === "signin" ? "signup" : "signin";
              setMode(next);
              setError(null);
              window.history.pushState({}, "", next === "signup" ? "/?mode=signup" : "/");
            }}
          >
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}
