"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminUser, signOut } from "./AdminAuthGuard";

/* Icons share one optical grid: 24×24 viewBox, ~18px content extent,
   1.8 stroke, round caps/joins — so every glyph renders the same size. */
const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  xmlns: "http://www.w3.org/2000/svg",
};

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
        <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
        <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
      </svg>
    ),
  },
  /* Submissions retired from the nav (Aug 13 session): the chat view now carries
     the full submission detail + actions. The /admin/submissions routes still
     exist as a fallback (linked from Dashboard "Full record") until testing
     confirms they're unneeded. */
  {
    label: "Adjustments",
    href: "/admin/adjustments",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M3.5 6h9.5M16.5 6h4M3.5 12h4M11 12h9.5M3.5 18h9.5M16.5 18h4" />
        <circle cx="14.5" cy="6" r="2" />
        <circle cx="9" cy="12" r="2" />
        <circle cx="14.5" cy="18" r="2" />
      </svg>
    ),
  },
  {
    label: "Chat",
    href: "/admin/chat",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M20.5 15.5A1.5 1.5 0 0 1 19 17H8l-4.5 3.8V5.5A1.5 1.5 0 0 1 5 4h14a1.5 1.5 0 0 1 1.5 1.5z" />
        <path d="M8 9h8M8 12.5h5.5" />
      </svg>
    ),
  },
  {
    label: "AI Prompts",
    href: "/admin/prompts",
    icon: (
      <svg {...ICON_PROPS}>
        <polygon points="12,3.5 14.63,8.82 20.5,9.68 16.25,13.82 17.25,19.67 12,16.9 6.75,19.67 7.75,13.82 3.5,9.68 9.37,8.82" />
      </svg>
    ),
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const user = useAdminUser();

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "A";

  return (
    <aside className="admin-sidebar">
      {/* Brand mark */}
      <div className="admin-sidebar__brand">
        <Link href="/admin" className="admin-sidebar__brandBadge" aria-label="Revived Smiles — Dashboard">
          <Image
            className="admin-sidebar__brandMark"
            src="/assets/images/logo-tooth-mark.png"
            alt="Revived Smiles"
            width={38}
            height={38}
            priority
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="admin-sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={`admin-sidebar__link ${isActive(item.href) ? "admin-sidebar__link--active" : ""}`}
          >
            <span className="admin-sidebar__icon">{item.icon}</span>
            <span className="admin-sidebar__label">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom user area */}
      <div className="admin-sidebar__footer">
        <div className="admin-sidebar__avatar" title={user?.name ?? "Admin User"}>{initials}</div>
        <button
          className="admin-sidebar__signout"
          onClick={signOut}
          title="Sign out"
          aria-label="Sign out"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M6 2H4a2 2 0 00-2 2v8a2 2 0 002 2h2M10.5 11.5L14 8l-3.5-3.5M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <style jsx global>{`
        .admin-sidebar {
          width: 96px;
          min-width: 96px;
          background: var(--admin-sidebar-bg);
          border-right: 1px solid var(--admin-card-border);
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100vh;
          position: sticky;
          top: 0;
        }
        .admin-sidebar__brand {
          padding: 1rem 0;
          display: flex;
          justify-content: center;
        }
        .admin-sidebar__brandBadge {
          width: 44px;
          height: 44px;
          background: transparent;
          color: var(--admin-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: transform 0.15s;
        }
        .admin-sidebar__brandBadge:hover {
          transform: translateY(-1px);
        }
        .admin-sidebar__brandMark {
          width: 38px;
          height: 38px;
        }
        .admin-sidebar__nav {
          flex: 1;
          width: 100%;
          padding: 0.75rem 0.625rem;
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }
        .admin-sidebar__link {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.9375rem 0.375rem;
          border-radius: 16px;
          color: var(--admin-sidebar-text);
          text-decoration: none;
          transition: background 0.15s, color 0.15s;
        }
        .admin-sidebar__label {
          font-size: 0.625rem;
          font-weight: 500;
          font-family: var(--font-body);
          letter-spacing: 0.02em;
          line-height: 1.2;
          text-align: center;
        }
        .admin-sidebar__link:hover {
          background: rgba(0, 0, 0, 0.055);
          color: var(--admin-text);
        }
        .admin-sidebar__link--active {
          background: rgba(0, 0, 0, 0.055);
          color: var(--admin-text);
        }
        .admin-sidebar__link--active:hover {
          background: rgba(0, 0, 0, 0.085);
          color: var(--admin-text);
        }
        .admin-sidebar__icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .admin-sidebar__icon svg {
          width: 22px;
          height: 22px;
          display: block;
        }
        .admin-sidebar__footer {
          width: 100%;
          padding: 0.75rem 0.5rem 1rem;
          border-top: 1px solid var(--admin-card-border);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .admin-sidebar__avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--admin-primary);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8125rem;
          font-weight: 600;
          font-family: var(--font-heading);
          flex-shrink: 0;
        }
        .admin-sidebar__signout {
          background: none;
          border: none;
          color: var(--admin-sidebar-text);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s, background 0.15s;
          flex-shrink: 0;
        }
        .admin-sidebar__signout:hover {
          color: var(--admin-text);
          background: var(--admin-bg);
        }
        @media (max-width: 768px) {
          .admin-sidebar {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
}
