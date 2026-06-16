"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminUser, signOut } from "./AdminAuthGuard";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="7" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="12" width="7" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="2" width="7" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="10" width="7" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    label: "Submissions",
    href: "/admin/submissions",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 3h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 7h8M6 10h8M6 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "AI Prompts",
    href: "/admin/prompts",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 2l2.35 4.76 5.25.77-3.8 3.7.9 5.24L10 14.27l-4.7 2.2.9-5.24-3.8-3.7 5.25-.77L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "AI Advisor",
    href: "/admin/advisor",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 4h14a1 1 0 011 1v8a1 1 0 01-1 1H7l-4 3V5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="7" cy="9" r="1" fill="currentColor" />
        <circle cx="10" cy="9" r="1" fill="currentColor" />
        <circle cx="13" cy="9" r="1" fill="currentColor" />
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
      {/* Logo */}
      <div className="admin-sidebar__logo">
        <Image
          src="/assets/images/logo-revived-smiles.png"
          alt="Revived Smiles"
          width={140}
          height={40}
          style={{ objectFit: "contain", filter: "brightness(0) invert(1)" }}
          priority
        />
      </div>

      {/* Navigation */}
      <nav className="admin-sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`admin-sidebar__link ${isActive(item.href) ? "admin-sidebar__link--active" : ""}`}
          >
            <span className="admin-sidebar__icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom user area */}
      <div className="admin-sidebar__footer">
        <div className="admin-sidebar__avatar">{initials}</div>
        <div className="admin-sidebar__user">
          <span className="admin-sidebar__username">{user?.name ?? "Admin User"}</span>
          <span className="admin-sidebar__role">{user?.role ?? "Representative"}</span>
        </div>
        <button
          className="admin-sidebar__signout"
          onClick={signOut}
          title="Sign out"
          aria-label="Sign out"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 2H4a2 2 0 00-2 2v8a2 2 0 002 2h2M10.5 11.5L14 8l-3.5-3.5M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <style jsx global>{`
        .admin-sidebar {
          width: 240px;
          min-width: 240px;
          background: var(--admin-sidebar-bg);
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: sticky;
          top: 0;
        }
        .admin-sidebar__logo {
          padding: 1.5rem 1.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .admin-sidebar__nav {
          flex: 1;
          padding: 1rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .admin-sidebar__link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.625rem 0.75rem;
          border-radius: 8px;
          color: var(--admin-sidebar-text);
          font-size: 0.875rem;
          font-weight: 500;
          font-family: var(--font-body);
          text-decoration: none;
          transition: background 0.15s, color 0.15s;
        }
        .admin-sidebar__link:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff;
        }
        .admin-sidebar__link--active {
          background: rgba(25, 144, 198, 0.15);
          color: #ffffff;
          position: relative;
        }
        .admin-sidebar__link--active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 60%;
          background: var(--admin-sidebar-active);
          border-radius: 0 3px 3px 0;
        }
        .admin-sidebar__icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .admin-sidebar__footer {
          padding: 1rem 1.25rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .admin-sidebar__avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--admin-sidebar-active);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8125rem;
          font-weight: 600;
          font-family: var(--font-heading);
          flex-shrink: 0;
        }
        .admin-sidebar__user {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }
        .admin-sidebar__username {
          color: #ffffff;
          font-size: 0.8125rem;
          font-weight: 500;
          line-height: 1.2;
        }
        .admin-sidebar__role {
          color: var(--admin-sidebar-text);
          font-size: 0.6875rem;
          line-height: 1.2;
        }
        .admin-sidebar__signout {
          background: none;
          border: none;
          color: var(--admin-sidebar-text);
          cursor: pointer;
          padding: 0.375rem;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s, background 0.15s;
          flex-shrink: 0;
        }
        .admin-sidebar__signout:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
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
