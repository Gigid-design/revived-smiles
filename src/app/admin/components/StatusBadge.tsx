"use client";

type SubmissionStatus =
  | "pending"
  | "in_review"
  | "approved"
  | "rejected"
  | "changes_requested"
  | "in_fabrication"
  | "shipped"
  | "completed";

interface StatusBadgeProps {
  status: SubmissionStatus;
}

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; bg: string; text: string }> = {
  pending: { label: "Pending", bg: "#fef3c7", text: "#92400e" },
  in_review: { label: "In Review", bg: "#dbeafe", text: "#1e40af" },
  approved: { label: "Approved", bg: "#dcfce7", text: "#166534" },
  rejected: { label: "Rejected", bg: "#fee2e2", text: "#991b1b" },
  changes_requested: { label: "Changes Requested", bg: "#ffedd5", text: "#9a3412" },
  in_fabrication: { label: "In Fabrication", bg: "#e0e7ff", text: "#3730a3" },
  shipped: { label: "Shipped", bg: "#cffafe", text: "#155e75" },
  completed: { label: "Completed", bg: "#dcfce7", text: "#14532d" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

  return (
    <span
      className="status-badge"
      style={{ background: config.bg, color: config.text }}
    >
      {config.label}

      <style jsx global>{`
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.625rem;
          border-radius: 9999px;
          font-family: var(--font-body);
          font-size: 0.6875rem;
          font-weight: 600;
          letter-spacing: 0.01em;
          white-space: nowrap;
          line-height: 1.4;
        }
      `}</style>
    </span>
  );
}
