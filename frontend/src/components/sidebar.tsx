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
      <div className="flex items-center gap-3 pl-[26px] pr-5 py-6">
        <svg
          className="h-6 w-6 text-text-primary"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            d="M12 1.5L3 6.375V12c0 5.625 3.938 10.688 9 11.813C17.063 22.688 21 17.625 21 12V6.375L12 1.5z"
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
                  ? "bg-white/8 text-text-primary"
                  : "text-text-primary/60 hover:bg-white/5 hover:text-text-primary"
              }`}
            >
              {item.isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-white" />
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
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 01-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 01-.837.552c-.676.328-1.028.774-1.028 1.152v.75a.75.75 0 01-1.5 0v-.75c0-1.279 1.06-2.107 1.875-2.502.182-.088.351-.199.503-.331.83-.727.83-1.857 0-2.584zM12 18a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
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
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
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
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6zm10.72 4.72a.75.75 0 011.06 0l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 11-1.06-1.06l1.72-1.72H9a.75.75 0 010-1.5h10.94l-1.72-1.72a.75.75 0 010-1.06z" clipRule="evenodd" />
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
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M3 6a3 3 0 013-3h2.25a3 3 0 013 3v2.25a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm9.75 0a3 3 0 013-3H18a3 3 0 013 3v2.25a3 3 0 01-3 3h-2.25a3 3 0 01-3-3V6zM3 15.75a3 3 0 013-3h2.25a3 3 0 013 3V18a3 3 0 01-3 3H6a3 3 0 01-3-3v-2.25zm9.75 0a3 3 0 013-3H18a3 3 0 013 3V18a3 3 0 01-3 3h-2.25a3 3 0 01-3-3v-2.25z" clipRule="evenodd" />
    </svg>
  );
}

function ActivitiesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
    </svg>
  );
}

function AuditLogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75-6.75a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" />
      <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
    </svg>
  );
}

function ConfigurationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
    </svg>
  );
}
