"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import styles from "./page.module.css";
import { useSubmission } from "../context/SubmissionContext";
import { api, ApiError } from "@/lib/api";

gsap.registerPlugin(useGSAP);

export default function CreatePassword() {
  const router = useRouter();
  const { data, update, ensureSubmissionId } = useSubmission();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const screenRef = useRef<HTMLElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  /* Reached here without an email (deep link or refresh)? Send them back to
     the start, where the email is collected. */
  useEffect(() => {
    if (!data.email) router.replace("/");
  }, [data.email, router]);

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

  // eslint-disable-next-line react-hooks/refs -- GSAP contextSafe requires render-time wrapping
  const handleSubmit = contextSafe(async (e: FormEvent) => {
    e.preventDefault();
    // Read DOM value as fallback for browser autofill (which skips onChange)
    const passwordValue = (password || passwordRef.current?.value || "").trim();
    if (!passwordValue) {
      setError("Choose a temporary password.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await api.auth.signUp(data.email, passwordValue);

      /* Adopt the order already on file before starting a new one, so progress
         isn't split across two drafts. */
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
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setLoading(false);
    }
  });

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

        <h1 className={styles.heading}>Your smile journey<br />starts here</h1>
        <p className={styles.subtitle}>Create a temporary password to continue</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            ref={passwordRef}
            id="temp-password"
            type="password"
            placeholder="Create temporary password"
            className={styles.input}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className={styles.errorText}>{error}</p>}
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Please wait…" : "SUBMIT"}
          </button>
        </form>

        <div className={styles.footerLinks}>
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
