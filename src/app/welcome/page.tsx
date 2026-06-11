"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import styles from "./page.module.css";

gsap.registerPlugin(useGSAP);

export default function Welcome() {
  const screenRef = useRef<HTMLElement>(null);
  const photoBgRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // Entrance: screen fades in, photo scales from slight zoom, text + button slide up
      const tl = gsap.timeline();

      tl.fromTo(screenRef.current,
        { filter: "blur(18px)", opacity: 0, scale: 1.04 },
        { filter: "blur(0px)", opacity: 1, scale: 1, duration: 0.65, ease: "power2.out" }
      )
      .fromTo(heroRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, ease: "power2.out" },
        0.2
      )
      .fromTo(btnRef.current,
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" },
        0.35
      );

      // Ken Burns loop after entrance
      tl.to(photoBgRef.current, {
        scale: 1.15,
        duration: 10,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        transformOrigin: "center center",
      }, 0.7);
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      // Simple fade only
      gsap.fromTo(screenRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: "power1.out" }
      );
      // Still do Ken Burns
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
  }, { scope: screenRef });

  return (
    <main className={styles.screen} ref={screenRef} style={{ opacity: 0 }}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

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

      <div className={styles.heroContent} id="main-content" ref={heroRef}>
        <p className={styles.heading}>
          Your{"\n"}
          new smile{"\n"}
          starts
        </p>
        <p className={styles.headingNow}>NOW</p>
      </div>

      <div className={styles.buttonWrapper} ref={btnRef}>
        <Link href="/intake" className={styles.btn}>
          LET&apos;S GO
        </Link>
      </div>
    </main>
  );
}
