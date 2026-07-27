"use client";

import Image from "next/image";
import { useRef, useEffect, useState, useCallback } from "react";
import styles from "./page.module.css";
import { usePageTransition } from "../hooks/usePageTransition";
import PhotoTimeline from "../components/PhotoTimeline";
import { IntakeHeader } from "../components/IntakeHeader";
import { FlowSupport } from "../components/FlowSupport";
import { useSubmission } from "../context/SubmissionContext";
import { api } from "@/lib/api";
import type { AnalysisCheck, PhotoAnalysis, PhotoType } from "@/lib/api";

type State = "idle" | "analyzing" | "pass" | "warning";

const PHOTO_TYPE: PhotoType = "close-bite-front";

interface PillState {
  label: string;
  detail: string;
  status: "idle" | "checking" | "pass" | "fail" | "allpass" | "allfail";
}

const FALLBACK_CHECK_IDS = ["teeth_visible", "front_view", "blur", "lighting", "framing", "glare"];

const TIPS: Record<string, string> = {
  teeth_visible:     "Pull your lips back so we can see both your upper and lower teeth.",
  front_view:        "Hold your phone in front of your face, not from the side.",
  blur:              "Hold steady — press your elbows against your body or rest your hand on a surface.",
  lighting:          "Move near a window or turn on the room lights for better brightness.",
  framing:           "Move closer — your teeth should fill most of the frame.",
  glare:             "Turn off flash and use soft natural light to avoid reflections on your teeth.",
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

export default function Camera() {
  const { navigate } = usePageTransition();
  const { data, update, ensureSubmissionId } = useSubmission();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<State>("idle");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [pill, setPill] = useState<PillState | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PhotoAnalysis | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [showExample, setShowExample] = useState(false);
  const [teethCenter, setTeethCenter] = useState<{ x: number; y: number } | null>(null);
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

  const runChecks = useCallback(async (checks: AnalysisCheck[]) => {
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

    if (allPass) {
      setState("pass");
    } else {
      setTip(TIPS[failedCheck!.id] ?? null);
      setState("warning");
    }
  }, []);

  /* One analysis path for both the shutter and the gallery picker. */
  const analyzePhoto = useCallback(async (dataUrl: string) => {
    setCapturedImage(dataUrl);
    setState("analyzing");
    setPill({ label: "Starting scan…", detail: "", status: "checking" });

    try {
      const result = await api.photos.analyze(dataUrl, PHOTO_TYPE);
      setAnalysis(result);
      if (result.teethCenter) setTeethCenter(result.teethCenter);
      await runChecks(result.checks);
    } catch {
      const fallback: PhotoAnalysis = {
        checks: FALLBACK_CHECK_IDS.map((id) => ({
          id, label: id, pass: false, detail: "Could not analyze. Try again.",
        })),
        summary: null,
        teethCenter: null,
        pass: false,
      };
      setAnalysis(fallback);
      await runChecks(fallback.checks);
    }
  }, [runChecks]);

  const captureAndAnalyze = async () => {
    /* Demo builds show the sample photo rather than the live frame, so the
       shutter works on a machine with no camera and never needs permission. */
    if (api.photos.usesStandInPhotos) {
      const { url } = await api.photos.standInPhoto(PHOTO_TYPE);
      await analyzePhoto(url);
      return;
    }

    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d")!.drawImage(video, 0, 0);

    await analyzePhoto(canvas.toDataURL("image/jpeg", 0.85));
  };

  const chooseFromGallery = async () => {
    /* Same reasoning as the shutter: no file picker in front of an audience. */
    if (api.photos.usesStandInPhotos) {
      const { url } = await api.photos.standInPhoto(PHOTO_TYPE);
      await analyzePhoto(url);
      return;
    }
    fileInputRef.current?.click();
  };

  const retake = () => {
    setCapturedImage(null);
    setPill(null);
    setTip(null);
    setAnalysis(null);
    setTeethCenter(null);
    setState("idle");
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmitPhoto = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (capturedImage) {
        const blob = await fetch(capturedImage).then(r => r.blob());
        const { url } = await api.photos.upload(blob, "close-bite");

        const id = await ensureSubmissionId();
        await api.photos.attachToSubmission(id, PHOTO_TYPE, url, analysis);

        // Keep the dashboard's progress in step with what was just saved.
        const nextPhotos = [...data.closeBitePhotos];
        nextPhotos[0] = url;
        update({ closeBitePhotos: nextPhotos });
      }
      navigate('/camera-1', 'forward');
    } catch (err) {
      console.error("Photo upload failed:", err);
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <IntakeHeader
        label="Teeth Photos"
        pct={25}
        counter="Photo 1 of 4"
        onBack={() => navigate('/photo-intro', 'backward')}
        onClose={() => navigate('/dashboard', 'backward')}
      />

      {/* Timeline */}
      <div className={styles.timeline}>
        <PhotoTimeline
          steps={[
            { label: "Front closed" },
            { label: "Open" },
            { label: "Left side" },
            { label: "Right side" },
          ]}
          currentStep={0}
        />
      </div>

      {/* White card */}
      <div className={styles.card} id="main-content">

        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderText}>
            <h1 className={styles.cardTitle}>Front — teeth closed</h1>
            <p className={styles.cardSubtitle}>
              {state === "idle" && "Bite down and smile so we can see your front teeth closed together."}
              {state === "analyzing" && "AI is scanning your photo…"}
              {state === "pass" && "All checks passed! Ready to submit."}
              {state === "warning" && "Some issues found — you can still continue or retake."}
            </p>
          </div>
        </div>

        {state === "idle" && (
          <Image src="/assets/images/camera-tutorial-btn.svg" alt="Tutorial" width={73} height={64} className={styles.tutorialBtn} unoptimized />
        )}

        {/* Viewfinder wrap — pill sits here so it's not clipped by viewfinder overflow */}
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
                style={teethCenter ? { objectPosition: `${teethCenter.x * 100}% ${teethCenter.y * 100}%` } : undefined}
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
                <Image src="/assets/images/camera-teeth-guide.png" alt="Teeth alignment guide" width={280} height={140} style={{ width: '100%', height: 'auto' }} unoptimized />
              </div>
            )}

            {/* Example photo overlay */}
            {showExample && (
              <div className={styles.exampleOverlay}>
                <Image src="/assets/images/close-bite-front.png" alt="Example: Front view" fill style={{ objectFit: 'cover' }} unoptimized />
              </div>
            )}
          </div>

          {/* Result badge on viewfinder */}
          {state === "pass" && <div className={styles.resultBadgePass}>✓ All checks passed</div>}
          {state === "warning" && <div className={styles.resultBadgeWarning}>⚠ Issues found</div>}

          {/* Pill outside viewfinder — no overflow clipping */}
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

      {/* See Example toggle — floats above the controls, out of the card flow */}
      {state === "idle" && (
        <button
          className={styles.exampleToggle}
          onClick={() => setShowExample(!showExample)}
          type="button"
        >
          {showExample ? "Hide Example" : "See Example"}
        </button>
      )}

      {/* Controls */}
      <div className={styles.controls}>
        {state === "idle" && (
          <>
            <button className={`${styles.controlBtn} ${styles.controlBtnTimer}`} aria-label="Choose from gallery" onClick={() => { void chooseFromGallery(); }}>
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
                  void analyzePhoto(reader.result as string);
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
            <button className={styles.retakeBtn} onClick={retake}>Retake Photo</button>
            <button className={styles.continueAnywayBtn} onClick={handleSubmitPhoto}>{submitting ? "Saving…" : "Continue Anyway"}</button>
          </div>
        )}
        {state === "pass" && (
          <div className={styles.submitRow}>
            <button className={styles.submitBtn} onClick={handleSubmitPhoto}>{submitting ? "Saving…" : "Submit Photo"}</button>
            <FlowSupport />
          </div>
        )}
      </div>

      {/* Contact support — only once a photo has been taken (analyzing/review),
          so the live capture screen stays clean. The submit state shows its own
          circle beside the CTA. */}
      {(state === "analyzing" || state === "warning") && (
        <div className={styles.supportDock}><FlowSupport /></div>
      )}
    </main>
  );
}
