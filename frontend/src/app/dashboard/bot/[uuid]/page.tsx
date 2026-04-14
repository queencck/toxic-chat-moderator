"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  isAuthenticated,
  logout,
  getBotActivityStats,
  getBotModerationStats,
  listBots,
  type Bot,
  type HourlyStat,
  type AllRangesActivityStats,
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

const TABS = ["Activities", "Moderations"] as const;
type Tab = (typeof TABS)[number];

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
  if (range === "7d") {
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
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

export default function BotMonitorPage() {
  const params = useParams<{ uuid: string }>();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("Activities");
  const [range, setRange] = useState<StatsRange>("48h");
  const [allStats, setAllStats] = useState<AllRangesActivityStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [modStats, setModStats] = useState<ModerationStats | null>(null);
  const [modStatsLoading, setModStatsLoading] = useState(false);
  const [bot, setBot] = useState<Bot | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    if (!params.uuid) return;
    listBots()
      .then((bots) => setBot(bots.find((b) => b.uuid === params.uuid) ?? null))
      .catch(() => {});
  }, [router, params.uuid]);

  useEffect(() => {
    if (!params.uuid) return;
    if (tab !== "Activities") return;
    setStatsLoading(true);
    getBotActivityStats(params.uuid)
      .then(setAllStats)
      .catch(() => setAllStats(null))
      .finally(() => setStatsLoading(false));
  }, [params.uuid, tab]);

  useEffect(() => {
    if (tab !== "Moderations" || !params.uuid) return;
    setModStatsLoading(true);
    getBotModerationStats(params.uuid)
      .then((data) => {
        
        setModStats(data);
      })
      .catch((err) => {
        setModStats(null);
      })
      .finally(() => setModStatsLoading(false));
  }, [tab, params.uuid]);


  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleCopyUUID = () => {
    navigator.clipboard.writeText(params.uuid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const chartData = (allStats?.[`range_${range}` as keyof AllRangesActivityStats] || []).map((s) => ({
    ...s,
    ts: new Date(s.hour).getTime(),
  }));

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

  return (
    <div className="flex min-h-screen">
      {/* Nav Panel */}
      <nav className="flex w-77 shrink-0 flex-col border-r border-neutral-800 bg-neutral-950">
        <div className="border-b border-neutral-800 px-6 py-6">
          <span className="text-xl font-bold tracking-tight">TCM</span>
          <span className="ml-2 text-sm text-neutral-500">Dashboard</span>
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <a
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-base text-neutral-400 hover:bg-neutral-900 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
            </svg>
            Home
          </a>
          <a
            href="#"
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-base text-neutral-400 hover:bg-neutral-900 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Analytics
          </a>
          <a
            href="#"
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-base text-neutral-400 hover:bg-neutral-900 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </a>
        </div>

        <div className="border-t border-neutral-800 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-base text-neutral-400 hover:bg-neutral-900 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 px-16 py-12">
        <div className="w-full">
          {/* Header */}
          <div className="mb-8 flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-900 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold tracking-tight">Bot Monitor</h1>
          </div>

          {/* Bot Info */}
          <div className="mb-8 grid grid-cols-4 gap-4">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-5 py-4">
              <p className="text-xs text-neutral-500">UUID</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="truncate font-mono text-sm text-neutral-400">{params.uuid}</p>
                <button
                  onClick={handleCopyUUID}
                  className="flex-shrink-0 rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300 transition-colors"
                  title="Copy UUID"
                >
                  {copied ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-5 py-4">
              <p className="text-xs text-neutral-500">Platform</p>
              <p className="mt-1 text-sm font-medium">{bot?.platform ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-5 py-4">
              <p className="text-xs text-neutral-500">Status</p>
              <p className="mt-1 text-sm font-medium">
                {bot ? (
                  <span className={bot.is_active ? "text-green-400" : "text-neutral-400"}>
                    {bot.is_active ? "Active" : "Inactive"}
                  </span>
                ) : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-5 py-4">
              <p className="text-xs text-neutral-500">Created</p>
              <p className="mt-1 text-sm font-medium">
                {bot ? new Date(bot.created_at).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" }) : "—"}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex gap-1 border-b border-neutral-800">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                  tab === t
                    ? "border-b-2 border-white text-white"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === "Activities" && (
            <div className="space-y-6">
              {/* Range selector */}
              <div className="mb-6 flex items-center gap-2">
                <span className="text-xs text-neutral-500">Range:</span>
                {RANGES.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setRange(r.value)}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                      range === r.value
                        ? "bg-neutral-800 text-white"
                        : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Chat Activity Chart */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6">
                <h2 className="mb-4 text-sm font-medium text-neutral-300">Chat Activity</h2>
                {statsLoading ? (
                  <div className="flex h-72 items-center justify-center">
                    <p className="text-sm text-neutral-500">Loading stats...</p>
                  </div>
                ) : !allStats || chartData.length === 0 ? (
                  <div className="flex h-72 items-center justify-center">
                    <p className="text-sm text-neutral-500">No activity data available.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="chatGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis
                        dataKey="ts"
                        type="number"
                        domain={["dataMin", "dataMax"]}
                        ticks={buildTicks()}
                        tickFormatter={(v) => formatTick(new Date(v).toISOString(), range)}
                        tick={{ fill: "#737373", fontSize: 11 }}
                        axisLine={{ stroke: "#262626" }}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "#737373", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0a0a0a",
                          border: "1px solid #262626",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        labelStyle={{ color: "#a3a3a3" }}
                        itemStyle={{ color: "#ffffff" }}
                        labelFormatter={formatTooltipLabel}
                      />
                      <Area
                        type="monotone"
                        dataKey="chat_count"
                        name="Chats"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                        fill="url(#chatGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Active Users Chart */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6">
                <h2 className="mb-4 text-sm font-medium text-neutral-300">Active Users</h2>
                {statsLoading ? (
                  <div className="flex h-72 items-center justify-center">
                    <p className="text-sm text-neutral-500">Loading stats...</p>
                  </div>
                ) : !allStats || chartData.length === 0 ? (
                  <div className="flex h-72 items-center justify-center">
                    <p className="text-sm text-neutral-500">No activity data available.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis
                        dataKey="ts"
                        type="number"
                        domain={["dataMin", "dataMax"]}
                        ticks={buildTicks()}
                        tickFormatter={(v) => formatTick(new Date(v).toISOString(), range)}
                        tick={{ fill: "#737373", fontSize: 11 }}
                        axisLine={{ stroke: "#262626" }}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "#737373", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0a0a0a",
                          border: "1px solid #262626",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        labelStyle={{ color: "#a3a3a3" }}
                        itemStyle={{ color: "#3b82f6" }}
                        labelFormatter={formatTooltipLabel}
                      />
                      <Area
                        type="monotone"
                        dataKey="active_users"
                        name="Active Users"
                        stroke="#3b82f6"
                        strokeWidth={1.5}
                        fill="url(#usersGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}

          {tab === "Moderations" && (
            <div>
              {modStatsLoading ? (
                <div className="flex h-72 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950">
                  <p className="text-sm text-neutral-500">Loading moderation stats...</p>
                </div>
              ) : !modStats || modStats.stats_by_period.length === 0 ? (
                <div className="flex h-72 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950">
                  <p className="text-sm text-neutral-500">No moderation data available.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {modStats.stats_by_period.map((stat) => (
                      <div
                        key={stat.period}
                        className="rounded-xl border border-neutral-800 bg-neutral-950 p-6"
                      >
                        <div className="mb-4">
                          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Last {stat.period}
                          </p>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <p className="text-xs text-neutral-500">Total Chats</p>
                            <p className="mt-1 text-3xl font-bold">{stat.total_chats}</p>
                          </div>

                          <div>
                            <p className="text-xs text-neutral-500">Flagged Chats</p>
                            <div className="mt-1 flex items-baseline gap-2">
                              <p className="text-2xl font-bold text-red-400">{stat.flagged_chats}</p>
                              <p className="text-sm text-neutral-500">
                                ({stat.flagging_percentage.toFixed(1)}%)
                              </p>
                            </div>
                          </div>

                          <div className="pt-2">
                            <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
                              <span>Flagging Rate</span>
                              <span className="font-mono font-medium">{stat.flagging_percentage.toFixed(1)}%</span>
                            </div>
                            <div className="relative h-2 overflow-hidden rounded-full bg-neutral-800">
                              <div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600 to-red-400"
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
                    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6">
                      <h2 className="mb-4 text-sm font-medium text-neutral-300">Recent Flagged Messages</h2>
                      {(modStats.flagged_messages?.length ?? 0) === 0 ? (
                        <div className="flex min-h-40 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900">
                          <p className="text-sm text-neutral-500">No flagged messages</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {modStats.flagged_messages!.map((message, idx) => (
                            <div key={idx} className="flex gap-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
                              <div className="flex-shrink-0">
                                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-red-900/30 border border-red-700/50">
                                  <span className="text-sm font-semibold text-red-400">
                                    {(message.toxicity * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-neutral-200 break-words">{message.text}</p>
                                <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
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
        </div>
      </main>
    </div>
  );
}
