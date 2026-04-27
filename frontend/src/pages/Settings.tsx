import React from "react";
import Sidebar from "../components/Sidebar";
import { Settings as SettingsIcon, Bell, Lock, Eye, Cloud, Trash2 } from "lucide-react";

export default function Settings() {
  return (
    <div className="flex min-h-screen bg-[#0f1115]">
      <Sidebar activePage="settings" />
      
      <main className="flex-1 flex flex-col">
        <header className="h-20 border-b border-slate-800 flex items-center px-8 bg-[#0f1115]/50 backdrop-blur-md">
          <h2 className="text-xl font-semibold text-white">Settings</h2>
        </header>

        <div className="p-8 max-w-3xl w-full space-y-6">
          <section className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 ml-1">General Settings</h3>
            <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden text-sm">
              <SettingsToggle icon={<Bell size={18}/>} label="Email Notifications" description="Receive updates about indexing status" defaultChecked />
              <SettingsToggle icon={<Eye size={18}/>} label="Public Profile" description="Allow others to see your documentation activity" />
              <SettingsToggle icon={<Cloud size={18}/>} label="Auto-sync Repositories" description="Periodically check for new commits" defaultChecked />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-red-500/80 ml-1">Danger Zone</h3>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Delete Account</p>
                  <p className="text-xs text-slate-500 mt-1">Permanently remove all your data and indexed projects.</p>
                </div>
                <button className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2">
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function SettingsToggle({ icon, label, description, defaultChecked = false }: { icon: React.ReactNode, label: string, description: string, defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-slate-800 last:border-0">
      <div className="flex gap-4">
        <div className="text-slate-500 mt-0.5">{icon}</div>
        <div>
          <p className="text-white font-medium">{label}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <input type="checkbox" defaultChecked={defaultChecked} className="w-10 h-5 bg-slate-700 rounded-full appearance-none checked:bg-green-500 relative cursor-pointer transition-colors" />
    </div>
  );
}