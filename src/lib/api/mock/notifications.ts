/**
 * The patient's notification feed.
 *
 * In the old backend these rows were written by a database trigger on status
 * change. The demo seeds them; the real implementation should keep generating
 * them server-side rather than from the client.
 */

import type { NotificationsApi } from "../contract";
import { clone, delay, getDb, mutate } from "./store";

const DEFAULT_LIMIT = 50;

export const mockNotifications: NotificationsApi = {
  async list(limit = DEFAULT_LIMIT) {
    await delay();

    const rows = getDb()
      .notifications.slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);

    return clone(rows);
  },

  async markRead(id) {
    await delay(60);
    mutate((db) => {
      const row = db.notifications.find((n) => n.id === id);
      if (row) row.read = true;
    });
  },

  async markAllRead() {
    await delay(60);
    mutate((db) => {
      db.notifications.forEach((n) => {
        n.read = true;
      });
    });
  },
};
