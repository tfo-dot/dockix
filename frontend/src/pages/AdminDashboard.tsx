import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import {
  FolderGit2, HardDrive, Users, CheckCircle, Loader,
  AlertTriangle, Clock, Activity, Trash2, Plus, X,
  Mail, User as UserIcon, Key, RefreshCw, Shield,
} from "lucide-react";
import { userApi, reposApi, ApiError } from "../api/client";
import type { User as ApiUser, RepoInfo } from "../api/client";
import type { Page, User } from "../App";

type SyncStatus = RepoInfo["status"];

const statusConfig: Record<SyncStatus, { label: string; color: string; icon: React.ReactNode }> = {
  ready:        { label: "Ready",        color: "text-green-400 bg-green-500/10 border-green-500/20",  icon: <CheckCircle size={12} /> },
  cloning:      { label: "Cloning",      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",    icon: <Loader size={12} className="animate-spin" /> },
  syncing:      { label: "Syncing",      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",    icon: <Loader size={12} className="animate-spin" /> },
  clone_failed: { label: "Clone failed", color: "text-red-400 bg-red-500/10 border-red-500/20",       icon: <AlertTriangle size={12} /> },
  sync_failed:  { label: "Sync failed",  color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: <Clock size={12} /> },
};

// ── Create User Modal ─────────────────────────────────────────────────────────

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: (user: ApiUser, password?: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || !email.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await userApi.create({
        name: name.trim(),
        email: email.trim(),
        password: password || undefined,
      });
      onCreated(res, res.generated_password ?? password);
      onClose();
    } catch (e) {
      const msg = e instanceof ApiError
        ? `${e.status}: ${e.message}`
        : e instanceof Error ? e.message : "Failed to create user";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">Create User</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Name</label>
            <div className="flex items-center gap-2 bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2.5 focus-within:border-green-500 transition-colors">
              <UserIcon size={13} className="text-slate-500 shrink-0" />
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Alice Smith"
                className="bg-transparent text-sm text-white outline-none flex-1 placeholder:text-slate-600" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Email</label>
            <div className="flex items-center gap-2 bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2.5 focus-within:border-green-500 transition-colors">
              <Mail size={13} className="text-slate-500 shrink-0" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="alice@company.com"
                className="bg-transparent text-sm text-white outline-none flex-1 placeholder:text-slate-600" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
              Password <span className="text-slate-600 normal-case font-normal">(leave blank to auto-generate)</span>
            </label>
            <div className="flex items-center gap-2 bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2.5 focus-within:border-green-500 transition-colors">
              <Key size={13} className="text-slate-500 shrink-0" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="optional"
                className="bg-transparent text-sm text-white outline-none flex-1 placeholder:text-slate-600" />
            </div>
          </div>
          {error && (
            <div className="flex items-start gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition text-sm">Cancel</button>
            <button disabled={!name.trim() || !email.trim() || loading} onClick={submit}
              className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition text-sm flex items-center justify-center gap-2">
              {loading ? <><Loader size={13} className="animate-spin" /> Creating...</> : "Create User"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Tab = "users" | "repos";

interface NewUserInfo { user: ApiUser; password?: string; }

export default function AdminDashboard({ navigate, user, onLogout }: {
  navigate: (p: Page) => void;
  user?: User | null;
  onLogout?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserAlert, setNewUserAlert] = useState<NewUserInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const list = await userApi.list();
      setUsers(list);
    } catch (e) {
      console.error("Failed to load users:", e);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchRepos = useCallback(async () => {
    try {
      const list = await reposApi.list();
      setRepos(list);
    } catch (e) {
      console.error("Failed to load repos:", e);
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRepos();
  }, [fetchUsers, fetchRepos]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchUsers(), fetchRepos()]);
    setRefreshing(false);
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
    setDeletingId(userId);
    try {
      await userApi.delete(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 403
        ? "Cannot delete your own account or a superadmin."
        : e instanceof Error ? e.message : "Delete failed";
      alert(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleUserCreated = (newUser: ApiUser, password?: string) => {
    setUsers(prev => [...prev, newUser]);
    setNewUserAlert({ user: newUser, password });
  };

  // Statystyki
  const totalDisk = repos.reduce((acc, r) => acc, 0); // Backend nie zwraca rozmiaru
  const reposByStatus = repos.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex min-h-screen bg-[#0f1115]">
      <Sidebar activePage="admin" navigate={navigate} user={user} onLogout={onLogout} />

      {showCreateUser && (
        <CreateUserModal
          onClose={() => setShowCreateUser(false)}
          onCreated={handleUserCreated}
        />
      )}

      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-[#0f1115]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Shield size={16} className="text-red-400" />
            <h2 className="text-lg font-semibold text-white">Admin Dashboard</h2>
          </div>
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg transition font-bold">
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Refresh
          </button>
        </header>

        <div className="p-8 max-w-5xl w-full space-y-8">

          {/* New user password alert */}
          {newUserAlert && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white mb-1">
                  User <span className="text-green-400">{newUserAlert.user.name}</span> created
                </p>
                {newUserAlert.password && (
                  <p className="text-xs text-slate-400">
                    Password: <code className="font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">{newUserAlert.password}</code>
                    <span className="text-slate-600 ml-2">— share this once, it won't be shown again</span>
                  </p>
                )}
              </div>
              <button onClick={() => setNewUserAlert(null)} className="text-slate-500 hover:text-white shrink-0">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={<Users size={20} />} label="Total Users" value={loadingUsers ? "…" : `${users.length}`} sub="registered accounts" color="text-blue-400" />
            <StatCard icon={<FolderGit2 size={20} />} label="Repositories" value={loadingRepos ? "…" : `${repos.length}`} sub="across all accounts" color="text-green-400" />
            <StatCard icon={<HardDrive size={20} />} label="Active / Ready" value={loadingRepos ? "…" : `${reposByStatus["ready"] ?? 0}`} sub="repos ready for analysis" color="text-purple-400" />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-900/50 border border-slate-800 rounded-xl p-1 w-fit">
            {(["users", "repos"] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${tab === t ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}>
                {t === "users" ? <><Users size={11} className="inline mr-1.5" />Users</> : <><FolderGit2 size={11} className="inline mr-1.5" />Repos</>}
              </button>
            ))}
          </div>

          {/* USERS TAB */}
          {tab === "users" && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  All Users ({users.length})
                </h3>
                <button onClick={() => setShowCreateUser(true)}
                  className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 hover:bg-green-500/15 px-3 py-1.5 rounded-lg border border-green-500/20 font-bold transition">
                  <Plus size={12} /> Create User
                </button>
              </div>

              {loadingUsers ? (
                <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
                  <Loader size={14} className="animate-spin" /> Loading users...
                </div>
              ) : users.length === 0 ? (
                <p className="text-slate-600 text-sm text-center py-8">No users found.</p>
              ) : (
                <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden">
                  {users.map((u, i) => (
                    <div key={u.id} className={`flex items-center justify-between px-5 py-4 ${i < users.length - 1 ? "border-b border-slate-800" : ""}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
                          {u.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{u.name}</p>
                          <p className="text-xs text-slate-500 font-mono">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] text-slate-600 font-mono hidden md:block">
                          {u.id.slice(0, 8)}…
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(u.created_at).toLocaleDateString()}
                        </span>
                        {/* Nie można usunąć samego siebie */}
                        {u.id !== user?.id ? (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            disabled={deletingId === u.id}
                            title="Delete user"
                            className="p-1.5 hover:bg-red-500/10 text-slate-600 hover:text-red-400 rounded-lg transition disabled:opacity-50"
                          >
                            {deletingId === u.id
                              ? <Loader size={13} className="animate-spin" />
                              : <Trash2 size={13} />}
                          </button>
                        ) : (
                          <span className="text-[10px] text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 font-bold">you</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* REPOS TAB */}
          {tab === "repos" && (
            <section className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                All Repositories ({repos.length})
              </h3>

              {loadingRepos ? (
                <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
                  <Loader size={14} className="animate-spin" /> Loading repos...
                </div>
              ) : repos.length === 0 ? (
                <p className="text-slate-600 text-sm text-center py-8">No repositories found.</p>
              ) : (
                <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden">
                  {repos.map((repo, i) => {
                    const s = statusConfig[repo.status] ?? statusConfig.clone_failed;
                    return (
                      <div key={repo.name} className={`flex items-center justify-between px-5 py-4 ${i < repos.length - 1 ? "border-b border-slate-800" : ""}`}>
                        <div className="flex items-center gap-4">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                            <FolderGit2 size={14} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white font-mono">{repo.name}</p>
                            <p className="text-[10px] text-slate-600 mt-0.5 font-mono truncate max-w-xs">{repo.path}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {repo.last_synced_at && (
                            <span className="text-[10px] text-slate-600 hidden md:block">
                              {new Date(repo.last_synced_at).toLocaleString()}
                            </span>
                          )}
                          <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${s.color}`}>
                            {s.icon} {s.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Status breakdown */}
              {repos.length > 0 && (
                <div className="grid grid-cols-5 gap-3">
                  {(["ready", "cloning", "syncing", "clone_failed", "sync_failed"] as SyncStatus[]).map(s => {
                    const count = reposByStatus[s] ?? 0;
                    const cfg = statusConfig[s];
                    return (
                      <div key={s} className="bg-slate-900/30 border border-slate-800 rounded-xl p-3 text-center">
                        <p className={`text-xl font-bold ${count > 0 ? cfg.color.split(" ")[0] : "text-slate-700"}`}>{count}</p>
                        <p className="text-[10px] text-slate-600 mt-1 capitalize">{s.replace("_", " ")}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Activity note */}
          <div className="flex items-center gap-2 text-slate-600 text-xs">
            <Activity size={12} />
            Activity log endpoint not yet available in backend API.
          </div>

        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="bg-[#161b22] border border-slate-800 rounded-2xl p-6 flex items-center gap-5">
      <div className={`w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 ${color}`}>{icon}</div>
      <div>
        <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}
