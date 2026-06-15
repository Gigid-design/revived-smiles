"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useEffect, useState, useCallback } from "react";
import styles from "./page.module.css";
import { usePageTransition } from "../hooks/usePageTransition";

type State = "idle" | "analyzing" | "pass" | "fail";

interface Check {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
}

interface PillState {
  label: string;
  detail: string;
  status: "idle" | "checking" | "pass" | "fail" | "allpass" | "allfail";
}

const FALLBACK_CHECK_IDS = ["mouth_open", "side_angle", "side_teeth_visible", "blur", "lighting", "framing", "glare"];

const TIPS: Record<string, string> = {
  mouth_open:          "Open your mouth as wide as you comfortably can — we need to see inside.",
  side_angle:          "Turn your head so the camera sees your left-side teeth clearly.",
  side_teeth_visible:  "Open wider and pull your cheek back to show the left-side teeth.",
  blur:                "Hold steady — press your elbows against your body or rest your hand on a surface.",
  lighting:            "Move near a window or turn on the room lights for better brightness.",
  framing:             "Move closer — your teeth should fill most of the frame.",
  glare:               "Turn off flash and use soft natural light to avoid reflections on your teeth.",
};

export default function OpenBite2() {
  const { navigate } = usePageTransition();
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
    startCamera(facingMode);
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
      setState("fail");
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
        body: JSON.stringify({ imageBase64: base64, photoType: "open-bite-left" }),
      });
      const data = await res.json();
      if (data.teethCenter) setTeethCenter(data.teethCenter);
      await runChecks(data.checks);
    } catch {
      const fallback: Check[] = FALLBACK_CHECK_IDS.map((id) => ({
        id, label: id, pass: false, detail: "Could not analyze. Try again.",
      }));
      await runChecks(fallback);
    }
  };

  return (
    <main className={styles.screen}>
      <a href="#main-content" className="sr-only">Skip to main content</a>

      <div className={styles.bg} aria-hidden="true">
        <Image src="/assets/images/intake-bg.png" alt="" fill style={{ objectFit: "cover" }} priority sizes="430px" />
      </div>
      <div className={styles.bgOverlay} aria-hidden="true">
        <Image src="/assets/images/intake-card-bg.png" alt="" fill style={{ objectFit: "cover", objectPosition: "center top" }} priority sizes="430px" />
      </div>

      {/* Progress bar */}
      <svg className={styles.progressBar} viewBox="0 0 395 5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Photo step" role="progressbar">
        <rect x="0"   width="23"  height="5" rx="2.5" fill="#0E184D"/>
        <rect x="31"  width="302" height="5" rx="2.5" fill="white"/>
        <rect x="31"  width="302" height="5" rx="2.5" fill="#0E184D"/>
        <rect x="341" width="23"  height="5" rx="2.5" fill="white"/>
        <rect x="372" width="23"  height="5" rx="2.5" fill="white"/>
      </svg>

      {/* Nav bar */}
      <nav className={styles.navBar}>
        <button className={styles.navBtn} aria-label="Go back" onClick={() => navigate('/open-bite', 'backward')}>
          <Image src="/assets/images/camera-icon-back.svg" alt="" width={20} height={20} unoptimized />
        </button>
        <span className={styles.navTitle}>Mouth Angles - Open Bite</span>
        <Link href="/" className={styles.navBtn} aria-label="Close">
          <Image src="/assets/images/camera-icon-close.svg" alt="" width={20} height={20} unoptimized />
        </Link>
      </nav>

      {/* Timeline */}
      <Image
        src="/assets/images/camera-timeline.svg"
        alt="Steps: Front, Left side"
        width={430} height={64}
        className={styles.timeline}
        unoptimized priority
      />

      {/* White card */}
      <div className={styles.card} id="main-content">

        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderText}>
            <h1 className={styles.cardTitle}>Open bite — Left side</h1>
            <p className={styles.cardSubtitle}>
              {state === "idle" && "Turn your head slightly right so the left side of your teeth is visible"}
              {state === "analyzing" && "AI is scanning your photo…"}
              {state === "pass" && "All checks passed! Ready to submit."}
              {state === "fail" && "A few things need fixing. Retake to try again."}
            </p>
          </div>
        </div>

        {state === "idle" && (
          <Image src="/assets/images/camera-tutorial-btn.svg" alt="Tutorial" width={73} height={64} className={styles.tutorialBtn} unoptimized />
        )}

        {/* Viewfinder wrap */}
        <div className={styles.viewfinderWrap}>
          <div className={`${styles.viewfinder} ${(state === "pass" || state === "fail") ? styles.viewfinderShrunk : ""}`} aria-label="Camera viewfinder">
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
                <div className={styles.examplePlaceholder}>
                  <span className={styles.examplePlaceholderText}>Example: Open bite left side</span>
                  <span className={styles.examplePlaceholderSub}>Mouth open, left teeth visible</span>
                </div>
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
          {state === "fail" && <div className={styles.resultBadgeFail}>✕ Check failed</div>}

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
                {pill.status === "fail" && <span className={styles.scanIconFail}>✕</span>}
                {pill.status === "allpass" && <span className={styles.scanIconPass}>✓</span>}
                {pill.status === "allfail" && <span className={styles.scanIconFail}>✕</span>}
              </div>
              <div className={styles.scanPillText}>
                <span className={styles.scanPillLabel}>{pill.label}</span>
                {pill.detail ? <span className={styles.scanPillDetail}>{pill.detail}</span> : null}
              </div>
            </div>
          )}
        </div>

        {/* Check results list */}
        {(state === "pass" || state === "fail") && checks.length > 0 && (
          <div className={styles.checkList}>
            {checks.map(c => (
              <div key={c.id} className={`${styles.checkPill} ${c.pass ? styles.checkPillPass : styles.checkPillFail}`}>
                <div className={styles.checkPillIcon}>
                  {c.pass ? <span className={styles.checkIconPass}>✓</span> : <span className={styles.checkIconFail}>✕</span>}
                </div>
                <div className={styles.checkPillBody}>
                  <span className={styles.checkPillLabel}>{c.label}</span>
                  <span className={styles.checkPillDetail}>{c.detail}</span>
                </div>
                <span className={styles.checkPillStatus}>{c.pass ? "Pass" : "Fail"}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tip card — fail state */}
        {state === "fail" && tip && (
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
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#0e1b4d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                    body: JSON.stringify({ imageBase64: base64, photoType: "open-bite-left" }),
                  })
                    .then((res) => res.json())
                    .then((data) => {
                      if (data.teethCenter) setTeethCenter(data.teethCenter);
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
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#0e1b4d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        {state === "fail" && (
          <button className={styles.retakeBtn} onClick={() => {
            setCapturedImage(null);
            setPill(null);
            setTip(null);
            setState("idle");
          }}>Retake Photo</button>
        )}
        {state === "pass" && (
          <button className={styles.submitBtn} onClick={() => {
            // Save open bite left side photo to localStorage
            if (capturedImage) {
              try {
                const stored = JSON.parse(localStorage.getItem('rs_openBitePhotos') || '[]');
                stored[1] = capturedImage;
                localStorage.setItem('rs_openBitePhotos', JSON.stringify(stored));
              } catch {}
            }
            navigate('/instructions', 'forward');
          }}>Submit Photo</button>
        )}
      </div>
    </main>
  );
}
