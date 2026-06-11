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

  const handleSubmit = contextSafe((e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    update({ email: email.trim() });

    const tl = gsap.timeline({
      onComplete: () => router.push("/welcome"),
    });

    tl.to(screenRef.current, {
      filter: "blur(18px)",
      opacity: 0,
      scale: 1.04,
      duration: 0.55,
      ease: "power2.in",
    });
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
        <h1 className={styles.heading}>Your smile journey starts here</h1>
        <p className={styles.subtitle}>
          Enter the email you used when you placed your order.
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
          <button type="submit" className={styles.submitBtn}>
            Submit
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
