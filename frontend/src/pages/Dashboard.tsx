import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import {
  Plus, ChevronRight, Search, RefreshCw, Settings,
  BookOpen, Globe, GitBranch, GitCommit, Tag,
  CheckCircle, Loader, AlertTriangle, Clock, Trash2,
} from "lucide-react";
import { reposApi, ApiError } from "../api/client";
import type { RepoInfo, Page, User } from "../App";

type SyncStatus = RepoInfo["status"];

const StatusBadge = ({ status }: { status: SyncStatus }) => {
  const cfg: Record<SyncStatus, { label: string; color: string; icon: React.ReactNode }> = {
    ready: { label: "Ready", color: "text-green-400 bg-green-500/10 border-green-500/20", icon: <CheckCircle size={10} /> },
    cloning: { label: "Cloning", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: <Loader size={10} className="animate-spin" /> },
    syncing: { label: "Syncing", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: <Loader size={10} className="animate-spin" /> },
    clone_failed: { label: "Clone failed", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: <AlertTriangle size={10} /> },
    sync_failed: { label: "Sync failed", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: <Clock size={10} /> },
  };
  const c = cfg[status] ?? cfg.clone_failed;
  return (
    <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${c.color}`}>
      {c.icon} {c.label}
    </span>
  );
};

interface Props {
  navigate: (p: Page) => void;
  user?: User | null;
  onLogout?: () => void;
  currentRepo: string;
  setCurrentRepo: (r: string) => void;
}

export default function Dashboard({ navigate, user, onLogout, setCurrentRepo }: Props) {
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRepos = useCallback(async () => {
    try {
      const data = await reposApi.list();
      setRepos(data);
    } catch (e) {
      console.error("Failed to load repos", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRepos();
    // Poll co 5s jeśli są repozytoria w stanie cloning/syncing
    const id = setInterval(() => {
      setRepos(prev => {
        const hasActive = prev.some(r => r.status === "cloning" || r.status === "syncing");
        if (hasActive) fetchRepos();
        return prev;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [fetchRepos]);

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete repository "${name}"? This cannot be undone.`)) return;
    setDeletingId(name);
    try {
      await reposApi.delete(name);
      setRepos(prev => prev.filter(r => r.name !== name));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Delete failed";
      alert(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = repos.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex min-h-screen bg-[#0f1115]">
      <Sidebar activePage="dashboard" navigate={navigate} user={user} onLogout={onLogout} />

      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-[#0f1115]/80 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-white">Dashboard</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search repositories..."
              className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-green-500/50 w-56 text-white transition-colors" />
          </div>
        </header>

        <div className="p-8 max-w-5xl w-full">
          {/* Add repo */}
          <section className="mb-10">
            <div className="bg-gradient-to-b from-slate-900 to-[#0f1115] border border-slate-800 rounded-2xl p-7">
              <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <Plus size={18} className="text-green-500" /> Add New Repository
              </h3>
              <p className="text-slate-500 text-xs mb-5">Paste a GitHub, GitLab or SSH URL to start indexing.</p>
              <button onClick={() => navigate("onboarding")}
                className="w-full bg-[#0d1117] border border-slate-700 hover:border-green-500 rounded-xl px-4 py-3 text-slate-500 hover:text-white text-sm focus:outline-none transition-colors font-mono text-left flex items-center justify-between group">
                <span>https://github.com/user/repo  or  git@github.com:user/repo.git</span>
                <ChevronRight size={16} className="text-slate-600 group-hover:text-green-500 transition" />
              </button>
            </div>
          </section>

          {/* Repo list */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Repositories {!loading && `(${filtered.length})`}
              </h3>
              <button onClick={fetchRepos} className="text-slate-500 hover:text-white transition p-1.5 rounded-lg hover:bg-slate-800" title="Refresh">
                <RefreshCw size={13} />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
                <Loader size={16} className="animate-spin" /> Loading repositories...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-600 text-sm">
                {repos.length === 0 ? "No repositories yet. Add one above." : "No repositories match your search."}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(repo => (
                  <div key={repo.name} className="bg-slate-900/40 border border-slate-800 rounded-2xl px-5 py-4 hover:border-slate-700 transition group">
                    <div className="flex items-center gap-5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5">
                          <p className="text-sm font-bold text-white group-hover:text-green-400 transition font-mono">{repo.name}</p>
                          <StatusBadge status={repo.status} />
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1"><Globe size={10} /> Git</span>
                          {repo.last_synced_at && (
                            <span>Last synced: {new Date(repo.last_synced_at).toLocaleString()}</span>
                          )}
                          {repo.error && (
                            <span className="text-red-400 flex items-center gap-1"><AlertTriangle size={10} /> {repo.error}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {repo.status === "ready" && (
                          <ActionBtn title="View Documentation" onClick={() => { setCurrentRepo(repo.name); navigate("documentation"); }}>
                            <BookOpen size={14} />
                          </ActionBtn>
                        )}
                        <ActionBtn title="Management" onClick={() => { setCurrentRepo(repo.name); navigate("project-management"); }}>
                          <Settings size={14} />
                        </ActionBtn>
                        <ActionBtn
                          title="Delete"
                          onClick={() => handleDelete(repo.name)}
                          danger
                          loading={deletingId === repo.name}
                        >
                          {deletingId === repo.name ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </ActionBtn>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function ActionBtn({ children, title, onClick, danger = false, loading = false }: {
  children: React.ReactNode; title: string; onClick: () => void; danger?: boolean; loading?: boolean;
}) {
  return (
    <button title={title} onClick={onClick} disabled={loading}
      className={`w-8 h-8 flex items-center justify-center rounded-lg border transition ${
        danger
          ? "bg-slate-800/60 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border-slate-700/50 hover:border-red-500/30"
          : "bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700/50 hover:border-slate-600"
      }`}>
      {children}
    </button>
  );
}
