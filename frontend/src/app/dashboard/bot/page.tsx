"use client";

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getBotActivityStats,
  getBotAuditLog,
  getBotModerationStats,
  listBots,
  type AuditLogEntry,
  type Bot,
  type HourlyStat,
  type ModerationStats,
  type StatsRange,
} from "@/lib/api";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type Tab = "activities" | "moderations" | "audit-log" | "configuration";

const RANGES: { label: string; value: StatsRange }[] = [
  { label: "48h", value: "48h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
];

function formatTick(iso: string, range: StatsRange) {
  const d = new Date(iso);
  if (range === "48h") {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatTooltipLabel(label: ReactNode) {
  const d = new Date(Number(label));
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BotMonitorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const uuid = searchParams.get("uuid") ?? "";
  const tab: Tab = (searchParams.get("tab") as Tab) || "activities";

  const [range, setRange] = useState<StatsRange>("48h");
  const [allStats, setAllStats] = useState<HourlyStat[] | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [modStats, setModStats] = useState<ModerationStats | null>(null);
  const [modStatsLoading, setModStatsLoading] = useState(false);
  const [bots, setBots] = useState<Bot[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Audit log state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditSender, setAuditSender] = useState("");
  const [auditFlagged, setAuditFlagged] = useState(false);
  // Submitted filter values (applied on search click or enter)
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedSender, setAppliedSender] = useState("");
  const [appliedFlagged, setAppliedFlagged] = useState(false);

  // Save last-visited bot UUID to localStorage
  useEffect(() => {
    if (uuid) {
      localStorage.setItem("lastBotUuid", uuid);
    }
  }, [uuid]);

  useEffect(() => {
    listBots().then(setBots).catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [dropdownOpen]);

  useEffect(() => {
    if (!uuid) return;
    if (tab !== "activities") return;
    setStatsLoading(true);
    getBotActivityStats(uuid)
      .then(setAllStats)
      .catch(() => setAllStats(null))
      .finally(() => setStatsLoading(false));
  }, [uuid, tab]);

  useEffect(() => {
    if (tab !== "moderations" || !uuid) return;
    setModStatsLoading(true);
    getBotModerationStats(uuid)
      .then((data) => {
        setModStats(data);
      })
      .catch(() => {
        setModStats(null);
      })
      .finally(() => setModStatsLoading(false));
  }, [tab, uuid]);

  useEffect(() => {
    if (tab !== "audit-log" || !uuid) return;
    setAuditLoading(true);
    getBotAuditLog({
      botId: uuid,
      page: auditPage,
      search: appliedSearch || undefined,
      sender: appliedSender || undefined,
      flagged: appliedFlagged || undefined,
    })
      .then((data) => {
        setAuditLogs(data.results);
        setAuditTotalPages(data.total_pages);
        setAuditTotal(data.total);
      })
      .catch(() => {
        setAuditLogs([]);
        setAuditTotalPages(1);
        setAuditTotal(0);
      })
      .finally(() => setAuditLoading(false));
  }, [tab, uuid, auditPage, appliedSearch, appliedSender, appliedFlagged]);

  const handleAuditFilter = () => {
    setAuditPage(1);
    setAppliedSearch(auditSearch);
    setAppliedSender(auditSender);
    setAppliedFlagged(auditFlagged);
  };

  const handleAuditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAuditFilter();
  };

  const RANGE_MS: Record<StatsRange, number> = { "48h": 48 * 3600_000, "7d": 7 * 86400_000, "30d": 30 * 86400_000 };

  const chartData = (() => {
    if (!allStats) return [];
    const cutoff = Date.now() - RANGE_MS[range];
    return allStats
      .filter((s) => new Date(s.hour).getTime() >= cutoff)
      .map((s) => ({ ...s, ts: new Date(s.hour).getTime() }));
  })();

  const TICK_COUNT: Record<StatsRange, number> = { "48h": 8, "7d": 7, "30d": 10 };

  function buildTicks(): number[] {
    if (chartData.length < 2) return chartData.map((d) => d.ts);
    const min = chartData[0].ts;
    const max = chartData[chartData.length - 1].ts;
    const count = TICK_COUNT[range];
    const step = (max - min) / count;
    const ticks: number[] = [];
    for (let i = 0; i <= count; i++) {
      ticks.push(min + step * i);
    }
    return ticks;
  }

  const tabLabels: Record<Tab, string> = {
    activities: "Activities",
    moderations: "Moderations",
    "audit-log": "Audit Logs",
    configuration: "Configuration",
  };

  const tabDescriptions: Record<Tab, string> = {
    activities: "Monitor chat volume and active users over time.",
    moderations: "Review flagged messages and moderation statistics.",
    "audit-log": "Browse all messages processed in the last 7 days.",
    configuration: "Manage bot settings, thresholds, and integrations.",
  };

  const currentBot = bots.find((b) => b.uuid === uuid);

  return (
    <div className="mx-auto w-full max-w-[1220px]">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{tabLabels[tab]}</h1>
          <p className="mt-1 text-sm text-text-muted">{tabDescriptions[tab]}</p>
        </div>

        {/* Bot selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex w-56 items-center gap-2 rounded-md border border-border-subtle bg-surface-card px-4 py-2.5 text-sm text-text-muted transition-colors hover:border-text-muted hover:text-text-primary"
          >
            <span className="min-w-0 flex-1 truncate text-left">
              {currentBot?.group_name ?? currentBot?.platform ?? uuid.slice(0, 8) + "..."}
            </span>
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
            </svg>
          </button>

          {dropdownOpen && bots.length > 0 && (
            <div className="absolute right-0 z-50 mt-1 w-56 rounded-md border border-border-subtle bg-surface-card py-1 shadow-lg">
              {bots.map((bot) => (
                <button
                  key={bot.uuid}
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push(`/dashboard/bot?uuid=${bot.uuid}&tab=${tab}`);
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors hover:bg-white/5 ${
                    bot.uuid === uuid ? "text-text-primary" : "text-text-muted"
                  }`}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                    {(bot.group_name ?? bot.platform).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {bot.group_name ?? bot.platform}
                    </p>
                    <p className="truncate font-mono text-[10px] text-text-muted/50">
                      {bot.uuid}
                    </p>
                  </div>
                  {bot.uuid === uuid && (
                    <svg className="h-4 w-4 shrink-0 text-accent" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tab content */}
      {tab === "activities" && (
        <div className="space-y-6">
          {/* Range selector */}
          <div className="mb-6 flex items-center gap-2">
            <span className="text-xs text-text-muted">Range:</span>
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  range === r.value
                    ? "bg-white/10 text-white"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Chat Activity Chart */}
          <div className="rounded-md border border-border-subtle bg-surface-card p-6">
            <h2 className="mb-4 text-sm font-medium text-text-muted">Chat Activity</h2>
            {statsLoading ? (
              <div className="flex h-72 items-center justify-center">
                <p className="text-sm text-text-muted">Loading stats...</p>
              </div>
            ) : !allStats || chartData.length === 0 ? (
              <div className="flex h-72 items-center justify-center">
                <p className="text-sm text-text-muted">No activity data available.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chatGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2025" />
                  <XAxis
                    dataKey="ts"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    ticks={buildTicks()}
                    tickFormatter={(v) => formatTick(new Date(v).toISOString(), range)}
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    axisLine={{ stroke: "#1f2025" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0b0c0f",
                      border: "1px solid #1f2025",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#9ca3af" }}
                    itemStyle={{ color: "#f97316" }}
                    labelFormatter={formatTooltipLabel}
                  />
                  <Area
                    type="monotone"
                    dataKey="chat_count"
                    name="Chats"
                    stroke="#f97316"
                    strokeWidth={1.5}
                    fill="url(#chatGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Active Users Chart */}
          <div className="rounded-md border border-border-subtle bg-surface-card p-6">
            <h2 className="mb-4 text-sm font-medium text-text-muted">Active Users</h2>
            {statsLoading ? (
              <div className="flex h-72 items-center justify-center">
                <p className="text-sm text-text-muted">Loading stats...</p>
              </div>
            ) : !allStats || chartData.length === 0 ? (
              <div className="flex h-72 items-center justify-center">
                <p className="text-sm text-text-muted">No activity data available.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2025" />
                  <XAxis
                    dataKey="ts"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    ticks={buildTicks()}
                    tickFormatter={(v) => formatTick(new Date(v).toISOString(), range)}
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    axisLine={{ stroke: "#1f2025" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0b0c0f",
                      border: "1px solid #1f2025",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#9ca3af" }}
                    itemStyle={{ color: "#06b6d4" }}
                    labelFormatter={formatTooltipLabel}
                  />
                  <Area
                    type="monotone"
                    dataKey="active_users"
                    name="Active Users"
                    stroke="#06b6d4"
                    strokeWidth={1.5}
                    fill="url(#usersGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {tab === "moderations" && (
        <div>
          {modStatsLoading ? (
            <div className="flex h-72 items-center justify-center rounded-md border border-border-subtle bg-surface-card">
              <p className="text-sm text-text-muted">Loading moderation stats...</p>
            </div>
          ) : !modStats || modStats.stats_by_period.length === 0 ? (
            <div className="flex h-72 items-center justify-center rounded-md border border-border-subtle bg-surface-card">
              <p className="text-sm text-text-muted">No moderation data available.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {modStats.stats_by_period.map((stat) => (
                  <div
                    key={stat.period}
                    className="rounded-md border border-border-subtle bg-surface-card p-6"
                  >
                    <div className="mb-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                        Last {stat.period}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-text-muted">Total Chats</p>
                        <p className="mt-1 text-3xl font-bold">{stat.total_chats}</p>
                      </div>

                      <div>
                        <p className="text-xs text-text-muted">Flagged Chats</p>
                        <div className="mt-1 flex items-baseline gap-2">
                          <p className="text-2xl font-bold text-red-400">{stat.flagged_chats}</p>
                          <p className="text-sm text-text-muted">
                            ({stat.flagging_percentage.toFixed(1)}%)
                          </p>
                        </div>
                      </div>

                      <div className="pt-2">
                        <div className="mb-2 flex items-center justify-between text-xs text-text-muted">
                          <span>Flagging Rate</span>
                          <span className="font-mono font-medium text-red-400">{stat.flagging_percentage.toFixed(1)}%</span>
                        </div>
                        <div className="relative h-2 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="absolute inset-y-0 left-0 bg-red-400"
                            style={{
                              width: `${Math.min(stat.flagging_percentage, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Flagged Messages */}
              {modStats && (
                <div className="rounded-md border border-border-subtle bg-surface-card p-6">
                  <h2 className="mb-4 text-sm font-medium text-text-muted">Recent Flagged Messages</h2>
                  {(modStats.flagged_messages?.length ?? 0) === 0 ? (
                    <div className="flex min-h-40 items-center justify-center rounded-md border border-border-subtle bg-white/5">
                      <p className="text-sm text-text-muted">No flagged messages</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {modStats.flagged_messages!.map((message, idx) => (
                        <div key={idx} className="flex gap-4 rounded-md border border-border-subtle bg-white/5 p-4">
                          <div className="flex-shrink-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-red-700/50 bg-red-900/30">
                              <span className="text-sm font-semibold text-red-400">
                                {(message.toxicity * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm text-neutral-200">{message.text}</p>
                            <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
                              {message.sender && (
                                <>
                                  <span>Sender: {message.sender}</span>
                                  <span>•</span>
                                </>
                              )}
                              <span>Time: {new Date(message.created_at).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "audit-log" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3 rounded-md border border-border-subtle bg-surface-card px-4 py-3">
            <div className="min-w-[140px]">
              <label className="mb-1 block text-[11px] font-medium text-text-muted">Sender</label>
              <input
                type="text"
                value={auditSender}
                onChange={(e) => setAuditSender(e.target.value)}
                onKeyDown={handleAuditKeyDown}
                placeholder="Filter by sender..."
                className="w-full rounded-md border border-border-subtle bg-surface px-2.5 py-1.5 text-sm text-text-primary placeholder-text-muted/50 outline-none focus:border-accent"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="mb-1 block text-[11px] font-medium text-text-muted">Search text</label>
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                onKeyDown={handleAuditKeyDown}
                placeholder="Search messages..."
                className="w-full rounded-md border border-border-subtle bg-surface px-2.5 py-1.5 text-sm text-text-primary placeholder-text-muted/50 outline-none focus:border-accent"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !auditFlagged;
                setAuditFlagged(next);
                setAuditPage(1);
                setAppliedSearch(auditSearch);
                setAppliedSender(auditSender);
                setAppliedFlagged(next);
              }}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                auditFlagged
                  ? "border-red-500/40 bg-red-500/10 text-red-400"
                  : "border-border-subtle bg-surface text-text-muted hover:border-text-muted hover:text-text-primary"
              }`}
            >
              Flagged only
            </button>
            <button
              onClick={handleAuditFilter}
              className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/80"
            >
              Filter
            </button>
          </div>

          {/* Results */}
          {auditLoading ? (
            <div className="flex h-64 items-center justify-center rounded-md border border-border-subtle bg-surface-card">
              <p className="text-sm text-text-muted">Loading messages...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-md border border-border-subtle bg-surface-card">
              <p className="text-sm text-text-muted">No messages found for the last 7 days.</p>
            </div>
          ) : (
            <div className="rounded-md border border-border-subtle bg-surface-card">
              {/* Table header */}
              <div className="grid grid-cols-[140px_1fr_100px_140px] gap-3 border-b border-border-subtle px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-text-muted">
                <span>Sender</span>
                <span>Message</span>
                <span>Toxicity</span>
                <span>Time</span>
              </div>
              {/* Table rows */}
              {auditLogs.map((entry) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-[140px_1fr_100px_140px] gap-3 border-b border-border-subtle px-4 py-3 last:border-b-0"
                >
                  <p className="truncate text-sm text-text-muted">{entry.sender || "—"}</p>
                  <p className="truncate text-sm text-text-primary">{entry.text}</p>
                  <div className="flex items-center">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                        entry.toxicity >= 0.6
                          ? "bg-red-900/30 text-red-400"
                          : "bg-white/5 text-text-muted"
                      }`}
                    >
                      {(entry.toxicity * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-text-muted">
                    {new Date(entry.created_at).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {auditTotalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-text-muted">
                {auditTotal} message{auditTotal !== 1 ? "s" : ""} total
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  disabled={auditPage <= 1}
                  className="rounded-md border border-border-subtle px-3 py-1 text-xs font-medium text-text-muted transition-colors hover:border-text-muted hover:text-text-primary disabled:opacity-30 disabled:hover:border-border-subtle disabled:hover:text-text-muted"
                >
                  Previous
                </button>
                <span className="text-xs text-text-muted">
                  Page {auditPage} of {auditTotalPages}
                </span>
                <button
                  onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                  disabled={auditPage >= auditTotalPages}
                  className="rounded-md border border-border-subtle px-3 py-1 text-xs font-medium text-text-muted transition-colors hover:border-text-muted hover:text-text-primary disabled:opacity-30 disabled:hover:border-border-subtle disabled:hover:text-text-muted"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "configuration" && (
        <div className="space-y-6">
          <div className="flex h-72 items-center justify-center rounded-md border border-border-subtle bg-surface-card">
            <div className="text-center">
              <svg className="mx-auto h-10 w-10 text-text-muted/40" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
              </svg>
              <p className="mt-3 text-sm font-medium text-text-muted">Bot Configuration</p>
              <p className="mt-1 text-xs text-text-muted/60">Manage bot settings, thresholds, and integrations here.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BotMonitorPage() {
  return (
    <Suspense>
      <BotMonitorContent />
    </Suspense>
  );
}
