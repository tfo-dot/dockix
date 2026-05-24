import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import {
  RefreshCw, Database, FileText, ChevronRight,
  Loader, AlertTriangle, CheckCircle, Clock, FileCode,
  Folder, FolderOpen, Code2, Hash,
} from "lucide-react";
import { reposApi } from "../api/client";
import type { RepoInfo, ParsedRepo } from "../api/client";
import type { Page, User } from "../App";

interface Props {
  navigate: (p: Page) => void;
  user?: User | null;
  onLogout?: () => void;
  currentRepo: string;
  setCurrentRepo: (r: string) => void;
}

type SyncStatus = RepoInfo["status"];

const StatusBadge = ({ status }: { status: SyncStatus }) => {
  const cfg: Record<SyncStatus, { label: string; color: string; icon: React.ReactNode }> = {
    ready:        { label: "Ready",        color: "text-green-400 bg-green-500/10 border-green-500/20",  icon: <CheckCircle size={11} /> },
    cloning:      { label: "Cloning",      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",    icon: <Loader size={11} className="animate-spin" /> },
    syncing:      { label: "Syncing",      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",    icon: <Loader size={11} className="animate-spin" /> },
    clone_failed: { label: "Clone failed", color: "text-red-400 bg-red-500/10 border-red-500/20",       icon: <AlertTriangle size={11} /> },
    sync_failed:  { label: "Sync failed",  color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: <Clock size={11} /> },
  };
  const c = cfg[status] ?? cfg.clone_failed;
  return (
    <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${c.color}`}>
      {c.icon} {c.label}
    </span>
  );
};

// Prosta reprezentacja pliku z analizy
interface FileRow { path: string; functions: number; classes: number; language: string; }

function buildFileRows(data: ParsedRepo): FileRow[] {
  return data.files.map(f => ({
    path: f.file_path,
    functions: f.functions.length,
    classes: f.classes.length,
    language: f.language,
  }));
}

export default function Project({ navigate, user, onLogout, currentRepo, setCurrentRepo }: Props) {
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [analysis, setAnalysis] = useState<ParsedRepo | null>(null);
  const [fileRows, setFileRows] = useState<FileRow[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resyncing, setResyncing] = useState(false);

  // Jeśli nie ma wybranego repo, załaduj listę
  useEffect(() => {
    reposApi.list()
      .then(list => {
        setRepos(list);
        // Jeśli currentRepo nie jest ustawiony, weź pierwszy gotowy
        if (!currentRepo) {
          const first = list.find(r => r.status === "ready");
          if (first) setCurrentRepo(first.name);
        }
      })
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load repos"))
      .finally(() => setLoadingRepos(false));
  }, []);

  // Załaduj analizę gdy currentRepo się zmieni
  useEffect(() => {
    if (!currentRepo) return;
    setLoadingAnalysis(true);
    setAnalysis(null);
    setFileRows([]);
    reposApi.analyze(currentRepo)
      .then(data => {
        setAnalysis(data);
        setFileRows(buildFileRows(data));
      })
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load analysis"))
      .finally(() => setLoadingAnalysis(false));
  }, [currentRepo]);

  const currentRepoInfo = repos.find(r => r.name === currentRepo);

  // Statystyki wyliczane z analizy
  const totalFunctions = analysis?.files.reduce((s, f) => s + f.functions.length, 0) ?? 0;
  const totalClasses = analysis?.files.reduce((s, f) => s + f.classes.length, 0) ?? 0;
  const totalFiles = analysis?.files.length ?? 0;
  const languages = [...new Set(analysis?.files.map(f => f.language).filter(Boolean) ?? [])];

  const handleResync = async () => {
    if (!currentRepo) return;
    setResyncing(true);
    // Backend nie ma endpointu resync — odświeżamy tylko status z listy
    try {
      const list = await reposApi.list();
      setRepos(list);
    } finally {
      setResyncing(false);
    }
  };

  if (loadingRepos) {
    return (
      <div className="flex min-h-screen bg-[#0f1115]">
        <Sidebar activePage="project" navigate={navigate} user={user} onLogout={onLogout} />
        <div className="flex-1 flex items-center justify-center text-slate-500 gap-2">
          <Loader size={16} className="animate-spin" /> Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0f1115]">
      <Sidebar activePage="project" navigate={navigate} user={user} onLogout={onLogout} />

      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-[#0f1115]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-semibold text-white shrink-0">Project</h2>
            {currentRepo && (
              <>
                <span className="text-slate-600">/</span>
                {/* Selector repo jeśli jest więcej niż jedno */}
                {repos.length > 1 ? (
                  <select
                    value={currentRepo}
                    onChange={e => setCurrentRepo(e.target.value)}
                    className="bg-transparent text-sm font-mono text-green-500 focus:outline-none cursor-pointer"
                  >
                    {repos.map(r => (
                      <option key={r.name} value={r.name} className="bg-[#0f1115]">{r.name}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm font-mono text-green-500 truncate">{currentRepo}</span>
                )}
                {currentRepoInfo && <StatusBadge status={currentRepoInfo.status} />}
              </>
            )}
          </div>
          <button
            onClick={handleResync}
            disabled={resyncing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition"
          >
            <RefreshCw size={13} className={resyncing ? "animate-spin" : ""} />
            Refresh Status
          </button>
        </header>

        {!currentRepo ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
            <Folder size={40} className="text-slate-700" />
            <p className="text-sm">No repository selected.</p>
            <button onClick={() => navigate("dashboard")}
              className="text-xs text-green-400 hover:text-green-300 underline">
              Go to Dashboard to add one
            </button>
          </div>
        ) : (
          <div className="p-8 max-w-6xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left: File list from analysis */}
            <div className="lg:col-span-2 space-y-6">
              <section className="bg-[#161b22] border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-[#0d1117] flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Analyzed Files
                  </span>
                  {languages.length > 0 && (
                    <div className="flex gap-1.5">
                      {languages.map(lang => (
                        <span key={lang} className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 font-mono">
                          {lang}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {loadingAnalysis ? (
                  <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
                    <Loader size={14} className="animate-spin" /> Loading analysis...
                  </div>
                ) : error ? (
                  <div className="p-4 text-red-400 text-sm flex items-center gap-2">
                    <AlertTriangle size={14} /> {error}
                  </div>
                ) : fileRows.length === 0 ? (
                  <div className="p-8 text-center text-slate-600 text-sm">
                    No analyzed files yet. Repository may still be indexing.
                  </div>
                ) : (
                  <div className="p-4 space-y-1 max-h-96 overflow-y-auto">
                    {fileRows.map(file => (
                      <div key={file.path}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-800/50 transition group cursor-pointer"
                        onClick={() => navigate("documentation")}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileCode size={14} className="text-slate-600 shrink-0" />
                          <span className="text-sm text-slate-300 font-mono truncate">{file.path}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          {file.functions > 0 && (
                            <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                              <Code2 size={9} /> {file.functions} fn
                            </span>
                          )}
                          {file.classes > 0 && (
                            <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                              <Hash size={9} /> {file.classes} cls
                            </span>
                          )}
                          {file.functions === 0 && file.classes === 0 && (
                            <span className="text-[10px] text-slate-600">no symbols</span>
                          )}
                          <ChevronRight size={13} className="text-slate-700 group-hover:text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {currentRepoInfo?.last_synced_at && (
                <p className="text-[10px] text-slate-600 ml-1">
                  Last synced: {new Date(currentRepoInfo.last_synced_at).toLocaleString()}
                </p>
              )}
              {currentRepoInfo?.error && (
                <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg flex items-center gap-2 text-xs text-red-400">
                  <AlertTriangle size={12} /> {currentRepoInfo.error}
                </div>
              )}
            </div>

            {/* Right: Stats from analysis */}
            <div className="space-y-6">
              <section className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">
                  Analysis Stats
                </h3>
                <div className="space-y-4">
                  <StatBox icon={<FileText size={15} />} label="Files Analyzed" value={loadingAnalysis ? "…" : `${totalFiles}`} />
                  <StatBox icon={<Code2 size={15} />} label="Functions" value={loadingAnalysis ? "…" : `${totalFunctions}`} />
                  <StatBox icon={<Hash size={15} />} label="Classes" value={loadingAnalysis ? "…" : `${totalClasses}`} />
                  <StatBox icon={<Database size={15} />} label="Languages" value={loadingAnalysis ? "…" : languages.length > 0 ? languages.join(", ") : "—"} />
                </div>

                {!loadingAnalysis && totalFiles > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-800">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-slate-400">Files with symbols</span>
                      <span className="text-xs text-green-500 font-bold">
                        {Math.round((fileRows.filter(f => f.functions > 0 || f.classes > 0).length / totalFiles) * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${Math.round((fileRows.filter(f => f.functions > 0 || f.classes > 0).length / totalFiles) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={() => navigate("documentation")}
                  className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-2"
                >
                  View Documentation <ChevronRight size={13} />
                </button>
              </section>

              {/* Inne repo w projekcie */}
              {repos.length > 1 && (
                <section className="bg-slate-900/30 border border-slate-800 rounded-2xl p-5">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Other Repos</h3>
                  <div className="space-y-2">
                    {repos.filter(r => r.name !== currentRepo).map(r => (
                      <div key={r.name}
                        onClick={() => setCurrentRepo(r.name)}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-800/50 cursor-pointer transition">
                        <span className="text-xs font-mono text-slate-400 truncate">{r.name}</span>
                        <StatusBadge status={r.status} />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-tight">{label}</p>
        <p className="text-sm font-medium text-white truncate">{value}</p>
      </div>
    </div>
  );
}
