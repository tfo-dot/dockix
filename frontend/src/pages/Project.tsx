import React from "react";
import Sidebar from "../components/Sidebar";
import { 
  GitBranch, 
  GitCommit, 
  RefreshCw, 
  Database, 
  FileText, 
  ChevronRight 
} from "lucide-react";

export default function Project() {
  return (
    <div className="flex min-h-screen bg-[#0f1115]">
      <Sidebar activePage="project" />
      
      <main className="flex-1 flex flex-col">
        {/* HEADER */}
        <header className="h-20 border-b border-slate-800 flex items-center justify-between px-8 bg-[#0f1115]/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white">Project</h2>
            <span className="text-slate-600">/</span>
            <span className="text-sm font-mono text-green-500">kernel-module-xyz</span>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition">
            <RefreshCw size={14} /> Resync Repository
          </button>
        </header>

        <div className="p-8 max-w-6xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* KOLUMNA LEWA: Struktura i pliki */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-[#161b22] border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 bg-[#0d1117] flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">File Structure</span>
                <div className="flex gap-2">
                  <span className="text-[10px] text-green-500 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">main</span>
                </div>
              </div>
              <div className="p-4 space-y-1">
                <FileRow name="src/main.c" type="file" status="Analyzed" />
                <FileRow name="src/utils.h" type="file" status="Analyzed" />
                <FileRow name="include/kernel_api.h" type="file" status="Processing" active />
                <FileRow name="docs/" type="folder" status="2 files" />
                <FileRow name="Makefile" type="file" status="Analyzed" />
              </div>
            </section>
          </div>

          {/* KOLUMNA PRAWA: Statystyki projektu */}
          <div className="space-y-6">
            <section className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6">Project Stats</h3>
              
              <div className="space-y-4">
                <StatBox icon={<GitBranch size={16}/>} label="Branches" value="4 Active" />
                <StatBox icon={<GitCommit size={16}/>} label="Total Commits" value="1,284" />
                <StatBox icon={<Database size={16}/>} label="Data Points" value="42.5k" />
                <StatBox icon={<FileText size={16}/>} label="Auto-Docs" value="186 pages" />
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-400">Overall Documentation Status</span>
                  <span className="text-xs text-green-500 font-bold">78%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-[78%]" />
                </div>
              </div>
            </section>
          </div>

        </div>
      </main>
    </div>
  );
}

function FileRow({ name, type, status, active = false }: { name: string, type: 'file' | 'folder', status: string, active?: boolean }) {
  return (
    <div className={`flex items-center justify-between p-2.5 rounded-lg transition-colors group cursor-pointer ${active ? 'bg-green-500/5 border border-green-500/20' : 'hover:bg-slate-800/50'}`}>
      <div className="flex items-center gap-3">
        <div className={active ? 'text-green-500' : 'text-slate-500'}>
          {type === 'folder' ? <div className="w-4 h-4 bg-blue-500/20 rounded" /> : <div className="w-4 h-4 bg-slate-700 rounded" />}
        </div>
        <span className={`text-sm ${active ? 'text-white font-medium' : 'text-slate-300'}`}>{name}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className={`text-[10px] font-mono ${active ? 'text-green-400' : 'text-slate-500'}`}>{status}</span>
        <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-400" />
      </div>
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-tight">{label}</p>
        <p className="text-sm font-medium text-white">{value}</p>
      </div>
    </div>
  );
}