import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import { Bell, Eye, Cloud, Trash2, Mail, ShieldCheck, Camera, Loader, Check } from "lucide-react";
import { userApi } from "../api/client";
import type { Page, User } from "../App";

interface Props {
  navigate: (p: Page) => void;
  user?: User | null;
  onLogout?: () => void;
  currentRepo?: string;
  setCurrentRepo?: (r: string) => void;
}

export default function Settings({ navigate, user, onLogout }: Props) {
  const [name, setName] = useState(user?.name ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    setSaving(true); setError(null); setSaved(false);
    const hasPasswordChange = password.length > 0;
    try {
      await userApi.updateMe({
        name: name || undefined,
        password: password || undefined,
      });
      if (hasPasswordChange) {
        // Backend unieważnia token po zmianie hasła — trzeba się wylogować
        setSaved(true);
        setTimeout(() => {
          alert("Password changed. You will be logged out.");
          onLogout?.();
        }, 800);
      } else {
        setSaved(true);
        setPassword("");
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    // Backend nie ma DELETE /user/@me — pokazujemy info
    alert("Account deletion must be performed by an administrator.");
    setShowDeleteConfirm(false);
  };

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
                    {(name || user?.name || "U")[0].toUpperCase()}
                  </div>
                  <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-full flex items-center justify-center transition">
                    <Camera size={11} className="text-slate-300" />
                  </button>
                </div>
                <div>
                  <p className="text-white font-semibold">{name || user?.name}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Display Name</label>
                  <input value={name} onChange={e => setName(e.target.value)}
                    className="w-full bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Email</label>
                  <div className="flex items-center gap-2 w-full bg-[#0d1117] border border-slate-800 rounded-lg px-3 py-2 opacity-60">
                    <Mail size={13} className="text-slate-500 shrink-0" />
                    <span className="text-sm text-slate-400">{user?.email}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1">Email cannot be changed here.</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">New Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className="w-full bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Security</label>
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <ShieldCheck size={14} /> Session-based authentication active
                  </div>
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 bg-white text-black font-bold px-5 py-2 rounded-lg text-sm hover:bg-slate-200 disabled:opacity-50 transition">
                  {saving ? <><Loader size={13} className="animate-spin" /> Saving...</>
                  : saved ? <><Check size={13} /> Saved</>
                  : "Save Changes"}
                </button>
              </div>
            </div>
          </section>

          {/* Preferences (local only — no backend endpoint) */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Preferences</h3>
            <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden">
              <SettingsToggle icon={<Bell size={16} />} label="Email Notifications" description="Receive updates about indexing status" defaultChecked />
              <SettingsToggle icon={<Eye size={16} />} label="Public Profile" description="Allow others to see your documentation activity" />
              <SettingsToggle icon={<Cloud size={16} />} label="Auto-sync Repositories" description="Periodically check for new commits" defaultChecked />
            </div>
            <p className="text-[10px] text-slate-600 ml-1">Preferences are stored locally — backend support coming soon.</p>
          </section>

          {/* Danger zone */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-red-500/80">Danger Zone</h3>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium text-sm">Delete Account</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {showDeleteConfirm
                      ? "Click again to confirm. This cannot be undone."
                      : "Permanently removes your account and all data."}
                  </p>
                </div>
                <button
                  onClick={handleDeleteAccount}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                    showDeleteConfirm
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-red-500/10 hover:bg-red-500/20 text-red-500"
                  }`}
                >
                  <Trash2 size={13} /> {showDeleteConfirm ? "Confirm Delete" : "Delete"}
                </button>
              </div>
              {showDeleteConfirm && (
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="mt-3 text-xs text-slate-500 hover:text-white transition"
                >
                  Cancel
                </button>
              )}
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
      <input type="checkbox" defaultChecked={defaultChecked}
        className="w-10 h-5 bg-slate-700 rounded-full appearance-none checked:bg-green-500 cursor-pointer transition-colors" />
    </div>
  );
}
