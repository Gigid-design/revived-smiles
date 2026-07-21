"use client";

import { useState } from "react";
import { PRODUCTS, CATEGORY_LABELS, type ProductConfig } from "@/app/context/productConfig";
import type { Submission } from "@/lib/api";

interface CompletenessCheckProps {
  submission: Submission;
  defaultOpen?: boolean;
}

type CheckStatus = "pass" | "warn" | "fail";

interface CheckItem {
  label: string;
  detail: string;
  status: CheckStatus;
}

interface CheckGroup {
  title: string;
  status: CheckStatus;
  items: CheckItem[];
}

function resolveProducts(ids: string[]): ProductConfig[] {
  return ids.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean) as ProductConfig[];
}

export function CompletenessCheck({ submission, defaultOpen = true }: CompletenessCheckProps) {
  const [open, setOpen] = useState(defaultOpen);

  const configs = resolveProducts(submission.products);
  const needsShade = configs.some((c) => c.needsShade);
  const needsTeethChart = configs.some((c) => c.needsTeethChart);

  const groups: CheckGroup[] = [];

  /* ---- Patient Information ---- */
  const patientItems: CheckItem[] = [
    {
      label: "Name",
      detail: submission.name || "—",
      status: submission.name ? "pass" : "fail",
    },
    {
      label: "Email",
      detail: submission.email || "—",
      status: submission.email ? "pass" : "fail",
    },
    {
      label: "State",
      detail: submission.state || "—",
      status: submission.state ? "pass" : "fail",
    },
  ];
  const patientStatus: CheckStatus = patientItems.every((i) => i.status === "pass") ? "pass" : "fail";
  groups.push({ title: "Patient Information", status: patientStatus, items: patientItems });

  /* ---- Products ---- */
  const productLabels = configs.map((c) => `${c.label} (${CATEGORY_LABELS[c.category]})`);
  const productItems: CheckItem[] = [
    {
      label: "Products selected",
      detail: productLabels.length > 0 ? productLabels.join(", ") : "None",
      status: productLabels.length > 0 ? "pass" : "fail",
    },
  ];

  if (needsShade) {
    productItems.push({
      label: "White shade",
      detail: submission.whiteShade || "Not provided",
      status: submission.whiteShade ? "pass" : "fail",
    });
    productItems.push({
      label: "Gum shade",
      detail: submission.gumShade || "Not provided",
      status: submission.gumShade ? "pass" : "fail",
    });
  }

  if (needsTeethChart) {
    const teethInfo = submission.selectedTeeth?.length
      ? `Teeth: ${submission.selectedTeeth.join(", ")}`
      : submission.teethNotSure
        ? "Not sure (requested help)"
        : "Not provided";
    productItems.push({
      label: "Teeth selection",
      detail: teethInfo,
      status: submission.selectedTeeth?.length || submission.teethNotSure ? "pass" : "fail",
    });
  }

  const prodStatus: CheckStatus = productItems.every((i) => i.status === "pass") ? "pass" : "fail";
  groups.push({
    title: `Products: ${productLabels.join(", ") || "None"}`,
    status: prodStatus,
    items: productItems,
  });

  /* ---- Photos ---- */
  const closeBiteCount = (submission.closeBitePhotos ?? []).filter(Boolean).length;
  const openBiteCount = (submission.openBitePhotos ?? []).filter(Boolean).length;
  const impressionCount = (submission.impressionPhotos ?? []).filter(Boolean).length;

  const photoItems: CheckItem[] = [
    {
      label: "Close bite",
      detail: `${closeBiteCount} photo${closeBiteCount !== 1 ? "s" : ""}`,
      status: closeBiteCount > 0 ? "pass" : "warn",
    },
    {
      label: "Open bite",
      detail: `${openBiteCount} photo${openBiteCount !== 1 ? "s" : ""}`,
      status: openBiteCount > 0 ? "pass" : "warn",
    },
    {
      label: "Impressions",
      detail: `${impressionCount} of 4`,
      status: impressionCount === 4 ? "pass" : impressionCount > 0 ? "warn" : "fail",
    },
  ];

  const photoStatus: CheckStatus = photoItems.every((i) => i.status === "pass")
    ? "pass"
    : photoItems.some((i) => i.status === "fail")
      ? "fail"
      : "warn";
  groups.push({ title: "Photos", status: photoStatus, items: photoItems });

  /* ---- Verdict ---- */
  const allStatuses = groups.map((g) => g.status);
  const verdict: { label: string; color: string } = allStatuses.every((s) => s === "pass")
    ? { label: "Ready for Review", color: "var(--admin-success)" }
    : allStatuses.some((s) => s === "fail")
      ? { label: "Missing Required Fields", color: "var(--admin-danger)" }
      : { label: "Incomplete Submission", color: "#f97316" };

  const statusIcon = (s: CheckStatus) =>
    s === "pass" ? "✓" : s === "warn" ? "⚠" : "✗";

  const statusColor = (s: CheckStatus) =>
    s === "pass" ? "var(--admin-success)" : s === "warn" ? "#f97316" : "var(--admin-danger)";

  return (
    <div className="cc-card">
      <button className="cc-header" onClick={() => setOpen(!open)}>
        <div className="cc-header__left">
          <span className="cc-verdict-dot" style={{ background: verdict.color }} />
          <span className="cc-header__title">Completeness Check</span>
          <span className="cc-verdict-label" style={{ color: verdict.color }}>{verdict.label}</span>
        </div>
        <svg
          className={`cc-chevron ${open ? "cc-chevron--open" : ""}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="cc-body">
          {groups.map((group) => (
            <div key={group.title} className="cc-group">
              <div className="cc-group__header">
                <span className="cc-status-icon" style={{ color: statusColor(group.status) }}>
                  {statusIcon(group.status)}
                </span>
                <span className="cc-group__title">{group.title}</span>
              </div>
              <div className="cc-group__items">
                {group.items.map((item) => (
                  <div key={item.label} className="cc-item">
                    <span className="cc-item__icon" style={{ color: statusColor(item.status) }}>
                      {statusIcon(item.status)}
                    </span>
                    <span className="cc-item__label">{item.label}:</span>
                    <span className="cc-item__detail">{item.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        .cc-card {
          background: var(--admin-card-bg);
          border: 1px solid var(--admin-card-border);
          border-radius: 12px;
          overflow: hidden;
        }
        .cc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 1rem 1.25rem;
          background: none;
          border: none;
          cursor: pointer;
          font-family: var(--font-heading);
          color: var(--admin-text);
        }
        .cc-header__left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .cc-verdict-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .cc-header__title {
          font-size: 0.9375rem;
          font-weight: 600;
        }
        .cc-verdict-label {
          font-size: 0.75rem;
          font-weight: 500;
          font-family: var(--font-body);
        }
        .cc-chevron {
          color: var(--admin-text-muted);
          transition: transform 0.2s;
          flex-shrink: 0;
        }
        .cc-chevron--open {
          transform: rotate(180deg);
        }
        .cc-body {
          padding: 0 1.25rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .cc-group {
          padding: 0.75rem;
          background: var(--admin-bg);
          border-radius: 8px;
        }
        .cc-group__header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .cc-status-icon {
          font-size: 0.875rem;
          font-weight: 700;
          flex-shrink: 0;
          width: 1.125rem;
          text-align: center;
        }
        .cc-group__title {
          font-family: var(--font-heading);
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--admin-text);
        }
        .cc-group__items {
          padding-left: 1.625rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .cc-item {
          display: flex;
          align-items: baseline;
          gap: 0.375rem;
          font-size: 0.75rem;
          color: var(--admin-text);
          line-height: 1.5;
        }
        .cc-item__icon {
          font-size: 0.6875rem;
          font-weight: 700;
          width: 1rem;
          text-align: center;
          flex-shrink: 0;
        }
        .cc-item__label {
          font-weight: 500;
          color: var(--admin-text-muted);
          white-space: nowrap;
        }
        .cc-item__detail {
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
