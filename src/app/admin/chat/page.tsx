"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { ChatPanel } from "@/app/components/ChatPanel";
import { ChatPhotoLightbox } from "@/app/components/ChatPhotoLightbox";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminUser } from "../components/AdminAuthGuard";
import { api } from "@/lib/api";
import type { ChatMessage, MessagePhoto, Submission } from "@/lib/api";
import {
  archTag,
  productLabel,
  productLabels,
  productPriceCents,
  productsSubtotalCents,
  formatUsd,
} from "@/app/context/productConfig";

/** Impression-tray slots, in capture order, for the expandable order card. */
const IMPRESSION_LABELS = ["Upper Impression 1", "Upper Impression 2", "Lower Impression 1", "Lower Impression 2"];

/** The teeth charted for one product on an order — its own per-item chart when
    the order carries several appliances, else the order-level selection. */
function teethForProduct(sub: Submission, slug: string): number[] {
  return sub.itemDetails?.[slug]?.selectedTeeth ?? sub.selectedTeeth ?? [];
}

interface Conversation {
  sub: Submission;
  last: ChatMessage | null;
  unread: number;
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatWhen(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
  if (diffMin < 2880) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** MM/DD/YYYY, matching the order-context rail. */
function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

/** Preview text: the message body, or a hint that no one has written yet. */
function preview(last: ChatMessage | null): string {
  if (!last) return "No messages yet";
  const who = last.senderRole === "admin" ? "You: " : "";
  return `${who}${last.body.replace(/\n+/g, " ")}`;
}

/** Sort conversations with real activity first (newest reply on top), the
    rest by most recently submitted — the way a support inbox reads. */
function sortConversations(rows: Conversation[]): Conversation[] {
  return [...rows].sort((a, b) => {
    const at = a.last?.createdAt ?? "";
    const bt = b.last?.createdAt ?? "";
    if (at && bt) return bt.localeCompare(at);
    if (at) return -1;
    if (bt) return 1;
    return (b.sub.createdAt ?? "").localeCompare(a.sub.createdAt ?? "");
  });
}

export default function AdminChatPage() {
  const router = useRouter();
  const adminUser = useAdminUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState<"all" | "unassigned" | "mine">("all");
  /* Conversations this agent has claimed. Seeded from ones that already have
     activity; an agent claims an unassigned one by replying or "Assign to me". */
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  /* The order card starts collapsed; expanding it reveals the impression photos. */
  const [orderExpanded, setOrderExpanded] = useState(false);
  const [lightbox, setLightbox] = useState<{ photos: MessagePhoto[]; index: number } | null>(null);

  /* Build the inbox: every submission is a possible conversation, decorated
     with its last message and unread count. */
  const load = useCallback(async () => {
    try {
      const { rows } = await api.submissions.list({ page: 0, pageSize: 50 });
      const ids = rows.map((s) => s.id);
      const [unread, threads] = await Promise.all([
        api.messages.unreadCounts(ids),
        Promise.all(
          ids.map((id) =>
            api.messages
              .list(id)
              .then((ms) => [id, ms[ms.length - 1] ?? null] as const)
              .catch(() => [id, null] as const),
          ),
        ),
      ]);
      const lastById = new Map(threads);
      /* A conversation with any history is one an agent is already handling. */
      setAssigned((prev) => {
        const next = new Set(prev);
        for (const [id, last] of threads) if (last) next.add(id);
        return next;
      });
      setConversations(
        sortConversations(
          rows.map((sub) => ({
            sub,
            last: lastById.get(sub.id) ?? null,
            unread: unread[sub.id] ?? 0,
          })),
        ),
      );
    } catch (err) {
      console.error("Could not load conversations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(); // eslint-disable-line react-hooks/set-state-in-effect -- initial inbox load
  }, [load]);

  /* Honour a deep link (/admin/chat?id=sub-003) once, on mount. */
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) setSelectedId(id); // eslint-disable-line react-hooks/set-state-in-effect -- deep-link on mount
  }, []);

  const selectConversation = useCallback(
    (id: string) => {
      setSelectedId(id);
      setOrderExpanded(false);
      router.replace(`/admin/chat?id=${id}`, { scroll: false });
      /* Viewing clears the patient's unread replies (ChatPanel marks them read). */
      setConversations((prev) =>
        prev.map((c) => (c.sub.id === id ? { ...c, unread: 0 } : c)),
      );
    },
    [router],
  );

  /* Keep the open conversation's preview fresh as messages arrive/send.
     Replying to a conversation claims it for this agent. */
  useEffect(() => {
    if (!selectedId) return;
    const unsubscribe = api.messages.subscribe(selectedId, (msg) => {
      setConversations((prev) =>
        sortConversations(
          prev.map((c) => (c.sub.id === selectedId ? { ...c, last: msg } : c)),
        ),
      );
      if (msg.senderRole === "admin") {
        setAssigned((prev) => (prev.has(selectedId) ? prev : new Set(prev).add(selectedId)));
      }
    });
    return unsubscribe;
  }, [selectedId]);

  /* Claim an unassigned conversation. */
  const assignToMe = useCallback((id: string) => {
    setAssigned((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    setFolder("mine");
  }, []);

  const counts = useMemo(
    () => ({
      all: conversations.length,
      mine: conversations.filter((c) => assigned.has(c.sub.id)).length,
      unassigned: conversations.filter((c) => !assigned.has(c.sub.id)).length,
    }),
    [conversations, assigned],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter((c) => {
      const inFolder =
        folder === "all"
          ? true
          : folder === "mine"
            ? assigned.has(c.sub.id)
            : !assigned.has(c.sub.id);
      if (!inFolder) return false;
      if (!q) return true;
      return (
        (c.sub.name ?? "").toLowerCase().includes(q) ||
        c.sub.email.toLowerCase().includes(q) ||
        productLabels(c.sub.products ?? []).toLowerCase().includes(q)
      );
    });
  }, [conversations, query, folder, assigned]);

  const active = conversations.find((c) => c.sub.id === selectedId) ?? null;
  const activeAssigned = active ? assigned.has(active.sub.id) : false;

  return (
    <div className={styles.page}>
      <div className={styles.shell} data-has-order={active ? "" : undefined}>
        {/* ── Conversation list ── */}
        <aside className={styles.list}>
          <div className={styles.folders} role="tablist" aria-label="Conversation folders">
            <button
              type="button"
              role="tab"
              aria-selected={folder === "all"}
              className={`${styles.folderTab} ${folder === "all" ? styles.folderTabActive : ""}`}
              onClick={() => setFolder("all")}
            >
              All
              <span className={styles.folderCount}>{counts.all}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={folder === "unassigned"}
              className={`${styles.folderTab} ${folder === "unassigned" ? styles.folderTabActive : ""}`}
              onClick={() => setFolder("unassigned")}
            >
              Unassigned
              <span className={styles.folderCount}>{counts.unassigned}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={folder === "mine"}
              className={`${styles.folderTab} ${folder === "mine" ? styles.folderTabActive : ""}`}
              onClick={() => setFolder("mine")}
            >
              Assigned to me
              <span className={styles.folderCount}>{counts.mine}</span>
            </button>
          </div>

          <div className={styles.searchWrap}>
            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              className={styles.search}
              placeholder="Search conversations…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className={styles.listScroll}>
            {loading ? (
              <div className={styles.listEmpty}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div className={styles.listEmpty}>
                {query
                  ? "No conversations found."
                  : folder === "unassigned"
                    ? "No unassigned conversations."
                    : folder === "mine"
                      ? "Nothing assigned to you yet."
                      : "No conversations yet."}
              </div>
            ) : (
              filtered.map((c) => {
                const selected = c.sub.id === selectedId;
                return (
                  <button
                    key={c.sub.id}
                    type="button"
                    className={`${styles.row} ${selected ? styles.rowActive : ""}`}
                    onClick={() => selectConversation(c.sub.id)}
                  >
                    <div className={styles.avatar} aria-hidden>{initials(c.sub.name)}</div>
                    <div className={styles.rowBody}>
                      <div className={styles.rowTop}>
                        <span className={styles.rowName}>{c.sub.name || c.sub.email}</span>
                        <span className={styles.rowTime}>{formatWhen(c.last?.createdAt)}</span>
                      </div>
                      <div className={styles.rowMeta}>{productLabels(c.sub.products ?? []) || "—"}</div>
                      <div className={styles.rowBottom}>
                        <span className={styles.rowPreview}>{preview(c.last)}</span>
                        {c.unread > 0 && <span className={styles.unread}>{c.unread}</span>}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Active conversation ── */}
        <section className={styles.thread}>
          {!active ? (
            <div className={styles.threadEmpty}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1H9l-4 3.5V17H4a1 1 0 01-1-1V6a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
              <p className={styles.threadEmptyTitle}>Select a conversation</p>
              <p className={styles.threadEmptyHint}>Pick a patient on the left to view and reply.</p>
            </div>
          ) : (
            <>
              <header className={styles.threadHeader}>
                <div className={styles.threadHeaderMain}>
                  <div className={styles.avatarLg} aria-hidden>{initials(active.sub.name)}</div>
                  <div>
                    <h2 className={styles.threadName}>{active.sub.name || "—"}</h2>
                    <p className={styles.threadSub}>{active.sub.email}</p>
                  </div>
                </div>
                <div className={styles.threadHeaderMeta}>
                  <span className={styles.threadOrder}>
                    {productLabels(active.sub.products ?? []) || "—"}
                    {active.sub.orderNumber ? ` · ${active.sub.orderNumber}` : ""}
                  </span>
                  {activeAssigned ? (
                    <span className={styles.assignedTag}>Assigned to you</span>
                  ) : (
                    <button
                      type="button"
                      className={styles.assignBtn}
                      onClick={() => assignToMe(active.sub.id)}
                    >
                      Assign to me
                    </button>
                  )}
                  <StatusBadge status={active.sub.status} />
                </div>
              </header>

              <ChatPanel
                submissionId={active.sub.id}
                currentRole="admin"
                currentName={adminUser?.name ?? "Admin User"}
              />
            </>
          )}
        </section>

        {/* ── Order context — the order in view while chatting ── */}
        {active && (
          <aside className={styles.orderPanel}>
            <div className={styles.orderScroll}>
              {/* Customer */}
              <section className={styles.orderCard}>
                <div className={styles.orderCardHead}>
                  <span className={styles.orderCardTitle}>Customer</span>
                </div>
                <div className={styles.customerRow}>
                  <div className={styles.avatarLg} aria-hidden>{initials(active.sub.name)}</div>
                  <div className={styles.customerInfo}>
                    <span className={styles.customerName}>{active.sub.name || "—"}</span>
                    <span className={styles.customerEmail}>{active.sub.email}</span>
                  </div>
                </div>
                <dl className={styles.metaList}>
                  <div className={styles.metaRow}>
                    <dt>Total spent</dt>
                    <dd>{formatUsd(productsSubtotalCents(active.sub.products ?? []))}</dd>
                  </div>
                  <div className={styles.metaRow}>
                    <dt>Orders</dt>
                    <dd>1 order</dd>
                  </div>
                  <div className={styles.metaRow}>
                    <dt>State</dt>
                    <dd>{active.sub.state || "—"}</dd>
                  </div>
                  <div className={styles.metaRow}>
                    <dt>Created at</dt>
                    <dd>{formatDate(active.sub.createdAt)}</dd>
                  </div>
                </dl>
              </section>

              {/* Order */}
              <section className={styles.orderCard}>
                <div className={styles.orderCardHead}>
                  <span className={styles.orderCardTitle}>
                    Order {active.sub.orderNumber || "—"}
                  </span>
                  <StatusBadge status={active.sub.status} />
                </div>
                <p className={styles.orderMetaLine}>
                  {formatDate(active.sub.createdAt)} · {active.sub.products?.length ?? 0} item
                  {(active.sub.products?.length ?? 0) === 1 ? "" : "s"} ·{" "}
                  {formatUsd(productsSubtotalCents(active.sub.products ?? []))}
                </p>
                <ul className={styles.lineItems}>
                  {(active.sub.products ?? []).map((p) => {
                    const arch = archTag(p, teethForProduct(active.sub, p));
                    return (
                      <li key={p} className={styles.lineItem}>
                        <span className={styles.lineItemName}>
                          {productLabel(p)}
                          {arch && <span className={styles.archTag}>{arch}</span>}
                        </span>
                        <span className={styles.lineItemPrice}>{formatUsd(productPriceCents(p))}</span>
                      </li>
                    );
                  })}
                </ul>

                {/* Expand to reveal the impression photos without leaving chat. */}
                {(() => {
                  const photos: MessagePhoto[] = (active.sub.impressionPhotos ?? []).map((url, i) => ({
                    url,
                    label: IMPRESSION_LABELS[i] || `Impression ${i + 1}`,
                  }));
                  if (photos.length === 0) return null;
                  return (
                    <>
                      <button
                        type="button"
                        className={styles.expandBtn}
                        aria-expanded={orderExpanded}
                        onClick={() => setOrderExpanded((v) => !v)}
                      >
                        {orderExpanded ? "Hide" : "View"} impression photos ({photos.length})
                        <svg
                          className={styles.expandChevron}
                          data-open={orderExpanded || undefined}
                          width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden
                        >
                          <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {orderExpanded && (
                        <div className={styles.photoGrid}>
                          {photos.map((photo, i) => (
                            <button
                              key={`${photo.url}-${i}`}
                              type="button"
                              className={styles.photoThumb}
                              onClick={() => setLightbox({ photos, index: i })}
                              title={`${photo.label} — click to expand`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element -- stand-in demo asset */}
                              <img src={photo.url} alt={photo.label} />
                              <span className={styles.photoThumbLabel}>{photo.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </section>

              {/* Shipping — the fulfilment data Gitai asked to see beside chat. */}
              <section className={styles.orderCard}>
                <div className={styles.orderCardHead}>
                  <span className={styles.orderCardTitle}>Shipping</span>
                </div>
                <dl className={styles.metaList}>
                  <div className={styles.metaRow}>
                    <dt>Tracking</dt>
                    <dd>{active.sub.trackingNumber || "—"}</dd>
                  </div>
                  <div className={styles.metaRow}>
                    <dt>Shipped</dt>
                    <dd>{active.sub.shippedAt ? formatDate(active.sub.shippedAt) : "—"}</dd>
                  </div>
                  <div className={styles.metaRow}>
                    <dt>Delivered</dt>
                    <dd>{active.sub.completedAt ? formatDate(active.sub.completedAt) : "—"}</dd>
                  </div>
                </dl>
              </section>

              {/* Impression review */}
              <section className={styles.orderCard}>
                <div className={styles.orderCardHead}>
                  <span className={styles.orderCardTitle}>Impression Review</span>
                </div>
                <div className={styles.metaRow}>
                  <dt>Status</dt>
                  <dd><StatusBadge status={active.sub.status} /></dd>
                </div>
                {active.sub.reviewedBy && (
                  <p className={styles.reviewedLine}>
                    Reviewed by {active.sub.reviewedBy}
                    {active.sub.reviewedAt ? ` · ${formatDate(active.sub.reviewedAt)}` : ""}
                  </p>
                )}
                <a href={`/admin/submissions/${active.sub.id}?from=chat`} className={styles.orderLink}>
                  Open full submission →
                </a>
              </section>
            </div>
          </aside>
        )}
      </div>

      {lightbox && (
        <ChatPhotoLightbox
          photos={lightbox.photos}
          index={lightbox.index}
          onIndexChange={(index) => setLightbox((prev) => (prev ? { ...prev, index } : prev))}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
