"use client";

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getBotAuditLog,
  getBotStats,
  listBots,
  type AuditLogEntry,
  type Bot,
  type BotStats,
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

type Tab = "activities" | "audit-log" | "configuration";

type FilterDef = {
  id: string;
  name: string;
  description: string;
  Icon: (props: { className?: string }) => ReactNode;
};

const FILTERS: FilterDef[] = [
  {
    id: "hate-speech",
    name: "Hate Speech",
    description: "Detect slurs, discrimination, and hateful content targeting groups.",
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M9.401 3.003c1.155-2.003 4.043-2.003 5.197 0l7.355 12.748c1.154 2.001-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.499-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    id: "nsfw",
    name: "NSFW Content",
    description: "Block sexually explicit or adult-oriented messages.",
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM6.165 6.165a8.25 8.25 0 0111.67 11.67L6.165 6.165zM12 20.25a8.25 8.25 0 01-6.75-12.97l11.72 11.72a8.21 8.21 0 01-4.97 1.25z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    id: "spamming",
    name: "Spamming",
    description: "Suppress repetitive messages, mass-tags, and link spam.",
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
        <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
      </svg>
    ),
  },
  {
    id: "self-promotion",
    name: "Self-Promotion",
    description: "Catch unsolicited advertising, referral links, and self-marketing.",
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M9.638 1.093a.75.75 0 01.724 0l2 1.104a.75.75 0 11-.724 1.313L10 2.607l-1.638.903a.75.75 0 11-.724-1.313l2-1.104zM5.403 4.287a.75.75 0 01-.295 1.019l-.805.444.805.444a.75.75 0 01-.724 1.314L3.5 6.866v.633a.75.75 0 01-1.5 0v-1.9a.75.75 0 01.388-.658l1.996-1.1a.75.75 0 011.019.296zm9.194 0a.75.75 0 011.02-.295l1.995 1.1A.75.75 0 0118 5.75v1.9a.75.75 0 01-1.5 0v-.633l-.884.488a.75.75 0 11-.724-1.314l.806-.444-.806-.444a.75.75 0 01-.295-1.02zM7.343 8.284a.75.75 0 011.02-.294L10 8.893l1.638-.903a.75.75 0 11.724 1.313l-1.612.89v1.557a.75.75 0 01-1.5 0v-1.557l-1.612-.89a.75.75 0 01-.295-1.019zM2.75 11.5a.75.75 0 01.75.75v1.704l1.273-.764a.75.75 0 11.772 1.286l-1.71 1.025 1.71 1.025a.75.75 0 11-.772 1.286L3.5 17.046v1.704a.75.75 0 01-1.5 0V12.25a.75.75 0 01.75-.75zm14.5 0a.75.75 0 01.75.75v6.5a.75.75 0 01-1.5 0v-1.704l-1.273.764a.75.75 0 11-.772-1.286l1.71-1.025-1.71-1.025a.75.75 0 11.772-1.286l1.273.764V12.25a.75.75 0 01.75-.75zM10 13a.75.75 0 01.75.75v1.557l1.612.89a.75.75 0 01-.724 1.313L10 16.607l-1.638.903a.75.75 0 11-.724-1.313l1.612-.89V13.75A.75.75 0 0110 13z" clipRule="evenodd" />
        <path d="M2.617 19.534a.75.75 0 011.02-.295l.805.444V18.5a.75.75 0 011.5 0v1.9a.75.75 0 01-.388.659l-1.996 1.1a.75.75 0 11-.94-1.225z" />
      </svg>
    ),
  },
  {
    id: "diff-speech",
    name: "Diff Speech",
    description: "Detect divisive or inflammatory rhetoric that escalates conflict.",
    Icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97zM6.75 8.25a.75.75 0 01.75-.75h9a.75.75 0 010 1.5h-9a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H7.5z" clipRule="evenodd" />
      </svg>
    ),
  },
];

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
  const [stats, setStats] = useState<BotStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
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

  // Configuration filters state
  const [filterSettings, setFilterSettings] = useState<Record<string, { enabled: boolean }>>(() =>
    Object.fromEntries(FILTERS.map((f) => [f.id, { enabled: true }])),
  );

  const toggleFilter = (id: string) => {
    setFilterSettings((prev) => ({
      ...prev,
      [id]: { enabled: !prev[id].enabled },
    }));
  };

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
    getBotStats(uuid)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, [uuid, tab]);

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
    if (!stats) return [];
    const cutoff = Date.now() - RANGE_MS[range];
    return stats.hourly_records
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
    "audit-log": "Audit Logs",
    configuration: "Configuration",
  };

  const tabDescriptions: Record<Tab, string> = {
    activities: "Monitor chat volume, active users, and recent moderation activity.",
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

          {/* Chat Activity & Active Users */}
          <div className="rounded-md border border-border-subtle bg-surface-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium text-text-muted">Chat Activity & Active Users</h2>
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#5a9ee8]" />
                  Chats
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#65c193]" />
                  Active Users
                </span>
              </div>
            </div>
            {statsLoading ? (
              <div className="flex h-72 items-center justify-center">
                <p className="text-sm text-text-muted">Loading stats...</p>
              </div>
            ) : !stats || chartData.length === 0 ? (
              <div className="flex h-72 items-center justify-center">
                <p className="text-sm text-text-muted">No activity data available.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chatGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5a9ee8" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#5a9ee8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#65c193" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#65c193" stopOpacity={0} />
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
                    yAxisId="left"
                    orientation="left"
                    allowDecimals={false}
                    tick={{ fill: "#5a9ee8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    allowDecimals={false}
                    tick={{ fill: "#65c193", fontSize: 11 }}
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
                      padding: "8px 12px",
                      lineHeight: "18px",
                    }}
                    labelStyle={{ color: "#9ca3af", marginBottom: "4px", lineHeight: "18px" }}
                    itemStyle={{ padding: 0, margin: 0, lineHeight: "18px" }}
                    labelFormatter={formatTooltipLabel}
                    itemSorter={(item) => (item.dataKey === "chat_count" ? 0 : 1)}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="chat_count"
                    name="Chats"
                    stroke="#5a9ee8"
                    strokeWidth={1.5}
                    fill="url(#chatGrad)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="active_users"
                    name="Active Users"
                    stroke="#65c193"
                    strokeWidth={1.5}
                    fill="url(#usersGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Moderation — Last 12 Hours */}
          <div className="rounded-md border border-border-subtle bg-surface-card p-6">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-sm font-medium text-text-muted">Flagged Messages</h2>
              <span className="text-xs text-text-muted">Last 12 hours</span>
            </div>
            {statsLoading ? (
              <div className="flex min-h-40 items-center justify-center">
                <p className="text-sm text-text-muted">Loading...</p>
              </div>
            ) : !stats ? (
              <div className="flex min-h-40 items-center justify-center">
                <p className="text-sm text-text-muted">No moderation data available.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-text-muted">Flagged Count</p>
                  <p className="mt-1 text-3xl font-bold text-red-400">{stats.flagged_count}</p>
                </div>
                {stats.flagged_messages.length === 0 ? (
                  <div className="flex min-h-32 items-center justify-center rounded-md border border-border-subtle bg-white/5">
                    <p className="text-sm text-text-muted">No flagged messages in the last 12 hours</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.flagged_messages.map((message, idx) => (
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
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {FILTERS.map((filter) => {
            const settings = filterSettings[filter.id];
            return (
              <div
                key={filter.id}
                className="flex flex-col rounded-md bg-surface-card"
              >
                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/5 text-text-primary">
                      <filter.Icon className="h-6 w-6" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-text-primary">
                        {filter.name}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-text-muted">
                        {filter.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border-subtle px-5 py-3">
                  <button
                    type="button"
                    onClick={() => toggleFilter(filter.id)}
                    className="flex items-center gap-2.5"
                  >
                    <span
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
                        settings.enabled ? "bg-accent" : "bg-white/10"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                          settings.enabled ? "translate-x-[18px]" : "translate-x-0.5"
                        }`}
                      />
                    </span>
                    <span className="text-xs font-medium text-text-muted">
                      {settings.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
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
