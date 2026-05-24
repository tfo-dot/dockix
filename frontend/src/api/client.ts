// src/api/client.ts
// Warstwa komunikacji z backendem.
// Każda funkcja odpowiada dokładnie jednemu endpointowi z openapi.yaml.

const API_KEY = import.meta.env.VITE_API_KEY as string | undefined;

// ── Pomocnicza funkcja fetch ──────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("dockix_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (API_KEY) {
    headers["x-api-key"] = API_KEY;
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

export interface UpdateMeRequest {
  name?: string;
  email?: string;
  password?: string;
}

// RepoStatus – discriminated union pasujący do Rust enum z #[serde(tag="status")]
export type RepoStatus =
  | { status: "ready"; last_synced_at: string }
  | { status: "cloning" }
  | { status: "syncing"; last_synced_at: string }
  | { status: "clone_failed"; error: string }
  | { status: "sync_failed"; last_synced_at: string; error: string; failed_at: string };

// Backend zwraca RepoInfo z flatten RepoStatus, więc wszystkie pola są na tym samym poziomie
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
  /** POST /auth/login */
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("dockix_token", res.token);
    return res;
  },

  /** POST /auth/logout */
  logout: async (): Promise<void> => {
    try {
      await request<void>("/auth/logout", { method: "POST" });
    } finally {
      localStorage.removeItem("dockix_token");
    }
  },

  isLoggedIn: (): boolean => Boolean(localStorage.getItem("dockix_token")),
};

// ── User ──────────────────────────────────────────────────────────────────────

export const userApi = {
  /** POST /user */
  create: (data: CreateUserRequest) =>
    request<CreateUserResponse>("/user", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /** GET /user/@me */
  me: () => request<User>("/user/@me"),

  /** PATCH /user/@me */
  updateMe: (data: UpdateMeRequest) =>
    request<User>("/user/@me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  /** GET /user/list – tylko superadmin */
  list: () => request<User[]>("/user/list"),

  /** GET /user/:id */
  getById: (id: string) => request<User>(`/user/${id}`),

  /** DELETE /user/:id – tylko superadmin */
  delete: (id: string) =>
    request<void>(`/user/${id}`, { method: "DELETE" }),
};

// ── Repos ─────────────────────────────────────────────────────────────────────

export const reposApi = {
  /** POST /repos/prefetch */
  prefetch: (url: string, token?: string) =>
    request<PrefetchResponse>("/repos/prefetch", {
      method: "POST",
      body: JSON.stringify({ url, token }),
    }),

  /** GET /repos */
  list: () => request<RepoInfo[]>("/repos"),

  /** POST /repos */
  clone: (data: CloneRequest) =>
    request<void>("/repos", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /** DELETE /repos/:name */
  delete: (name: string) =>
    request<void>(`/repos/${name}`, { method: "DELETE" }),

  /** GET /repos/:name/analysis */
  analyze: (name: string) =>
    request<ParsedRepo>(`/repos/${name}/analysis`),
};

// ── Roles ─────────────────────────────────────────────────────────────────────

export const rolesApi = {
  list: (repo: string) =>
    request<RepoRole[]>(`/repos/${repo}/role`),

  create: (repo: string, name: string, permissions: string[], level?: number) =>
    request<RepoRole>(`/repos/${repo}/role`, {
      method: "POST",
      body: JSON.stringify({ name, permissions, level }),
    }),

  update: (repo: string, roleId: string, data: { name?: string; permissions?: string[]; level?: number }) =>
    request<RepoRole>(`/repos/${repo}/role/${roleId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

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
