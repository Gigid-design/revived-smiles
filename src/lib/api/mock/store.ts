/**
 * The in-memory database behind the mock adapter.
 *
 * Persisted to `sessionStorage`, so a demo survives a page reload but a fresh
 * tab starts clean — which is what you want when handing a laptop to someone.
 *
 * Everything here is demo scaffolding. When a real backend lands, this whole
 * folder is deleted and only `contract.ts` survives.
 */

import type {
  AdminUser,
  AppNotification,
  AuthUser,
  ChatMessage,
  PromptConfig,
  Submission,
  SubmissionChange,
  Subscription,
} from "../types";
import { SEED_VERSION, buildSeed } from "./seed";

const STORAGE_KEY = "rs_mock_db";

/** Small delay so spinners and skeletons are actually visible in the demo. */
export const LATENCY_MS = 140;

export interface MockDb {
  /** Which seed produced this state. See `SEED_VERSION`. */
  version: number;
  submissions: Submission[];
  subscriptions: Subscription[];
  messages: ChatMessage[];
  notifications: AppNotification[];
  promptConfigs: PromptConfig[];
  authUser: AuthUser | null;
  adminUser: AdminUser | null;
  /** Set when the visitor arrives via a password-recovery link. */
  recoverySession: boolean;
}

let db: MockDb | null = null;

function canPersist(): boolean {
  return typeof window !== "undefined";
}

function load(): MockDb {
  if (db) return db;

  if (canPersist()) {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as Partial<MockDb>;
        // Ignore state left by an older seed — it would silently win.
        if (stored.version === SEED_VERSION) {
          db = stored as MockDb;
          return db;
        }
      }
    } catch {
      /* corrupt or unavailable storage — fall through to a fresh seed */
    }
  }

  db = buildSeed();
  persist();
  return db;
}

function persist(): void {
  if (!canPersist() || !db) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* quota or private mode — the demo still works from memory */
  }
}

/** Reads the database. Seeds it on first use. */
export function getDb(): MockDb {
  return load();
}

/** Mutates the database and persists the result. */
export function mutate<T>(fn: (db: MockDb) => T): T {
  const current = load();
  const result = fn(current);
  persist();
  return result;
}

/** Wipes the demo back to its seeded state. */
export function resetDb(): void {
  db = buildSeed();
  persist();
}

/** Resolves after the simulated network delay. */
export function delay(ms: number = LATENCY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Structured clone, so callers can't mutate the store by holding a reference. */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/* ------------------------------------------------------------------ */
/* Subscriptions — stand-ins for a real change feed                    */
/* ------------------------------------------------------------------ */

type SubmissionHandler = (change: SubmissionChange) => void;
type MessageHandler = (message: ChatMessage) => void;

const submissionSubscribers = new Set<SubmissionHandler>();
const messageSubscribers = new Map<string, Set<MessageHandler>>();

export function subscribeToSubmissions(handler: SubmissionHandler): () => void {
  submissionSubscribers.add(handler);
  return () => submissionSubscribers.delete(handler);
}

export function emitSubmissionChange(change: SubmissionChange): void {
  submissionSubscribers.forEach((handler) => {
    try {
      handler(change);
    } catch {
      /* a broken listener must not stop the others */
    }
  });
}

export function subscribeToMessages(submissionId: string, handler: MessageHandler): () => void {
  let handlers = messageSubscribers.get(submissionId);
  if (!handlers) {
    handlers = new Set();
    messageSubscribers.set(submissionId, handlers);
  }
  handlers.add(handler);

  return () => {
    const set = messageSubscribers.get(submissionId);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) messageSubscribers.delete(submissionId);
  };
}

export function emitMessage(message: ChatMessage): void {
  messageSubscribers.get(message.submissionId)?.forEach((handler) => {
    try {
      handler(message);
    } catch {
      /* as above */
    }
  });
}
