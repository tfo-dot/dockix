import React from "react";
import { 
  Terminal, 
  Activity, 
  Layers, 
  Table as TableIcon, 
  ArrowRight 
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-300 font-sans selection:bg-green-500/30">
      {/* Nawigacja - Powiększone logo bez napisów */}
      <nav className="p-8">
        <img src="/logo.svg" alt="dockix logo" className="h-20 w-auto" />
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* LEWA STRONA: Analysis Engine */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 to-blue-500/20 blur opacity-25" />
          <div className="relative bg-[#161b22] border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
            <div className="bg-[#0d1117] px-4 py-2 border-b border-slate-800 flex items-center justify-between">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/20" />
                <div className="w-3 h-3 rounded-full bg-amber-500/20" />
                <div className="w-3 h-3 rounded-full bg-green-500/20" />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Analysis Engine</span>
            </div>
            <div className="p-6 font-mono text-sm leading-relaxed">
              <div className="flex gap-4">
                <span className="text-slate-600 text-right w-4">6</span>
                <p><span className="text-blue-400">def</span> <span className="text-yellow-200">parse_code</span>(d):</p>
              </div>
              <div className="flex gap-4">
                <span className="text-slate-600 text-right w-4">7</span>
                <p className="pl-4 text-slate-400"># 123456 processing</p>
              </div>
              <div className="flex gap-4">
                <span className="text-slate-600 text-right w-4">8</span>
                <p><span className="text-blue-400">def</span> <span className="text-yellow-200">cunyoaticer</span>(aronel):</p>
              </div>
              <div className="flex gap-4">
                <span className="text-slate-600 text-right w-4">9</span>
                <p className="pl-4">current_conn = parse_code(u)</p>
              </div>
              <div className="flex gap-4">
                <span className="text-slate-600 text-right w-4">10</span>
                <p className="pl-4"><span className="text-purple-400">return</span> <span className="text-orange-300">True</span></p>
              </div>
              <div className="flex gap-4 mt-2">
                <span className="text-slate-600 text-right w-4">11</span>
                <p><span className="text-blue-400">if</span> (leopascort) {'{'}</p>
              </div>
              <div className="flex gap-4">
                <span className="text-slate-600 text-right w-4">12</span>
                <p className="pl-4 text-green-400">coder.data;</p>
              </div>
              <div className="flex gap-4">
                <span className="text-slate-600 text-right w-4">13</span>
                <p className="pl-4 text-purple-400">return <span className="text-slate-300">data</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* PRAWA STRONA: Status i Akcje */}
        <div className="flex flex-col gap-8">
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl">
            <div className="flex items-center gap-6 mb-8">
              {/* Progress Circle (78%) */}
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
                    strokeDasharray={251.2} strokeDashoffset={251.2 * (1 - 0.78)} 
                    className="text-green-500" strokeLinecap="round" />
                </svg>
                <span className="absolute text-xl font-bold text-white">78%</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">Indexing Process</h3>
                <p className="text-slate-500 text-sm">Automated documentation in progress...</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-6 rounded-xl transition flex items-center justify-center gap-2 group">
                GET STARTED NOW <ArrowRight size={18} className="group-hover:translate-x-1 transition" />
              </button>
              <button className="w-full border border-slate-700 hover:bg-slate-800 text-white font-medium py-3 px-6 rounded-xl transition">
                Sign now
              </button>
            </div>
          </div>

          {/* Grid funkcji */}
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={<Activity size={16}/>} text="Automated Flowcharts" />
            <FeatureItem icon={<Terminal size={16}/>} text="Team Activity Logs" />
            <FeatureItem icon={<TableIcon size={16}/>} text="Data Tables" />
            <FeatureItem icon={<Layers size={16}/>} text="Indexing Process" />
          </div>
        </div>
      </main>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <div className="flex items-center gap-3 bg-slate-900/30 border border-slate-800/50 p-3 rounded-lg">
      <div className="text-green-500">{icon}</div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{text}</span>
    </div>
  );
}