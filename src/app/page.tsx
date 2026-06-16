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
import { PRODUCTS } from "./context/productConfig";

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
    if (params.get("mode") === "signup") setMode("signup");
  }, []);
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

  /** Given a draft submission row, determine the next incomplete step */
  function getResumeRoute(s: Record<string, unknown>): string {
    // 1. Basic info
    if (!s.name) return "/intake";
    if (!s.state) return "/step2";

    const products = (s.products as string[] | null) ?? [];
    if (products.length === 0) return "/step3";

    // 2. Product-conditional steps
    const productId = products[0];
    const config = PRODUCTS.find((p) => p.id === productId);
    if (config?.needsShade && !s.white_shade) return "/step4";
    if (config?.needsTeethChart && !(s.selected_teeth as number[] | null)?.length && !s.teeth_not_sure) return "/step5";

    // 3. Bite photos — check each slot individually
    const closeBite = (s.close_bite_photos as string[] | null) ?? [];
    const openBite = (s.open_bite_photos as string[] | null) ?? [];

    if (!closeBite[0]) return "/photo-intro";   // close bite front not taken
    if (!closeBite[1]) return "/camera-1";       // close bite left not taken
    if (!openBite[0]) return "/open-bite";       // open bite front not taken
    if (!openBite[1]) return "/open-bite-2";     // open bite left not taken

    // 4. Impression photos
    const impressions = (s.impression_photos as string[] | null) ?? [];
    if (impressions.length < 4) return "/instructions";

    // Everything filled — should have been submitted already
    return "/dashboard";
  }

  const handleSubmit = contextSafe(async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });
        if (signUpError) throw signUpError;

        // Supabase returns a user with no session when the email already exists
        // (security: doesn't reveal whether an account exists)
        if (!signUpData.session) {
          setError("An account with this email may already exist. Try signing in instead.");
          setLoading(false);
          return;
        }

        update({ email: email.trim() });
        const userId = signUpData.user?.id;
        if (userId) await createDraft(email.trim(), userId);
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
        const lookupData = await res.json();

        if (lookupData.found) {
          const s = lookupData.submission;
          if (s.status === 'draft') {
            // Resume draft — restore context and navigate to next incomplete step
            update({
              submissionId: s.id,
              email: email.trim(),
              name: s.name || '',
              state: s.state || '',
              products: s.products || [],
              whiteShade: s.white_shade || null,
              gumShade: s.gum_shade || null,
              selectedTeeth: s.selected_teeth || [],
              teethNotSure: s.teeth_not_sure || false,
            });
            try { sessionStorage.setItem('rs_submission_id', s.id); } catch {}
            animateOut(getResumeRoute(s));
          } else {
            animateOut("/dashboard");
          }
        } else {
          // No submission found — create a new draft
          const user = (await supabase.auth.getUser()).data.user;
          if (user) await createDraft(email.trim(), user.id);
          animateOut("/welcome");
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
          {mode === "signin" && (
            <Link href="/forgot-password" className={styles.forgotLink}>
              Forgot your password?
            </Link>
          )}
          <button
            type="button"
            className={styles.modeToggle}
            onClick={() => {
              const next = mode === "signin" ? "signup" : "signin";
              setMode(next);
              setError(null);
              window.history.pushState({}, "", next === "signup" ? "/?mode=signup" : "/");
            }}
          >
            {mode === "signin"
              ? <><span>New here? </span><span className={styles.modeToggleUnderline}>Create an account</span></>
              : <><span>Already have an account? </span><span className={styles.modeToggleUnderline}>Sign in</span></>
            }
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
