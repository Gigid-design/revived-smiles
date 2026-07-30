"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ClipboardEvent, FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import styles from "./page.module.css";
import { useSubmission } from "../context/SubmissionContext";
import { api, ApiError } from "@/lib/api";

gsap.registerPlugin(useGSAP);

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function VerifyCode() {
  const router = useRouter();
  const { data, update, ensureSubmissionId } = useSubmission();

  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  const screenRef = useRef<HTMLElement>(null);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  // Guards the auto-submit so a single completed code fires the verify once.
  const submittedRef = useRef(false);

  /* Reached here without an email (deep link or refresh)? Send them back to
     the start, where the email is collected. */
  useEffect(() => {
    if (!data.email) router.replace("/");
  }, [data.email, router]);

  /* Land focus on the first box so typing just works. */
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  /* Countdown to re-enable "Resend code". */
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [secondsLeft]);

  const { contextSafe } = useGSAP(() => {}, { scope: screenRef });

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

  async function verify(code: string) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setError(null);
    setLoading(true);

    try {
      // The code stands in for the credential — no password step in this flow.
      await api.auth.signIn(data.email, code);

      /* Adopt the order already on file so intake progress isn't split across
         drafts once we land on the dashboard. */
      const existing = await api.submissions.getById(await ensureSubmissionId());
      if (existing.status === "draft") {
        update({
          submissionId: existing.id,
          name: existing.name ?? "",
          state: existing.state ?? "",
          products: existing.products,
          whiteShade: existing.whiteShade,
          gumShade: existing.gumShade,
          selectedTeeth: existing.selectedTeeth,
          teethNotSure: existing.teethNotSure,
        });
      }

      animateOut("/dashboard");
    } catch (err: unknown) {
      submittedRef.current = false;
      setError(err instanceof ApiError ? err.message : "That code didn't work. Try again.");
      setLoading(false);
    }
  }

  function commit(next: string[]) {
    setDigits(next);
    const code = next.join("");
    if (code.length === CODE_LENGTH && next.every(Boolean)) {
      void verify(code);
    }
  }

  function handleChange(index: number, raw: string) {
    setError(null);
    // Keep only digits; grab the last one typed so overtyping a filled box works.
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }
    const next = [...digits];
    next[index] = cleaned[cleaned.length - 1];
    commit(next);
    if (index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        setDigits(next);
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus();
        const next = [...digits];
        next[index - 1] = "";
        setDigits(next);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    setError(null);
    const next = Array(CODE_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i += 1) next[i] = pasted[i];
    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    inputsRef.current[focusIndex]?.focus();
    commit(next);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < CODE_LENGTH) {
      setError("Enter all 6 digits.");
      return;
    }
    void verify(code);
  }

  async function handleResend() {
    if (secondsLeft > 0) return;
    setError(null);
    try {
      await api.auth.requestPasswordReset(data.email, `${window.location.origin}/reset-password`);
    } catch {
      /* The demo can't fail to "send"; nothing to surface. */
    }
    setNotice("A new code is on its way.");
    setSecondsLeft(RESEND_SECONDS);
    setDigits(Array(CODE_LENGTH).fill(""));
    submittedRef.current = false;
    inputsRef.current[0]?.focus();
  }

  return (
    <main className={styles.screen} ref={screenRef}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <video
        className={styles.videoBg}
        autoPlay
        loop
        muted
        playsInline
        poster="/assets/images/login-bg-poster.jpg"
        aria-hidden="true"
      >
        <source src="/assets/videos/login-bg.mp4" type="video/mp4" />
      </video>

      <div className={styles.card} id="main-content">
        <Image
          src="/assets/images/logo-revived-smiles.png"
          alt="Revived Smiles"
          width={168}
          height={44}
          className={styles.logo}
          priority
        />

        <h1 className={styles.heading}>Check your email</h1>
        <p className={styles.subtitle}>
          Enter the 6-digit code we sent to<br />
          <span className={styles.email}>{data.email || "your email"}</span>
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.codeRow} role="group" aria-label="6-digit verification code">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputsRef.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={1}
                className={`${styles.codeBox} ${error ? styles.codeBoxError : ""}`}
                aria-label={`Digit ${index + 1}`}
                value={digit}
                disabled={loading}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
              />
            ))}
          </div>

          {error && <p className={styles.errorText}>{error}</p>}
          {!error && notice && <p className={styles.noticeText}>{notice}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Verifying…" : "Verify"}
          </button>
        </form>

        <div className={styles.footerLinks}>
          <button
            type="button"
            className={styles.footerLink}
            onClick={handleResend}
            disabled={secondsLeft > 0}
          >
            {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : "Resend code"}
          </button>
          <button
            type="button"
            className={styles.footerLink}
            onClick={() => router.push("/")}
          >
            Back
          </button>
        </div>
      </div>
    </main>
  );
}
