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
 *
 * `npm run smoke` sets `JITI_TSCONFIG_PATHS=true`, and it has to: this file
 * imports the mock adapter, which imports `@/app/...`, and jiti does not read
 * tsconfig `paths` unless asked. Its CLI takes no flags and reads no config
 * file, so the environment variable is the only place to ask. Without it the
 * run dies on `Cannot find module '@/app/context/adjustmentConfig'` before a
 * single check executes — which is how this file sat unrunnable while the
 * demo data moved on underneath it.
 */

import {
  api,
  ANALYTICS_RANGES,
  ApiError,
  MAX_CUSTOM_RANGE_DAYS,
  PHOTO_TYPES,
} from "../src/lib/api";
import type {
  AgentAnalytics,
  AgentPerformance,
  AnalyticsRange,
  ImpressionPhoto,
  PhotoType,
} from "../src/lib/api";

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

  const resolvedId = await ensureSubmissionId();
  check("an order id resolves without signing in", Boolean(resolvedId), resolvedId);

  /* It resolves to the seeded demo order, which sits mid-review on purpose so
     the patient and admin portals open onto one live conversation without
     anyone walking intake first. That order is past `draft`, so the capture
     flow below runs against a draft of our own — otherwise the draft ->
     submitted transition never executes and sections 2 and 4 assert nothing. */
  const resolvedOrder = await api.submissions.getById(resolvedId);
  check(
    "and it is the seeded demo order, already past draft",
    resolvedOrder.status !== "draft",
    `status=${resolvedOrder.status}`,
  );

  const id = await api.submissions.createDraft(user?.email ?? "", user?.id ?? null);
  check("a new patient's draft starts empty and in draft", (await api.submissions.getById(id)).status === "draft", id);

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

  console.log("\n10. The six-screen adjustment request flow");
  const orderForAdj = await api.submissions.getMine();
  check("there's an order to adjust", Boolean(orderForAdj), orderForAdj?.orderNumber ?? "");
  const adjProduct = orderForAdj!.products[0];

  let noIssues: string | null = null;
  try {
    await api.adjustments.create({
      submissionId: orderForAdj!.id, product: adjProduct,
      issues: [], answers: {}, photos: {}, description: "anything",
    });
  } catch (err) {
    noIssues = err instanceof Error ? err.message : String(err);
  }
  check("a request with no issues is refused", noIssues !== null, noIssues ?? "it was allowed!");

  let wrongProduct: string | null = null;
  try {
    await api.adjustments.create({
      submissionId: orderForAdj!.id, product: "not-on-this-order",
      issues: ["fit"], answers: {}, photos: {}, description: "anything",
    });
  } catch (err) {
    wrongProduct = err instanceof Error ? err.message : String(err);
  }
  check("a product not on the order is refused", wrongProduct !== null, wrongProduct ?? "it was allowed!");

  const createdAdj = await api.adjustments.create({
    submissionId: orderForAdj!.id,
    product: adjProduct,
    issues: ["sore-spots", "tooth-shade"],
    answers: { woreForFiveDays: true, completedHotWaterActivation: true, newToothShade: "A3" },
    photos: { markedModels: "data:stub", onModels: "data:stub", inMouth: "data:stub" },
    description: "It rubs on the lower-left gum after about an hour.",
  });
  check("a request is created in pending", createdAdj.status === "pending", createdAdj.requestNumber);
  check("with a human request number", /^ADJ-/.test(createdAdj.requestNumber), createdAdj.requestNumber);

  const adjConversation = await api.messages.list(orderForAdj!.id);
  check(
    "it drops a recap into the order conversation",
    adjConversation.some((m) => m.body.includes(createdAdj.requestNumber)),
  );

  const forOrder = await api.adjustments.listForSubmission(orderForAdj!.id);
  check("it's listed against the order", forOrder.some((r) => r.id === createdAdj.id), `${forOrder.length} for this order`);

  const mineAdj = await api.adjustments.listMine();
  check("and in the patient's own list", mineAdj.some((r) => r.id === createdAdj.id));

  let reopenNoNote: string | null = null;
  try {
    await api.adjustments.decide(createdAdj.id, { status: "changes_requested", reviewedBy: "Admin User" });
  } catch (err) {
    reopenNoNote = err instanceof Error ? err.message : String(err);
  }
  check("reopening without a note is refused", reopenNoNote !== null, reopenNoNote ?? "it was allowed!");

  const approvedAdj = await api.adjustments.decide(createdAdj.id, {
    status: "approved",
    reviewedBy: "Admin User",
  });
  check(
    "approval sticks and stamps approvedAt",
    approvedAdj.status === "approved" && approvedAdj.approvedAt !== null,
    `status=${approvedAdj.status}`,
  );

  console.log("\n11. The support analytics contract");
  /* The Agents/Channels/Tags tabs are the one screen with no coverage here,
     and they are almost entirely shape: a chart that zips `perDay` against
     `days`, and top-performer cards derived from the same aggregate as the
     table beneath them. Both break silently — a misaligned array still plots,
     and a card that disagrees with its own table still renders. So assert the
     invariants the contract's doc comments promise, for every range the UI
     offers.

     Not asserted, because the mock cannot honour it: `AnalyticsApi` says a
     real backend must reject a patient session with `not_authorized`. The
     mock has no session check on these three calls, so there is nothing to
     test here until one exists. */
  /* Every window the picker can produce: the three presets, and a custom pair
     of calendar dates. The custom one is the interesting case — it takes the
     same code path but the caller, not the backend, chose the endpoints. */
  const utcDaysAgo = (days: number) =>
    new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

  const windows: { label: string; range: AnalyticsRange }[] = [
    ...ANALYTICS_RANGES.map((preset) => ({ label: preset, range: { preset } as AnalyticsRange })),
    {
      label: "custom",
      range: { preset: "custom", start: utcDaysAgo(45), end: utcDaysAgo(1) } as AnalyticsRange,
    },
  ];

  for (const { label, range } of windows) {
    const agents = await api.analytics.agents(range);

    check(
      `agents(${label}): the table has rows, ordered by closed tickets`,
      agents.performance.length > 0 &&
        agents.performance.every((row, i) =>
          i === 0 || agents.performance[i - 1].closedTickets >= row.closedTickets),
      `${agents.performance.length} agent(s)`,
    );
    check(
      `agents(${label}): the closed-ticket shares add up to 100%`,
      Math.abs(agents.performance.reduce((sum, r) => sum + r.pctOfClosedTickets, 0) - 100) < 0.01,
    );

    /* The card/table disagreement the contract warns about, checked head-on:
       every top-performer card must name a row in the table and carry that
       row's own number, not a separately computed one. */
    const cardValue: Record<string, (row: AgentPerformance) => number | null> = {
      averageCsat: (r) => r.averageCsat,
      firstResponseTime: (r) => r.firstResponseMinutes,
      resolutionTime: (r) => r.resolutionMinutes,
      closedTickets: (r) => r.closedTickets,
    };
    check(
      `agents(${label}): all four top-performer cards are present`,
      agents.topPerformers.length === 4 &&
        agents.topPerformers.every((card) => card.metric in cardValue),
      agents.topPerformers.map((c) => c.metric).join(", "),
    );
    check(
      `agents(${label}): every card agrees with its row in the table`,
      agents.topPerformers.every((card) => {
        if (!card.agent) return card.value === null;
        const row = agents.performance.find((r) => r.agentId === card.agent!.agentId);
        return Boolean(row) && cardValue[card.metric](row!) === card.value;
      }),
    );
    /* The speed cards are minimums where the others are maximums — a copied
       comparator here silently crowns the slowest agent on the team. */
    check(
      `agents(${label}): the speed cards name the fastest agent, not the slowest`,
      agents.topPerformers
        .filter((c) => c.metric === "firstResponseTime" || c.metric === "resolutionTime")
        .every((card) =>
          card.value === null ||
          agents.performance.every((r) => {
            const own = cardValue[card.metric](r);
            return own === null || own >= card.value!;
          })),
    );

    check(
      `agents(${label}): averages are null when there is nothing to average, never zero`,
      [agents.performanceAverage.averageCsat,
       agents.performanceAverage.firstResponseMinutes,
       agents.performanceAverage.resolutionMinutes]
        .every((v) => v === null || v > 0),
    );
    check(
      `agents(${label}): availability is ordered by time online`,
      agents.availability.length > 0 &&
        agents.availability.every((row, i) =>
          i === 0 || agents.availability[i - 1].onlineMinutes >= row.onlineMinutes),
    );
    check(
      `agents(${label}): an agent with no time online has no rate, not a division by zero`,
      agents.availability.every((row) =>
        row.onlineMinutes === 0
          ? row.ticketsPerOnlineHour === null
          : typeof row.ticketsPerOnlineHour === "number" &&
            Number.isFinite(row.ticketsPerOnlineHour)),
    );

    const channels = await api.analytics.channels(range);
    check(
      `channels(${label}): rows are ordered by tickets created`,
      channels.channels.length > 0 &&
        channels.channels.every((row, i) =>
          i === 0 || channels.channels[i - 1].createdTickets >= row.createdTickets),
      `${channels.channels.length} channel(s)`,
    );
    check(
      `channels(${label}): the created-ticket shares add up to 100%`,
      Math.abs(channels.channels.reduce((sum, r) => sum + r.pctOfCreatedTickets, 0) - 100) < 0.01,
    );
    /* The contract is explicit: a ticket created before the range can close
       inside it, so closes may exceed creates. Anyone "fixing" that with a
       clamp fails this check rather than the demo. */
    check(
      `channels(${label}): closes are not clamped to creates`,
      channels.channels.some((r) => r.closedTickets > r.createdTickets),
      "a ticket opened before the range can still close inside it",
    );

    const tags = await api.analytics.tags(range);
    check(
      `tags(${label}): every series is aligned to the shared x-axis`,
      tags.days.length > 0 && tags.all.every((t) => t.perDay.length === tags.days.length),
      `${tags.days.length} bucket(s), ${tags.all.length} tag(s)`,
    );
    check(
      `tags(${label}): buckets ascend, leaving the chart nothing to guess`,
      tags.days.every((day, i) =>
        i === 0 || new Date(tags.days[i - 1]).getTime() < new Date(day).getTime()),
    );
    check(
      `tags(${label}): quiet buckets are zeroes, not holes`,
      tags.all.every((t) => t.perDay.every((n) => typeof n === "number" && n >= 0)),
    );
    check(
      `tags(${label}): each total matches its own series`,
      tags.all.every((t) => t.perDay.reduce((sum, n) => sum + n, 0) === t.total),
    );
    check(
      `tags(${label}): tags are ordered by total, and topUsed is the head of that list`,
      tags.all.every((t, i) => i === 0 || tags.all[i - 1].total >= t.total) &&
        tags.topUsed.every((t, i) => t.tag === tags.all[i]?.tag),
      `top ${tags.topUsed.length} of ${tags.all.length}`,
    );

    /* Deterministic by design — the doc comment says so, because a chart that
       reshuffles itself on refresh teaches staff to distrust it. */
    check(
      `tags(${label}): the same range twice returns the same numbers`,
      JSON.stringify((await api.analytics.tags(range)).all) === JSON.stringify(tags.all),
    );
  }

  /* A custom range is the one window the caller composes itself, so it is the
     one the backend cannot trust. The contract names four rejections; the
     picker enforces them too, and none of that survives a crafted request.
     Asserted against all three methods, because a check that lives in only one
     of them is the kind of gap that ships. */
  const badRanges: { label: string; range: AnalyticsRange }[] = [
    {
      label: "an end before the start",
      range: { preset: "custom", start: utcDaysAgo(1), end: utcDaysAgo(30) },
    },
    {
      label: "an end in the future",
      range: { preset: "custom", start: utcDaysAgo(7), end: utcDaysAgo(-7) },
    },
    {
      label: `a window longer than ${MAX_CUSTOM_RANGE_DAYS} days`,
      range: {
        preset: "custom",
        start: utcDaysAgo(MAX_CUSTOM_RANGE_DAYS + 30),
        end: utcDaysAgo(1),
      },
    },
    {
      label: "a date that is not a date",
      range: { preset: "custom", start: "not-a-date", end: utcDaysAgo(1) },
    },
  ];

  for (const { label, range } of badRanges) {
    for (const method of ["agents", "channels", "tags"] as const) {
      let rejection: unknown = null;
      try {
        await api.analytics[method](range);
      } catch (err) {
        rejection = err;
      }
      check(
        `${method}: ${label} is rejected as a validation error`,
        rejection instanceof ApiError && rejection.code === "validation",
        rejection instanceof ApiError
          ? rejection.message
          : rejection === null
            ? "it was allowed!"
            : `threw ${String(rejection)}`,
      );
    }
  }

  /* Volume grows with the range; speed does not, because it is a rate. */
  const [week, quarter] = await Promise.all([
    api.analytics.agents({ preset: "7d" }),
    api.analytics.agents({ preset: "90d" }),
  ]);
  const closedIn = (a: AgentAnalytics) =>
    a.performance.reduce((sum, r) => sum + r.closedTickets, 0);
  check(
    "a longer range holds more tickets",
    closedIn(quarter) > closedIn(week),
    `${closedIn(week)} in 7d, ${closedIn(quarter)} in 90d`,
  );
  check(
    "but response times do not grow with it",
    week.performanceAverage.firstResponseMinutes ===
      quarter.performanceAverage.firstResponseMinutes,
    "first response is a rate, not a volume",
  );

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
