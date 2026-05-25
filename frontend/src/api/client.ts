// src/api/client.ts
// Dwa mechanizmy autoryzacji:
// 1. JWT Bearer — zwykli użytkownicy: localStorage.getItem("dockix_token")
// 2. API Key — superadmin: localStorage.getItem("dockix_api_key") → nagłówek x-api-key

// ── Storage keys ──────────────────────────────────────────────────────────────

export const AUTH_TOKEN_KEY = "dockix_token";
export const API_KEY_STORAGE = "dockix_api_key";

// ── Pomocnicza funkcja fetch ──────────────────────────────────────────────────

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const apiKey = localStorage.getItem(API_KEY_STORAGE);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };

  // JWT Bearer — zwykły użytkownik
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // x-api-key — superadmin (oddzielne pole w localStorage)
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, json?.error ?? `HTTP ${res.status}`);
  }

  return json as T;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ── Typy ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

// /user/@me może zwrócić pełny User LUB {role:"superadmin"} dla superadmina
export type MeResponse = User | { role: "superadmin" };

export function isSuperadminResponse(r: MeResponse): r is { role: "superadmin" } {
  return "role" in r && (r as { role: string }).role === "superadmin";
}

export interface LoginResponse {
  token: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password?: string;
}

export interface CreateUserResponse extends User {
  generated_password?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
}

export interface RepoInfo {
  name: string;
  path: string;
  status: "ready" | "cloning" | "syncing" | "clone_failed" | "sync_failed";
  last_synced_at?: string;
  error?: string;
  failed_at?: string;
}

export interface PrefetchResponse {
  default_branch: string | null;
  branches: string[];
  tags: string[];
}

export interface CloneRequest {
  url: string;
  name: string;
  token?: string;
  depth?: number;
  branch?: string;
}

export interface RepoRole {
  id: string;
  name: string;
  permissions: string[];
  is_builtin: boolean;
  level: number;
}

export interface RepoMember {
  user_id: string;
  role_id: string | null;
  is_owner: boolean;
  joined_at: string;
}

export interface ParsedRepo {
  repo_name: string;
  files: ParsedFile[];
}

export interface ParsedFile {
  file_path: string;
  language: string;
  classes: ClassDoc[];
  functions: FunctionDoc[];
}

export interface ClassDoc {
  name: string;
  docstring: string | null;
  methods: FunctionDoc[];
}

export interface FunctionDoc {
  name: string;
  docstring: string | null;
  parameters: ParameterDoc[];
  return_type: string | null;
}

export interface ParameterDoc {
  name: string;
  type_annotation: string | null;
  default_value: string | null;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  /** POST /auth/login → JWT dla zwykłego użytkownika */
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem(AUTH_TOKEN_KEY, res.token);
    return res;
  },

  /** Zaloguj jako superadmin przez API key — weryfikuje przez /user/@me */
  loginWithApiKey: async (apiKey: string): Promise<boolean> => {
    localStorage.setItem(API_KEY_STORAGE, apiKey);
    try {
      const res = await request<MeResponse>("/user/@me");
      if (isSuperadminResponse(res)) return true;
      // Klucz ważny ale to nie superadmin — czyścimy
      localStorage.removeItem(API_KEY_STORAGE);
      return false;
    } catch {
      localStorage.removeItem(API_KEY_STORAGE);
      return false;
    }
  },

  /** POST /auth/logout — pomija call dla superadmina (brak JWT do unieważnienia) */
  logout: async (): Promise<void> => {
    const isSuperadmin = Boolean(localStorage.getItem(API_KEY_STORAGE));
    try {
      if (!isSuperadmin) {
        // Tylko zwykły użytkownik ma JWT do unieważnienia
        await request<void>("/auth/logout", { method: "POST" });
      }
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(API_KEY_STORAGE);
    }
  },

  isLoggedIn: (): boolean =>
    Boolean(localStorage.getItem(AUTH_TOKEN_KEY)) ||
    Boolean(localStorage.getItem(API_KEY_STORAGE)),

  isSuperadmin: (): boolean =>
    Boolean(localStorage.getItem(API_KEY_STORAGE)),

  clearAll: () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(API_KEY_STORAGE);
  },
};

// ── User ──────────────────────────────────────────────────────────────────────

export const userApi = {
  /** GET /user/@me — zwraca User lub {role:"superadmin"} */
  me: () => request<MeResponse>("/user/@me"),

  /** POST /user — wymaga x-api-key (superadmin) */
  create: (data: CreateUserRequest) =>
    request<CreateUserResponse>("/user", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /** PATCH /user/@me */
  updateMe: (data: UpdateUserRequest) =>
    request<User>("/user/@me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  /** GET /user/list — wymaga x-api-key */
  list: () => request<User[]>("/user/list"),

  /** GET /user/:id */
  getById: (id: string) => request<User>(`/user/${id}`),

  /** PATCH /user/:id — wymaga x-api-key */
  update: (id: string, data: UpdateUserRequest) =>
    request<User>(`/user/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  /** DELETE /user/:id — wymaga x-api-key */
  delete: (id: string) =>
    request<void>(`/user/${id}`, { method: "DELETE" }),
};

// ── Repos ─────────────────────────────────────────────────────────────────────

export const reposApi = {
  prefetch: (url: string, token?: string) =>
    request<PrefetchResponse>("/repos/prefetch", {
      method: "POST",
      body: JSON.stringify({ url, token }),
    }),

  list: () => request<RepoInfo[]>("/repos"),

  clone: (data: CloneRequest) =>
    request<void>("/repos", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: (name: string) =>
    request<void>(`/repos/${name}`, { method: "DELETE" }),

  analyze: (name: string) =>
    request<ParsedRepo>(`/repos/${name}/analysis`),
};

// ── Roles ─────────────────────────────────────────────────────────────────────

export const rolesApi = {
  list: (repo: string) =>
    request<RepoRole[]>(`/repos/${repo}/role`),

  create: (repo: string, name: string, permissions: string[]) =>
    request<RepoRole>(`/repos/${repo}/role`, {
      method: "POST",
      body: JSON.stringify({ name, permissions }),
    }),

  update: (repo: string, roleId: string, data: { name?: string; permissions?: string[] }) =>
    request<RepoRole>(`/repos/${repo}/role/${roleId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  /** DELETE /repos/:repo/role/:id */
  delete: (repo: string, roleId: string) =>
    request<void>(`/repos/${repo}/role/${roleId}`, { method: "DELETE" }),
};

// ── Members ───────────────────────────────────────────────────────────────────

export const membersApi = {
  list: (repo: string) =>
    request<RepoMember[]>(`/repos/${repo}/member`),

  add: (repo: string, userId: string, roleId?: string) =>
    request<void>(`/repos/${repo}/member`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId, role_id: roleId }),
    }),

  update: (repo: string, userId: string, data: { role_id?: string; transfer_ownership?: boolean }) =>
    request<void>(`/repos/${repo}/member/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  remove: (repo: string, userId: string) =>
    request<void>(`/repos/${repo}/member/${userId}`, { method: "DELETE" }),
};
