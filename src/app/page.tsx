"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import styles from "./page.module.css";
import { useSubmission } from "./context/SubmissionContext";
import { supabase } from "../lib/supabase";

gsap.registerPlugin(useGSAP);

export default function Home() {
  const router = useRouter();
  const { update } = useSubmission();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const screenRef = useRef<HTMLElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLDivElement>(null);

  const { contextSafe } = useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const el = productRef.current;
      if (!el) return;

      gsap.to(el, { y: -10, duration: 2, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.to(el, { x: 4, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.to(el, { rotation: 1.5, duration: 2, ease: "sine.inOut", yoyo: true, repeat: -1 });
    });

    return () => mm.revert();
  }, { scope: screenRef });

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

  const handleSubmit = contextSafe(async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });
        if (signUpError) throw signUpError;
        update({ email: email.trim() });
        animateOut("/welcome");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (signInError) throw signInError;
        update({ email: email.trim() });

        // Check if user has an existing submission
        const res = await fetch(`/api/lookup?email=${encodeURIComponent(email.trim())}`);
        const data = await res.json();

        if (data.found) {
          // Populate localStorage for dashboard/order-detail
          const s = data.submission;
          try {
            if (s.name) localStorage.setItem("rs_name", s.name);
            if (s.state) localStorage.setItem("rs_state", s.state);
            if (s.products) localStorage.setItem("rs_products", JSON.stringify(s.products));
            if (s.white_shade) localStorage.setItem("rs_whiteShade", s.white_shade);
            if (s.gum_shade) localStorage.setItem("rs_gumShade", s.gum_shade);
          } catch {}
          animateOut("/dashboard");
        } else {
          animateOut("/welcome");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setLoading(false);
    }
  });

  return (
    <main className={styles.screen} ref={screenRef}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <div className={styles.cardBg} aria-hidden="true">
        <Image
          src="/assets/images/hero-card-bg.png"
          alt=""
          fill
          style={{ objectFit: "cover", objectPosition: "center top" }}
          priority
          sizes="430px"
        />
      </div>

      <div className={styles.topSection} id="main-content" ref={topRef}>
        <h1 className={styles.heading}>{mode === "signin" ? "Welcome back" : "Your smile journey starts here"}</h1>
        <p className={styles.subtitle}>
          {mode === "signin" ? "Sign in to your account." : "Create an account to get started."}
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputWrapper}>
            <input
              id="email"
              type="email"
              placeholder=" "
              className={styles.input}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label htmlFor="email" className={styles.floatingLabel}>
              Enter email
            </label>
          </div>
          <div className={styles.inputWrapper}>
            <input
              id="password"
              type="password"
              placeholder=" "
              className={styles.input}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label htmlFor="password" className={styles.floatingLabel}>
              {mode === "signin" ? "Password" : "Create password"}
            </label>
          </div>
          {error && <p className={styles.errorText}>{error}</p>}
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (mode === "signin" ? "Signing in…" : "Creating account…") : (mode === "signin" ? "SIGN IN" : "CREATE ACCOUNT")}
          </button>
          <button
            type="button"
            className={styles.modeToggle}
            onClick={() => { setMode(m => m === "signin" ? "signup" : "signin"); setError(null); }}
          >
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </form>
      </div>

      <div className={styles.bottomSection} aria-hidden="true">
        <div className={styles.productImageWrapper} ref={productRef}>
          <Image
            src="/assets/images/hero-product-v2.png"
            alt="Revived Smiles impression kit"
            width={461}
            height={576}
            className={styles.productImage}
            sizes="461px"
          />
        </div>
      </div>
    </main>
  );
}
