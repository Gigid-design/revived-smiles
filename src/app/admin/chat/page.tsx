"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { ChatPanel } from "@/app/components/ChatPanel";
import { ChatPhotoLightbox } from "@/app/components/ChatPhotoLightbox";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminUser } from "../components/AdminAuthGuard";
import { api, ApiError } from "@/lib/api";
import type { ChatMessage, Insurance, Invoice, MessagePhoto, Submission, SubmissionStatus } from "@/lib/api";
import {
  archTag,
  productLabel,
  productLabels,
  productPriceCents,
  productsSubtotalCents,
  formatUsd,
} from "@/app/context/productConfig";

/** Photo slot labels, in capture order, for the expandable photo strip. */
const IMPRESSION_LABELS = ["Upper Impression 1", "Upper Impression 2", "Lower Impression 1", "Lower Impression 2"];
const CLOSE_BITE_LABELS = ["Close Bite — Front", "Close Bite — Side"];
const OPEN_BITE_LABELS = ["Open Bite — Front", "Open Bite — Side"];

/** The order lifecycle, as the compact stage tracker in the rail draws it. */
const WORKFLOW_STEPS: { key: SubmissionStatus; label: string }[] = [
  { key: "in_review", label: "Review" },
  { key: "approved", label: "Approved" },
  { key: "in_fabrication", label: "Fabrication" },
  { key: "shipped", label: "Shipped" },
  { key: "completed", label: "Complete" },
];

/** The one line telling support what this customer needs next. */
const STATUS_TODO: Record<SubmissionStatus, string> = {
  draft: "Draft — the patient hasn't submitted yet.",
  pending: "Review the impression photos and decide.",
  in_review: "Review the impression photos and decide.",
  changes_requested: "Waiting on the patient to resubmit.",
  lab_retake: "New kit sent — waiting on the patient's retake.",
  approved: "Approved — start fabrication when ready.",
  rejected: "Can't proceed with this order — see the reason below.",
  in_fabrication: "In production — add tracking to ship.",
  shipped: "In transit — confirm delivery when it arrives.",
  completed: "Delivered — order complete.",
};

/** A status needing review notes before it can be set. */
function needsNotes(status: SubmissionStatus): boolean {
  return status === "rejected" || status === "changes_requested";
}

/** The teeth charted for one product on an order — its own per-item chart when
    the order carries several appliances, else the order-level selection. */
function teethForProduct(sub: Submission, slug: string): number[] {
  return sub.itemDetails?.[slug]?.selectedTeeth ?? sub.selectedTeeth ?? [];
}

/** A small muted glyph that precedes a rail card title, for quick scanning. */
function TitleIcon({ kind }: { kind: "customer" | "order" | "shipping" | "intake" | "plan" }) {
  const p = {
    width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
    strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  };
  const glyph = {
    customer: <><circle cx="12" cy="8" r="3.6" /><path d="M5 20c0-3.2 3.4-5.6 7-5.6s7 2.4 7 5.6" /></>,
    order: <><path d="M6 2.5h12L19.5 7H4.5z" /><path d="M5 7v12.5a1 1 0 001 1h12a1 1 0 001-1V7" /><path d="M9 11a3 3 0 006 0" /></>,
    shipping: <><rect x="2.5" y="6.5" width="11.5" height="9" rx="1.2" /><path d="M14 9.5h3.5l3.5 3.5V15.5H14z" /><circle cx="7" cy="17.5" r="1.5" /><circle cx="17" cy="17.5" r="1.5" /></>,
    intake: <><rect x="6" y="4" width="12" height="17" rx="2.2" /><rect x="9" y="2.5" width="6" height="3.2" rx="1" /><path d="M9 11h6M9 14.5h4" /></>,
    plan: <><path d="M12 3l7 2.8v5.2c0 4.4-3 7.8-7 9.7-4-1.9-7-5.3-7-9.7V5.8z" /><path d="M9 12l2 2 4-4" /></>,
  }[kind];
  return <span className={styles.titleIcon} aria-hidden><svg {...p}>{glyph}</svg></span>;
}

/** Every photo on a submission, labelled by pose/slot, for the rail strip. */
function allPhotos(sub: Submission): MessagePhoto[] {
  return [
    ...(sub.closeBitePhotos ?? []).map((url, i) => ({ url, label: CLOSE_BITE_LABELS[i] || `Close Bite ${i + 1}` })),
    ...(sub.openBitePhotos ?? []).map((url, i) => ({ url, label: OPEN_BITE_LABELS[i] || `Open Bite ${i + 1}` })),
    ...(sub.impressionPhotos ?? []).map((url, i) => ({ url, label: IMPRESSION_LABELS[i] || `Impression ${i + 1}` })),
  ];
}

interface Conversation {
  sub: Submission;
  last: ChatMessage | null;
  unread: number;
  /* When the patient has been waiting: the time of the FIRST patient message
     since the team's last reply — not the latest one — so a follow-up nudge
     never resets the clock or pushes the thread back down (Aug 21 review). */
  waitingSince: string | null;
}

/** Business hours elapsed between two instants — Mon–Fri, 9am–6pm local. */
const WORK_START = 9;
const WORK_END = 18;
function businessHoursBetween(fromIso: string, to: Date): number {
  const from = new Date(fromIso);
  if (!(from < to)) return 0;
  let hours = 0;
  const cursor = new Date(from);
  while (cursor < to) {
    const day = cursor.getDay();
    const h = cursor.getHours() + cursor.getMinutes() / 60;
    if (day >= 1 && day <= 5 && h >= WORK_START && h < WORK_END) {
      const stepEnd = new Date(cursor); stepEnd.setHours(WORK_END, 0, 0, 0);
      const end = stepEnd < to ? stepEnd : to;
      hours += (end.getTime() - cursor.getTime()) / 3_600_000;
      cursor.setTime(end.getTime());
    } else {
      /* Jump to the next working moment. */
      if (day >= 1 && day <= 5 && h < WORK_START) cursor.setHours(WORK_START, 0, 0, 0);
      else { cursor.setDate(cursor.getDate() + 1); cursor.setHours(WORK_START, 0, 0, 0); }
    }
  }
  return hours;
}
const OVERDUE_AFTER_HOURS = 12;

/** The first patient message after the team's last reply, if the thread is
    waiting on the team. */
function firstUnansweredAt(thread: ChatMessage[]): string | null {
  let since: string | null = null;
  for (const m of thread) {
    if (m.senderRole === "admin") since = null;
    else if (m.senderRole === "patient" && since === null) since = m.createdAt;
  }
  return since;
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

/** Inbox order (Aug 21 client review): threads the patient has been waiting
    on for 12+ business hours first (longest wait on top), then every other
    thread awaiting the team (oldest wait first), then the rest by activity.
    Waiting time counts from the first unanswered message, so a patient
    replying again never drops their thread down the list. */
function sortConversations(rows: Conversation[]): Conversation[] {
  const now = new Date();
  const rank = (c: Conversation) => {
    if (!c.waitingSince) return 2;
    return businessHoursBetween(c.waitingSince, now) >= OVERDUE_AFTER_HOURS ? 0 : 1;
  };
  return [...rows].sort((a, b) => {
    const ra = rank(a), rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra < 2) return (a.waitingSince ?? "").localeCompare(b.waitingSince ?? "");
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
  /* Conversations marked complete. In a real backend this closes the Gorgias
     ticket; a new patient reply reopens it (handled in the subscribe effect). */
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  /* On narrow screens the rail becomes a slide-over drawer, toggled here. */
  const [railOpen, setRailOpen] = useState(false);
  /* Collapsible rail sections. Photos + intake + protection plan start closed. */
  const [orderExpanded, setOrderExpanded] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ photos: MessagePhoto[]; index: number } | null>(null);

  /* Review/action state for the stage card, mirroring the submission detail. */
  const [reviewNotes, setReviewNotes] = useState("");
  const [tracking, setTracking] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  /* Per-order side data the rail shows: the protection plan and recent payments. */
  const [insurance, setInsurance] = useState<Insurance | null>(null);
  /* "Can't proceed" is available at every stage, not just review (Aug 21
     client review) — outside review it sits behind a disclosure so the
     primary action for the stage stays primary. */
  const [cantProceedOpen, setCantProceedOpen] = useState(false);
  /* Inline intake correction (Aug 24, Nathan: "no problems here"). */
  const [intakeEditing, setIntakeEditing] = useState(false);
  const [editShade, setEditShade] = useState("");
  const [editGum, setEditGum] = useState("");
  const [editTeeth, setEditTeeth] = useState("");
  const [intakeSaving, setIntakeSaving] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

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
              .then((ms) => [id, ms[ms.length - 1] ?? null, firstUnansweredAt(ms)] as const)
              .catch(() => [id, null, null] as const),
          ),
        ),
      ]);
      const lastById = new Map(threads.map(([id, last]) => [id, last] as const));
      const waitingById = new Map(threads.map(([id, , since]) => [id, since] as const));
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
            waitingSince: waitingById.get(sub.id) ?? null,
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
      setRailOpen(false);
      setOrderExpanded(false);
      setIntakeOpen(false);
      setPlanOpen(false);
      setReviewNotes("");
      setTracking("");
      router.replace(`/admin/chat?id=${id}`, { scroll: false });
      /* Viewing clears the patient's unread replies (ChatPanel marks them read). */
      setConversations((prev) =>
        prev.map((c) => (c.sub.id === id ? { ...c, unread: 0 } : c)),
      );
    },
    [router],
  );

  /* Mobile single-pane: step back from a thread to the conversation list. */
  const deselect = useCallback(() => {
    setSelectedId(null);
    setRailOpen(false);
    router.replace("/admin/chat", { scroll: false });
  }, [router]);

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
      /* A new patient reply reopens a completed conversation (Gorgias parity). */
      if (msg.senderRole === "patient") {
        setCompleted((prev) => {
          if (!prev.has(selectedId)) return prev;
          const next = new Set(prev);
          next.delete(selectedId);
          return next;
        });
      }
    });
    return unsubscribe;
  }, [selectedId]);

  /* Mark the open conversation complete (or reopen it). Completing closes the
     linked Gorgias ticket in a real backend; the transcript stays visible there. */
  const toggleComplete = useCallback((id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /* Load the side data the rail shows for the open order — the protection plan
     and recent payments — so support has that context without leaving chat. */
  useEffect(() => {
    if (!selectedId) {
      setInsurance(null); // eslint-disable-line react-hooks/set-state-in-effect -- reset when nothing selected
      return;
    }
    let live = true;
    Promise.all([
      api.insurance.getForSubmission(selectedId).catch(() => null),
      invoices.length ? Promise.resolve(invoices) : api.subscriptions.listInvoices().catch(() => []),
    ]).then(([plan, inv]) => {
      if (!live) return;
      setInsurance(plan);
      setInvoices(inv);
    });
    return () => {
      live = false;
    };
  }, [selectedId, invoices]);

  /* Reflect a status change back into the inbox so the header badge, the list
     row and the rail all move together. */
  const patchSub = useCallback((updated: Submission) => {
    setConversations((prev) =>
      prev.map((c) => (c.sub.id === updated.id ? { ...c, sub: updated } : c)),
    );
  }, []);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  /* The review/stage action, mirroring the submission detail: reject and
     changes-requested need a note; reject confirms; shipping carries tracking. */
  const saveIntakeEdit = useCallback(async (sub: Submission) => {
    if (intakeSaving) return;
    setIntakeSaving(true);
    try {
      const teeth = editTeeth
        .split(/[,\s]+/)
        .map((x) => parseInt(x, 10))
        .filter((n) => Number.isFinite(n) && n >= 1 && n <= 32);
      const updated = await api.submissions.updateIntake(
        sub.id,
        { whiteShade: editShade || null, gumShade: editGum || null, selectedTeeth: teeth },
        adminUser?.name ?? "Admin User",
      );
      patchSub(updated);
      setIntakeEditing(false);
    } catch (err) {
      console.error("Could not save intake edit:", err);
    } finally {
      setIntakeSaving(false);
    }
  }, [intakeSaving, editShade, editGum, editTeeth, adminUser]);

  const handleStatusUpdate = useCallback(
    async (sub: Submission, newStatus: SubmissionStatus) => {
      if (saving) return;
      if (needsNotes(newStatus) && !reviewNotes.trim()) {
        showToast(
          `Add a note before ${newStatus === "rejected" ? "rejecting" : "requesting changes"}.`,
          "error",
        );
        return;
      }
      if (newStatus === "rejected" && !window.confirm("Reject this submission? This can be reversed later.")) {
        return;
      }
      setSaving(true);
      const note = reviewNotes.trim();
      try {
        const updated = await api.submissions.updateStatus(sub.id, {
          status: newStatus,
          reviewedBy: adminUser?.name ?? "Admin User",
          reviewNotes: note || undefined,
          trackingNumber: newStatus === "shipped" && tracking.trim() ? tracking.trim() : undefined,
        });
        /* Post the note into the conversation so it reaches the customer and
           sits in the thread — otherwise it only lives on the order record. */
        if (note) {
          await api.messages.send(sub.id, note, "admin", adminUser?.name ?? "Admin User");
        }
        patchSub(updated);
        setReviewNotes("");
        setTracking("");
        showToast(note ? "Updated — note sent to chat." : "Status updated.");
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : "Something went wrong.", "error");
      } finally {
        setSaving(false);
      }
    },
    [adminUser, reviewNotes, tracking, saving, patchSub],
  );

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
  const activeCompleted = active ? completed.has(active.sub.id) : false;

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
              <span className={styles.folderLabel}>All</span>
              <span className={styles.folderCount}>{counts.all}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={folder === "unassigned"}
              className={`${styles.folderTab} ${folder === "unassigned" ? styles.folderTabActive : ""}`}
              onClick={() => setFolder("unassigned")}
            >
              <span className={styles.folderLabel}>Unassigned</span>
              <span className={styles.folderCount}>{counts.unassigned}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={folder === "mine"}
              className={`${styles.folderTab} ${folder === "mine" ? styles.folderTabActive : ""}`}
              onClick={() => setFolder("mine")}
            >
              <span className={styles.folderLabel}>Mine</span>
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
                const isCompleted = completed.has(c.sub.id);
                return (
                  <button
                    key={c.sub.id}
                    type="button"
                    className={`${styles.row} ${selected ? styles.rowActive : ""} ${isCompleted ? styles.rowCompleted : ""}`}
                    onClick={() => selectConversation(c.sub.id)}
                  >
                    <div className={styles.avatar} aria-hidden>{initials(c.sub.name)}</div>
                    <div className={styles.rowBody}>
                      <div className={styles.rowTop}>
                        <span className={styles.rowName}>
                          {isCompleted && (
                            <svg className={styles.rowDone} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6L9 17l-5-5" /></svg>
                          )}
                          {c.sub.name || c.sub.email}
                        </span>
                        <span className={styles.rowTime}>{formatWhen(c.last?.createdAt)}</span>
                      </div>
                      <div className={styles.rowMeta}>
                        {c.sub.orderNumber ? `${c.sub.orderNumber} · ` : ""}{productLabels(c.sub.products ?? []) || "—"}
                      </div>
                      <div className={styles.rowBottom}>
                        <span className={styles.rowPreview}>{preview(c.last)}</span>
                        {c.waitingSince && businessHoursBetween(c.waitingSince, new Date()) >= OVERDUE_AFTER_HOURS && (
                          <span className={styles.overdueChip} title="Waiting on the team for 12+ business hours">
                            {Math.floor(businessHoursBetween(c.waitingSince, new Date()))}h
                          </span>
                        )}
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
                  <button type="button" className={styles.threadBack} onClick={deselect} aria-label="Back to conversations">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M15 6l-6 6 6 6" />
                    </svg>
                  </button>
                  <div className={styles.avatarLg} aria-hidden>{initials(active.sub.name)}</div>
                  <div className={styles.threadHeaderText}>
                    <h2 className={styles.threadName}>{active.sub.name || "—"}</h2>
                    <p className={styles.threadSub}>{active.sub.email}</p>
                  </div>
                </div>
                <div className={styles.threadHeaderMeta}>
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
                  {activeCompleted ? (
                    <span className={styles.completedTag}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6L9 17l-5-5" /></svg>
                      Completed
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={styles.completeBtn}
                      onClick={() => toggleComplete(active.sub.id)}
                    >
                      Mark complete
                    </button>
                  )}
                  {activeCompleted && (
                    <button type="button" className={styles.reopenBtn} onClick={() => toggleComplete(active.sub.id)}>
                      Reopen
                    </button>
                  )}
                  <StatusBadge status={active.sub.status} />
                </div>
                {/* Narrow screens: open the detail rail as a drawer. */}
                <button
                  type="button"
                  className={styles.railToggle}
                  onClick={() => setRailOpen(true)}
                  aria-label="Open order details"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="M15 4v16M18 8h.01M18 12h.01" />
                  </svg>
                  Details
                </button>
              </header>

              <ChatPanel
                submissionId={active.sub.id}
                currentRole="admin"
                currentName={adminUser?.name ?? "Admin User"}
              />
            </>
          )}
        </section>

        {/* ── Order context — the full submission, in view while chatting ── */}
        {active && (() => {
          const sub = active.sub;
          /* Pending collapsed into Review (Aug 24) — one stage on the tracker. */
          const status = sub.status === "pending" ? "in_review" : sub.status;
          const currentIdx = WORKFLOW_STEPS.findIndex((s) => s.key === status);
          const isBranch = status === "changes_requested" || status === "rejected" || status === "lab_retake";
          const isReviewable = status === "in_review" || status === "changes_requested";
          /* A review-stage branch stops the track at Review; a lab retake
             happened after approval, so the track holds at Approved instead of
             rewinding — mirroring the customer's tracker (Aug 18 session). */
          const filledIdx = isBranch ? (status === "lab_retake" ? 1 : 0) : currentIdx;
          /* Fraction of the track to fill with the brand ramp (0–1), matching
             the submission stepper and the customer fulfilment tracker. */
          const progress = filledIdx <= 0 ? 0 : filledIdx / (WORKFLOW_STEPS.length - 1);
          const stageLabel =
            status === "rejected" ? "Can't Proceed"
              : status === "changes_requested" ? "Changes Requested"
                : status === "lab_retake" ? "Lab Retake"
                  : WORKFLOW_STEPS[currentIdx]?.label ?? "Draft";
          const photos = allPhotos(sub);
          const itemEntries = Object.entries(sub.itemDetails ?? {});
          const recentPayments = invoices.slice(0, 3);

          return (
          <aside className={styles.orderPanel} data-open={railOpen ? "" : undefined}>
            <button type="button" className={styles.railClose} onClick={() => setRailOpen(false)} aria-label="Close details">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            <div className={styles.orderScroll}>
              {/* Stage + to-do + actions — what this customer needs next */}
              <section className={styles.orderCard}>
                <div
                  className={styles.stepper}
                  style={{ "--progress": progress } as CSSProperties}
                  aria-label={`Stage: ${stageLabel}`}
                >
                  {WORKFLOW_STEPS.map((step, i) => (
                    <span key={step.key} className={styles.stepItem}>
                      <span
                        className={`${styles.stepDot} ${
                          i < filledIdx ? styles.stepDotDone : i === filledIdx ? (isBranch ? styles.stepDotBranch : styles.stepDotOn) : ""
                        }`}
                      />
                    </span>
                  ))}
                </div>
                <div className={styles.stageHead}>
                  <span className={styles.stageTitle}>{stageLabel}</span>
                  <StatusBadge status={status} />
                </div>
                <p className={styles.stageTodo}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8h.01M11 12h1v4h1" />
                  </svg>
                  {STATUS_TODO[status]}
                </p>

                {/* Actions by stage — parity with the submission detail. */}
                {isReviewable && (
                  <div className={styles.actionBlock}>
                    {sub.reviewNotes && (
                      <p className={styles.priorNote}>Last note: {sub.reviewNotes}</p>
                    )}
                    <div className={styles.noteTemplates}>
                      {["Impression photos are blurry — please retake",
                        "Photos are too dark — please retake in better lighting",
                        "Missing teeth selection — please update"].map((tpl) => (
                        <button key={tpl} type="button" className={styles.noteTemplateBtn} onClick={() => setReviewNotes(tpl)}>
                          {tpl}
                        </button>
                      ))}
                    </div>
                    <textarea
                      className={styles.notesTextarea}
                      placeholder="Write a note to the customer — it's sent into this chat (required to reject or request changes)…"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                    />
                    <div className={styles.actionBtns}>
                      <button className={styles.btnApprove} disabled={saving} onClick={() => void handleStatusUpdate(sub, "approved")}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6L9 17l-5-5" /></svg>
                        Approve
                      </button>
                      <button className={styles.btnChanges} disabled={saving} onClick={() => void handleStatusUpdate(sub, "changes_requested")}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 11a9 9 0 0115-6.7L21 7M21 3v4h-4M21 13a9 9 0 01-15 6.7L3 17M3 21v-4h4" /></svg>
                        Request Changes
                      </button>
                      <button className={styles.btnReject} disabled={saving} onClick={() => void handleStatusUpdate(sub, "rejected")}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 6L6 18M6 6l12 12" /></svg>
                        Can&apos;t proceed with order
                      </button>
                    </div>
                  </div>
                )}
                {status === "approved" && (
                  <button className={styles.btnPrimary} disabled={saving} onClick={() => void handleStatusUpdate(sub, "in_fabrication")}>Start Fabrication</button>
                )}
                {status === "in_fabrication" && (
                  <div className={styles.actionBlock}>
                    <input
                      className={styles.trackingInput}
                      placeholder="Tracking number…"
                      value={tracking}
                      onChange={(e) => setTracking(e.target.value)}
                    />
                    <button className={styles.btnPrimary} disabled={saving} onClick={() => void handleStatusUpdate(sub, "shipped")}>Confirm Shipment</button>
                  </div>
                )}
                {status === "shipped" && (
                  <button className={styles.btnPrimary} disabled={saving} onClick={() => void handleStatusUpdate(sub, "completed")}>Confirm Delivery</button>
                )}

                {/* Stop the order at any later stage — with a required reason. */}
                {["approved", "lab_retake", "in_fabrication", "shipped"].includes(status) && (
                  <div className={styles.cantProceedWrap}>
                    {!cantProceedOpen ? (
                      <button type="button" className={styles.cantProceedLink} onClick={() => setCantProceedOpen(true)}>
                        Can&apos;t proceed with this order?
                      </button>
                    ) : (
                      <div className={styles.actionBlock}>
                        <textarea
                          className={styles.notesTextarea}
                          placeholder="Tell the patient why we can't continue (required)…"
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                        />
                        <div className={styles.actionBtns}>
                          <button className={styles.btnReject} disabled={saving || !reviewNotes.trim()} onClick={() => void handleStatusUpdate(sub, "rejected")}>
                            Can&apos;t proceed with order
                          </button>
                          <button type="button" className={styles.cantProceedLink} onClick={() => { setCantProceedOpen(false); setReviewNotes(""); }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {status === "rejected" && sub.reviewNotes && (
                  <div className={styles.rejectReason}>
                    <span className={styles.rejectReasonLabel}>Why we can&apos;t proceed</span>
                    {sub.reviewNotes}
                    {sub.reviewedBy && (
                      <span className={styles.rejectReasonMeta}>
                        — {sub.reviewedBy}{sub.reviewedAt ? ` · ${formatDate(sub.reviewedAt)}` : ""}
                      </span>
                    )}
                  </div>
                )}

                {/* Who made the call — on every reviewed state, not just
                    rejections (Aug 18 session: "mark who rejected and who
                    approved… so we can keep that traceability"). */}
                {["approved", "in_fabrication", "shipped", "completed", "changes_requested", "lab_retake"].includes(status) && sub.reviewedBy && sub.reviewedAt && (
                  <p className={styles.decisionMeta}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    {status === "changes_requested" || status === "lab_retake"
                      ? "Sent back by"
                      : "Approved by"} <strong>{sub.reviewedBy}</strong> · {formatDate(sub.reviewedAt)}
                  </p>
                )}
              </section>

              {/* Customer */}
              <section className={styles.orderCard}>
                <div className={styles.orderCardHead}>
                  <span className={styles.orderCardTitle}><TitleIcon kind="customer" />Customer</span>
                </div>
                <div className={styles.customerRow}>
                  <div className={styles.avatarLg} aria-hidden>{initials(sub.name)}</div>
                  <div className={styles.customerInfo}>
                    <span className={styles.customerName}>{sub.name || "—"}</span>
                    <span className={styles.customerEmail}>{sub.email}</span>
                  </div>
                </div>
                <dl className={styles.metaList}>
                  <div className={styles.metaRow}><dt>Total spent</dt><dd>{formatUsd(productsSubtotalCents(sub.products ?? []))}</dd></div>
                  {/* Mirrored from the Shopify order; read-only here so there is
                      exactly one address of record (Aug 18 session). */}
                  {sub.shippingAddress ? (
                    <div className={styles.metaRow}>
                      <dt>Shipping address</dt>
                      <dd className={styles.addressLines}>
                        <span>{sub.shippingAddress.line1}{sub.shippingAddress.line2 ? `, ${sub.shippingAddress.line2}` : ""}</span>
                        <span>{sub.shippingAddress.city}, {sub.shippingAddress.state} {sub.shippingAddress.postalCode}</span>
                      </dd>
                    </div>
                  ) : (
                    <div className={styles.metaRow}><dt>State</dt><dd>{sub.state || "—"}</dd></div>
                  )}
                  <div className={styles.metaRow}><dt>Created at</dt><dd>{formatDate(sub.createdAt)}</dd></div>
                </dl>
              </section>

              {/* Order — laid out like the Shopify order-details block */}
              <section className={styles.orderCard}>
                <div className={styles.orderCardHead}>
                  <span className={styles.orderCardTitle}><TitleIcon kind="order" />Order {sub.orderNumber || "—"}</span>
                  <StatusBadge status={status} />
                </div>
                <p className={styles.orderMetaLine}>
                  {formatDate(sub.createdAt)} · {sub.products?.length ?? 0} item
                  {(sub.products?.length ?? 0) === 1 ? "" : "s"}
                </p>
                <ul className={styles.lineItems}>
                  {(sub.products ?? []).map((p) => {
                    const arch = archTag(p, teethForProduct(sub, p));
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
                <div className={styles.orderTotal}>
                  <span>Subtotal</span>
                  <span>{formatUsd(productsSubtotalCents(sub.products ?? []))}</span>
                </div>

                {photos.length > 0 && (
                  <>
                    <button
                      type="button"
                      className={styles.expandBtn}
                      aria-expanded={orderExpanded}
                      onClick={() => setOrderExpanded((v) => !v)}
                    >
                      {orderExpanded ? "Hide" : "View"} photos ({photos.length})
                      <svg className={styles.expandChevron} data-open={orderExpanded || undefined} width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
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
                )}
              </section>

              {/* Shipping */}
              <section className={styles.orderCard}>
                <div className={styles.orderCardHead}>
                  <span className={styles.orderCardTitle}><TitleIcon kind="shipping" />Shipping</span>
                </div>
                <dl className={styles.metaList}>
                  <div className={styles.metaRow}><dt>Tracking</dt><dd>{sub.trackingNumber || "—"}</dd></div>
                  <div className={styles.metaRow}><dt>Shipped</dt><dd>{sub.shippedAt ? formatDate(sub.shippedAt) : "—"}</dd></div>
                  <div className={styles.metaRow}><dt>Delivered</dt><dd>{sub.completedAt ? formatDate(sub.completedAt) : "—"}</dd></div>
                </dl>
              </section>

              {/* Patient intake — collapsible: shades, teeth, per-item, note */}
              <section className={styles.orderCard}>
                <button type="button" className={styles.collapseHead} aria-expanded={intakeOpen} onClick={() => setIntakeOpen((v) => !v)}>
                  <span className={styles.orderCardTitle}><TitleIcon kind="intake" />Patient Intake</span>
                  <svg className={styles.expandChevron} data-open={intakeOpen || undefined} width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {intakeOpen && (
                  <div className={styles.collapseBody}>
                    {!intakeEditing ? (
                      <button
                        type="button"
                        className={styles.cantProceedLink}
                        onClick={() => {
                          setEditShade(sub.whiteShade ?? "");
                          setEditGum(sub.gumShade ?? "");
                          setEditTeeth((sub.selectedTeeth ?? []).join(", "));
                          setIntakeEditing(true);
                        }}
                      >
                        Edit intake details
                      </button>
                    ) : (
                      <div className={styles.intakeEdit}>
                        <label className={styles.intakeLabel}>
                          Tooth shade
                          <select className={styles.intakeSelect} value={editShade} onChange={(e) => setEditShade(e.target.value)}>
                            <option value="">—</option>
                            {["A1", "A2", "A3", "A4"].map((v) => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </label>
                        <label className={styles.intakeLabel}>
                          Gum shade
                          <select className={styles.intakeSelect} value={editGum} onChange={(e) => setEditGum(e.target.value)}>
                            <option value="">—</option>
                            {["Dark", "Pink", "Clear"].map((v) => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </label>
                        <label className={styles.intakeLabel}>
                          Teeth (1–32, comma-separated)
                          <input className={styles.intakeSelect} value={editTeeth} onChange={(e) => setEditTeeth(e.target.value)} placeholder="e.g. 12, 13, 14" />
                        </label>
                        <div className={styles.actionBtns}>
                          <button className={styles.btnPrimary} disabled={intakeSaving} onClick={() => void saveIntakeEdit(sub)}>
                            {intakeSaving ? "Saving…" : "Save & notify patient"}
                          </button>
                          <button type="button" className={styles.cantProceedLink} onClick={() => setIntakeEditing(false)}>Cancel</button>
                        </div>
                      </div>
                    )}
                    <dl className={styles.metaList}>
                      <div className={styles.metaRow}><dt>Tooth shade</dt><dd>{sub.whiteShade || "—"}</dd></div>
                      <div className={styles.metaRow}><dt>Gum shade</dt><dd>{sub.gumShade || "—"}</dd></div>
                    </dl>
                    <div className={styles.intakeField}>
                      <span className={styles.intakeLabel}>Teeth to replace</span>
                      {sub.teethNotSure ? (
                        <span className={styles.intakeValue}>Not sure — asked for help</span>
                      ) : sub.selectedTeeth?.length ? (
                        <div className={styles.toothList}>
                          {sub.selectedTeeth.map((t) => <span key={t} className={styles.toothBadge}>{t}</span>)}
                        </div>
                      ) : (
                        <span className={styles.intakeValue}>—</span>
                      )}
                    </div>
                    {itemEntries.map(([slug, detail]) => (
                      <div key={slug} className={styles.intakeField}>
                        <span className={styles.intakeLabel}>{productLabel(slug)}</span>
                        <span className={styles.intakeValue}>
                          Shade {detail.whiteShade || "—"} · Gum {detail.gumShade || "—"}
                          {detail.selectedTeeth.length ? ` · Teeth ${detail.selectedTeeth.join(", ")}` : detail.teethNotSure ? " · Teeth: not sure" : ""}
                        </span>
                        {detail.notes && detail.notes.trim() && <span className={styles.intakeNote}>{detail.notes}</span>}
                      </div>
                    ))}
                    {sub.notes && sub.notes.trim() && (
                      <div className={styles.intakeField}>
                        <span className={styles.intakeLabel}>Patient note</span>
                        <span className={styles.intakeNote}>{sub.notes}</span>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Protection plan — collapsible: status + coverage + payments */}
              <section className={styles.orderCard}>
                <button type="button" className={styles.collapseHead} aria-expanded={planOpen} onClick={() => setPlanOpen((v) => !v)}>
                  <span className={styles.orderCardTitle}><TitleIcon kind="plan" />Protection Plan</span>
                  <span className={styles.collapseHeadRight}>
                    <span className={`${styles.planChip} ${insurance?.status === "insured" ? styles.planChipOn : styles.planChipOff}`}>
                      {insurance ? (insurance.status === "insured" ? "Active" : "Inactive") : "None"}
                    </span>
                    <svg className={styles.expandChevron} data-open={planOpen || undefined} width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
                      <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>
                {planOpen && (
                  <div className={styles.collapseBody}>
                    {!insurance ? (
                      <p className={styles.intakeValue}>No protection plan on this order.</p>
                    ) : (
                      <>
                        <dl className={styles.metaList}>
                          <div className={styles.metaRow}><dt>Plan</dt><dd>{insurance.planName || "Protection Plan"}</dd></div>
                          <div className={styles.metaRow}><dt>Coverage</dt><dd>{insurance.coverage || "—"}</dd></div>
                          {insurance.status === "insured" ? (
                            <div className={styles.metaRow}><dt>Expires</dt><dd>{insurance.expiresAt ? formatDate(insurance.expiresAt) : "—"}</dd></div>
                          ) : (
                            <div className={styles.metaRow}><dt>Status</dt><dd>Not active — no current coverage</dd></div>
                          )}
                          {insurance.claim && (
                            <div className={styles.metaRow}><dt>Claim</dt><dd>{insurance.claim.reason} · {insurance.claim.status.replace("_", " ")}</dd></div>
                          )}
                        </dl>
                        {recentPayments.length > 0 && (
                          <div className={styles.payList}>
                            <span className={styles.intakeLabel}>Recent payments</span>
                            {recentPayments.map((inv) => (
                              <div key={inv.id} className={styles.payRow}>
                                <span className={styles.payDate}>{formatDate(inv.date)}</span>
                                <span className={styles.payAmount}>{formatUsd(inv.amount)}</span>
                                <span className={`${styles.payStatus} ${inv.status === "paid" ? styles.payOk : styles.payBad}`}>{inv.status}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </section>
            </div>
          </aside>
          );
        })()}
      </div>

      {/* Drawer backdrop (narrow screens only, styled by media query). */}
      {active && (
        <div
          className={styles.railBackdrop}
          data-open={railOpen ? "" : undefined}
          onClick={() => setRailOpen(false)}
          aria-hidden
        />
      )}

      {toast && (
        <div className={`${styles.toast} ${toast.type === "error" ? styles.toastError : styles.toastSuccess}`}>
          {toast.message}
        </div>
      )}

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
