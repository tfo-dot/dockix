import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import { Bell, Eye, Cloud, Trash2, User, Mail, ShieldCheck, Camera } from "lucide-react";
import type { Page, User as UserType } from "../App";

interface Props {
  navigate: (p: Page) => void;
  user?: UserType | null;
  onLogout?: () => void;
}

export default function Settings({ navigate, user, onLogout }: Props) {
  const [name, setName] = useState(user?.name ?? "User2137");
  const [email] = useState(user?.email ?? "user2137@dockix.ai");

  return (
    <div className="flex min-h-screen bg-[#0f1115]">
      <Sidebar activePage="settings" navigate={navigate} user={user} onLogout={onLogout} />

      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-16 border-b border-slate-800 flex items-center px-8 bg-[#0f1115]/80 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
        </header>

        <div className="p-8 max-w-2xl w-full space-y-8">

          {/* Profile */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Profile</h3>
            <div className="bg-[#161b22] border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-5 mb-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white font-bold text-2xl">
                    {name[0]}
                  </div>
                  <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-full flex items-center justify-center transition">
                    <Camera size={11} className="text-slate-300" />
                  </button>
                </div>
                <div>
                  <p className="text-white font-semibold">{name}</p>
                  <p className="text-xs text-slate-500">{email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
                    Display Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
                    Email
                  </label>
                  <div className="flex items-center gap-2 w-full bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2">
                    <Mail size={13} className="text-slate-500 shrink-0" />
                    <span className="text-sm text-slate-400">{email}</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
                    Security
                  </label>
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <ShieldCheck size={14} />
                    Two-Factor Authentication enabled
                  </div>
                </div>
                <button className="bg-white text-black font-bold px-5 py-2 rounded-lg text-sm hover:bg-slate-200 transition">
                  Save Changes
                </button>
              </div>
            </div>
          </section>

          {/* Preferences */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Preferences</h3>
            <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden">
              <SettingsToggle icon={<Bell size={16} />} label="Email Notifications" description="Receive updates about indexing status" defaultChecked />
              <SettingsToggle icon={<Eye size={16} />} label="Public Profile" description="Allow others to see your documentation activity" />
              <SettingsToggle icon={<Cloud size={16} />} label="Auto-sync Repositories" description="Periodically check for new commits" defaultChecked />
            </div>
          </section>

          {/* Danger zone */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-red-500/80">Danger Zone</h3>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium text-sm">Delete Account</p>
                  <p className="text-xs text-slate-500 mt-1">Permanently remove all your data and indexed projects.</p>
                </div>
                <button className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2">
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

function SettingsToggle({ icon, label, description, defaultChecked = false }: {
  icon: React.ReactNode; label: string; description: string; defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-slate-800 last:border-0">
      <div className="flex gap-4">
        <div className="text-slate-500 mt-0.5">{icon}</div>
        <div>
          <p className="text-white font-medium text-sm">{label}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="w-10 h-5 bg-slate-700 rounded-full appearance-none checked:bg-green-500 cursor-pointer transition-colors"
      />
    </div>
  );
}
