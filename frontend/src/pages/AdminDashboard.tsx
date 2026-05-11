import React from "react";
import Sidebar from "../components/Sidebar";
import { FolderGit2, HardDrive, CheckCircle, Loader, AlertTriangle, Clock, Activity } from "lucide-react";
import type { Page, User as UserType } from "../App";

const PROJECTS = [
  { name: "kernel-module-xyz", status: "synced", docs: 186, size: "24.3 MB" },
  { name: "dockix-frontend", status: "syncing", docs: 94, size: "11.7 MB" },
  { name: "internal-auth-service", status: "error", docs: 42, size: "5.1 MB" },
  { name: "legacy-api", status: "outdated", docs: 231, size: "38.9 MB" },
];

const LOGS = [
  { user: "User2137", action: "Triggered full re-index", project: "kernel-module-xyz", time: "2 min ago" },
  { user: "Alice K.", action: "Edited documentation", project: "dockix-frontend", time: "45 min ago" },
  { user: "Bot", action: "Auto-sync completed", project: "legacy-api", time: "1 hour ago" },
  { user: "User2137", action: "Changed role for Bob D.", project: "kernel-module-xyz", time: "3 hours ago" },
  { user: "Bob D.", action: "Viewed documentation", project: "internal-auth-service", time: "5 hours ago" },
  { user: "Alice K.", action: "Invited new member", project: "dockix-frontend", time: "1 day ago" },
  { user: "User2137", action: "Connected repository", project: "internal-auth-service", time: "2 days ago" },
  { user: "Bot", action: "Parse error detected", project: "internal-auth-service", time: "2 days ago" },
  { user: "User2137", action: "Created project", project: "legacy-api", time: "5 days ago" },
  { user: "Alice K.", action: "First sync completed", project: "kernel-module-xyz", time: "1 week ago" },
];

type SyncStatus = "synced" | "syncing" | "error" | "outdated";

const statusConfig: Record<SyncStatus, { label: string; color: string; icon: React.ReactNode }> = {
  synced: { label: "Synced", color: "text-green-400 bg-green-500/10 border-green-500/20", icon: <CheckCircle size={12} /> },
  syncing: { label: "Syncing", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: <Loader size={12} className="animate-spin" /> },
  error: { label: "Error", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: <AlertTriangle size={12} /> },
  outdated: { label: "Outdated", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: <Clock size={12} /> },
};

const totalDiskMB = PROJECTS.reduce((acc, p) => acc + parseFloat(p.size), 0);

export default function AdminDashboard({ navigate, user, onLogout }: {
  navigate: (p: Page) => void; user?: UserType | null; onLogout?: () => void;
}) {
  return (
    <div className="flex min-h-screen bg-[#0f1115]">
      <Sidebar activePage="admin" navigate={navigate} user={user} onLogout={onLogout} />

      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-16 border-b border-slate-800 flex items-center px-8 bg-[#0f1115]/80 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-white">Admin Dashboard</h2>
        </header>

        <div className="p-8 max-w-5xl w-full space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={<FolderGit2 size={20} />} label="Projects Indexed" value={`${PROJECTS.length}`} sub="across all workspaces" color="text-blue-400" />
            <StatCard icon={<HardDrive size={20} />} label="Total Disk Usage" value={`${totalDiskMB.toFixed(1)} MB`} sub="combined index storage" color="text-purple-400" />
          </div>

          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Project Statuses</h3>
            <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden">
              {PROJECTS.map((p, i) => {
                const s = statusConfig[p.status as SyncStatus];
                return (
                  <div key={p.name} className={`flex items-center justify-between px-5 py-4 ${i < PROJECTS.length - 1 ? "border-b border-slate-800" : ""}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">
                        <FolderGit2 size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white font-mono">{p.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{p.docs} doc pages · {p.size}</p>
                      </div>
                    </div>
                    <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${s.color}`}>
                      {s.icon} {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Activity size={13} className="text-slate-500" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Recent Activity (last 10)</h3>
            </div>
            <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden">
              {LOGS.map((log, i) => (
                <div key={i} className={`flex items-start gap-4 px-5 py-3.5 ${i < LOGS.length - 1 ? "border-b border-slate-800/60" : ""}`}>
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-[9px] shrink-0 mt-0.5">
                    {log.user === "Bot" ? "⚙" : log.user[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300">
                      <span className="font-medium text-white">{log.user}</span>{" "}{log.action}{" "}
                      <span className="font-mono text-blue-400 text-[11px]">{log.project}</span>
                    </p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{log.time}</p>
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

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-[#161b22] border border-slate-800 rounded-2xl p-6 flex items-center gap-5">
      <div className={`w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}
