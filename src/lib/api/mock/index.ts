/**
 * The demo backend.
 *
 * Implements the whole `ApiClient` contract against seeded in-memory data, so
 * every screen works with no server, no API keys and no network. This folder
 * is the only thing that gets deleted when a real backend arrives.
 */

import type { ApiClient } from "../contract";
import { mockAdjustments } from "./adjustments";
import { mockAuth } from "./auth";
import { mockInsurance } from "./insurance";
import { mockMessages } from "./messages";
import { mockNotifications } from "./notifications";
import { mockPhotos } from "./photos";
import { mockPrompts } from "./prompts";
import { mockShipping } from "./shipping";
import { mockSubmissions } from "./submissions";
import { mockSubscriptions } from "./subscriptions";

export const mockApi: ApiClient = {
  auth: mockAuth,
  submissions: mockSubmissions,
  photos: mockPhotos,
  messages: mockMessages,
  notifications: mockNotifications,
  prompts: mockPrompts,
  subscriptions: mockSubscriptions,
  insurance: mockInsurance,
  adjustments: mockAdjustments,
  shipping: mockShipping,
};

export { resetDb } from "./store";
export {
  CARE_TEAM_NAME,
  DEMO_ADMIN_EMAIL,
  DEMO_IMPRESSION_PHOTO,
  DEMO_PATIENT,
  DEMO_PHOTOS,
  DEMO_SUBMISSION_ID,
} from "./seed";
