/**
 * Smoke test for the demo data layer.  Run with `npm run smoke`.
 *
 * Walks the mock adapter the way the screens do, with no browser and no
 * server, and fails loudly if a flow breaks. It exists because this app has no
 * other automated test, and two demo-breaking regressions (a file picker
 * opening instead of a photo appearing, and "We couldn't find your order" on
 * Continue) both got as far as a passing typecheck and a passing build.
 * Neither would survive this file.
 *
 * It runs through `jiti`, which Next.js already installs — no new dependency.
 */

import { api, PHOTO_TYPES } from "../src/lib/api";
import type { ImpressionPhoto, PhotoType } from "../src/lib/api";

let failures = 0;

function check(label: string, condition: boolean, detail = "") {
  const mark = condition ? "PASS" : "FAIL";
  if (!condition) failures++;
  console.log(`  [${mark}] ${label}${detail ? ` — ${detail}` : ""}`);
}

/**
 * What SubmissionContext.ensureSubmissionId() does, minus the React state.
 * `remembered` stands in for the id kept in sessionStorage.
 */
async function ensureSubmissionId(remembered?: string | null): Promise<string> {
  if (remembered) {
    try {
      await api.submissions.getById(remembered);
      return remembered;
    } catch {
      /* the order it pointed at is gone — re-resolve rather than wedge */
    }
  }

  const mine = await api.submissions.getMine();
  if (mine) return mine.id;

  const user = await api.auth.getUser();
  return api.submissions.createDraft(user?.email ?? "", user?.id ?? null);
}

async function main() {
  console.log("\n1. Entering the flow cold, with no sign-in (the reported bug)");
  const user = await api.auth.getUser();
  check("a patient is signed in by default", user !== null, user?.email);

  const id = await ensureSubmissionId();
  check("an order id resolves without signing in", Boolean(id), id);

  console.log("\n2. Impression photos -> Continue (this threw 'We couldn't find your order')");
  const impressions: ImpressionPhoto[] = [1, 2, 3, 4].map((slot) => ({
    slot: slot as ImpressionPhoto["slot"],
    url: "/assets/images/impression-example-good.svg",
    path: `stand-in/impression-${slot}`,
  }));

  let threw: string | null = null;
  let afterFinalize;
  try {
    afterFinalize = await api.submissions.finalize(id, impressions);
  } catch (err) {
    threw = err instanceof Error ? err.message : String(err);
  }
  check("Continue does not throw", threw === null, threw ?? "");
  check("the four impressions are saved", afterFinalize?.impressionPhotos.length === 4);
  check(
    "still a draft, because the teeth photos are missing",
    afterFinalize?.status === "draft",
    `status=${afterFinalize?.status}`,
  );

  /* The dashboard reads getMine() and marks the step done when
     impressionPhotos is non-empty — assert against that exact predicate, not
     just against what finalize handed back. */
  const asDashboardSeesIt = await api.submissions.getMine();
  check(
    "the dashboard would show 'Impression photos submitted' as done",
    (asDashboardSeesIt?.impressionPhotos.length ?? 0) > 0,
    `${asDashboardSeesIt?.impressionPhotos.length ?? 0} impression photo(s) on the saved order`,
  );
  check(
    "the Start Here video/instructions block would hide",
    (asDashboardSeesIt?.impressionPhotos.length ?? 0) > 0,
  );
  check(
    "and intake is still the next step, so its card stays",
    (asDashboardSeesIt?.closeBitePhotos.filter(Boolean).length ?? 0) < 2,
    "teeth photos not taken yet",
  );

  console.log("\n3. Tap-to-simulate on every capture surface");
  check("the adapter declares stand-in photos", api.photos.usesStandInPhotos === true);

  const impressionStandIn = await api.photos.standInPhoto("impression");
  check("an impression slot fills on tap", Boolean(impressionStandIn.url), impressionStandIn.url);

  for (const photoType of PHOTO_TYPES as PhotoType[]) {
    const standIn = await api.photos.standInPhoto(photoType);
    const analysis = await api.photos.analyze(standIn.url, photoType);
    await api.photos.attachToSubmission(id, photoType, standIn.url, analysis);
    check(`${photoType}: tap -> analyse -> save`, analysis.pass && analysis.checks.length > 0,
      `${analysis.checks.length} checks`);
  }

  console.log("\n4. Finishing the order now that everything is present");
  const done = await api.submissions.finalize(id, impressions);
  check("the order leaves draft and is submitted", done.status === "pending", `status=${done.status}`);
  check("both close-bite photos landed", done.closeBitePhotos.filter(Boolean).length === 2);
  check("both open-bite photos landed", done.openBitePhotos.filter(Boolean).length === 2);

  console.log("\n5. The admin side sees it");
  const stats = await api.submissions.stats();
  check("the admin queue has orders", stats.total > 0, `${stats.total} total, ${stats.pending} pending`);

  const listed = await api.submissions.list({ page: 0, pageSize: 25 });
  check("the list pages", listed.rows.length > 0 && listed.total >= listed.rows.length,
    `${listed.rows.length} of ${listed.total}`);
  check("this order appears in the queue", listed.rows.some((r) => r.id === id));

  const reviewed = await api.submissions.updateStatus(id, {
    status: "changes_requested",
    reviewedBy: "Admin User",
    reviewNotes: "Please retake the lower impression.",
  });
  check("an admin decision sticks", reviewed.status === "changes_requested" && reviewed.reviewedAt !== null);

  let rejectedWithoutNotes: string | null = null;
  try {
    await api.submissions.updateStatus(id, { status: "rejected", reviewedBy: "Admin User" });
  } catch (err) {
    rejectedWithoutNotes = err instanceof Error ? err.message : String(err);
  }
  check("rejecting without notes is refused", rejectedWithoutNotes !== null, rejectedWithoutNotes ?? "it was allowed!");

  console.log("\n6. One shared conversation, requests included");
  const sent = await api.messages.send(id, "Is the lower one okay now?", "patient", "Angela Carter");
  check("a patient message sends", sent.body.length > 0);

  const conversation = await api.messages.list(id);
  check(
    "it lands in the conversation",
    conversation.some((m) => m.id === sent.id),
    `${conversation.length} messages`,
  );

  /* The whole point of the redesign: the care team writes into the SAME
     conversation, so a reply actually reaches the patient. */
  const careReply = await api.messages.send(id, "Looks good from here.", "admin", "Revived Smiles Care");
  const afterReply = await api.messages.list(id);
  check(
    "a care-team reply reaches the patient's conversation",
    afterReply.some((m) => m.id === careReply.id),
    "patient and admin share one thread",
  );
  check(
    "and counts as unread for her",
    afterReply.some((m) => m.id === careReply.id && m.senderRole === "admin" && !m.readAt),
  );

  const request = await api.messages.sendRequest(id, "trays", "Trays too big", "They lift at the back.", "Angela Carter");
  check("a supplies request is a message in the conversation", request.request?.status === "pending");
  check("carrying the note she typed", request.body.includes("They lift at the back."));

  const accepted = await api.messages.setRequestStatus(request.id, "accepted");
  check("it can be accepted", accepted.request?.status === "accepted");
  check("and returns a tracking number", Boolean(accepted.request?.trackingNumber));

  const withDecision = await api.messages.list(id);
  check(
    "acceptance also posts the care team's reply into the conversation",
    withDecision.some((m) => m.senderRole === "admin" && m.body.includes(accepted.request!.trackingNumber!)),
  );
  check(
    "and /my-order can find the request without a separate store",
    withDecision.filter((m) => m.request).length > 0,
    `${withDecision.filter((m) => m.request).length} request(s) in the conversation`,
  );

  const notes = await api.notifications.list();
  check("notifications load", notes.length > 0, `${notes.length}`);
  await api.notifications.markAllRead();
  check("mark-all-read works", (await api.notifications.list()).every((n) => n.read));

  console.log("\n7. The subscription card behaves like a subscription");
  const [sub] = await api.subscriptions.list();
  check("a subscription loads", Boolean(sub), sub?.productName);
  check("with a next delivery in the future", new Date(sub.nextDeliveryAt).getTime() > Date.now());

  const before = new Date(sub.nextDeliveryAt).getTime();
  const skipped = await api.subscriptions.skipNext(sub.id);
  const expected = before + sub.intervalWeeks * 7 * 86_400_000;
  check(
    "skipping moves it on by exactly one interval",
    Math.abs(new Date(skipped.nextDeliveryAt).getTime() - expected) < 60_000,
    `${sub.intervalWeeks} weeks later`,
  );
  check("and records that a delivery was skipped", skipped.lastSkippedAt !== null);

  const target = new Date(Date.now() + 10 * 86_400_000).toISOString();
  const moved = await api.subscriptions.reschedule(sub.id, target);
  check("rescheduling lands on the chosen date", moved.nextDeliveryAt === target);

  let pastRejected: string | null = null;
  try {
    await api.subscriptions.reschedule(sub.id, new Date(Date.now() - 5 * 86_400_000).toISOString());
  } catch (err) {
    pastRejected = err instanceof Error ? err.message : String(err);
  }
  check("a date in the past is refused", pastRejected !== null, pastRejected ?? "it was allowed!");

  let farRejected: string | null = null;
  try {
    await api.subscriptions.reschedule(sub.id, new Date(Date.now() + 400 * 86_400_000).toISOString());
  } catch (err) {
    farRejected = err instanceof Error ? err.message : String(err);
  }
  check(
    "and so is pushing it out indefinitely",
    farRejected !== null,
    "a delivery moved forever is a cancellation in disguise",
  );

  const paused = await api.subscriptions.setStatus(sub.id, "paused");
  check("it can be paused", paused.status === "paused");
  let skipWhilePaused: string | null = null;
  try {
    await api.subscriptions.skipNext(sub.id);
  } catch (err) {
    skipWhilePaused = err instanceof Error ? err.message : String(err);
  }
  check("and a paused subscription has nothing to skip", skipWhilePaused !== null);
  await api.subscriptions.setStatus(sub.id, "active");

  console.log("\n8. Admin sign-in");
  let badAdmin: string | null = null;
  try {
    await api.auth.signInAdmin("nobody@example.com", "whatever");
  } catch (err) {
    badAdmin = err instanceof Error ? err.message : String(err);
  }
  check("a non-staff address is refused", badAdmin !== null, badAdmin ?? "it was allowed!");

  const admin = await api.auth.signInAdmin("admin@revivedsmiles.com", "anything");
  check("staff sign-in works with any password", admin.role === "Admin", admin.name);

  console.log("\n8. Signing in lands in the same place as the skip-login shortcut");
  const beforeSignIn = await api.submissions.getMine();

  const signedIn = await api.auth.signIn("someone.entirely.different@example.com", "any-password");
  check("any address signs in", signedIn.email === "angela@example.com", `resolved to ${signedIn.email}`);

  const afterSignIn = await ensureSubmissionId();
  check(
    "and adopts the demo order rather than an empty new draft",
    afterSignIn === beforeSignIn?.id,
    `${beforeSignIn?.id} -> ${afterSignIn}`,
  );

  const stillMine = await api.submissions.getMine();
  check(
    "the dashboard still shows the populated order",
    stillMine?.id === beforeSignIn?.id && (stillMine?.products.length ?? 0) > 0,
    `${stillMine?.products.length ?? 0} product(s), status=${stillMine?.status}`,
  );

  console.log("\n9. A remembered order id that no longer exists");
  /* The id is kept separately from the demo data, so it outlives what it
     points at — a reseeded demo, a cleared backend, a deleted order. It used
     to wedge Continue with "that order could not be found" until storage was
     cleared by hand. */
  const recovered = await ensureSubmissionId("sub-thisorderisgone");
  check(
    "a stale id is discarded and a real order resolves",
    recovered !== "sub-thisorderisgone" && Boolean(recovered),
    `recovered to ${recovered}`,
  );

  let staleThrew: string | null = null;
  try {
    await api.submissions.finalize(recovered, impressions);
  } catch (err) {
    staleThrew = err instanceof Error ? err.message : String(err);
  }
  check("and Continue works afterwards", staleThrew === null, staleThrew ?? "");

  console.log(
    failures === 0
      ? "\nAll checks passed.\n"
      : `\n${failures} CHECK(S) FAILED.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\nHarness crashed:", err);
  process.exit(1);
});
