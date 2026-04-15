"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { linkBot, listBots, type Bot } from "@/lib/api";

function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  if (platform.toLowerCase() === "discord") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  );
}

export default function DashboardPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [botsLoading, setBotsLoading] = useState(true);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [botId, setBotId] = useState("");
  const [linkError, setLinkError] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);

  const openLinkForm = () => {
    setShowLinkForm(true);
    // Delay visibility to next frame so the transition triggers
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setModalVisible(true));
    });
  };

  const closeLinkForm = () => {
    setModalVisible(false);
    setTimeout(() => {
      setShowLinkForm(false);
      setLinkError("");
    }, 200);
  };

  useEffect(() => {
    listBots()
      .then(setBots)
      .catch(() => {})
      .finally(() => setBotsLoading(false));
  }, []);

  const handleLinkBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError("");
    setLinkLoading(true);
    try {
      await linkBot(botId);
      const updated = await listBots();
      setBots(updated);
      setBotId("");
      closeLinkForm();
    } catch (err: unknown) {
      const error = err as Record<string, unknown>;
      setLinkError(String(error.error || "Failed to link bot."));
    } finally {
      setLinkLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1220px]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Bots</h1>
          <p className="mt-1 text-sm text-text-muted">
            All linked bots are shown here. You can also link new bots.
          </p>
        </div>
        <button
          onClick={() => {
            if (showLinkForm) {
              closeLinkForm();
            } else {
              openLinkForm();
            }
          }}
          className="rounded-md border border-border-subtle bg-surface-card px-4 py-2.5 text-sm text-text-muted transition-colors hover:border-text-muted hover:text-text-primary"
        >
          + Link a Bot
        </button>
      </div>

      {showLinkForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/50 transition-opacity duration-200"
          style={{ opacity: modalVisible ? 1 : 0 }}
          onClick={closeLinkForm}
        >
          <form
            onSubmit={handleLinkBot}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-md bg-surface-card p-6 shadow-2xl transition-all duration-200"
            style={{
              opacity: modalVisible ? 1 : 0,
              transform: modalVisible ? "scale(1) translateY(0)" : "scale(0.95) translateY(8px)",
            }}
          >
            <h2 className="mb-1 text-lg font-semibold text-text-primary">Link a Bot</h2>
            <p className="mb-5 text-sm text-text-muted">Enter the bot UUID to link it to your account.</p>
            <input
              type="text"
              value={botId}
              onChange={(e) => setBotId(e.target.value)}
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              required
              autoFocus
              className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2.5 text-sm text-text-primary placeholder-text-muted/50 outline-none focus:border-accent"
            />
            {linkError && (
              <p className="mt-2 text-xs text-red-400">{linkError}</p>
            )}
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeLinkForm}
                className="rounded-md px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={linkLoading}
                className="rounded-md bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/80 disabled:opacity-50"
              >
                {linkLoading ? "Linking..." : "Link Bot"}
              </button>
            </div>
          </form>
        </div>
      )}

      {botsLoading ? (
        <div className="rounded-md bg-surface-card p-12 text-center">
          <p className="text-text-muted">Loading bots...</p>
        </div>
      ) : bots.length === 0 ? (
        <div className="rounded-md bg-surface-card p-12 text-center">
          <p className="text-text-muted">No bots linked yet.</p>
          <p className="mt-1 text-sm text-text-muted/70">
            Click &quot;Link a Bot&quot; to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {bots.map((bot) => (
            <div
              key={bot.uuid}
              className="flex flex-col rounded-md bg-surface-card"
            >
              {/* Card body — clickable */}
              <Link
                href={`/dashboard/bot?uuid=${bot.uuid}&tab=activities`}
                className="flex flex-1 flex-col gap-4 p-5 transition-colors hover:bg-white/[0.02] rounded-t-lg"
              >
                {/* Top row: avatar + info + platform icon */}
                <div className="flex items-start gap-4">
                  {/* 48px circular avatar */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/15 text-lg font-bold text-accent">
                    {(bot.group_name ?? bot.platform).charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-text-primary">
                      {bot.group_name ?? bot.platform}
                    </p>
                    <p className="mt-1 truncate font-mono text-[11px] text-text-muted/60">
                      {bot.uuid}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      Created on{" "}
                      {new Date(bot.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  {/* Platform icon */}
                  <PlatformIcon
                    platform={bot.platform}
                    className="h-5 w-5 shrink-0 text-text-muted/60"
                  />
                </div>
              </Link>

              {/* Card footer — actions */}
              <div className="flex items-center justify-between border-t border-border-subtle px-5 py-3">
                {/* Toggle switch + label */}
                <div className="flex items-center gap-2.5">
                  <span
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-default rounded-full transition-colors ${
                      bot.is_active ? "bg-accent" : "bg-white/10"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                        bot.is_active ? "translate-x-[18px]" : "translate-x-0.5"
                      }`}
                    />
                  </span>
                  <span className="text-xs font-medium text-text-muted">
                    {bot.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Action icons */}
                <div className="flex items-center gap-1">
                  <Link
                    href={`/dashboard/bot?uuid=${bot.uuid}`}
                    className="rounded-md p-1.5 text-text-muted/60 transition-colors hover:bg-white/5 hover:text-text-primary"
                    title="Settings"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.248a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </Link>
                  <button
                    className="rounded-md p-1.5 text-text-muted/60 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Delete"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
