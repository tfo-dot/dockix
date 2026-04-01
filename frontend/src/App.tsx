import React, { useState } from "react";
import { Computer, Search, Eye } from "lucide-react";

import Log from "./components/Log.tsx";
import Sidebar from "./components/Sidebar.tsx";
import ProjectCard, { type Project } from "./components/ProjectCard.tsx";

const MOCK_PROJECTS: Project[] = [
  {
    id: "1",
    name: "kernel-module-xyz",
    branch: "main",
    status: "synced",
    lastSync: "2m ago",
  },
  {
    id: "2",
    name: "tree-sitter-parser",
    branch: "develop",
    status: "indexing",
    lastSync: "Now",
  },
  {
    id: "3",
    name: "legacy-api-docs",
    branch: "v1.0",
    status: "error",
    lastSync: "1h ago",
  },
];

export default function Dashboard() {
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-300 font-sans selection:bg-blue-500/30">
      {/* 1. IMPERSONATION BAR (Audit/Preview) */}
      {isPreviewMode && (
        <div className="bg-amber-500 text-black px-4 py-1.5 text-center text-sm font-bold flex justify-center items-center gap-4">
          <Eye size={16} /> VIEWING AS GUEST (READ-ONLY)
          <button
            onClick={() => setIsPreviewMode(false)}
            className="bg-black/20 hover:bg-black/30 px-2 py-0.5 rounded text-xs transition"
          >
            Exit Preview
          </button>
        </div>
      )}

      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-8">
          {/* Header Area */}
          <header className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Project Dashboard
              </h1>
              <p className="text-slate-500 text-sm">
                Managing {MOCK_PROJECTS.length} indexed repositories.
              </p>
            </div>

            <div className="flex gap-3">
              <div className="relative">
                <Search
                  className="absolute left-3 top-2.5 text-slate-500"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Ctrl + K to search..."
                  className="bg-slate-900 border border-slate-800 rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition w-64"
                />
              </div>
              <button
                onClick={() => setIsPreviewMode(true)}
                className="flex items-center gap-2 px-4 py-2 border border-slate-700 rounded-md text-sm hover:bg-slate-800 transition"
              >
                <Eye size={16} /> Preview Mode
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-medium transition">
                <Computer size={16} /> Add Repository
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MOCK_PROJECTS.map((proj) => (
              <ProjectCard project={proj} key={proj.id} />
            ))}
          </div>

          <Log />
        </main>
      </div>
    </div>
  );
}
