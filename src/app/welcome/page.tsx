"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import styles from "./page.module.css";

gsap.registerPlugin(useGSAP);

export default function Welcome() {
  const photoBgRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // Slow Ken Burns zoom: scale 1 → 1.15 over 10s, breathes back, loops forever
      gsap.to(photoBgRef.current, {
        scale: 1.15,
        duration: 10,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        transformOrigin: "center center",
      });
    });

    return () => mm.revert();
  }, { scope: photoBgRef });

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      {/* Card background texture */}
      <div className={styles.cardBg} aria-hidden="true">
        <Image
          src="/assets/images/welcome-card-bg.png"
          alt=""
          fill
          style={{ objectFit: "cover", objectPosition: "center top" }}
          priority
          sizes="430px"
        />
      </div>

      {/* Full-screen photo — two layers composited, slowly zooms in */}
      <div className={styles.photoBg} ref={photoBgRef} aria-hidden="true">
        <Image
          src="/assets/images/welcome-photo-1.png"
          alt=""
          fill
          style={{ objectFit: "cover", objectPosition: "center top" }}
          priority
          sizes="430px"
        />
        <Image
          src="/assets/images/welcome-photo-2.png"
          alt=""
          fill
          style={{ objectFit: "cover", objectPosition: "center top" }}
          priority
          sizes="430px"
        />
      </div>

      {/* Hero text — top-left */}
      <div className={styles.heroContent} id="main-content">
        <p className={styles.heading}>
          Your{"\n"}
          new smile{"\n"}
          starts
        </p>
        <p className={styles.headingNow}>NOW</p>
      </div>

      {/* LET'S GO button → /intake */}
      <div className={styles.buttonWrapper}>
        <Link href="/intake" className={styles.btn}>
          LET&apos;S GO
        </Link>
      </div>
    </main>
  );
}
