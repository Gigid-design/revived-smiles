"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import styles from "./page.module.css";
import { usePageTransition } from "../hooks/usePageTransition";
import { useSubmission } from "../context/SubmissionContext";
import { supabase } from "../../lib/supabase";

const SLOT_DEFS = [
  { id: 1, label: "Upper Impression 1", sub: "Angle 1", tray: "imp-dental-tray-2.svg", section: "upper" },
  { id: 2, label: "Upper Impression 2", sub: "Angle 2", tray: "imp-dental-tray-1.svg", section: "upper" },
  { id: 3, label: "Lower Impression 1", sub: "Angle 1", tray: "imp-dental-tray-3.svg", section: "lower" },
  { id: 4, label: "Lower Impression 2", sub: "Angle 2", tray: "imp-dental-tray-1.svg", section: "lower" },
];

export default function Step6() {
  const { cardRef, navigate } = usePageTransition();
  const { data, update } = useSubmission();
  const [uploading, setUploading] = useState<number | null>(null);
  const [photos, setPhotos] = useState<{ slot: number; url: string; path: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const photosAdded = photos.length;
  const allDone = photosAdded === 4;

  async function handleFileChange(slot: number, file: File) {
    setUploading(slot);
    try {
      const ext = file.name.split(".").pop();
      const path = `impressions/${Date.now()}-slot${slot}.${ext}`;
      const { error } = await supabase.storage
        .from("impression-photos")
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("impression-photos")
        .getPublicUrl(path);

      setPhotos((prev) => {
        const next = prev.filter((p) => p.slot !== slot);
        return [...next, { slot, url: urlData.publicUrl, path }];
      });
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(null);
    }
  }

  async function handleSubmit() {
    if (!allDone || submitting) return;
    setSubmitting(true);

    update({ impressionPhotos: photos });

    const { data: row, error } = await supabase
      .from("submissions")
      .insert({
        email: data.email,
        name: data.name,
        state: data.state,
        products: data.products,
        white_shade: data.whiteShade,
        gum_shade: data.gumShade,
        selected_teeth: data.selectedTeeth,
        teeth_not_sure: data.teethNotSure,
        impression_photos: photos.map((p) => p.url),
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Submission failed:", error);
      alert("Submission failed. Please try again.");
      setSubmitting(false);
      return;
    }

    update({ submissionId: row.id });
    navigate("/complete", "forward");
  }

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <div className={styles.outerBg} aria-hidden="true">
        <Image src="/assets/images/intake-bg.png" alt="" fill style={{ objectFit: "cover" }} priority sizes="430px" />
      </div>
      <div className={styles.cardBg} aria-hidden="true">
        <Image src="/assets/images/intake-card-bg.png" alt="" fill style={{ objectFit: "cover", objectPosition: "center top" }} priority sizes="430px" />
      </div>

      <div className={styles.progressBar} aria-label="Complete" role="progressbar" aria-valuenow={3} aria-valuemin={1} aria-valuemax={3}>
        <div className={styles.segTrackFull} />
        <div className={styles.segSmall} />
        <div className={styles.segSmall} />
      </div>

      <nav className={styles.navBar} aria-label="Form navigation">
        <button className={styles.navBtn} aria-label="Go back" onClick={() => navigate('/step5', 'backward')}>
          <Image src="/assets/images/intake-icon-back.svg" alt="" width={20} height={20} />
        </button>
        <span className={styles.navTitle}>Intake form</span>
        <Link href="/" className={styles.navBtn} aria-label="Close form">
          <Image src="/assets/images/intake-icon-close.svg" alt="" width={20} height={20} />
        </Link>
      </nav>

      <div className={styles.card} id="main-content" ref={cardRef}>
        <h1 className={styles.cardTitle}>Impression Photos</h1>
        <p className={styles.cardSubtitle}>
          Take 4 photos of your at-home impression kit so we can verify your molds are accurate.
        </p>

        <div className={styles.tipBox}>
          <div className={styles.tipIcon}>
            <Image src="/assets/images/imp-icon-info.svg" alt="" width={18} height={18} unoptimized />
          </div>
          <p className={styles.tipText}>
            <strong>Good lighting matters.</strong>{" "}
            <span>Place your mold on a white surface and ensure the arch shape is clearly visible before snapping.</span>
          </p>
        </div>

        <div className={styles.progressRow}>
          <p className={styles.progressText}>
            <strong>{photosAdded}</strong> of 4 photos added
          </p>
          <div className={styles.progressDots}>
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={`${styles.dot} ${i <= photosAdded ? styles.dotActive : ""}`} />
            ))}
          </div>
        </div>

        {(["upper", "lower"] as const).map((section) => (
          <div key={section}>
            <p className={styles.sectionLabel}>{section === "upper" ? "Upper" : "Lower"} Arch</p>
            <div className={styles.photoGrid}>
              {SLOT_DEFS.filter((s) => s.section === section).map((slot, i) => {
                const done = photos.some((p) => p.slot === slot.id);
                const isUploading = uploading === slot.id;
                const photo = photos.find((p) => p.slot === slot.id);

                return (
                  <div
                    key={slot.id}
                    className={`${styles.photoCard} ${done ? styles.photoCardDone : ""}`}
                    onClick={() => inputRefs.current[slot.id - 1]?.click()}
                    style={{ cursor: "pointer" }}
                  >
                    <div className={styles.photoCardInner}>
                      {done && photo ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={photo.url} alt={slot.label} style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 8 }} />
                      ) : isUploading ? (
                        <span style={{ fontSize: 11, color: "#8a8a8a" }}>Uploading…</span>
                      ) : (
                        <Image
                          src={`/assets/images/${slot.tray}`}
                          alt=""
                          width={80}
                          height={60}
                          className={styles.trayImg}
                          unoptimized
                          style={i === 1 ? { transform: "scaleX(-1)" } : undefined}
                        />
                      )}
                    </div>
                    <div className={`${styles.badge} ${done ? styles.badgeDone : styles.badgeEmpty}`}>
                      <Image src={`/assets/images/${done ? "imp-icon-check.svg" : "imp-icon-plus.svg"}`} alt="" width={10} height={10} unoptimized />
                    </div>
                    <p className={styles.photoLabel}>{slot.label}</p>
                    {!done && <p className={styles.photoSub}>{slot.sub}</p>}

                    <input
                      ref={(el) => { inputRefs.current[slot.id - 1] = el; }}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileChange(slot.id, file);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.buttonWrapper}>
        <button
          type="button"
          className={styles.btn}
          style={allDone && !submitting ? { background: "#0e1b4d", color: "#fff" } : {}}
          onClick={handleSubmit}
          disabled={!allDone || submitting}
        >
          {submitting ? "SUBMITTING…" : "CONTINUE"}
        </button>
      </div>
    </main>
  );
}
