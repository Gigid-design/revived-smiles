"use client";

import { useEffect, useState, useCallback } from "react";

interface Photo {
  url: string;
  label: string;
}

interface PhotoViewerProps {
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
}

export function PhotoViewer({ photos, initialIndex, onClose }: PhotoViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);

  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
    setZoomed(false);
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(photos.length - 1, i + 1));
    setZoomed(false);
  }, [photos.length]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) goPrev();
      if (e.key === "ArrowRight" && hasNext) goNext();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, hasPrev, hasNext, goPrev, goNext]);

  /* Prevent body scroll while lightbox is open */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (!photo) return null;

  return (
    <div className="pv-overlay" onClick={onClose}>
      <div className="pv-container" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="pv-close" onClick={onClose} aria-label="Close photo viewer">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* Navigation arrows */}
        {hasPrev && (
          <button className="pv-arrow pv-arrow--left" onClick={goPrev} aria-label="Previous photo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {hasNext && (
          <button className="pv-arrow pv-arrow--right" onClick={goNext} aria-label="Next photo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {/* Image */}
        <div className="pv-image-wrap" onClick={() => setZoomed((z) => !z)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt={photo.label}
            className={`pv-image ${zoomed ? "pv-image--zoomed" : ""}`}
          />
        </div>

        {/* Label + Counter */}
        <div className="pv-footer">
          <span className="pv-label">{photo.label}</span>
          <span className="pv-counter">{index + 1} / {photos.length}</span>
        </div>
      </div>

      <style jsx global>{`
        .pv-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pv-container {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          max-width: 90vw;
          max-height: 90vh;
        }
        .pv-close {
          position: fixed;
          top: 1rem;
          right: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          cursor: pointer;
          transition: background 0.15s;
          z-index: 10;
        }
        .pv-close:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .pv-arrow {
          position: fixed;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 50%;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          cursor: pointer;
          transition: background 0.15s;
          z-index: 10;
        }
        .pv-arrow:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .pv-arrow--left {
          left: 1rem;
        }
        .pv-arrow--right {
          right: 1rem;
        }
        .pv-image-wrap {
          cursor: zoom-in;
          display: flex;
          align-items: center;
          justify-content: center;
          max-height: 75vh;
          overflow: hidden;
        }
        .pv-image {
          max-width: 80vw;
          max-height: 75vh;
          object-fit: contain;
          border-radius: 8px;
          transition: transform 0.25s ease;
        }
        .pv-image--zoomed {
          transform: scale(1.8);
          cursor: zoom-out;
        }
        .pv-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          margin-top: 1rem;
          color: #ffffff;
        }
        .pv-label {
          font-family: var(--font-body);
          font-size: 0.875rem;
          font-weight: 500;
        }
        .pv-counter {
          font-family: var(--font-body);
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
        }
      `}</style>
    </div>
  );
}
