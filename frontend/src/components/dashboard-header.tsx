"use client";

import { useEffect, useState } from "react";
import { getUser, type User } from "@/lib/api";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export function DashboardHeader() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  return (
    <header className="flex items-center justify-between px-8 pt-8 pb-6">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">
        {getGreeting()}, {user?.first_name || user?.username || "User"}
      </h1>

      <div className="flex items-center gap-2 rounded-full border border-border-subtle bg-white/5 px-4 py-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-live opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-status-live" />
        </span>
        <span className="text-sm font-medium text-text-primary">
          System Live
        </span>
      </div>
    </header>
  );
}
