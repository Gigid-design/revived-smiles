"use client";

/**
 * Analytics — Agents, Channels and Tags.
 *
 * One destination rather than three nav items: the three tabs answer the same
 * question ("how is support doing over this window") and share the one range
 * picker, so splitting them across the sidebar would put three near-identical
 * screens next to each other.
 *
 * Everything comes from `api.analytics`. This screen does no arithmetic on the
 * numbers it renders — the averages, percentages and company-wide figures
 * arrive computed, so a real backend and this prototype cannot disagree about
 * them. The one thing it does compute is the tag filter, which is a search over
 * text already on screen rather than a claim about the data.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { api, analyticsRangeSlug, ApiError } from "@/lib/api";
import type {
  AgentAnalytics,
  AgentAvailability,
  AgentPerformance,
  AnalyticsRange,
  ChannelAnalytics,
  ChannelPerformance,
  TagAnalytics,
  TagUsage,
} from "@/lib/api";
import { useRealtimeContext } from "../AdminShell";
import { AgentCell, BarList, CompanyBand, TopPerformerCard } from "./components/Primitives";
import { MetricTable, type Column } from "./components/MetricTable";
import { RangePicker } from "./components/RangePicker";
import { TrendChart } from "./components/TrendChart";
import {
  downloadCsv,
  formatCount,
  formatCsat,
  formatDay,
  formatDecimal,
  formatDayRange,
  formatMinutes,
  formatPercent,
  toCsv,
} from "./format";
import styles from "./page.module.css";

type Tab = "agents" | "channels" | "tags";
type AgentView = "performance" | "availability";
type TableMode = "table" | "heatmap";

const TABS: { id: Tab; label: string }[] = [
  { id: "agents", label: "Agents" },
  { id: "channels", label: "Channels" },
  { id: "tags", label: "Tags" },
];

/* ------------------------------------------------------------------ *
 * Column definitions
 * ------------------------------------------------------------------ */

const AGENT_COLUMNS: Column<AgentPerformance>[] = [
  {
    key: "agent",
    label: "Agent",
    identity: true,
    render: (row) => <AgentCell agent={row} />,
  },
  {
    key: "closedTickets",
    label: "Closed tickets",
    hint: "Tickets this agent moved to closed inside the range, whenever they were opened.",
    unit: "count",
    value: (row) => row.closedTickets,
  },
  {
    key: "pctOfClosedTickets",
    label: "% of closed tickets",
    hint: "This agent's share of every ticket the team closed in the range.",
    unit: "percent",
    value: (row) => row.pctOfClosedTickets,
  },
  {
    key: "averageCsat",
    label: "Average CSAT",
    hint: "Mean satisfaction score out of 5. Blank until an agent has responses to average.",
    unit: "csat",
    value: (row) => row.averageCsat,
  },
  {
    key: "ticketsReplied",
    label: "Tickets replied",
    hint: "Distinct tickets the agent sent at least one message on.",
    unit: "count",
    value: (row) => row.ticketsReplied,
  },
  {
    key: "messagesSent",
    label: "Messages sent",
    hint: "Total outbound messages, so a ticket answered five times counts five.",
    unit: "count",
    value: (row) => row.messagesSent,
  },
  {
    key: "firstResponseMinutes",
    label: "First response",
    hint: "Median wait between a patient writing in and this agent's first reply.",
    unit: "minutes",
    value: (row) => row.firstResponseMinutes,
    lowerIsBetter: true,
  },
  {
    key: "resolutionMinutes",
    label: "Resolution time",
    hint: "Median time from a ticket opening to the agent closing it.",
    unit: "minutes",
    value: (row) => row.resolutionMinutes,
    lowerIsBetter: true,
  },
];

const AVAILABILITY_COLUMNS: Column<AgentAvailability>[] = [
  {
    key: "agent",
    label: "Agent",
    identity: true,
    render: (row) => <AgentCell agent={row} />,
  },
  {
    key: "onlineMinutes",
    label: "Online",
    hint: "Time the agent was accepting tickets.",
    unit: "minutes",
    value: (row) => row.onlineMinutes,
  },
  {
    key: "awayMinutes",
    label: "Away",
    hint: "Time the agent was signed in but paused.",
    unit: "minutes",
    value: (row) => row.awayMinutes,
    lowerIsBetter: true,
  },
  {
    key: "offlineMinutes",
    label: "Offline",
    hint: "Rostered time the agent was signed out.",
    unit: "minutes",
    value: (row) => row.offlineMinutes,
    lowerIsBetter: true,
  },
  {
    key: "ticketsPerOnlineHour",
    label: "Closed / online hour",
    hint: "Closed tickets divided by hours online — throughput, not effort.",
    unit: "decimal",
    value: (row) => row.ticketsPerOnlineHour,
  },
];

const CHANNEL_COLUMNS: Column<ChannelPerformance>[] = [
  {
    key: "channel",
    label: "Channel",
    identity: true,
    render: (row) => <span className={styles.channelName}>{row.label}</span>,
  },
  {
    key: "createdTickets",
    label: "Created tickets",
    hint: "Tickets that first arrived on this channel during the range.",
    unit: "count",
    value: (row) => row.createdTickets,
  },
  {
    key: "pctOfCreatedTickets",
    label: "% of created tickets",
    hint: "This channel's share of everything created in the range.",
    unit: "percent",
    value: (row) => row.pctOfCreatedTickets,
  },
  {
    key: "closedTickets",
    label: "Closed tickets",
    hint: "Closes inside the range. May exceed created — older tickets close too.",
    unit: "count",
    value: (row) => row.closedTickets,
  },
  {
    key: "handleTimeMinutes",
    label: "Handle time",
    hint: "Time actually spent working the ticket, not how long it sat open.",
    unit: "minutes",
    value: (row) => row.handleTimeMinutes,
    lowerIsBetter: true,
  },
  {
    key: "firstResponseMinutes",
    label: "First response",
    hint: "Median wait for the first reply on this channel.",
    unit: "minutes",
    value: (row) => row.firstResponseMinutes,
    lowerIsBetter: true,
  },
  {
    key: "averageCsat",
    label: "Average CSAT",
    hint: "Mean satisfaction score out of 5 for tickets on this channel.",
    unit: "csat",
    value: (row) => row.averageCsat,
  },
];

/* ------------------------------------------------------------------ */

export default function AdminAnalyticsPage() {
  const { lastEvent } = useRealtimeContext();

  const [tab, setTab] = useState<Tab>("agents");
  const [agentView, setAgentView] = useState<AgentView>("performance");
  const [range, setRange] = useState<AnalyticsRange>({ preset: "7d" });
  const [mode, setMode] = useState<TableMode>("table");
  const [tagQuery, setTagQuery] = useState("");

  const [agents, setAgents] = useState<AgentAnalytics | null>(null);
  const [channels, setChannels] = useState<ChannelAnalytics | null>(null);
  const [tags, setTags] = useState<TagAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* All three tabs load together: switching tabs is then instant, and the
     three sections can never be showing two different ranges at once. */
  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [agentData, channelData, tagData] = await Promise.all([
        api.analytics.agents(range),
        api.analytics.channels(range),
        api.analytics.tags(range),
      ]);
      setAgents(agentData);
      setChannels(channelData);
      setTags(tagData);
    } catch (err) {
      console.error("Failed to load analytics:", err);
      /* A rejected range is the user's mistake to fix, so it gets their words
         back; anything else is ours, and saying "invalid range" for a dropped
         connection would send them hunting through the date fields. */
      setError(
        err instanceof ApiError && err.code === "validation"
          ? err.message
          : "Could not load analytics. Try again in a moment.",
      );
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData(); // eslint-disable-line react-hooks/set-state-in-effect -- data fetch on mount
  }, [fetchData, lastEvent]);

  /* The caption beside the picker comes from the tag buckets, so it always
     describes the window the backend actually cut — not one recomputed here.
     A custom range doesn't get one: its pill already reads the two dates, and
     repeating them three inches to the right is noise. */
  const rangeCaption = useMemo(
    () => (tags && range.preset !== "custom" ? formatDayRange(tags.days) : ""),
    [tags, range],
  );

  /**
   * The tag rows the table and the export both work from (Aug 25 — "can we add
   * a search function?").
   *
   * Filtered here rather than in the API: the response already carries every
   * tag used in the range, so a round trip per keystroke would fetch data the
   * browser is holding.
   */
  const filteredTags = useMemo(() => {
    if (!tags) return [];
    const query = tagQuery.trim().toLowerCase();
    if (!query) return tags.all;
    return tags.all.filter((row) => row.tag.toLowerCase().includes(query));
  }, [tags, tagQuery]);

  /**
   * Exports whatever is on screen. Built in the page from data already loaded;
   * nothing leaves the browser to produce the file.
   */
  const handleDownload = useCallback(() => {
    const slug = analyticsRangeSlug(range);

    if (tab === "agents" && agents) {
      if (agentView === "performance") {
        /* The company-wide row leads the file rather than being left on screen:
           the two Aug 25 asks — company totals and "we can download the data" —
           are the same ask when the numbers are going into a spreadsheet. */
        const company = Object.fromEntries(
          agents.company.metrics.map((metric) => [metric.key, metric.value]),
        );

        downloadCsv(
          `agent-performance-${slug}.csv`,
          toCsv(
            ["Agent", "Closed tickets", "% of closed", "Average CSAT", "Tickets replied", "Messages sent", "First response", "Resolution time"],
            [
              [
                "Company-wide",
                formatCount(company.closedTickets ?? null),
                formatPercent(100),
                formatCsat(company.averageCsat ?? null),
                formatCount(company.ticketsReplied ?? null),
                formatCount(company.messagesSent ?? null),
                formatMinutes(company.firstResponseMinutes ?? null),
                formatMinutes(company.resolutionMinutes ?? null),
              ],
              ...agents.performance.map((row) => [
                row.name,
                formatCount(row.closedTickets),
                formatPercent(row.pctOfClosedTickets),
                formatCsat(row.averageCsat),
                formatCount(row.ticketsReplied),
                formatCount(row.messagesSent),
                formatMinutes(row.firstResponseMinutes),
                formatMinutes(row.resolutionMinutes),
              ]),
            ],
          ),
        );
        return;
      }
      downloadCsv(
        `agent-availability-${slug}.csv`,
        toCsv(
          ["Agent", "Online", "Away", "Offline", "Closed per online hour"],
          agents.availability.map((row) => [
            row.name,
            formatMinutes(row.onlineMinutes),
            formatMinutes(row.awayMinutes),
            formatMinutes(row.offlineMinutes),
            formatDecimal(row.ticketsPerOnlineHour),
          ]),
        ),
      );
      return;
    }

    if (tab === "channels" && channels) {
      downloadCsv(
        `channel-performance-${slug}.csv`,
        toCsv(
          ["Channel", "Created tickets", "% of created", "Closed tickets", "Handle time", "First response", "Average CSAT"],
          channels.channels.map((row) => [
            row.label,
            formatCount(row.createdTickets),
            formatPercent(row.pctOfCreatedTickets),
            formatCount(row.closedTickets),
            formatMinutes(row.handleTimeMinutes),
            formatMinutes(row.firstResponseMinutes),
            formatCsat(row.averageCsat),
          ]),
        ),
      );
      return;
    }

    if (tab === "tags" && tags) {
      /* Exports the filtered list, not the full one: the button says "download
         data", and the data is what the search left on screen. */
      downloadCsv(
        `tag-usage-${slug}.csv`,
        toCsv(
          ["Tag", "Total", ...tags.days.map(formatDay)],
          filteredTags.map((row) => [row.tag, String(row.total), ...row.perDay.map(String)]),
        ),
      );
    }
  }, [tab, agentView, agents, channels, tags, filteredTags, range]);

  const tagColumns: Column<TagUsage>[] = useMemo(() => {
    if (!tags) return [];
    return [
      {
        key: "tag",
        label: "Tag name",
        identity: true,
        render: (row) => <span className={styles.tagName}>{row.tag}</span>,
      },
      {
        key: "total",
        label: "Total",
        hint: "Times this tag was applied across the range.",
        unit: "count",
        value: (row) => row.total,
      },
      ...tags.days.map((day, index) => ({
        key: day,
        label: formatDay(day),
        unit: "count" as const,
        value: (row: TagUsage) => row.perDay[index] ?? 0,
      })),
    ];
  }, [tags]);

  return (
    <div className={styles.page}>
      {/* Range + export */}
      <div className={styles.toolbar}>
        <div className={styles.rangeArea}>
          <RangePicker range={range} onChange={setRange} />
          {rangeCaption && <span className={styles.rangeCaption}>{rangeCaption}</span>}
        </div>

        <button
          type="button"
          className={styles.downloadBtn}
          onClick={handleDownload}
          disabled={loading || Boolean(error)}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 2v8M4.5 7l3.5 3 3.5-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2.5 13h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Download data
        </button>
      </div>

      {/* Section tabs */}
      <div className={styles.tabs} role="tablist" aria-label="Analytics section">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`${styles.tab} ${tab === item.id ? styles.tabActive : ""}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && !error && <p className={styles.loading}>Loading analytics…</p>}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {/* ---------------------------------------------------------- Agents */}
      {!loading && !error && tab === "agents" && agents && (
        <>
          <CompanyBand summary={agents.company} range={range} />

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Top performers</h2>
            <div className={styles.performerGrid}>
              {agents.topPerformers.map((performer) => (
                <TopPerformerCard key={performer.metric} performer={performer} />
              ))}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.subTabs} role="tablist" aria-label="Agent view">
                <button
                  type="button"
                  role="tab"
                  aria-selected={agentView === "performance"}
                  className={`${styles.subTab} ${agentView === "performance" ? styles.subTabActive : ""}`}
                  onClick={() => setAgentView("performance")}
                >
                  Agent Performance
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={agentView === "availability"}
                  className={`${styles.subTab} ${agentView === "availability" ? styles.subTabActive : ""}`}
                  onClick={() => setAgentView("availability")}
                >
                  Agent Availability
                </button>
              </div>

              <ModeToggle mode={mode} onChange={setMode} />
            </div>

            {agentView === "performance" ? (
              <MetricTable
                columns={AGENT_COLUMNS}
                rows={agents.performance}
                rowKey={(row) => row.agentId}
                averages={agents.performanceAverage as unknown as Record<string, number | null>}
                averageHint="The team mean across every agent active in this range."
                heatmap={mode === "heatmap"}
                initialSort="closedTickets"
              />
            ) : (
              <MetricTable
                columns={AVAILABILITY_COLUMNS}
                rows={agents.availability}
                rowKey={(row) => row.agentId}
                heatmap={mode === "heatmap"}
                initialSort="onlineMinutes"
              />
            )}
          </section>
        </>
      )}

      {/* -------------------------------------------------------- Channels */}
      {!loading && !error && tab === "channels" && channels && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Channel performance</h2>
              <p className={styles.cardSubtitle}>
                Where patients reach out, and how quickly each channel gets answered.
              </p>
            </div>
            <ModeToggle mode={mode} onChange={setMode} />
          </div>

          <MetricTable
            columns={CHANNEL_COLUMNS}
            rows={channels.channels}
            rowKey={(row) => row.channelId}
            averages={channels.channelAverage as unknown as Record<string, number | null>}
            averageHint="The mean across every channel with traffic in this range."
            heatmap={mode === "heatmap"}
            initialSort="createdTickets"
          />
        </section>
      )}

      {/* ------------------------------------------------------------ Tags */}
      {!loading && !error && tab === "tags" && tags && (
        <>
          <div className={styles.tagTop}>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Top used tags</h2>
                  <p className={styles.cardSubtitle}>The eight most applied across the range.</p>
                </div>
              </div>
              <div className={styles.cardBody}>
                <BarList items={tags.topUsed} />
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Trend</h2>
                  <p className={styles.cardSubtitle}>Hover for a day. Click a tag to hide it.</p>
                </div>
              </div>
              <div className={styles.cardBody}>
                <TrendChart days={tags.days} series={tags.topUsed} />
              </div>
            </section>
          </div>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>All used tags</h2>
                <p className={styles.cardSubtitle}>
                  {tagQuery.trim()
                    ? `${filteredTags.length} of ${tags.all.length} tags match "${tagQuery.trim()}".`
                    : "Every tag applied in the range, by day."}
                </p>
              </div>

              <div className={styles.cardTools}>
                <TagSearch value={tagQuery} onChange={setTagQuery} />
                <ModeToggle mode={mode} onChange={setMode} />
              </div>
            </div>

            <MetricTable
              columns={tagColumns}
              rows={filteredTags}
              rowKey={(row) => row.tag}
              heatmap={mode === "heatmap"}
              initialSort="total"
              emptyMessage={`No tag matches "${tagQuery.trim()}".`}
            />
          </section>
        </>
      )}
    </div>
  );
}

/**
 * Search over the tag vocabulary (Aug 25 — "search for a specific tag").
 *
 * Filters as you type, with no submit: the list is already in the browser, so
 * there is nothing to wait for, and a button would only add a step between the
 * question and the answer.
 */
function TagSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className={styles.search}>
      <svg
        className={styles.searchIcon}
        width="15"
        height="15"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>

      <input
        type="search"
        className={styles.searchInput}
        placeholder="Search tags"
        aria-label="Search tags"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />

      {value && (
        <button
          type="button"
          className={styles.searchClear}
          onClick={() => onChange("")}
          aria-label="Clear tag search"
        >
          ×
        </button>
      )}
    </div>
  );
}

/** Table / Heatmap switch, shared by all three tabs. */
function ModeToggle({ mode, onChange }: { mode: TableMode; onChange: (mode: TableMode) => void }) {
  return (
    <div className={styles.modeToggle} role="group" aria-label="Table display">
      <button
        type="button"
        className={`${styles.modeBtn} ${mode === "table" ? styles.modeBtnActive : ""}`}
        onClick={() => onChange("table")}
        aria-pressed={mode === "table"}
      >
        Table
      </button>
      <button
        type="button"
        className={`${styles.modeBtn} ${mode === "heatmap" ? styles.modeBtnActive : ""}`}
        onClick={() => onChange("heatmap")}
        aria-pressed={mode === "heatmap"}
      >
        Heatmap
      </button>
    </div>
  );
}
