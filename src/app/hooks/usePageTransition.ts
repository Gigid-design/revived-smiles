"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

type AnimationType = "slide" | "fade";

export function usePageTransition(animation: AnimationType = "fade") {
  const cardRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { contextSafe } = useGSAP(() => {
    const dir = (sessionStorage.getItem("transitionDirection") ?? "forward") as "forward" | "backward";
    sessionStorage.removeItem("transitionDirection");

    if (animation === "fade") {
      gsap.fromTo(cardRef.current, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power1.out", clearProps: "opacity" });
    } else {
      gsap.fromTo(
        cardRef.current,
        { x: dir === "backward" ? -40 : 40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.45, ease: "power2.out", clearProps: "x,opacity" }
      );
    }
  }, { scope: cardRef });

  const navigate = contextSafe((url: string, direction: "forward" | "backward" = "forward") => {
    sessionStorage.setItem("transitionDirection", direction);
    router.push(url);
  });

  return { cardRef, navigate };
}
