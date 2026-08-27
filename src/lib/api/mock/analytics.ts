/**
 * Support analytics for the staff portal.
 *
 * The prototype has no ticketing system behind it, so these numbers are
 * fabricated — but fabricated *deterministically*. Every figure derives from a
 * fixed table and a seeded generator, so the same range always returns the same
 * values: a chart that reshuffles itself on every refresh teaches staff to
 * distrust it, and makes the design impossible to review.
 *
 * The shapes are the point. When a real backend arrives it must satisfy
 * `AnalyticsApi` in `../contract`, and the doc comments there — not this file —
 * are the specification.
 */

import type { AnalyticsApi } from "../contract";
import type {
  AgentAnalytics,
  AgentAvailability,
  AgentPerformance,
  AnalyticsRange,
  ChannelAnalytics,
  ChannelPerformance,
  CompanyMetric,
  CompanySummary,
  TagUsage,
  TopPerformer,
} from "../types";
import { analyticsRangeDays, analyticsRangeSlug, ApiError, MAX_CUSTOM_RANGE_DAYS } from "../types";
import { delay } from "./store";

/* ------------------------------------------------------------------ *
 * Determinism
 * ------------------------------------------------------------------ */

/** mulberry32 — small, fast, and identical on server and client. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Turns a string into a stable seed, so each tag gets its own wobble. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ------------------------------------------------------------------ *
 * Ranges
 * ------------------------------------------------------------------ */

/** Today at UTC midnight, the last day any range may include. */
function todayUtc(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

/**
 * A validated range, reduced to the two things the rest of this file needs.
 *
 * The checks here mirror the ones the contract requires of a real backend, and
 * exist for the same reason: the picker enforces them too, and none of that
 * survives someone calling the method directly.
 */
interface ResolvedRange {
  /** Days in the window, inclusive of both endpoints. */
  days: number;
  /** UTC midnight of the last day in the window. */
  endMs: number;
}

function resolveRange(range: AnalyticsRange): ResolvedRange {
  const days = analyticsRangeDays(range);

  if (days === null) {
    throw new ApiError("validation", "The end date must fall on or after the start date.");
  }
  if (days > MAX_CUSTOM_RANGE_DAYS) {
    throw new ApiError(
      "validation",
      `A custom range can cover at most ${MAX_CUSTOM_RANGE_DAYS} days.`,
    );
  }

  if (range.preset !== "custom") return { days, endMs: todayUtc() };

  const endMs = Date.parse(`${range.end}T00:00:00Z`);
  if (endMs > todayUtc()) {
    throw new ApiError("validation", "A range cannot end in the future.");
  }

  return { days, endMs };
}

/**
 * Volume scales with the range, but not linearly — the team was smaller three
 * months ago, so 90 days holds less than 90/7 of a week.
 *
 * The exponent is chosen so the three presets land on the figures this file
 * shipped with (7d → 1, 30d → 3.6, 90d → 9.4); a custom range now interpolates
 * along the same curve instead of falling off a lookup table.
 */
function rangeVolume(resolved: ResolvedRange): number {
  return Math.pow(resolved.days / 7, 0.88);
}

function scale(base: number, resolved: ResolvedRange): number {
  return Math.round(base * rangeVolume(resolved));
}

/* ------------------------------------------------------------------ *
 * The team
 * ------------------------------------------------------------------ */

interface AgentSeed {
  agentId: string;
  name: string;
  avatarUrl: string | null;
  /** Weekly baselines. Everything else is derived from these. */
  closedTickets: number;
  ticketsReplied: number;
  messagesSent: number;
  averageCsat: number | null;
  firstResponseMinutes: number | null;
  resolutionMinutes: number | null;
  onlineMinutes: number;
  awayMinutes: number;
  offlineMinutes: number;
}

/* Angela Carter is the seeded admin in `seed.ts` — she appears here too so the
   signed-in reviewer can find her own row. */
const AGENTS: AgentSeed[] = [
  {
    agentId: "agt_carter",
    name: "Angela Carter",
    avatarUrl: null,
    closedTickets: 63,
    ticketsReplied: 71,
    messagesSent: 118,
    averageCsat: 4.7,
    firstResponseMinutes: 71,
    resolutionMinutes: 1109,
    onlineMinutes: 1880,
    awayMinutes: 240,
    offlineMinutes: 280,
  },
  {
    agentId: "agt_michelson",
    name: "Annika Michelson",
    avatarUrl: null,
    closedTickets: 58,
    ticketsReplied: 64,
    messagesSent: 97,
    averageCsat: 4.6,
    firstResponseMinutes: 96,
    resolutionMinutes: 1342,
    onlineMinutes: 1810,
    awayMinutes: 195,
    offlineMinutes: 395,
  },
  {
    agentId: "agt_vaughn",
    name: "Daija Vaughn",
    avatarUrl: null,
    closedTickets: 44,
    ticketsReplied: 57,
    messagesSent: 101,
    averageCsat: 4.4,
    firstResponseMinutes: 112,
    resolutionMinutes: 1089,
    onlineMinutes: 1655,
    awayMinutes: 310,
    offlineMinutes: 435,
  },
  {
    agentId: "agt_naranjo",
    name: "Isaac Naranjo",
    avatarUrl: null,
    closedTickets: 36,
    ticketsReplied: 39,
    messagesSent: 62,
    averageCsat: 4.5,
    firstResponseMinutes: 47,
    resolutionMinutes: 1520,
    onlineMinutes: 1420,
    awayMinutes: 180,
    offlineMinutes: 700,
  },
  {
    agentId: "agt_okonjo",
    name: "Ruth Okonjo",
    avatarUrl: null,
    closedTickets: 21,
    ticketsReplied: 26,
    messagesSent: 44,
    averageCsat: 4.9,
    firstResponseMinutes: 88,
    resolutionMinutes: 967,
    onlineMinutes: 940,
    awayMinutes: 120,
    offlineMinutes: 1240,
  },
  {
    agentId: "agt_delacroix",
    name: "Marc Delacroix",
    avatarUrl: null,
    closedTickets: 14,
    ticketsReplied: 18,
    messagesSent: 29,
    /* New this quarter — not enough responses to score yet. The table must
       render this as an em dash, not as 0.0. */
    averageCsat: null,
    firstResponseMinutes: 134,
    resolutionMinutes: 1783,
    onlineMinutes: 720,
    awayMinutes: 95,
    offlineMinutes: 1485,
  },
];

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/* ------------------------------------------------------------------ *
 * Channels
 * ------------------------------------------------------------------ */

interface ChannelSeed {
  channelId: string;
  label: string;
  createdTickets: number;
  /** Closes run slightly ahead of creates — the backlog is coming down. */
  closeRatio: number;
  handleTimeMinutes: number | null;
  firstResponseMinutes: number | null;
  averageCsat: number | null;
}

/* The channels this product actually has: in-app chat carries the impression
   review conversation, the rest are how patients reach out around it. */
const CHANNELS: ChannelSeed[] = [
  {
    channelId: "app-chat",
    label: "App Chat",
    createdTickets: 96,
    closeRatio: 1.04,
    handleTimeMinutes: 7,
    firstResponseMinutes: 34,
    averageCsat: 4.7,
  },
  {
    channelId: "email",
    label: "Email",
    createdTickets: 61,
    closeRatio: 0.94,
    handleTimeMinutes: 12,
    firstResponseMinutes: 233,
    averageCsat: 4.3,
  },
  {
    channelId: "contact-form",
    label: "Contact Form",
    createdTickets: 24,
    closeRatio: 1.11,
    handleTimeMinutes: 5,
    firstResponseMinutes: 176,
    averageCsat: 4.4,
  },
  {
    channelId: "sms",
    label: "SMS",
    createdTickets: 18,
    closeRatio: 1.0,
    handleTimeMinutes: 4,
    firstResponseMinutes: 41,
    averageCsat: 4.6,
  },
  {
    channelId: "phone",
    label: "Phone",
    createdTickets: 11,
    closeRatio: 1.0,
    handleTimeMinutes: 14,
    firstResponseMinutes: 1,
    averageCsat: 4.8,
  },
  {
    channelId: "instagram-dm",
    label: "Instagram DM",
    createdTickets: 7,
    closeRatio: 1.07,
    handleTimeMinutes: 3,
    firstResponseMinutes: 58,
    averageCsat: null,
  },
  {
    channelId: "facebook-messenger",
    label: "Facebook Messenger",
    createdTickets: 4,
    closeRatio: 1.0,
    handleTimeMinutes: 3,
    firstResponseMinutes: 62,
    averageCsat: null,
  },
];

/* ------------------------------------------------------------------ *
 * Tags
 * ------------------------------------------------------------------ */

/** Weekly baseline uses, keyed by tag. Drawn from what this app is about. */
const TAGS: { tag: string; weekly: number }[] = [
  { tag: "Impressions Review", weekly: 41 },
  { tag: "Retake Requested", weekly: 28 },
  { tag: "Insufficient Coverage", weekly: 22 },
  { tag: "Order Status", weekly: 19 },
  { tag: "Adjustment", weekly: 16 },
  { tag: "Distortion", weekly: 13 },
  { tag: "Shipping", weekly: 11 },
  { tag: "Insurance", weekly: 9 },
  { tag: "Positive", weekly: 8 },
  { tag: "Refund / Exchange", weekly: 6 },
  { tag: "Complaint", weekly: 5 },
  { tag: "Negative", weekly: 3 },
];

/**
 * Days covered by one bucket.
 *
 * Windows past six weeks are bucketed weekly, past nine months monthly-ish, so
 * a table of per-bucket columns stays readable at any range the picker allows.
 */
function bucketSpan(resolved: ResolvedRange): number {
  if (resolved.days <= 45) return 1;
  if (resolved.days <= 280) return 7;
  return 28;
}

/** How many chart buckets a range gets. */
function bucketCount(resolved: ResolvedRange): number {
  return Math.max(1, Math.ceil(resolved.days / bucketSpan(resolved)));
}

/**
 * Bucket start dates, ascending, ending on the last day of the range.
 *
 * Cut at UTC midnight rather than the caller's timezone, matching the note in
 * the contract: two staff in two timezones must see the same day totals.
 */
function bucketDates(resolved: ResolvedRange): string[] {
  const span = bucketSpan(resolved);
  const count = bucketCount(resolved);
  const dayMs = 86400000;

  return Array.from({ length: count }, (_, i) => {
    const offset = (count - 1 - i) * span * dayMs;
    return new Date(resolved.endMs - offset).toISOString();
  });
}

/** A tag's per-bucket counts: its baseline, wobbled by its own stable seed. */
function tagSeries(tag: string, weekly: number, resolved: ResolvedRange): number[] {
  const count = bucketCount(resolved);
  const span = bucketSpan(resolved);
  const perBucket = (weekly / 7) * span;
  const random = seeded(hash(tag));

  return Array.from({ length: count }, () => {
    /* ±45%, so the lines cross each other instead of running parallel. */
    const wobble = 0.55 + random() * 0.9;
    return Math.max(0, Math.round(perBucket * wobble));
  });
}

/* ------------------------------------------------------------------ *
 * Implementation
 * ------------------------------------------------------------------ */

/** Averages the non-null values, or returns null when there are none. */
function meanOf(values: (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) return null;
  return present.reduce((sum, value) => sum + value, 0) / present.length;
}

/** The agent with the lowest value of a metric, ignoring agents without one. */
function fastest(
  rows: AgentPerformance[],
  pick: (row: AgentPerformance) => number | null,
): AgentPerformance | null {
  const ranked = rows
    .filter((row) => pick(row) !== null)
    .sort((a, b) => (pick(a) as number) - (pick(b) as number));
  return ranked[0] ?? null;
}

/** The agent with the highest value of a metric, ignoring agents without one. */
function highest(
  rows: AgentPerformance[],
  pick: (row: AgentPerformance) => number | null,
): AgentPerformance | null {
  const ranked = rows
    .filter((row) => pick(row) !== null)
    .sort((a, b) => (pick(b) as number) - (pick(a) as number));
  return ranked[0] ?? null;
}

/**
 * The whole-team band above the agent tables.
 *
 * Counts are totals across the team; CSAT and the two times are means. The
 * previous-window figures are fabricated the way everything else here is — a
 * drift seeded from the metric and the range — so a given range always shows
 * the same deltas, and the design can be reviewed against a screen that holds
 * still. Most tiles improve; a couple do not, because a band that can only
 * render green has not been designed.
 */
function companySummary(performance: AgentPerformance[], range: AnalyticsRange): CompanySummary {
  const slug = analyticsRangeSlug(range);

  const total = (pick: (row: AgentPerformance) => number): number =>
    performance.reduce((sum, row) => sum + pick(row), 0);

  /* The three volume metrics move together, off one drift: a week that closed
     more tickets did not also send fewer messages, and a band that claimed so
     would be the first thing anyone reviewing it noticed. */
  const volumeRandom = seeded(hash(`${slug}:volume`));
  const volumeRose = volumeRandom() < 0.72;
  const volumeMagnitude = 0.04 + volumeRandom() * 0.18;

  function previousOf(value: number | null, key: string, lowerIsBetter: boolean, unit: string) {
    if (value === null) return null;

    const random = seeded(hash(`${slug}:${key}`));

    let improved: boolean;
    let magnitude: number;

    if (unit === "count") {
      improved = volumeRose;
      /* ±15% around the shared figure, so the three tiles aren't identical. */
      magnitude = volumeMagnitude * (0.85 + random() * 0.3);
    } else if (unit === "csat") {
      improved = random() < 0.72;
      /* A satisfaction score out of five does not move by a fifth in a week.
         Half a percent to five is what a real quarter of CSAT looks like. */
      magnitude = 0.005 + random() * 0.045;
    } else {
      improved = random() < 0.72;
      magnitude = 0.04 + random() * 0.18;
    }

    /* Improving means the current figure beat the old one: lower for a time,
       higher for a count. So the previous window sits on the other side. */
    const previous = improved === lowerIsBetter ? value * (1 + magnitude) : value * (1 - magnitude);

    return unit === "csat" ? Math.min(5, previous) : previous;
  }

  const base: Omit<CompanyMetric, "previous">[] = [
    {
      key: "closedTickets",
      label: "Closed tickets",
      value: total((row) => row.closedTickets),
      unit: "count",
      lowerIsBetter: false,
    },
    {
      key: "firstResponseMinutes",
      label: "First response",
      value: meanOf(performance.map((row) => row.firstResponseMinutes)),
      unit: "minutes",
      lowerIsBetter: true,
    },
    {
      key: "resolutionMinutes",
      label: "Resolution time",
      value: meanOf(performance.map((row) => row.resolutionMinutes)),
      unit: "minutes",
      lowerIsBetter: true,
    },
    {
      key: "averageCsat",
      label: "Average CSAT",
      value: meanOf(performance.map((row) => row.averageCsat)),
      unit: "csat",
      lowerIsBetter: false,
    },
    {
      key: "ticketsReplied",
      label: "Tickets replied",
      value: total((row) => row.ticketsReplied),
      unit: "count",
      lowerIsBetter: false,
    },
    {
      key: "messagesSent",
      label: "Messages sent",
      value: total((row) => row.messagesSent),
      unit: "count",
      lowerIsBetter: false,
    },
  ];

  return {
    activeAgents: performance.length,
    metrics: base.map((metric) => ({
      ...metric,
      previous: previousOf(metric.value, metric.key, metric.lowerIsBetter, metric.unit),
    })),
  };
}

function identityOf(row: AgentPerformance | null) {
  if (!row) return null;
  return {
    agentId: row.agentId,
    name: row.name,
    initials: row.initials,
    avatarUrl: row.avatarUrl,
  };
}

export const mockAnalytics: AnalyticsApi = {
  async agents(range) {
    await delay();
    const resolved = resolveRange(range);

    const closedByAgent = AGENTS.map((agent) => scale(agent.closedTickets, resolved));
    const totalClosed = closedByAgent.reduce((sum, value) => sum + value, 0);
    const rangeFactor = rangeVolume(resolved);

    const performance: AgentPerformance[] = AGENTS.map((agent, index) => ({
      agentId: agent.agentId,
      name: agent.name,
      initials: initialsOf(agent.name),
      avatarUrl: agent.avatarUrl,
      closedTickets: closedByAgent[index],
      pctOfClosedTickets: totalClosed === 0 ? 0 : (closedByAgent[index] / totalClosed) * 100,
      averageCsat: agent.averageCsat,
      ticketsReplied: scale(agent.ticketsReplied, resolved),
      messagesSent: scale(agent.messagesSent, resolved),
      /* Speed is a rate, not a volume — it does not grow with the range. */
      firstResponseMinutes: agent.firstResponseMinutes,
      resolutionMinutes: agent.resolutionMinutes,
    })).sort((a, b) => b.closedTickets - a.closedTickets);

    const availability: AgentAvailability[] = AGENTS.map((agent) => {
      const onlineMinutes = Math.round(agent.onlineMinutes * rangeFactor);
      const closed = scale(agent.closedTickets, resolved);
      return {
        agentId: agent.agentId,
        name: agent.name,
        initials: initialsOf(agent.name),
        avatarUrl: agent.avatarUrl,
        onlineMinutes,
        awayMinutes: Math.round(agent.awayMinutes * rangeFactor),
        offlineMinutes: Math.round(agent.offlineMinutes * rangeFactor),
        ticketsPerOnlineHour: onlineMinutes === 0 ? null : closed / (onlineMinutes / 60),
      };
    }).sort((a, b) => b.onlineMinutes - a.onlineMinutes);

    const topCsat = highest(performance, (row) => row.averageCsat);
    const topFirstResponse = fastest(performance, (row) => row.firstResponseMinutes);
    const topResolution = fastest(performance, (row) => row.resolutionMinutes);
    const topClosed = highest(performance, (row) => row.closedTickets);

    const topPerformers: TopPerformer[] = [
      {
        metric: "averageCsat",
        label: "Average CSAT",
        agent: identityOf(topCsat),
        value: topCsat?.averageCsat ?? null,
        unit: "csat",
      },
      {
        metric: "firstResponseTime",
        label: "First response time",
        agent: identityOf(topFirstResponse),
        value: topFirstResponse?.firstResponseMinutes ?? null,
        unit: "minutes",
      },
      {
        metric: "resolutionTime",
        label: "Resolution time",
        agent: identityOf(topResolution),
        value: topResolution?.resolutionMinutes ?? null,
        unit: "minutes",
      },
      {
        metric: "closedTickets",
        label: "Closed tickets",
        agent: identityOf(topClosed),
        value: topClosed?.closedTickets ?? null,
        unit: "count",
      },
    ];

    const performanceAverage: AgentAnalytics["performanceAverage"] = {
      closedTickets: Math.round(totalClosed / performance.length),
      pctOfClosedTickets: 100 / performance.length,
      averageCsat: meanOf(performance.map((row) => row.averageCsat)),
      ticketsReplied: Math.round(
        performance.reduce((sum, row) => sum + row.ticketsReplied, 0) / performance.length,
      ),
      messagesSent: Math.round(
        performance.reduce((sum, row) => sum + row.messagesSent, 0) / performance.length,
      ),
      firstResponseMinutes: meanOf(performance.map((row) => row.firstResponseMinutes)),
      resolutionMinutes: meanOf(performance.map((row) => row.resolutionMinutes)),
    };

    return {
      company: companySummary(performance, range),
      topPerformers,
      performance,
      availability,
      performanceAverage,
    };
  },

  async channels(range) {
    await delay();
    const resolved = resolveRange(range);

    const created = CHANNELS.map((channel) => scale(channel.createdTickets, resolved));
    const totalCreated = created.reduce((sum, value) => sum + value, 0);

    const channels: ChannelPerformance[] = CHANNELS.map((channel, index) => ({
      channelId: channel.channelId,
      label: channel.label,
      createdTickets: created[index],
      pctOfCreatedTickets: totalCreated === 0 ? 0 : (created[index] / totalCreated) * 100,
      closedTickets: Math.round(created[index] * channel.closeRatio),
      handleTimeMinutes: channel.handleTimeMinutes,
      firstResponseMinutes: channel.firstResponseMinutes,
      averageCsat: channel.averageCsat,
    })).sort((a, b) => b.createdTickets - a.createdTickets);

    const channelAverage: ChannelAnalytics["channelAverage"] = {
      createdTickets: Math.round(totalCreated / channels.length),
      pctOfCreatedTickets: 100 / channels.length,
      closedTickets: Math.round(
        channels.reduce((sum, row) => sum + row.closedTickets, 0) / channels.length,
      ),
      handleTimeMinutes: meanOf(channels.map((row) => row.handleTimeMinutes)),
      firstResponseMinutes: meanOf(channels.map((row) => row.firstResponseMinutes)),
      averageCsat: meanOf(channels.map((row) => row.averageCsat)),
    };

    return { channels, channelAverage };
  },

  async tags(range) {
    await delay();
    const resolved = resolveRange(range);

    const days = bucketDates(resolved);

    const all: TagUsage[] = TAGS.map(({ tag, weekly }) => {
      const perDay = tagSeries(tag, weekly, resolved);
      return {
        tag,
        total: perDay.reduce((sum, value) => sum + value, 0),
        perDay,
      };
    }).sort((a, b) => b.total - a.total);

    return { days, topUsed: all.slice(0, 8), all };
  },
};
