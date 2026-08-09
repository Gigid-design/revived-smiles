"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/submissions": "Submissions",
  "/admin/adjustments": "Adjustment Requests",
};

interface AdminTopbarProps {
  onRefresh?: () => void;
  newSubmission?: { name: string; id: string } | null;
  onDismissNewSubmission?: () => void;
}

export function AdminTopbar({ onRefresh, newSubmission, onDismissNewSubmission }: AdminTopbarProps) {
  const pathname = usePathname();

  /* Derive page title from route */
  const title =
    PAGE_TITLES[pathname] ??
    (pathname.startsWith("/admin/submissions/")
      ? "Submission Detail"
      : pathname.startsWith("/admin/adjustments/")
        ? "Adjustment Detail"
        : "Admin");

  return (
    <header className="admin-topbar">
      <h1 className="admin-topbar__title">{title}</h1>

      <div className="admin-topbar__actions">
        {/* Refresh button */}
        {onRefresh && (
          <button
            className="admin-topbar__refresh"
            onClick={onRefresh}
            title="Refresh data"
            aria-label="Refresh data"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 8a6 6 0 0110.5-4M14 8a6 6 0 01-10.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M12.5 1v3h-3M3.5 15v-3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* Search */}
        <div className="admin-topbar__search">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search submissions…"
            className="admin-topbar__input"
            aria-label="Search submissions"
          />
        </div>
      </div>

      {/* New submission toast */}
      {newSubmission && (
        <div className="admin-topbar__toast">
          <span className="admin-topbar__toast-dot" />
          <span>New submission from <strong>{newSubmission.name}</strong></span>
          {newSubmission.id && (
            <Link
              href={`/admin/submissions/${newSubmission.id}`}
              className="admin-topbar__toast-link"
              onClick={onDismissNewSubmission}
            >
              View →
            </Link>
          )}
          <button
            className="admin-topbar__toast-close"
            onClick={onDismissNewSubmission}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <style jsx global>{`
        .admin-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 2rem;
          background: var(--admin-card-bg);
          border-bottom: 1px solid var(--admin-card-border);
          min-height: 64px;
          position: relative;
        }
        .admin-topbar__title {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0;
        }
        .admin-topbar__actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .admin-topbar__refresh {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid var(--admin-card-border);
          background: var(--admin-bg);
          color: var(--admin-text-muted);
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }
        .admin-topbar__refresh:hover {
          border-color: var(--admin-primary);
          color: var(--admin-primary);
        }
        .admin-topbar__search {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: var(--admin-bg);
          border: 1px solid var(--admin-card-border);
          border-radius: 8px;
          color: var(--admin-text-muted);
          min-width: 240px;
        }
        .admin-topbar__input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 0.8125rem;
          font-family: var(--font-body);
          color: var(--admin-text);
          flex: 1;
          min-width: 0;
        }
        .admin-topbar__input::placeholder {
          color: var(--admin-text-muted);
        }
        /* Toast banner */
        .admin-topbar__toast {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 2rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: #dbeafe;
          border: 1px solid #93c5fd;
          border-radius: 8px;
          font-size: 0.8125rem;
          font-family: var(--font-body);
          color: #1e40af;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          z-index: 100;
          animation: toastSlideIn 0.3s ease;
        }
        .admin-topbar__toast-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #3b82f6;
          flex-shrink: 0;
        }
        .admin-topbar__toast-link {
          font-weight: 600;
          color: #1e40af;
          text-decoration: none;
          white-space: nowrap;
        }
        .admin-topbar__toast-link:hover {
          text-decoration: underline;
        }
        .admin-topbar__toast-close {
          background: none;
          border: none;
          color: #1e40af;
          font-size: 1.125rem;
          cursor: pointer;
          padding: 0 0.25rem;
          line-height: 1;
        }
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(-0.5rem); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          .admin-topbar {
            padding: 1rem;
          }
          .admin-topbar__search {
            min-width: 0;
            flex: 1;
          }
        }
      `}</style>
    </header>
  );
}
