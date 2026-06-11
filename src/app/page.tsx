"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import styles from "./page.module.css";
import { useSubmission } from "./context/SubmissionContext";

gsap.registerPlugin(useGSAP);

export default function Home() {
  const router = useRouter();
  const { update } = useSubmission();
  const [email, setEmail] = useState("");
  const productRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const el = productRef.current;
      if (!el) return;

      // Vertical bob — 4s full period (2s half), ±10px, sine wave
      gsap.to(el, {
        y: -10,
        duration: 2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });

      // Horizontal sway — slightly different period for organic feel, ±4px
      gsap.to(el, {
        x: 4,
        duration: 2.4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });

      // Rotation — ±1.5°, tied loosely to the bob
      gsap.to(el, {
        rotation: 1.5,
        duration: 2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    });

    return () => mm.revert();
  }, { scope: productRef });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (email.trim()) {
      update({ email: email.trim() });
      router.push("/welcome");
    }
  }

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      {/* Full-screen card background image */}
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

      {/* Top section — heading, subtitle, input, button (396px) */}
      <div className={styles.topSection} id="main-content">
        <h1 className={styles.heading}>Your smile journey starts here</h1>
        <p className={styles.subtitle}>
          Enter the email you used when you placed your order.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputWrapper}>
            {/* placeholder=" " enables CSS :placeholder-shown trick for floating label */}
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
          <button type="submit" className={styles.submitBtn}>
            Submit
          </button>
        </form>
      </div>

      {/* Bottom section — product image (536px) */}
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
