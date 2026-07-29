"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

/* Aftercare guidance shown once an order is delivered. Kept generic to the
   appliance so it reads sensibly for any product. */
const SECTIONS: { icon: React.ReactNode; title: string; body: string; points: string[] }[] = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 3h10l-1 6a4 4 0 0 1-8 0z" /><path d="M12 15v4" /><path d="M8 21h8" />
      </svg>
    ),
    title: "Clean it daily",
    body: "Rinse after every wear and brush gently once a day.",
    points: [
      "Rinse under lukewarm water each time you take it out.",
      "Brush with a soft toothbrush and mild soap — not toothpaste, which scratches.",
      "Soak in a denture or retainer cleaner a few times a week.",
    ],
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
      </svg>
    ),
    title: "Ease into wearing it",
    body: "A little pressure or extra saliva at first is normal.",
    points: [
      "Wear it a few hours the first day, then build up.",
      "Practice speaking out loud to adjust faster.",
      "Take it out overnight unless your care team says otherwise.",
    ],
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="8" width="18" height="12" rx="2" /><path d="M7 8V6a5 5 0 0 1 10 0v2" />
      </svg>
    ),
    title: "Store it safely",
    body: "Keep it moist and out of harm's way when it's not in.",
    points: [
      "Keep it in its case, in water or cleaning solution.",
      "Never let it dry out — it can warp and stop fitting.",
      "Keep it away from pets and hot water.",
    ],
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
      </svg>
    ),
    title: "Avoid these",
    body: "A few habits shorten the life of your appliance.",
    points: [
      "Hot or boiling water, and dishwashers.",
      "Toothpaste, bleach, or abrasive cleaners.",
      "Bending the clasps or biting it into place.",
    ],
  },
];

export default function CareGuidePage() {
  const router = useRouter();

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <header className={styles.header}>
        <button
          type="button"
          className={styles.backBtn}
          aria-label="Back to my orders"
          onClick={() => router.push("/my-order")}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className={styles.title}>Care Guide</h1>
      </header>

      <div className={styles.content} id="main-content">
        <section className={styles.introCard}>
          <p className={styles.introEyebrow}>Your appliance has arrived</p>
          <h2 className={styles.introTitle}>Make it last</h2>
          <p className={styles.introBody}>
            A few simple habits keep your appliance comfortable, clear, and fitting well
            for as long as possible.
          </p>
        </section>

        {SECTIONS.map((s) => (
          <section key={s.title} className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardIcon} aria-hidden>{s.icon}</span>
              <h3 className={styles.cardTitle}>{s.title}</h3>
            </div>
            <p className={styles.cardBody}>{s.body}</p>
            <ul className={styles.pointList}>
              {s.points.map((p) => (
                <li key={p} className={styles.point}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 12.5L9.5 18L20 6.5" />
                  </svg>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className={styles.helpCard}>
          <div>
            <h3 className={styles.cardTitle}>Something not feeling right?</h3>
            <p className={styles.cardBody}>Sore spots or a loose fit are worth a quick message.</p>
          </div>
          <Link href="/messages" className={styles.helpBtn}>Message your care team</Link>
        </section>
      </div>
    </main>
  );
}
