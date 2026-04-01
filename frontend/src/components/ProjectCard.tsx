import { RefreshCw } from "lucide-react";

export type ProjectStatus = "synced" | "indexing" | "error";

export interface Project {
  id: string;
  name: string;
  branch: string;
  status: ProjectStatus;
  lastSync: string;
}

const StatusBadge = ({ status }: { status: ProjectStatus }) => {
  const styles = {
    synced: "bg-green-500/10 text-green-500 border-green-500/20",
    indexing: "bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse",
    error: "bg-red-500/10 text-red-500 border-red-500/20",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-mono border ${styles[status]}`}
    >
      {status.toUpperCase()}
    </span>
  );
};

export default function ProjectCard({ project }) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-white group-hover:text-blue-400 transition">
            {project.name}
          </h3>
          <code className="text-[10px] text-slate-600 uppercase tracking-widest">
            {project.branch}
          </code>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="flex items-center justify-between mt-8">
        <div className="text-xs text-slate-500">
          Last sync: <span className="text-slate-400">{project.lastSync}</span>
        </div>
        <div className="flex gap-2">
          <button
            className="p-2 hover:bg-slate-800 rounded-md transition text-slate-400"
            title="Sync Now"
          >
            <RefreshCw
              size={14}
              className={project.status === "indexing" ? "animate-spin" : ""}
            />
          </button>
          <button className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded transition">
            VIEW DOCS
          </button>
        </div>
      </div>
    </div>
  );
}
