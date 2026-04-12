"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, logout, linkBot, listBots, type Bot } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [bots, setBots] = useState<Bot[]>([]);
  const [botsLoading, setBotsLoading] = useState(true);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [botId, setBotId] = useState("");
  const [linkError, setLinkError] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    listBots()
      .then(setBots)
      .catch(() => {})
      .finally(() => setBotsLoading(false));
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleLinkBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError("");
    setLinkLoading(true);
    try {
      await linkBot(botId);
      const updated = await listBots();
      setBots(updated);
      setBotId("");
      setShowLinkForm(false);
    } catch (err: unknown) {
      const error = err as Record<string, unknown>;
      setLinkError(String(error.error || "Failed to link bot."));
    } finally {
      setLinkLoading(false);
    }
  };

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
            className="flex items-center gap-3 rounded-lg bg-neutral-800 px-4 py-2.5 text-base font-medium text-white"
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
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Your Bots</h1>
            <button
              onClick={() => {
                setShowLinkForm(!showLinkForm);
                setLinkError("");
              }}
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
            >
              + Link a Bot
            </button>
          </div>

          {showLinkForm && (
            <form
              onSubmit={handleLinkBot}
              className="mb-6 flex items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4"
            >
              <div className="flex-1">
                <input
                  type="text"
                  value={botId}
                  onChange={(e) => setBotId(e.target.value)}
                  placeholder="Enter bot UUID"
                  required
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-500"
                />
                {linkError && (
                  <p className="mt-1 text-xs text-red-400">{linkError}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={linkLoading}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-neutral-200 disabled:opacity-50"
              >
                {linkLoading ? "..." : "Link"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLinkForm(false);
                  setLinkError("");
                }}
                className="rounded-lg px-3 py-2 text-sm text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
            </form>
          )}

          {botsLoading ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-12 text-center">
              <p className="text-neutral-500">Loading bots...</p>
            </div>
          ) : bots.length === 0 ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-12 text-center">
              <p className="text-neutral-400">No bots linked yet.</p>
              <p className="mt-1 text-sm text-neutral-500">
                Click &quot;Link a Bot&quot; to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bots.map((bot) => (
                <Link
                  key={bot.uuid}
                  href={`/dashboard/bot/${bot.uuid}`}
                  className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 px-5 py-4 transition-colors hover:border-neutral-700 hover:bg-neutral-900"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800 text-sm font-bold text-neutral-300">
                      {bot.platform.charAt(0)}
                    </div>
                    <div>
                      <p className="text-m font-medium">{bot.platform}</p>
                      <p className="text-sm text-neutral-500 font-mono">{bot.uuid}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      bot.is_active
                        ? "bg-green-900/40 text-green-400"
                        : "bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    {bot.is_active ? "Active" : "Inactive"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
