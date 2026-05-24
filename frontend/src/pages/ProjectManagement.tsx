import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import {
  ShieldCheck, Users, Eye, Edit3, Trash2, Plus, ChevronRight,
  X, Check, AlertCircle, Clock, Lock, Save, Mail, Loader,
} from "lucide-react";
import { rolesApi, membersApi, userApi, ApiError } from "../api/client";
import type { RepoRole, RepoMember, User as ApiUser } from "../api/client";
import type { Page, User } from "../App";

type Tab = "users" | "roles" | "events";

const ALL_PERMISSIONS = [
  { id: "read_docs", label: "Read Documentation", description: "View all documentation" },
  { id: "write_docs", label: "Edit Documentation", description: "Manually edit documentation entries" },
  { id: "sync_repo", label: "Sync Repository", description: "Trigger re-indexing" },
  { id: "manage_users", label: "Manage Users", description: "Invite, remove, change roles" },
  { id: "manage_roles", label: "Manage Roles", description: "Create and modify roles" },
  { id: "delete_project", label: "Delete Project", description: "Permanently delete this project" },
];

// ── Modals ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition"><X size={16} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function InviteModal({ repoName, roles, onClose, onDone }: {
  repoName: string; roles: RepoRole[]; onClose: () => void; onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState(roles[1]?.id ?? roles[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      // Backend expects user_id, not email — find user by email first
      const users = await userApi.list();
      const found = users.find(u => u.email === email);
      if (!found) throw new Error(`No user found with email: ${email}`);
      await membersApi.add(repoName, found.id, roleId || undefined);
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Invite Member" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Email address</label>
          <div className="flex items-center gap-2 bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2.5 focus-within:border-green-500 transition-colors">
            <Mail size={14} className="text-slate-500 shrink-0" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="bg-transparent text-sm text-white outline-none flex-1 placeholder:text-slate-600" />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Role</label>
          <select value={roleId} onChange={e => setRoleId(e.target.value)}
            className="w-full bg-[#0d1117] border border-slate-700 text-sm text-white rounded-lg px-3 py-2.5 focus:outline-none focus:border-green-500">
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        {error && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertCircle size={11} /> {error}</p>}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition text-sm">Cancel</button>
          <button disabled={!valid || loading} onClick={submit}
            className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition text-sm flex items-center justify-center gap-2">
            {loading ? <><Loader size={13} className="animate-spin" /> Adding...</> : "Add Member"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function NewRoleModal({ repoName, onClose, onDone }: { repoName: string; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<string[]>(["read_docs"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setPermissions(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      // Wysyłamy tylko name i permissions — level jest opcjonalny
      await rolesApi.create(repoName, name.trim(), permissions);
      onDone();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create role";
      // Pokaż szczegóły błędu jeśli to ApiError
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="New Role" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Role name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Contributor"
            className="w-full bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Permissions</label>
          <div className="space-y-1.5">
            {ALL_PERMISSIONS.map(perm => {
              const has = permissions.includes(perm.id);
              return (
                <div key={perm.id} onClick={() => toggle(perm.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition ${has ? "bg-green-500/5 border-green-500/20" : "border-slate-800 hover:border-slate-700"}`}>
                  <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${has ? "bg-green-500 text-black" : "bg-slate-800"}`}>
                    {has && <Check size={10} />}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">{perm.label}</p>
                    <p className="text-[10px] text-slate-600">{perm.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {error && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertCircle size={11} /> {error}</p>}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition text-sm">Cancel</button>
          <button disabled={!name.trim() || loading} onClick={submit}
            className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition text-sm flex items-center justify-center gap-2">
            {loading ? <><Loader size={13} className="animate-spin" /> Creating...</> : "Create Role"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ProjectManagement({ navigate, user, onLogout, currentRepo, isNewProject = false, onComplete }: {
  navigate: (p: Page) => void;
  user?: User | null;
  onLogout?: () => void;
  currentRepo?: string;
  isNewProject?: boolean;
  onComplete?: () => void;
}) {
  const repoName = currentRepo ?? "";
  const [tab, setTab] = useState<Tab>("users");
  const [roles, setRoles] = useState<RepoRole[]>([]);
  const [members, setMembers] = useState<RepoMember[]>([]);
  const [userMap, setUserMap] = useState<Record<string, ApiUser>>({});
  const [loading, setLoading] = useState(true);
  const [previewRoleId, setPreviewRoleId] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editedPerms, setEditedPerms] = useState<string[]>([]);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [savedRoleId, setSavedRoleId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showNewRole, setShowNewRole] = useState(false);

  const reload = async () => {
    if (!repoName) return;
    setLoading(true);
    try {
      const [r, m] = await Promise.all([
        rolesApi.list(repoName),
        membersApi.list(repoName),
      ]);
      setRoles(r);
      setMembers(m);
      // Pobierz dane użytkowników dla wyświetlenia
      const userIds = m.map(mem => mem.user_id);
      const userData: Record<string, ApiUser> = {};
      await Promise.all(userIds.map(async id => {
        try { userData[id] = await userApi.getById(id); } catch { /* skip */ }
      }));
      setUserMap(userData);
    } catch (e) {
      console.error("Failed to load management data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [repoName]);

  const startEditRole = (role: RepoRole) => {
    setEditingRoleId(role.id);
    setEditedPerms([...role.permissions]);
  };

  const saveRole = async (roleId: string) => {
    setSavingRoleId(roleId);
    try {
      await rolesApi.update(repoName, roleId, { permissions: editedPerms });
      setRoles(prev => prev.map(r => r.id === roleId ? { ...r, permissions: editedPerms } : r));
      setEditingRoleId(null);
      setSavedRoleId(roleId);
      setTimeout(() => setSavedRoleId(null), 2000);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingRoleId(null);
    }
  };

  const removeMember = async (userId: string) => {
    if (!confirm("Remove this member from the repository?")) return;
    try {
      await membersApi.remove(repoName, userId);
      setMembers(prev => prev.filter(m => m.user_id !== userId));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Remove failed");
    }
  };

  const changeRole = async (userId: string, roleId: string, isOwner: boolean) => {
    if (isOwner) return; // Backend zwróci 403 — blokujemy na poziomie UI
    try {
      await membersApi.update(repoName, userId, { role_id: roleId });
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role_id: roleId } : m));
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 403
        ? "Cannot change role of the repository owner."
        : e instanceof Error ? e.message : "Update failed";
      alert(msg);
    }
  };

  const previewRole = roles.find(r => r.id === previewRoleId);

  return (
    <div className="flex min-h-screen bg-[#0f1115]">
      <Sidebar activePage="project-management" navigate={navigate} user={user} onLogout={onLogout} />

      {showInvite && <InviteModal repoName={repoName} roles={roles} onClose={() => setShowInvite(false)} onDone={reload} />}
      {showNewRole && <NewRoleModal repoName={repoName} onClose={() => setShowNewRole(false)} onDone={reload} />}

      <main className="flex-1 flex flex-col overflow-y-auto">
        {previewRoleId && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-8 py-3 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <Eye size={15} className="text-amber-400" />
              <span className="text-sm text-amber-400 font-medium">Preview mode — <strong>{previewRole?.name}</strong></span>
              <span className="text-xs text-amber-600">Editing is disabled.</span>
            </div>
            <button onClick={() => setPreviewRoleId(null)}
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition font-bold">
              <X size={12} /> Exit Preview
            </button>
          </div>
        )}

        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-[#0f1115]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">Management</h2>
            {repoName && <span className="text-xs font-mono text-slate-500">/ {repoName}</span>}
            {isNewProject && (
              <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-full font-bold uppercase">
                New Project Setup
              </span>
            )}
          </div>
          {isNewProject && onComplete && (
            <button onClick={onComplete} className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-sm transition">
              Confirm & View Docs <ChevronRight size={16} />
            </button>
          )}
        </header>

        <div className="p-8 max-w-5xl w-full">
          {!repoName && (
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center gap-3 mb-6">
              <AlertCircle size={15} className="text-amber-400" />
              <p className="text-sm text-slate-400">No repository selected. Go to Dashboard and open a repository first.</p>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-900/50 border border-slate-800 rounded-xl p-1 mb-8 w-fit">
            {(["users", "roles", "events"] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${tab === t ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}>
                {t === "users" && <Users size={11} className="inline mr-1.5" />}
                {t === "roles" && <ShieldCheck size={11} className="inline mr-1.5" />}
                {t === "events" && <Clock size={11} className="inline mr-1.5" />}
                {t}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
              <Loader size={16} className="animate-spin" /> Loading...
            </div>
          ) : (
            <>
              {/* USERS */}
              {tab === "users" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Members ({members.length})</h3>
                    <button onClick={() => setShowInvite(true)}
                      className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 hover:bg-green-500/15 px-3 py-1.5 rounded-lg border border-green-500/20 font-bold transition">
                      <Plus size={12} /> Invite
                    </button>
                  </div>
                  <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden">
                    {members.length === 0 ? (
                      <p className="text-slate-600 text-sm text-center py-8">No members yet.</p>
                    ) : members.map((member, i) => {
                      const u = userMap[member.user_id];
                      const role = roles.find(r => r.id === member.role_id);
                      return (
                        <div key={member.user_id} className={`flex items-center justify-between px-5 py-4 ${i < members.length - 1 ? "border-b border-slate-800" : ""}`}>
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-bold text-xs">
                              {(u?.name ?? member.user_id)[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{u?.name ?? member.user_id}</p>
                              <p className="text-xs text-slate-500 font-mono">{u?.email ?? ""}</p>
                            </div>
                            {member.is_owner && (
                              <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">Owner</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-600">
                              {new Date(member.joined_at).toLocaleDateString()}
                            </span>
                            {previewRoleId ? (
                              <span className="text-xs text-slate-400">{role?.name ?? "—"}</span>
                            ) : (
                              <select
                                value={member.role_id ?? ""}
                                onChange={e => changeRole(member.user_id, e.target.value, member.is_owner)}
                                disabled={member.is_owner}
                                title={member.is_owner ? "Cannot change owner's role" : undefined}
                                className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-2 py-1.5 focus:outline-none focus:border-green-500 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <option value="">No role</option>
                                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                              </select>
                            )}
                            {!previewRoleId && !member.is_owner && (
                              <button onClick={() => removeMember(member.user_id)}
                                className="p-1.5 hover:bg-red-500/10 text-slate-600 hover:text-red-400 rounded-lg transition">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ROLES */}
              {tab === "roles" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Roles</h3>
                    <button onClick={() => setShowNewRole(true)}
                      className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 hover:bg-green-500/15 px-3 py-1.5 rounded-lg border border-green-500/20 font-bold transition">
                      <Plus size={12} /> New Role
                    </button>
                  </div>
                  <div className="space-y-4">
                    {roles.map(role => {
                      const isEditing = editingRoleId === role.id;
                      const perms = isEditing ? editedPerms : role.permissions;
                      return (
                        <div key={role.id} className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden">
                          <div className="flex items-center justify-between p-5 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold px-2.5 py-1 rounded-full border text-slate-300 bg-slate-800 border-slate-700">{role.name}</span>
                              {role.is_builtin
                                ? <span className="text-[10px] text-slate-600 flex items-center gap-1"><Lock size={9} /> built-in · read-only</span>
                                : isEditing
                                  ? <span className="text-[10px] text-blue-400">editing — click permissions to toggle</span>
                                  : <span className="text-[10px] text-slate-600">click ✎ to edit</span>
                              }
                              {savedRoleId === role.id && <span className="text-[10px] text-green-400 flex items-center gap-1"><Check size={10} /> Saved</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setPreviewRoleId(previewRoleId === role.id ? null : role.id)}
                                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-bold transition ${
                                  previewRoleId === role.id ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "text-slate-400 hover:text-white border-slate-700"}`}>
                                <Eye size={12} /> Preview
                              </button>
                              {!role.is_builtin && !previewRoleId && (
                                isEditing ? (
                                  <button onClick={() => saveRole(role.id)} disabled={savingRoleId === role.id}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold transition">
                                    {savingRoleId === role.id ? <Loader size={12} className="animate-spin" /> : <Save size={12} />} Save
                                  </button>
                                ) : (
                                  <button onClick={() => startEditRole(role)} className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-white rounded-lg transition">
                                    <Edit3 size={13} />
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                          <div className="p-5 grid grid-cols-2 gap-2">
                            {ALL_PERMISSIONS.map(perm => {
                              const has = perms.includes(perm.id);
                              const canToggle = isEditing && !role.is_builtin && !previewRoleId;
                              return (
                                <div key={perm.id} onClick={() => canToggle && setEditedPerms(p => p.includes(perm.id) ? p.filter(x => x !== perm.id) : [...p, perm.id])}
                                  className={`flex items-center gap-3 p-3 rounded-lg border transition ${has ? "bg-green-500/5 border-green-500/15" : "border-slate-800 opacity-50"} ${canToggle ? "cursor-pointer hover:border-slate-700" : "cursor-default"}`}>
                                  <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${has ? "bg-green-500 text-black" : "bg-slate-800"}`}>
                                    {has && <Check size={10} />}
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-white">{perm.label}</p>
                                    <p className="text-[10px] text-slate-600">{perm.description}</p>
                                  </div>
                                  {role.is_builtin && <Lock size={10} className="ml-auto text-slate-700" />}
                                </div>
                              );
                            })}
                          </div>
                          {isEditing && (
                            <div className="px-5 pb-4 flex gap-3">
                              <button onClick={() => setEditingRoleId(null)} className="text-xs text-slate-500 hover:text-white transition">Cancel</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* EVENTS — brak endpointu w API, placeholder */}
              {tab === "events" && (
                <div className="text-center py-16 text-slate-600 text-sm">
                  Activity log endpoint not yet available in backend.
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
