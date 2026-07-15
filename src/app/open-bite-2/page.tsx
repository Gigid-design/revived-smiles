"use client";

import Image from "next/image";
import { useRef, useEffect, useState, useCallback } from "react";
import styles from "./page.module.css";
import { usePageTransition } from "../hooks/usePageTransition";
import PhotoTimeline from "../components/PhotoTimeline";
import { IntakeHeader } from "../components/IntakeHeader";
import { useSubmission } from "../context/SubmissionContext";
import { getSupabase } from "@/lib/supabase";

type State = "idle" | "analyzing" | "pass" | "warning";

interface Check {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
  observation?: string;
}

interface PillState {
  label: string;
  detail: string;
  status: "idle" | "checking" | "pass" | "fail" | "allpass" | "allfail";
}

const FALLBACK_CHECK_IDS = ["mouth_open", "side_angle", "blur", "lighting", "framing", "glare"];

const TIPS: Record<string, string> = {
  mouth_open:        "Open your mouth comfortably — we need to see your teeth inside.",
  side_angle:        "Turn your head a bit so the camera sees your teeth from the side.",
  blur:                "Hold steady — press your elbows against your body or rest your hand on a surface.",
  lighting:            "Move near a window or turn on the room lights for better brightness.",
  framing:             "Move closer — your teeth should fill most of the frame.",
  glare:               "Turn off flash and use soft natural light to avoid reflections on your teeth.",
};

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M12 3.5 21 19H3L12 3.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 8.75V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 16.5H12.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export default function OpenBite2() {
  const { navigate } = usePageTransition();
  const { data } = useSubmission();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<State>("idle");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [pill, setPill] = useState<PillState | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [showExample, setShowExample] = useState(false);
  const [teethCenter, setTeethCenter] = useState<{ x: number; y: number } | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async (facing: "environment" | "user" = "environment") => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setCameraError("Camera access denied. Allow camera in browser settings.");
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode); // eslint-disable-line react-hooks/set-state-in-effect -- camera stream initialization
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [startCamera, facingMode]);

  const flipCamera = () => {
    setFacingMode((prev) => prev === "environment" ? "user" : "environment");
  };

  const runChecks = useCallback(async (checks: Check[]) => {
    for (let i = 0; i < checks.length; i++) {
      const c = checks[i];
      setPill({ label: c.label, detail: "", status: "checking" });
      await new Promise<void>((r) => setTimeout(r, 900));
      setPill({ label: c.label, detail: c.detail, status: c.pass ? "pass" : "fail" });
      await new Promise<void>((r) => setTimeout(r, 500));
    }
    await new Promise<void>((r) => setTimeout(r, 300));
    const allPass = checks.every((c) => c.pass);
    const failedCheck = checks.find((c) => !c.pass);

    setPill(null);
    setChecks(checks);

    if (allPass) {
      setState("pass");
    } else {
      setTip(TIPS[failedCheck!.id] ?? null);
      setState("warning");
    }
  }, []);

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

    setCapturedImage(dataUrl);
    setState("analyzing");
    setPill({ label: "Starting scan…", detail: "", status: "checking" });

    const base64 = dataUrl.split(",")[1];

    try {
      const res = await fetch("/api/analyze-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, photoType: "open-bite-side" }),
      });
      const data = await res.json();
      if (data.teethCenter) setTeethCenter(data.teethCenter);
      if (data.summary) setAiSummary(data.summary);
      await runChecks(data.checks);
    } catch {
      const fallback: Check[] = FALLBACK_CHECK_IDS.map((id) => ({
        id, label: id, pass: false, detail: "Could not analyze. Try again.",
      }));
      await runChecks(fallback);
    }
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmitPhoto = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (capturedImage) {
        const supabase = getSupabase();
        const blob = await fetch(capturedImage).then(r => r.blob());
        const path = `open-bite/${Date.now()}-side.jpg`;
        await supabase.storage.from("impression-photos").upload(path, blob, { contentType: "image/jpeg", upsert: true });
        const { data: urlData } = supabase.storage.from("impression-photos").getPublicUrl(path);

        const id = data.submissionId || sessionStorage.getItem("rs_submission_id");
        if (id) {
          const { data: row } = await supabase.from("submissions").select("open_bite_photos,photo_analyses").eq("id", id).single();
          const photos = row?.open_bite_photos || [];
          photos[1] = urlData.publicUrl;
          const analyses = row?.photo_analyses || {};
          analyses["open-bite-side"] = { checks, summary: aiSummary, teethCenter, pass: checks.every(c => c.pass) };
          await supabase.from("submissions").update({ open_bite_photos: photos, photo_analyses: analyses }).eq("id", id);
        }
      }
      navigate('/impression-photos', 'forward');
    } catch (err) {
      console.error("Photo upload failed:", err);
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>
      <IntakeHeader
        pct={100}
        counter="Photo 4 of 4"
        onBack={() => navigate('/open-bite', 'backward')}
        onClose={() => navigate('/', 'backward')}
      />

      {/* Timeline */}
      <div className={styles.timeline}>
        <PhotoTimeline
          steps={[
            { label: "Front" },
            { label: "Side" },
            { label: "Open" },
            { label: "Open side" },
          ]}
          currentStep={3}
        />
      </div>

      {/* White card */}
      <div className={styles.card} id="main-content">

        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderText}>
            <h1 className={styles.cardTitle}>Side view — mouth<br />open</h1>
            <p className={styles.cardSubtitle}>
              {state === "idle" && "Keep your mouth open wide. Turn your head to show one side."}
              {state === "analyzing" && "AI is scanning your photo…"}
              {state === "pass" && "All checks passed! Ready to submit."}
              {state === "warning" && "Some issues found — you can still continue or retake."}
            </p>
          </div>
        </div>

        {state === "idle" && (
          <Image src="/assets/images/camera-tutorial-btn.svg" alt="Tutorial" width={73} height={64} className={styles.tutorialBtn} unoptimized />
        )}

        {/* Viewfinder wrap */}
        <div className={styles.viewfinderWrap}>
          <div className={`${styles.viewfinder} ${(state === "pass" || state === "warning") ? styles.viewfinderShrunk : ""}`} aria-label="Camera viewfinder">
            <video
              ref={videoRef}
              className={`${styles.liveVideo} ${state !== "idle" ? styles.hidden : ""} ${facingMode === "user" ? styles.mirrored : ""}`}
              autoPlay playsInline muted
            />
            {capturedImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={capturedImage}
                alt="Captured"
                className={styles.capturedImg}
                style={teethCenter ? { objectPosition: `${teethCenter.x}% ${teethCenter.y}%` } : undefined}
              />
            )}
            {cameraError && (
              <div className={styles.cameraError}><p>{cameraError}</p></div>
            )}

            <span className={`${styles.corner} ${styles.cornerTL}`} />
            <span className={`${styles.corner} ${styles.cornerTR}`} />
            <span className={`${styles.corner} ${styles.cornerBL}`} />
            <span className={`${styles.corner} ${styles.cornerBR}`} />

            {state === "idle" && !showExample && (
              <div className={styles.teethGuide}>
                <Image src="/assets/images/camera-teeth-guide-open.png" alt="Teeth alignment guide - open bite" width={280} height={140} style={{ width: '100%', height: 'auto' }} unoptimized />
              </div>
            )}

            {/* Example photo overlay */}
            {showExample && (
              <div className={styles.exampleOverlay}>
                <Image src="/assets/images/open-bite-left.png" alt="Example: Open mouth side" fill style={{ objectFit: 'cover', borderRadius: 'inherit' }} unoptimized />
              </div>
            )}
          </div>

          {/* See Example toggle */}
          {state === "idle" && (
            <button
              className={styles.exampleToggle}
              onClick={() => setShowExample(!showExample)}
              type="button"
            >
              {showExample ? "Hide Example" : "See Example"}
            </button>
          )}

          {/* Result badge on viewfinder */}
          {state === "pass" && <div className={styles.resultBadgePass}>✓ All checks passed</div>}
          {state === "warning" && <div className={styles.resultBadgeWarning}>⚠ Issues found</div>}

          {/* Pill outside viewfinder */}
          {pill && (
            <div className={`${styles.scanPill} ${
              pill.status === "allpass" ? styles.scanPillAllPass :
              pill.status === "allfail" || pill.status === "fail" ? styles.scanPillFail :
              pill.status === "pass" ? styles.scanPillPass :
              styles.scanPillChecking
            }`}>
              <div className={styles.scanPillIcon}>
                {pill.status === "checking" && <span className={styles.scanSpinner} />}
                {pill.status === "pass" && <span className={styles.scanIconPass}>✓</span>}
                {pill.status === "fail" && <AlertIcon className={`${styles.alertIcon} ${styles.scanIconFail}`} />}
                {pill.status === "allpass" && <span className={styles.scanIconPass}>✓</span>}
                {pill.status === "allfail" && <AlertIcon className={`${styles.alertIcon} ${styles.scanIconFail}`} />}
              </div>
              <div className={styles.scanPillText}>
                <span className={styles.scanPillLabel}>{pill.label}</span>
                {pill.detail ? <span className={styles.scanPillDetail}>{pill.detail}</span> : null}
              </div>
            </div>
          )}
        </div>

        {/* Tip card — fail state */}
        {state === "warning" && tip && (
          <div className={styles.tipCard}>
            <div className={styles.tipIcon}>💡</div>
            <div className={styles.tipBody}>
              <span className={styles.tipLabel}>Try this</span>
              <span className={styles.tipText}>{tip}</span>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>

      {/* Bottom fade */}
      <div className={styles.bottomFade} aria-hidden="true" />

      {/* Controls */}
      <div className={styles.controls}>
        {state === "idle" && (
          <>
            <button className={`${styles.controlBtn} ${styles.controlBtnTimer}`} aria-label="Choose from gallery" onClick={() => fileInputRef.current?.click()}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#121723" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = reader.result as string;
                  const base64 = dataUrl.split(",")[1];
                  setCapturedImage(dataUrl);
                  setState("analyzing");
                  setPill({ label: "Starting scan…", detail: "", status: "checking" });
                  fetch("/api/analyze-photo", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ imageBase64: base64, photoType: "open-bite-side" }),
                  })
                    .then((res) => res.json())
                    .then((data) => {
                      if (data.teethCenter) setTeethCenter(data.teethCenter);
                      if (data.summary) setAiSummary(data.summary);
                      return runChecks(data.checks);
                    })
                    .catch(() => {
                      const fallback: Check[] = FALLBACK_CHECK_IDS.map((id) => ({
                        id, label: id, pass: false, detail: "Could not analyze. Try again.",
                      }));
                      runChecks(fallback);
                    });
                };
                reader.readAsDataURL(file);
                e.target.value = "";
              }}
            />
            <button className={`${styles.controlBtn} ${styles.controlBtnFlash}`} aria-label="Flash">
              <Image src="/assets/images/camera-icon-flash.svg" alt="" width={21} height={21} unoptimized />
            </button>
            <button className={styles.shutter} aria-label="Capture photo" onClick={captureAndAnalyze}>
              <div className={styles.shutterInner} />
            </button>
            <button className={`${styles.controlBtn} ${styles.controlBtnGrid}`} aria-label="Flip camera" onClick={flipCamera}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#121723" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6"/>
                <path d="M23 20v-6h-6"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
            </button>
          </>
        )}
        {state === "analyzing" && (
          <div className={styles.analyzingControls}>
            <span className={styles.analyzingLabel}>Scanning photo…</span>
          </div>
        )}
        {state === "warning" && (
          <div className={styles.warningControls}>
            <button className={styles.retakeBtn} onClick={() => {
              setCapturedImage(null);
              setPill(null);
              setTip(null);
              setAiSummary(null);
              setState("idle");
            }}>Retake Photo</button>
            <button className={styles.continueAnywayBtn} onClick={handleSubmitPhoto}>{submitting ? "Saving…" : "Continue Anyway"}</button>
          </div>
        )}
        {state === "pass" && (
          <button className={styles.submitBtn} onClick={handleSubmitPhoto}>{submitting ? "Saving…" : "Submit Photo"}</button>
        )}
      </div>
    </main>
  );
}
