import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "";
const PAGE_SIZE = 20;
const EMPTY_FILTERS = {
  flagged: "all",
  source: "",
  startDate: "",
  endDate: "",
};

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json();
}

function buildMessagesUrl(page, filters) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(PAGE_SIZE),
  });

  if (filters.flagged !== "all") {
    params.set("flagged", filters.flagged);
  }

  const source = filters.source.trim();
  if (source) {
    params.set("source", source);
  }

  if (filters.startDate) {
    params.set("start_date", new Date(`${filters.startDate}T00:00:00`).toISOString());
  }

  if (filters.endDate) {
    const end = new Date(`${filters.endDate}T00:00:00`);
    end.setDate(end.getDate() + 1);
    params.set("end_date", end.toISOString());
  }

  return `${API_BASE}/api/v1/messages?${params.toString()}`;
}

function StatCard({ label, value, hint, tone = "default" }) {
  const toneClass =
    tone === "alert"
      ? "border-red-400/50"
      : tone === "ok"
        ? "border-teal-500/40"
        : "border-slate-600/15";

  return (
    <div className={`glass fade-in rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-800">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

function MessagesTable({
  rows,
  total,
  page,
  totalPages,
  draftFilters,
  sourceOptions,
  loading,
  onDraftFilterChange,
  onApplyFilters,
  onResetFilters,
  onPrevPage,
  onNextPage,
}) {
  return (
    <div className="glass fade-in rounded-2xl border p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">All Messages</h2>
        <span className="mono text-xs text-slate-600">{total} total</span>
      </div>

      <form className="mb-4 grid gap-3 md:grid-cols-4" onSubmit={onApplyFilters}>
        <label className="text-xs text-slate-600">
          Flagged Status
          <select
            value={draftFilters.flagged}
            onChange={(event) => onDraftFilterChange("flagged", event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">All</option>
            <option value="true">Flagged</option>
            <option value="false">Not flagged</option>
          </select>
        </label>

        <label className="text-xs text-slate-600">
          Source
          <input
            list="source-options"
            value={draftFilters.source}
            onChange={(event) => onDraftFilterChange("source", event.target.value)}
            placeholder="api"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          />
          <datalist id="source-options">
            {sourceOptions.map((source) => (
              <option key={source} value={source} />
            ))}
          </datalist>
        </label>

        <label className="text-xs text-slate-600">
          Start Date
          <input
            type="date"
            value={draftFilters.startDate}
            onChange={(event) => onDraftFilterChange("startDate", event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          />
        </label>

        <label className="text-xs text-slate-600">
          End Date
          <input
            type="date"
            value={draftFilters.endDate}
            onChange={(event) => onDraftFilterChange("endDate", event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          />
        </label>

        <div className="md:col-span-4 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            Apply Filters
          </button>
          <button
            type="button"
            onClick={onResetFilters}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset
          </button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2 text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Message</th>
              <th className="px-3 py-2">Sender</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Flagged</th>
              <th className="px-3 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="rounded-xl bg-white/75 px-3 py-6 text-center text-sm text-slate-500">
                  No messages found for the selected filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="rounded-xl bg-white/75 text-sm text-slate-700">
                  <td className="max-w-md truncate rounded-l-xl px-3 py-3" title={row.text}>
                    {row.text}
                  </td>
                  <td className="px-3 py-3">{row.sender || "-"}</td>
                  <td className="px-3 py-3">{row.source || "-"}</td>
                  <td className="px-3 py-3">
                    {row.is_flagged ? (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                        flagged
                      </span>
                    ) : (
                      <span className="rounded-full bg-teal-100 px-2 py-1 text-xs font-medium text-teal-800">
                        clear
                      </span>
                    )}
                  </td>
                  <td className="rounded-r-xl px-3 py-3">{formatDate(row.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="mono text-xs text-slate-600">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPrevPage}
            disabled={loading || page <= 1}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={onNextPage}
            disabled={loading || page >= totalPages}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function LatestFlagged({ message }) {
  if (!message) {
    return (
      <div className="glass fade-in rounded-2xl border p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Most Recent Flagged Message</h2>
        <p className="mt-4 text-sm text-slate-500">No flagged messages yet.</p>
      </div>
    );
  }

  return (
    <div className="glass fade-in rounded-2xl border border-red-300/50 p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">Most Recent Flagged Message</h2>
      <p className="mt-3 rounded-xl bg-red-50 px-3 py-3 text-sm leading-relaxed text-red-900">
        {message.text}
      </p>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="mono">Sender: {message.sender || "-"}</span>
        <span className="mono">Source: {message.source || "-"}</span>
        <span className="mono">At: {formatDate(message.created_at)}</span>
      </div>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [page, setPage] = useState(1);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [stats, setStats] = useState(null);
  const [latestFlagged, setLatestFlagged] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  const flaggedPercentage = useMemo(() => {
    if (!stats || !stats.total_messages) return "0.00";
    return ((stats.flagged_count / stats.total_messages) * 100).toFixed(2);
  }, [stats]);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const [messagesRes, statsRes, flaggedRes] = await Promise.all([
          fetchJson(buildMessagesUrl(page, appliedFilters)),
          fetchJson(`${API_BASE}/api/v1/stats`),
          fetchJson(`${API_BASE}/api/v1/messages?flagged=true&page=1&page_size=1`),
        ]);

        if (!isMounted) {
          return;
        }

        setMessages(messagesRes.items || []);
        setTotalMessages(messagesRes.total || 0);
        setStats(statsRes);
        setLatestFlagged((flaggedRes.items && flaggedRes.items[0]) || null);
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to fetch dashboard data.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [page, appliedFilters, refreshTick]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalMessages / PAGE_SIZE)), [totalMessages]);

  const sourceOptions = useMemo(
    () => Array.from(new Set(messages.map((message) => message.source).filter(Boolean))).sort(),
    [messages],
  );

  function onDraftFilterChange(field, value) {
    setDraftFilters((current) => ({ ...current, [field]: value }));
  }

  function onApplyFilters(event) {
    event.preventDefault();
    setPage(1);
    setAppliedFilters({ ...draftFilters });
  }

  function onResetFilters() {
    setPage(1);
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  }

  function onRefresh() {
    setRefreshTick((tick) => tick + 1);
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mono text-xs uppercase tracking-[0.24em] text-slate-500">Toxic Chat Moderator</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-800">Moderation Dashboard</h1>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total Moderated"
          value={stats ? stats.total_messages : "-"}
          hint="All messages processed by the moderation API"
          tone="ok"
        />
        <StatCard
          label="Flagged Percentage"
          value={`${flaggedPercentage}%`}
          hint="Share of moderated messages currently flagged"
          tone="alert"
        />
        <StatCard
          label="Flagged Count"
          value={stats ? stats.flagged_count : "-"}
          hint="Total number of flagged messages"
        />
      </section>

      <section className="mt-4">
        <LatestFlagged message={latestFlagged} />
      </section>

      <section className="mt-4">
        <MessagesTable
          rows={messages}
          total={totalMessages}
          page={page}
          totalPages={totalPages}
          draftFilters={draftFilters}
          sourceOptions={sourceOptions}
          loading={loading}
          onDraftFilterChange={onDraftFilterChange}
          onApplyFilters={onApplyFilters}
          onResetFilters={onResetFilters}
          onPrevPage={() => setPage((current) => Math.max(1, current - 1))}
          onNextPage={() => setPage((current) => Math.min(totalPages, current + 1))}
        />
      </section>
    </main>
  );
}
