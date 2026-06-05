import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import { Mail, ShieldCheck, Camera, Loader, Check, Copy } from "lucide-react";
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
  const [copiedId, setCopiedId] = useState(false);

  const copyUserId = () => {
    if (!user?.id || user.id === "superadmin") return;
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

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
                {/* User ID — potrzebny żeby admin repo mógł dodać Cię do projektu */}
                {user?.id && user.id !== "superadmin" && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
                      User ID
                      <span className="ml-2 normal-case font-normal text-slate-600">— share with repo admins to be added to a project</span>
                    </label>
                    <div className="flex items-center gap-2 w-full bg-[#0d1117] border border-slate-800 rounded-lg px-3 py-2">
                      <span className="text-sm text-slate-400 font-mono flex-1 truncate">{user.id}</span>
                      <button
                        onClick={copyUserId}
                        title="Copy User ID"
                        className="shrink-0 p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-white transition"
                      >
                        {copiedId ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                )}
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
        </div>
      </main>
    </div>
  );
}
