"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./ReviewCriteriaDrawer.module.css";

/* ── Types ── */

interface Check {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
  observation?: string;
}

interface AnalysisEntry {
  checks: Check[];
  summary: string | null;
  teethCenter: { x: number; y: number } | null;
  pass: boolean;
}

interface DrawerMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ReviewCriteriaDrawerProps {
  open: boolean;
  onClose: () => void;
  photoUrl: string;
  photoLabel: string;
  photoType: string;
  analysis: AnalysisEntry | null;
}

/* ── Label map ── */

const PHOTO_TYPE_MAP: Record<string, string> = {
  "Close Bite — Front": "close-bite-front",
  "Close Bite — Left": "close-bite-side",
  "Close Bite — Right": "close-bite-side",
  "Open Bite — Front": "open-bite-front",
  "Open Bite — Left": "open-bite-side",
  "Open Bite — Right": "open-bite-side",
};

/* ── Helpers ── */

function buildInitialMessage(analysis: AnalysisEntry, label: string): string {
  const failedChecks = analysis.checks.filter((c) => !c.pass);
  const passedChecks = analysis.checks.filter((c) => c.pass);

  if (failedChecks.length === 0) {
    return (
      `This **${label}** photo **passed all ${passedChecks.length} checks**. ` +
      (analysis.summary ? `\n\n${analysis.summary}` : "") +
      `\n\nEverything looks good! If you think any check should be stricter or the criteria should change, let me know.`
    );
  }

  let msg = `This **${label}** photo **failed ${failedChecks.length} of ${analysis.checks.length} checks**:\n\n`;

  for (const check of failedChecks) {
    msg += `• **${check.label}** — ${check.detail}`;
    if (check.observation) msg += ` (${check.observation})`;
    msg += "\n";
  }

  if (analysis.summary) {
    msg += `\n${analysis.summary}`;
  }

  msg += "\n\nDo you think the AI got it wrong? Tell me which check you disagree with and I'll suggest how to adjust the criteria.";

  return msg;
}

/** Render inline markdown: **bold**, `code`, [link](url) */
function renderInline(line: string, lineKey: number): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIdx) parts.push(line.slice(lastIdx, match.index));
    const tok = match[0];
    if (tok.startsWith("**")) {
      parts.push(<strong key={`${lineKey}-${match.index}`}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("[")) {
      const linkMatch = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        parts.push(
          <a
            key={`${lineKey}-${match.index}`}
            href={linkMatch[2]}
            className={styles.inlineLink}
            target={linkMatch[2].startsWith("/") ? undefined : "_blank"}
            rel={linkMatch[2].startsWith("/") ? undefined : "noopener noreferrer"}
          >
            {linkMatch[1]}
          </a>
        );
      }
    } else {
      parts.push(
        <code key={`${lineKey}-${match.index}`} className={styles.inlineCode}>{tok.slice(1, -1)}</code>
      );
    }
    lastIdx = match.index + tok.length;
  }
  if (lastIdx < line.length) parts.push(line.slice(lastIdx));
  return parts;
}

/** Markdown with :::current / :::proposed prompt blocks, **bold**, `code`, bullet points */
function renderMarkdown(
  text: string,
  onApplyProposed?: (text: string) => void,
): React.ReactNode[] {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    /* ── Prompt block: :::current | :::proposed | :::success | :::warning ── */
    const blockMatch = line.match(/^:::(current|proposed|success|warning)\s*$/);
    if (blockMatch) {
      const variant = blockMatch[1] as "current" | "proposed" | "success" | "warning";
      const blockLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ":::") {
        blockLines.push(lines[i]);
        i++;
      }
      i++; // skip closing :::

      const blockKey = `block-${i}`;
      const BLOCK_CONFIG = {
        current:  { label: "📋 Current Requirement", className: styles.promptBlockCurrent },
        proposed: { label: "✨ Proposed Change",      className: styles.promptBlockProposed },
        success:  { label: "✅ Change Applied",       className: styles.promptBlockSuccess },
        warning:  { label: "⚠️ Warning",               className: styles.promptBlockWarning },
      };
      const config = BLOCK_CONFIG[variant];

      elements.push(
        <div key={blockKey} className={`${styles.promptBlock} ${config.className}`}>
          <div className={styles.promptBlockLabel}>{config.label}</div>
          <div className={styles.promptBlockContent}>
            {blockLines.map((bl, j) => {
              if (bl.trim() === "") return <br key={`${blockKey}-${j}`} />;
              return <p key={`${blockKey}-${j}`} className={styles.textLine}>{renderInline(bl, j)}</p>;
            })}
          </div>
          {variant === "proposed" && onApplyProposed && (
            <button
              type="button"
              className={styles.applyBtn}
              onClick={() => onApplyProposed(blockLines.join("\n"))}
            >
              ✓ Apply This Change
            </button>
          )}
        </div>
      );
      continue;
    }

    /* ── Regular lines ── */
    let currentLine = line;
    const isBullet = /^[•\-*]\s/.test(currentLine);
    if (isBullet) currentLine = currentLine.replace(/^[•\-*]\s/, "");

    const parts = renderInline(currentLine, i);

    if (isBullet) {
      elements.push(
        <div key={i} className={styles.bulletLine}>
          <span className={styles.bulletDot}>•</span>
          <span>{parts}</span>
        </div>
      );
    } else if (currentLine.trim() === "") {
      elements.push(<br key={i} />);
    } else {
      elements.push(<p key={i} className={styles.textLine}>{parts}</p>);
    }
    i++;
  }
  return elements;
}

/* ── Component ── */

export function ReviewCriteriaDrawer({
  open,
  onClose,
  photoUrl,
  photoLabel,
  photoType,
  analysis,
}: ReviewCriteriaDrawerProps) {
  const resolvedType = PHOTO_TYPE_MAP[photoLabel] ?? photoType;

  const [messages, setMessages] = useState<DrawerMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initRef = useRef(false);

  /* Seed initial AI message when drawer opens with analysis data */
  /* eslint-disable react-hooks/set-state-in-effect -- intentional: reset state on open/close */
  useEffect(() => {
    if (open && analysis && !initRef.current) {
      initRef.current = true;
      const initial: DrawerMessage = {
        id: "init",
        role: "assistant",
        content: buildInitialMessage(analysis, photoLabel),
        timestamp: new Date().toISOString(),
      };
      setMessages([initial]);
    }
    if (!open) {
      initRef.current = false;
      setMessages([]);
      setDraft("");
    }
  }, [open, analysis, photoLabel]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* Auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isLoading]);

  /* Focus input when drawer opens */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: DrawerMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text.trim(),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setDraft("");
      setIsLoading(true);

      try {
        const apiMessages = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/agent/prompt-advisor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            context: {
              photoType: resolvedType,
              photoLabel,
              photoUrl,
              analysisResult: analysis,
            },
          }),
        });

        const data = await res.json();

        const assistantMsg: DrawerMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: data.response || "I couldn't generate a response. Please try again.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        const errMsg: DrawerMessage = {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "⚠️ Something went wrong. Please try again.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, resolvedType, photoLabel, photoUrl, analysis]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(draft);
    }
  }

  if (!open) return null;

  const failedChecks = analysis?.checks.filter((c) => !c.pass) ?? [];

  const SUGGESTIONS = failedChecks.length > 0
    ? [
        "This photo should have passed",
        `The ${failedChecks[0]?.label} check is wrong`,
        "This check is too strict",
        "Show me the current prompt",
      ]
    : [
        "Make the checks stricter",
        "Show me the current prompt",
        "What would you change?",
      ];

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.drawer}>
        {/* Header */}
        <div className={styles.header}>
          {photoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={photoUrl} alt={photoLabel} className={styles.headerPhoto} />
          )}
          <div className={styles.headerInfo}>
            <div className={styles.headerTitle}>{photoLabel}</div>
            <div className={styles.headerMeta}>
              Analyzed by AI ·{" "}
              <span style={{ color: analysis?.pass ? "var(--admin-success)" : "var(--admin-danger)" }}>
                {analysis?.pass ? "PASSED" : "FAILED"}
              </span>
              {analysis && ` · ${failedChecks.length} of ${analysis.checks.length} checks failed`}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Check chips */}
        {analysis && (
          <div className={styles.contextBar}>
            {analysis.checks.map((check) => (
              <span
                key={check.id}
                className={`${styles.chip} ${check.pass ? styles.chipPass : styles.chipFail}`}
              >
                {check.pass ? "✓" : "✗"} {check.label}
              </span>
            ))}
          </div>
        )}

        {/* Ephemeral notice */}
        <div className={styles.ephemeralNotice}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3.5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4.5zM8 11a.75.75 0 110 1.5.75.75 0 010-1.5z" fill="currentColor" />
          </svg>
          This conversation is not saved. Any prompt changes you apply will be versioned in the prompt editor.
        </div>

        {/* Chat messages */}
        <div className={styles.messageList}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`${styles.msgWrap} ${msg.role === "user" ? styles.msgUser : styles.msgAi}`}
            >
              {msg.role === "assistant" && <span className={styles.avatar}>🤖</span>}
              <div className={`${styles.bubble} ${msg.role === "user" ? styles.bubbleUser : styles.bubbleAi}`}>
                {msg.role === "assistant" ? (
                  <div className={styles.richContent}>
                    {renderMarkdown(msg.content, (proposedText) =>
                      sendMessage(`Yes, apply this change:\n\n${proposedText}`)
                    )}
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className={`${styles.msgWrap} ${styles.msgAi}`}>
              <span className={styles.avatar}>🤖</span>
              <div className={`${styles.bubble} ${styles.bubbleAi}`}>
                <div className={styles.typing}><span /><span /><span /></div>
              </div>
            </div>
          )}

          {/* Suggestion chips — only show when no user messages yet */}
          {messages.length <= 1 && !isLoading && (
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className={styles.suggestChip}
                  onClick={() => sendMessage(s)}
                  type="button"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className={styles.inputBar}>
          <textarea
            ref={inputRef}
            className={styles.input}
            placeholder="Discuss this photo's criteria…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isLoading}
          />
          <button
            className={styles.sendBtn}
            onClick={() => sendMessage(draft)}
            disabled={!draft.trim() || isLoading}
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d="M18.5 1.5L9 11M18.5 1.5L12.5 18.5L9 11M18.5 1.5L1.5 7.5L9 11"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
