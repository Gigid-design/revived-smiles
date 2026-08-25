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
 * numbers it renders — the averages and percentages arrive computed, so a real
 * backend and this prototype cannot disagree about them.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { api, ANALYTICS_RANGE_LABELS, ANALYTICS_RANGES } from "@/lib/api";
import type {
  AgentAnalytics,
  AgentAvailability,
  AgentPerformance,
  AnalyticsRangeKey,
  ChannelAnalytics,
  ChannelPerformance,
  TagAnalytics,
  TagUsage,
} from "@/lib/api";
import { useRealtimeContext } from "../AdminShell";
import { AgentCell, BarList, TopPerformerCard } from "./components/Primitives";
import { MetricTable, type Column } from "./components/MetricTable";
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
  const [range, setRange] = useState<AnalyticsRangeKey>("7d");
  const [mode, setMode] = useState<TableMode>("table");

  const [agents, setAgents] = useState<AgentAnalytics | null>(null);
  const [channels, setChannels] = useState<ChannelAnalytics | null>(null);
  const [tags, setTags] = useState<TagAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  /* All three tabs load together: switching tabs is then instant, and the
     three sections can never be showing two different ranges at once. */
  const fetchData = useCallback(async () => {
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
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData(); // eslint-disable-line react-hooks/set-state-in-effect -- data fetch on mount
  }, [fetchData, lastEvent]);

  /* The caption under the picker comes from the tag buckets, so it always
     describes the window the backend actually cut — not one recomputed here. */
  const rangeCaption = useMemo(() => (tags ? formatDayRange(tags.days) : ""), [tags]);

  /**
   * Exports whatever is on screen. Built in the page from data already loaded;
   * nothing leaves the browser to produce the file.
   */
  const handleDownload = useCallback(() => {
    if (tab === "agents" && agents) {
      if (agentView === "performance") {
        downloadCsv(
          `agent-performance-${range}.csv`,
          toCsv(
            ["Agent", "Closed tickets", "% of closed", "Average CSAT", "Tickets replied", "Messages sent", "First response", "Resolution time"],
            agents.performance.map((row) => [
              row.name,
              formatCount(row.closedTickets),
              formatPercent(row.pctOfClosedTickets),
              formatCsat(row.averageCsat),
              formatCount(row.ticketsReplied),
              formatCount(row.messagesSent),
              formatMinutes(row.firstResponseMinutes),
              formatMinutes(row.resolutionMinutes),
            ]),
          ),
        );
        return;
      }
      downloadCsv(
        `agent-availability-${range}.csv`,
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
        `channel-performance-${range}.csv`,
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
      downloadCsv(
        `tag-usage-${range}.csv`,
        toCsv(
          ["Tag", "Total", ...tags.days.map(formatDay)],
          tags.all.map((row) => [row.tag, String(row.total), ...row.perDay.map(String)]),
        ),
      );
    }
  }, [tab, agentView, agents, channels, tags, range]);

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
        <div className={styles.rangeGroup} role="group" aria-label="Date range">
          <span className={styles.rangeLabel}>Date</span>
          {ANALYTICS_RANGES.map((key) => (
            <button
              key={key}
              type="button"
              className={`${styles.rangeBtn} ${range === key ? styles.rangeBtnActive : ""}`}
              onClick={() => setRange(key)}
              aria-pressed={range === key}
            >
              {ANALYTICS_RANGE_LABELS[key]}
            </button>
          ))}
          {rangeCaption && <span className={styles.rangeCaption}>{rangeCaption}</span>}
        </div>

        <button type="button" className={styles.downloadBtn} onClick={handleDownload} disabled={loading}>
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

      {loading && <p className={styles.loading}>Loading analytics…</p>}

      {/* ---------------------------------------------------------- Agents */}
      {!loading && tab === "agents" && agents && (
        <>
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
      {!loading && tab === "channels" && channels && (
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
      {!loading && tab === "tags" && tags && (
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
                <p className={styles.cardSubtitle}>Every tag applied in the range, by day.</p>
              </div>
              <ModeToggle mode={mode} onChange={setMode} />
            </div>

            <MetricTable
              columns={tagColumns}
              rows={tags.all}
              rowKey={(row) => row.tag}
              heatmap={mode === "heatmap"}
              initialSort="total"
            />
          </section>
        </>
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
