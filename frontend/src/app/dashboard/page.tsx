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
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z" clipRule="evenodd" />
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
              className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2.5 text-sm text-text-primary placeholder-text-muted/50 outline-none focus:border-white/20"
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
                className="rounded-md bg-white px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:opacity-50"
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
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
                    </svg>
                  </Link>
                  <button
                    className="rounded-md p-1.5 text-text-muted/60 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Delete"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
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
