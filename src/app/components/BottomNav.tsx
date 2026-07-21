"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";

const TABS = [
  {
    href: "/dashboard",
    label: "Home",
    match: (p: string) => p === "/dashboard",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M11.3 2.53a1 1 0 0 1 1.4 0l8 7.7a1 1 0 0 1 .3.72V20a1.5 1.5 0 0 1-1.5 1.5H15a1 1 0 0 1-1-1v-5h-4v5a1 1 0 0 1-1 1H4.5A1.5 1.5 0 0 1 3 20v-9.05a1 1 0 0 1 .3-.72z" />
      </svg>
    ),
  },
  {
    href: "/my-order",
    label: "My Order",
    match: (p: string) => p === "/my-order",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12.6 2.6A2 2 0 0 0 11.2 2H4.6A2.6 2.6 0 0 0 2 4.6v6.6a2 2 0 0 0 .59 1.41l8.2 8.2a2.4 2.4 0 0 0 3.4 0l6.42-6.42a2.4 2.4 0 0 0 0-3.4z" />
        <circle cx="7.4" cy="7.4" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/messages",
    label: "Messages",
    match: (p: string) => p.startsWith("/messages"),
    icon: (
      /* Bubble uses currentColor like the other two tabs, so it inherits the
         nav's colour and any active state. It was hardcoded to #F1F3F8 —
         near-white on a white nav, which made it all but invisible. The dots
         are knocked out of the bubble and read as the nav behind them. */
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M11.9968 0.079958C13.7907 0.0789388 15.5617 0.482817 17.1778 1.26149C18.794 2.04019 20.2136 3.17366 21.3308 4.57737C22.4478 5.98108 23.2338 7.61884 23.6298 9.36856C24.026 11.1183 24.0219 12.9349 23.6183 14.6828C23.2146 16.4308 22.4216 18.0651 21.2982 19.464C20.175 20.8628 18.7505 21.99 17.1309 22.7618C15.5114 23.5334 13.7385 23.9295 11.9446 23.9206C10.2459 23.9122 8.5697 23.5409 7.02801 22.8327L1.08633 23.9071C0.782758 23.9619 0.473103 23.8495 0.275526 23.6126C0.0779508 23.3756 0.0229359 23.0508 0.131475 22.7621L1.83587 18.2275C0.789559 16.5195 0.189178 14.5731 0.0936243 12.5677C-0.00899774 10.4139 0.474497 8.2726 1.49261 6.37187C2.51073 4.47114 4.02534 2.88215 5.87512 1.77415C7.72482 0.666191 9.84066 0.0806764 11.9968 0.079958ZM6.474 11.9977L6.47479 12.0003L6.474 12.003L6.47304 12.0047L6.47136 12.0056L6.46871 12.0064L6.46607 12.0056L6.46439 12.0047L6.46343 12.003L6.46264 12.0003L6.46343 11.9977L6.46439 11.996L6.46607 11.9951L6.46871 11.9943L6.47136 11.9951L6.47304 11.996L6.474 11.9977ZM6.46871 10.2922C5.52532 10.2922 4.76056 11.057 4.76056 12.0003C4.76056 12.9437 5.52532 13.7085 6.46871 13.7085C7.41211 13.7085 8.17687 12.9437 8.17687 12.0003C8.17687 11.057 7.41211 10.2922 6.46871 10.2922ZM12.0064 12.0003L12.0056 11.9977L12.0047 11.996L12.003 11.9951L12.0003 11.9943L11.9977 11.9951L11.996 11.996L11.9951 11.9977L11.9943 12.0003L11.9951 12.003L11.996 12.0047L11.9977 12.0056L12.0003 12.0064L12.003 12.0056L12.0047 12.0047L12.0056 12.003L12.0064 12.0003ZM10.2922 12.0003C10.2922 11.057 11.0569 10.2922 12.0003 10.2922C12.9437 10.2922 13.7085 11.057 13.7085 12.0003C13.7085 12.9437 12.9437 13.7085 12.0003 13.7085C11.0569 13.7085 10.2922 12.9437 10.2922 12.0003ZM17.5373 11.9977L17.5381 12.0003L17.5373 12.003L17.5362 12.0047L17.5347 12.0056L17.5319 12.0064L17.5294 12.0056L17.5277 12.0047L17.5266 12.003L17.5259 12.0003L17.5266 11.9977L17.5277 11.996L17.5294 11.9951L17.5319 11.9943L17.5347 11.9951L17.5362 11.996L17.5373 11.9977ZM17.5319 10.2922C16.5886 10.2922 15.8238 11.057 15.8238 12.0003C15.8238 12.9437 16.5886 13.7085 17.5319 13.7085C18.4753 13.7085 19.2401 12.9437 19.2401 12.0003C19.2401 11.057 18.4753 10.2922 17.5319 10.2922Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
];

export function BottomNav({ messagesBadge = 0 }: { messagesBadge?: number }) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      {TABS.map((tab) => {
        const isActive = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.tab} ${isActive ? styles.active : ""}`}
            aria-label={tab.label}
          >
            <span className={`${styles.icon} ${tab.label === "Messages" ? styles.iconMsg : ""}`}>
              {tab.icon}
              {tab.label === "Messages" && messagesBadge > 0 && (
                <span className={styles.badge}>{messagesBadge > 9 ? "9+" : messagesBadge}</span>
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
