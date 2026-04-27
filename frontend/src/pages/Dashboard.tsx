import React from "react";
import Sidebar from "../components/Sidebar";
import { Plus, ChevronRight, ExternalLink, Search } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="flex min-h-screen bg-[#0f1115]">
      <Sidebar activePage="dashboard" />
      
      <main className="flex-1 flex flex-col">
        <header className="h-20 border-b border-slate-800 flex items-center justify-between px-8 bg-[#0f1115]/50 backdrop-blur-md">
          <h2 className="text-xl font-semibold text-white">Dashboard</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search projects..." 
              className="bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-green-500/50 w-64 text-white"
            />
          </div>
        </header>

        <div className="p-8 max-w-5xl w-full">
          {/* Sekcja dodawania repo */}
          <section className="mb-12">
            <div className="bg-gradient-to-b from-slate-900 to-[#0f1115] border border-slate-800 rounded-2xl p-8 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Plus size={20} className="text-green-500" /> Add New Project
              </h3>
              <p className="text-slate-500 text-sm mb-6">Import your repository to start indexing.</p>
              
              <div className="flex gap-3">
                <input 
                  type="text" 
                  placeholder="wklej link do repo (np. github.com/user/repo)" 
                  className="flex-1 bg-[#0d1117] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
                />
                <button className="bg-green-600 hover:bg-green-500 text-white font-bold px-8 rounded-xl transition-all flex items-center gap-2">
                  Index <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </section>

          {/* Lista aktywnych projektów */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6">Active Repositories</h3>
            <div className="grid grid-cols-1 gap-4">
              <ProjectItem name="kernel-module-xyz" status="78%" color="bg-green-500" />
              <ProjectItem name="dockix-frontend" status="Synced" color="bg-blue-500" />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function ProjectItem({ name, status, color }: { name: string, status: string, color: string }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center justify-between group hover:border-slate-700 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`w-2 h-2 rounded-full ${color} shadow-[0_0_8px_rgba(0,0,0,0.4)]`} />
        <p className="text-white font-medium group-hover:text-green-400 transition-colors">{name}</p>
      </div>
      <div className="flex items-center gap-6">
        <span className="text-xs font-mono text-slate-400">{status}</span>
        <ExternalLink size={16} className="text-slate-600 cursor-pointer hover:text-white" />
      </div>
    </div>
  );
}