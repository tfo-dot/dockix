import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import {
  Plus, ChevronRight, Search, RefreshCw, Settings,
  BookOpen, Globe, GitBranch, GitCommit, Tag,
  CheckCircle, Loader, AlertTriangle, Clock, ExternalLink,
} from "lucide-react";
import type { Page, User as UserType } from "../App";

type SyncStatus = "synced" | "syncing" | "error" | "outdated";
type RefType = "branch" | "tag" | "commit";
type Provider = "github" | "gitlab" | "self-hosted";

interface ProjectItem {
  id: string; name: string; provider: Provider;
  refType: RefType; refName: string; status: SyncStatus;
  lastSync: string; docsCount: number;
}

const PROJECTS: ProjectItem[] = [
  { id: "1", name: "kernel-module-xyz", provider: "github", refType: "branch", refName: "main", status: "synced", lastSync: "2 min ago", docsCount: 186 },
  { id: "2", name: "dockix-frontend", provider: "github", refType: "tag", refName: "v2.1.0", status: "syncing", lastSync: "syncing...", docsCount: 94 },
  { id: "3", name: "internal-auth-service", provider: "gitlab", refType: "branch", refName: "develop", status: "error", lastSync: "1 hour ago", docsCount: 42 },
  { id: "4", name: "legacy-api", provider: "self-hosted", refType: "commit", refName: "a3f9c12", status: "outdated", lastSync: "5 days ago", docsCount: 231 },
];

const ProviderBadge = ({ provider }: { provider: Provider }) => {
  const cfg: Record<Provider, { label: string; color: string }> = {
    github: { label: "GitHub", color: "text-white" },
    gitlab: { label: "GitLab", color: "text-orange-400" },
    "self-hosted": { label: "Self-hosted", color: "text-slate-400" },
  };
  const c = cfg[provider];
  return <span className={`flex items-center gap-1 text-[10px] font-bold ${c.color}`}><Globe size={10} /> {c.label}</span>;
};

const RefBadge = ({ type, name }: { type: RefType; name: string }) => {
  const icon = type === "branch" ? <GitBranch size={10} /> : type === "tag" ? <Tag size={10} /> : <GitCommit size={10} />;
  return (
    <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
      {icon} {name}
    </span>
  );
};

const StatusBadge = ({ status }: { status: SyncStatus }) => {
  const cfg: Record<SyncStatus, { label: string; color: string; icon: React.ReactNode }> = {
    synced: { label: "Synced", color: "text-green-400 bg-green-500/10 border-green-500/20", icon: <CheckCircle size={10} /> },
    syncing: { label: "Syncing", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: <Loader size={10} className="animate-spin" /> },
    error: { label: "Error", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: <AlertTriangle size={10} /> },
    outdated: { label: "Outdated", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: <Clock size={10} /> },
  };
  const c = cfg[status];
  return (
    <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${c.color}`}>
      {c.icon} {c.label}
    </span>
  );
};

export default function Dashboard({ navigate, user, onLogout }: {
  navigate: (p: Page) => void; user?: UserType | null; onLogout?: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = PROJECTS.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex min-h-screen bg-[#0f1115]">
      <Sidebar activePage="dashboard" navigate={navigate} user={user} onLogout={onLogout} />

      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-[#0f1115]/80 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-white">Dashboard</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search projects..."
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
              <div className="flex gap-3">
                <input type="text"
                  placeholder="https://github.com/user/repo  or  git@github.com:user/repo.git"
                  className="flex-1 bg-[#0d1117] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500 transition-colors font-mono" />
                <button onClick={() => navigate("onboarding")}
                  className="bg-green-600 hover:bg-green-500 text-white font-bold px-7 rounded-xl transition flex items-center gap-2 text-sm">
                  Index <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </section>

          {/* Project list */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Repositories ({filtered.length})
              </h3>
            </div>
            <div className="space-y-3">
              {filtered.length === 0 && <p className="text-slate-600 text-sm py-8 text-center">No projects match your search.</p>}
              {filtered.map(project => (
                <div key={project.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl px-5 py-4 hover:border-slate-700 transition group">
                  <div className="flex items-center gap-5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-sm font-bold text-white group-hover:text-green-400 transition font-mono">{project.name}</p>
                        <StatusBadge status={project.status} />
                      </div>
                      <div className="flex items-center gap-4">
                        <ProviderBadge provider={project.provider} />
                        <RefBadge type={project.refType} name={project.refName} />
                        <span className="text-[10px] text-slate-600">{project.docsCount} doc pages</span>
                        <span className="text-[10px] text-slate-600">Last sync: {project.lastSync}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ActionBtn title="View Documentation" onClick={() => navigate("documentation")}>
                        <BookOpen size={14} />
                      </ActionBtn>
                      <ActionBtn title="Refresh" onClick={() => {}}>
                        <RefreshCw size={14} className={project.status === "syncing" ? "animate-spin" : ""} />
                      </ActionBtn>
                      <ActionBtn title="Settings" onClick={() => navigate("project-management")}>
                        <Settings size={14} />
                      </ActionBtn>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function ActionBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button title={title} onClick={onClick}
      className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/50 hover:border-slate-600 transition">
      {children}
    </button>
  );
}
