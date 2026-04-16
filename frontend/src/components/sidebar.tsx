"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { logout, getUser, listBots, type User } from "@/lib/api";

function getLastBotUuid(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("lastBotUuid");
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [lastBotUuid, setLastBotUuid] = useState<string | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(getUser());
    const stored = getLastBotUuid();
    if (stored) {
      setLastBotUuid(stored);
    } else {
      listBots()
        .then((bots) => {
          if (bots.length > 0) {
            localStorage.setItem("lastBotUuid", bots[0].uuid);
            setLastBotUuid(bots[0].uuid);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Keep lastBotUuid in sync when the route changes to a bot page
  useEffect(() => {
    if (pathname === "/dashboard/bot") {
      const uuid = searchParams.get("uuid");
      if (uuid) {
        localStorage.setItem("lastBotUuid", uuid);
        setLastBotUuid(uuid);
      }
    }
  }, [pathname, searchParams]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Close options dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setOptionsOpen(false);
      }
    }
    if (optionsOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [optionsOpen]);

  const currentTab = searchParams.get("tab") ?? "activities";
  const isOnBotPage = pathname === "/dashboard/bot";

  const navItems = [
    {
      label: "All Bots",
      href: "/dashboard",
      isActive: pathname === "/dashboard",
      icon: DashboardIcon,
      disabled: false,
    },
    {
      label: "Activities",
      href: lastBotUuid ? `/dashboard/bot?uuid=${lastBotUuid}&tab=activities` : "#",
      isActive: isOnBotPage && currentTab === "activities",
      icon: ActivitiesIcon,
      disabled: !lastBotUuid,
    },
    {
      label: "Moderations",
      href: lastBotUuid ? `/dashboard/bot?uuid=${lastBotUuid}&tab=moderations` : "#",
      isActive: isOnBotPage && currentTab === "moderations",
      icon: ModerationsIcon,
      disabled: !lastBotUuid,
    },
    {
      label: "Audit Logs",
      href: lastBotUuid ? `/dashboard/bot?uuid=${lastBotUuid}&tab=audit-log` : "#",
      isActive: isOnBotPage && currentTab === "audit-log",
      icon: AuditLogIcon,
      disabled: !lastBotUuid,
    },
    {
      label: "Configuration",
      href: lastBotUuid ? `/dashboard/bot?uuid=${lastBotUuid}&tab=configuration` : "#",
      isActive: isOnBotPage && currentTab === "configuration",
      icon: ConfigurationIcon,
      disabled: !lastBotUuid,
    },
  ];

  return (
    <nav className="flex w-[300px] shrink-0 flex-col border-r border-border-subtle bg-surface-card">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-6">
        <svg
          className="h-8 w-8 text-text-primary"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 2L3 7v5c0 5.25 3.75 10.13 9 11.25C17.25 22.13 21 17.25 21 12V7l-9-5z"
          />
        </svg>
        <span className="text-lg font-bold tracking-tight text-text-primary">
          MoonBot
        </span>
      </div>

      {/* Nav Items */}
      <div className="flex flex-1 flex-col gap-1 px-3 pt-2">
        {navItems.map((item) => {
          if (item.disabled) {
            return (
              <span
                key={item.label}
                className="flex cursor-default items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-text-muted/40"
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </span>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`relative flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                item.isActive
                  ? "bg-accent/10 text-text-primary"
                  : "text-text-primary/60 hover:bg-white/5 hover:text-text-primary"
              }`}
            >
              {item.isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />
              )}
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Support link */}
      <div className="px-3 pb-3">
        <a
          href="#"
          className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-text-primary/60 transition-colors hover:bg-white/5 hover:text-text-primary"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
          Support
        </a>
      </div>

      {/* User Identity Card */}
      <div className="border-t border-border-subtle p-4">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent">
            {user?.username?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text-primary">
              {user?.username ?? "User"}
            </p>
          </div>
          <div className="relative" ref={optionsRef}>
            <button
              onClick={() => setOptionsOpen(!optionsOpen)}
              className="rounded-md p-1 text-text-muted transition-colors hover:bg-white/5 hover:text-text-primary"
              title="Account options"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>

            {optionsOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-36 rounded-md border border-border-subtle bg-surface-card py-1 shadow-lg">
                <button
                  onClick={() => {
                    setOptionsOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-muted transition-colors hover:bg-white/5 hover:text-text-primary"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  Account
                </button>
                <button
                  onClick={() => {
                    setOptionsOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-white/5"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-3h-9m9 0l-3-3m3 3l-3 3" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

/* ── Inline SVG Icon Components ── */


function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  );
}

function ActivitiesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  );
}

function ModerationsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285zm0 13.036h.008v.008H12v-.008z"
      />
    </svg>
  );
}

function AuditLogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function ConfigurationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.248a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
