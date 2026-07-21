/**
 * Faked authentication.
 *
 * The login, signup and reset screens are real UI worth keeping in the build,
 * so they all still work — but any password is accepted and the session lives
 * in `sessionStorage`. Nothing here is a security boundary, and the real
 * implementation must decide staff access server-side.
 */

import type { AuthApi } from "../contract";
import type { AdminUser, AuthEvent, AuthUser, Unsubscribe } from "../types";
import { ApiError } from "../types";
import { DEMO_ADMIN_EMAILS, DEMO_PATIENT } from "./seed";
import { clone, delay, getDb, mutate, nowIso } from "./store";

type AuthListener = (event: AuthEvent, user: AuthUser | null) => void;

const listeners = new Set<AuthListener>();

function emit(event: AuthEvent, user: AuthUser | null): void {
  listeners.forEach((listener) => {
    try {
      listener(event, user);
    } catch {
      /* one broken listener must not stop the others */
    }
  });
}

/**
 * Every sign-in and sign-up resolves to the demo patient.
 *
 * The demo has one persona with one populated order, so any address and any
 * password land in exactly the same place as the skip-login shortcut. That
 * predictability is the point: nobody demoing this should have to remember
 * which email address has the data behind it.
 *
 * A real adapter returns the account that actually authenticated.
 */
function signedInPatient(): AuthUser {
  return { ...DEMO_PATIENT };
}

function displayNameFor(email: string): string {
  const local = email.split("@")[0] ?? "Admin";
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const mockAuth: AuthApi = {
  async signUp(email, password) {
    await delay();
    if (!email.trim() || !password) {
      throw new ApiError("validation", "Enter an email address and a password.");
    }

    const user = signedInPatient();
    mutate((db) => {
      db.authUser = user;
    });
    emit("signed_in", user);
    return clone(user);
  },

  async signIn(email, password) {
    await delay();
    if (!email.trim() || !password) {
      throw new ApiError("invalid_credentials", "Enter your email address and password.");
    }

    const user = signedInPatient();
    mutate((db) => {
      db.authUser = user;
    });
    emit("signed_in", user);
    return clone(user);
  },

  async signInWithProvider() {
    await delay();
    /* No redirect in the demo: whichever provider you pick, you land on the
       same demo patient as every other way in. */
    const user = signedInPatient();
    mutate((db) => {
      db.authUser = user;
    });
    emit("signed_in", user);
    return clone(user);
  },

  async getUser() {
    const user = getDb().authUser;
    return user ? clone(user) : null;
  },

  async signOut() {
    await delay(60);
    mutate((db) => {
      db.authUser = null;
      db.recoverySession = false;
    });
    emit("signed_out", null);
  },

  async requestPasswordReset(email) {
    await delay();
    if (!email.trim()) {
      throw new ApiError("validation", "Enter your email address.");
    }
    // Resolves the same way whether or not the address exists, so the
    // response can't be used to discover who has an account.
    mutate((db) => {
      db.recoverySession = true;
    });
  },

  async hasRecoverySession() {
    await delay(60);
    return getDb().recoverySession;
  },

  async updatePassword(password) {
    await delay();
    if (password.length < 8) {
      throw new ApiError("validation", "Choose a password of at least 8 characters.");
    }
    mutate((db) => {
      db.recoverySession = false;
    });
  },

  onAuthChange(handler): Unsubscribe {
    listeners.add(handler);

    // Replay the current state so a listener mounting after a recovery link
    // still learns about it.
    const db = getDb();
    if (db.recoverySession) {
      queueMicrotask(() => handler("password_recovery", db.authUser));
    }

    return () => listeners.delete(handler);
  },

  async signInAdmin(email, password) {
    await delay();
    const normalised = email.trim().toLowerCase();

    if (!normalised || !password) {
      throw new ApiError("invalid_credentials", "Enter your email address and password.");
    }
    if (!DEMO_ADMIN_EMAILS.includes(normalised)) {
      throw new ApiError("not_authorized", "That account doesn't have admin access.");
    }

    const admin: AdminUser = {
      id: `admin-${normalised.replace(/[^a-z0-9]/g, "-")}`,
      name: displayNameFor(normalised),
      email: normalised,
      role: "Admin",
      loggedInAt: nowIso(),
    };

    mutate((db) => {
      db.adminUser = admin;
    });
    return clone(admin);
  },

  async getAdminUser() {
    const admin = getDb().adminUser;
    return admin ? clone(admin) : null;
  },

  async signOutAdmin() {
    await delay(60);
    mutate((db) => {
      db.adminUser = null;
    });
  },
};
