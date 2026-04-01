import { Layout, Settings, ShieldCheck, Database } from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-slate-800 h-screen sticky top-0 bg-[#0f1115] p-4 flex flex-col gap-8">
      <div className="flex items-center gap-3 px-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white italic font-black">
          D
        </div>
        <span className="font-bold text-white tracking-tight">Dockix</span>
      </div>

      <nav className="flex flex-col gap-1">
        <a
          href="#"
          className="flex items-center gap-3 px-3 py-2 bg-slate-800/50 text-white rounded-md transition"
        >
          <Layout size={18} /> Projects
        </a>
        <a
          href="#"
          className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800/30 rounded-md transition"
        >
          <Database size={18} /> Workers
        </a>
        <a
          href="#"
          className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800/30 rounded-md transition"
        >
          <Settings size={18} /> Settings
        </a>
        <a
          href="#"
          className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800/30 rounded-md transition text-red-400/80"
        >
          <ShieldCheck size={18} /> Admin Panel
        </a>
      </nav>
    </aside>
  );
}
