const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token");
}

// Mutex for token refresh: ensures only one refresh request is in-flight at a time.
// When multiple requests hit 401 concurrently, the first one triggers the refresh
// and all others await the same promise.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    localStorage.setItem("access_token", data.access);
    return data.access as string;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  _retry = false
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && !_retry) {
    // Coalesce concurrent refresh attempts into a single request
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }

    const newToken = await refreshPromise;
    if (newToken) {
      return request<T>(path, options, true);
    }

    // Refresh failed — clear tokens and redirect to login
    logout();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw { status: 401, detail: "Session expired" };
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw { status: res.status, ...body };
  }

  return res.json();
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface Bot {
  uuid: string;
  platform: string;
  group_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface LinkBotResponse {
  message: string;
  bot_id: string;
  user_id: string;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const data = await request<LoginResponse>("/v1/login/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem("access_token", data.access);
  localStorage.setItem("refresh_token", data.refresh);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data;
}

export async function register(fields: {
  username: string;
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
}): Promise<RegisterResponse> {
  return request<RegisterResponse>("/v1/register/", {
    method: "POST",
    body: JSON.stringify(fields),
  });
}

export async function listBots(): Promise<Bot[]> {
  return request<Bot[]>("/v1/bots/list/");
}

export async function linkBot(botId: string): Promise<LinkBotResponse> {
  return request<LinkBotResponse>("/v1/bots/link/", {
    method: "PATCH",
    body: JSON.stringify({ bot_id: botId }),
  });
}

export type StatsRange = "48h" | "7d" | "30d";

export interface HourlyStat {
  hour: string;
  chat_count: number;
  active_users: number;
}

export interface PeriodModStats {
  period: string;
  total_chats: number;
  flagged_chats: number;
  flagging_percentage: number;
}

export interface FlaggedMessage {
  text: string;
  toxicity: number;
  sender: string;
  created_at: string;
}

export interface ModerationStats {
  stats_by_period: PeriodModStats[];
  flagged_messages: FlaggedMessage[];
}

export async function getBotActivityStats(botId: string): Promise<HourlyStat[]> {
  return request<HourlyStat[]>(`/v1/moderate/stats/?bot_id=${botId}`);
}

export async function getBotModerationStats(botId: string): Promise<ModerationStats> {
  return request<ModerationStats>(`/v1/moderate/moderation-stats/?bot_id=${botId}`);
}

export interface AuditLogEntry {
  id: number;
  text: string;
  toxicity: number;
  sender: string;
  created_at: string;
  model_version: string;
}

export interface AuditLogResponse {
  results: AuditLogEntry[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AuditLogParams {
  botId: string;
  page?: number;
  pageSize?: number;
  sender?: string;
  search?: string;
  flagged?: boolean;
}

export async function getBotAuditLog(params: AuditLogParams): Promise<AuditLogResponse> {
  const qs = new URLSearchParams();
  qs.set("bot_id", params.botId);
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("page_size", String(params.pageSize));
  if (params.sender) qs.set("sender", params.sender);
  if (params.search) qs.set("search", params.search);
  if (params.flagged) qs.set("flagged", "true");
  return request<AuditLogResponse>(`/v1/moderate/audit-log/?${qs.toString()}`);
}



export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}
