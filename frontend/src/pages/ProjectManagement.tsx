import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import {
  ShieldCheck, Users, Eye, Edit3, Trash2, Plus, ChevronRight,
  X, Check, AlertCircle, Clock, Lock, Save, Mail, Loader,
} from "lucide-react";
import { rolesApi, membersApi, userApi, authApi, eventsApi, ApiError } from "../api/client";
import type { RepoRole, RepoMember, User as ApiUser, RepoEvent, RepoEventKind } from "../api/client";
import type { Page, User } from "../App";

type Tab = "users" | "roles" | "events";

// Przyjazne etykiety dla uprawnień z backendu
// Klucze = dokładne stringi zwracane przez backend
function permLabel(id: string): { label: string; description: string } {
  const map: Record<string, { label: string; description: string }> = {
    // Rzeczywiste uprawnienia z backendu
    analyze:        { label: "Analyze Repository", description: "Run analysis and view documentation" },
    sync:           { label: "Sync Repository",    description: "Trigger re-indexing and synchronization" },
    manage_members: { label: "Manage Members",     description: "Invite and remove members, change their roles" },
    manage_roles:   { label: "Manage Roles",       description: "Create, edit and delete custom roles" },
    // Aliasy na wypadek innych wariantów
    read_docs:      { label: "Read Documentation", description: "View all generated documentation" },
    write_docs:     { label: "Edit Documentation", description: "Manually edit documentation entries" },
    sync_repo:      { label: "Sync Repository",    description: "Trigger re-indexing" },
    manage_users:   { label: "Manage Members",     description: "Invite, remove, change roles" },
    delete_project: { label: "Delete Project",     description: "Permanently delete this project" },
  };
  // Fallback: zamień _ na spacje i kapitalizuj
  return map[id] ?? {
    label: id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    description: "",
  };
}

// ── Modal shell ───────────────────────────────────────────────────────────────

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

// ── Invite Modal ──────────────────────────────────────────────────────────────

function InviteModal({ repoName, roles, isSuperadmin, onClose, onDone }: {
  repoName: string; roles: RepoRole[]; isSuperadmin: boolean;
  onClose: () => void; onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [roleId, setRoleId] = useState(roles[1]?.id ?? roles[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validUserId = userId.trim().length > 8;
  const canSubmit = isSuperadmin ? validEmail : validUserId;

  const submit = async () => {
    setLoading(true); setError(null);
    try {
      if (isSuperadmin) {
        // Superadmin może listować użytkowników — szukamy po emailu
        const users = await userApi.list();
        const found = users.find(u => u.email === email);
        if (!found) throw new Error(`No user found with email: ${email}`);
        await membersApi.add(repoName, found.id, roleId || undefined);
      } else {
        // Zwykły user nie ma dostępu do GET /user/list — używa bezpośrednio user ID
        await membersApi.add(repoName, userId.trim(), roleId || undefined);
      }
      onDone(); onClose();
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 403
        ? "You don't have permission to add members to this repository."
        : e instanceof Error ? e.message : "Failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Add Member" onClose={onClose}>
      <div className="space-y-4">
        {isSuperadmin ? (
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Email</label>
            <div className="flex items-center gap-2 bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2.5 focus-within:border-green-500">
              <Mail size={13} className="text-slate-500 shrink-0" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@company.com"
                className="bg-transparent text-sm text-white outline-none flex-1 placeholder:text-slate-600" />
            </div>
          </div>
        ) : (
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">User ID</label>
            <input value={userId} onChange={e => setUserId(e.target.value)}
              placeholder="e.g. bdd88e91-8b47-49d6-82fe-a9e64b477f70"
              className="w-full bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-green-500 transition-colors placeholder:text-slate-700" />
            <p className="text-[10px] text-slate-600 mt-1.5 leading-relaxed">
              Ask the person to go to <span className="text-slate-400">Settings → Account</span> and share their User ID with you.
            </p>
          </div>
        )}
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
          <button disabled={!canSubmit || loading} onClick={submit}
            className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition text-sm flex items-center justify-center gap-2">
            {loading ? <><Loader size={13} className="animate-spin" /> Adding...</> : "Add Member"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── New Role Modal ────────────────────────────────────────────────────────────

function NewRoleModal({ repoName, availablePermissions, onClose, onDone }: {
  repoName: string;
  availablePermissions: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  // Domyślnie zaznaczamy pierwsze uprawnienie jeśli istnieje
  const [permissions, setPermissions] = useState<string[]>(
    availablePermissions.length > 0 ? [availablePermissions[0]] : []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toggle = (id: string) => setPermissions(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const submit = async () => {
    setLoading(true); setError(null);
    try {
      await rolesApi.create(repoName, name.trim(), permissions);
      onDone(); onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
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
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">
            Permissions
            {availablePermissions.length === 0 && (
              <span className="ml-2 text-amber-500 normal-case font-normal">— loading from backend...</span>
            )}
          </label>
          {availablePermissions.length === 0 ? (
            <p className="text-slate-600 text-xs py-4 text-center">No permissions available. Make sure Admin role exists in this repo.</p>
          ) : (
            <div className="space-y-1.5">
              {availablePermissions.map(permId => {
                const { label, description } = permLabel(permId);
                const has = permissions.includes(permId);
                return (
                  <div key={permId} onClick={() => toggle(permId)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition ${has ? "bg-green-500/5 border-green-500/20" : "border-slate-800 hover:border-slate-700"}`}>
                    <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${has ? "bg-green-500 text-black" : "bg-slate-800"}`}>
                      {has && <Check size={10} />}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white">{label}</p>
                      {description && <p className="text-[10px] text-slate-600">{description}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertCircle size={11} /> {error}</p>}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition text-sm">Cancel</button>
          <button disabled={!name.trim() || loading || availablePermissions.length === 0} onClick={submit}
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
  navigate: (p: Page) => void; user?: User | null; onLogout?: () => void;
  currentRepo?: string; isNewProject?: boolean; onComplete?: () => void;
}) {
  const repoName = currentRepo ?? "";
  const [tab, setTab] = useState<Tab>("users");
  const [roles, setRoles] = useState<RepoRole[]>([]);
  const [members, setMembers] = useState<RepoMember[]>([]);
  const [userMap, setUserMap] = useState<Record<string, ApiUser>>({});
  const [events, setEvents] = useState<RepoEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewRoleId, setPreviewRoleId] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editedPerms, setEditedPerms] = useState<string[]>([]);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [savedRoleId, setSavedRoleId] = useState<string | null>(null);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showNewRole, setShowNewRole] = useState(false);

  // Uprawnienia dostępne w systemie — bierzemy z roli Admin (ma wszystkie)
  // Dzięki temu nie używamy hardkodowanych stringów, które backend może odrzucić
  const availablePermissions: string[] = React.useMemo(() => {
    const adminRole = roles.find(r => r.name.toLowerCase() === "admin" || r.is_builtin);
    if (adminRole && adminRole.permissions.length > 0) return adminRole.permissions;
    // fallback: unia wszystkich uprawnień ze wszystkich ról
    return [...new Set(roles.flatMap(r => r.permissions))];
  }, [roles]);

  const reload = async () => {
    if (!repoName) return;
    setLoading(true);
    try {
      const [r, m, ev] = await Promise.all([
        rolesApi.list(repoName),
        membersApi.list(repoName),
        eventsApi.repoEvents(repoName).catch(() => [] as RepoEvent[]),
      ]);
      setRoles(r);
      setMembers(m);
      setEvents(ev);
      const ud: Record<string, ApiUser> = {};
      await Promise.all(m.map(async mem => {
        try { ud[mem.user_id] = await userApi.getById(mem.user_id); } catch { /* skip */ }
      }));
      setUserMap(ud);
    } catch (e) {
      console.error("Management load failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [repoName]);

  const startEdit = (role: RepoRole) => { setEditingRoleId(role.id); setEditedPerms([...role.permissions]); };

  const saveRole = async (roleId: string) => {
    setSavingRoleId(roleId);
    try {
      await rolesApi.update(repoName, roleId, { permissions: editedPerms });
      setRoles(p => p.map(r => r.id === roleId ? { ...r, permissions: editedPerms } : r));
      setEditingRoleId(null);
      setSavedRoleId(roleId);
      setTimeout(() => setSavedRoleId(null), 2000);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingRoleId(null);
    }
  };

  const deleteRole = async (role: RepoRole) => {
    if (!confirm(`Delete role "${role.name}"? Members with this role will lose it.`)) return;
    setDeletingRoleId(role.id);
    try {
      await rolesApi.delete(repoName, role.id);
      setRoles(p => p.filter(r => r.id !== role.id));
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 409
        ? "Cannot delete a role that is still assigned to members."
        : e instanceof Error ? e.message : "Delete failed";
      alert(msg);
    } finally {
      setDeletingRoleId(null);
    }
  };

  const removeMember = async (userId: string) => {
    // Zabezpieczenie: nie możesz usunąć samego siebie z repo
    if (userId === user?.id) {
      alert("You cannot remove yourself from this repository.");
      return;
    }
    if (!confirm("Remove this member from the repository?")) return;
    try {
      await membersApi.remove(repoName, userId);
      setMembers(p => p.filter(m => m.user_id !== userId));
    } catch (e) { alert(e instanceof Error ? e.message : "Remove failed"); }
  };

  const changeRole = async (userId: string, roleId: string, isOwner: boolean) => {
    if (isOwner) return;
    try {
      await membersApi.update(repoName, userId, { role_id: roleId });
      setMembers(p => p.map(m => m.user_id === userId ? { ...m, role_id: roleId } : m));
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 403
        ? "Permission denied. Only the repository owner or superadmin can change member roles."
        : e instanceof Error ? e.message : "Failed";
      alert(msg);
    }
  };

  const previewRole = roles.find(r => r.id === previewRoleId);

  return (
    <div className="flex min-h-screen bg-[#0f1115]">
      <Sidebar activePage="project-management" navigate={navigate} user={user} onLogout={onLogout} />

      {showInvite && <InviteModal repoName={repoName} roles={roles} isSuperadmin={authApi.isSuperadmin()} onClose={() => setShowInvite(false)} onDone={reload} />}
      {showNewRole && <NewRoleModal repoName={repoName} availablePermissions={availablePermissions} onClose={() => setShowNewRole(false)} onDone={reload} />}

      <main className="flex-1 flex flex-col overflow-y-auto">
        {previewRoleId && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-8 py-3 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <Eye size={15} className="text-amber-400" />
              <span className="text-sm text-amber-400 font-medium">
                Preview mode — viewing as <strong>{previewRole?.name}</strong>
              </span>
              <span className="text-xs text-amber-600">Editing is disabled. Role selectors show read-only view.</span>
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
            {isNewProject && <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-full font-bold uppercase">New Project Setup</span>}
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
              <p className="text-sm text-slate-400">No repository selected. Open one from Dashboard first.</p>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-900/50 border border-slate-800 rounded-xl p-1 mb-8 w-fit">
            {(["users", "roles", "events"] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${tab === t ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}>
                {t === "users" && <><Users size={11} className="inline mr-1.5" />Users</>}
                {t === "roles" && <><ShieldCheck size={11} className="inline mr-1.5" />Roles</>}
                {t === "events" && <><Clock size={11} className="inline mr-1.5" />Events</>}
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
                            {member.is_owner && <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">Owner</span>}
                            {member.user_id === user?.id && <span className="text-[10px] text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full font-bold">you</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-600">{new Date(member.joined_at).toLocaleDateString()}</span>
                            {previewRoleId ? (
                              <span className="text-xs text-slate-400">{role?.name ?? "—"}</span>
                            ) : (() => {
                              const isSelf = member.user_id === user?.id;
                              const isLocked = member.is_owner || isSelf;
                              // Zwykły user nie może przypisać roli Admin (tylko superadmin)
                              const assignableRoles = authApi.isSuperadmin()
                                ? roles
                                : roles.filter(r => !r.is_builtin || r.name.toLowerCase() !== "admin");
                              return (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={member.role_id ?? ""}
                                    onChange={e => {
                                      if (!e.target.value) return;
                                      changeRole(member.user_id, e.target.value, member.is_owner);
                                    }}
                                    disabled={isLocked}
                                    title={
                                      member.is_owner ? "Cannot change owner's role"
                                      : isSelf ? "Cannot change your own role"
                                      : undefined
                                    }
                                    className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-2 py-1.5 focus:outline-none focus:border-green-500 disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    {!member.role_id && <option value="">No role</option>}
                                    {assignableRoles.map(r => (
                                      <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                  </select>
                                </div>
                              );
                            })()}
                            {/* Ukryj przycisk usuwania dla właściciela i dla samego siebie */}
                            {!previewRoleId && !member.is_owner && member.user_id !== user?.id && (
                              <button
                                onClick={() => removeMember(member.user_id)}
                                title="Remove from repository"
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
                            <div className="flex items-center gap-3 flex-wrap">
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
                                title="See the UI as a user with this role (disables editing)"
                                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-bold transition ${previewRoleId === role.id ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "text-slate-400 hover:text-white border-slate-700"}`}>
                                <Eye size={12} /> {previewRoleId === role.id ? "Exit Preview" : "Preview"}
                              </button>
                              {!role.is_builtin && !previewRoleId && (
                                <>
                                  {isEditing ? (
                                    <button onClick={() => saveRole(role.id)} disabled={savingRoleId === role.id}
                                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold transition">
                                      {savingRoleId === role.id ? <Loader size={12} className="animate-spin" /> : <Save size={12} />} Save
                                    </button>
                                  ) : (
                                    <button onClick={() => startEdit(role)} className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-white rounded-lg transition">
                                      <Edit3 size={13} />
                                    </button>
                                  )}
                                  {/* DELETE /repos/:repo/role/:id */}
                                  <button
                                    onClick={() => deleteRole(role)}
                                    disabled={deletingRoleId === role.id}
                                    title="Delete role"
                                    className="p-1.5 hover:bg-red-500/10 text-slate-600 hover:text-red-400 rounded-lg transition disabled:opacity-50"
                                  >
                                    {deletingRoleId === role.id ? <Loader size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="p-5 grid grid-cols-2 gap-2">
                            {availablePermissions.map(permId => {
                              const { label, description } = permLabel(permId);
                              const has = perms.includes(permId);
                              const canToggle = isEditing && !role.is_builtin && !previewRoleId;
                              return (
                                <div key={permId}
                                  onClick={() => canToggle && setEditedPerms(p => p.includes(permId) ? p.filter(x => x !== permId) : [...p, permId])}
                                  className={`flex items-center gap-3 p-3 rounded-lg border transition ${has ? "bg-green-500/5 border-green-500/15" : "border-slate-800 opacity-50"} ${canToggle ? "cursor-pointer hover:border-slate-700" : "cursor-default"}`}>
                                  <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${has ? "bg-green-500 text-black" : "bg-slate-800"}`}>
                                    {has && <Check size={10} />}
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-white">{label}</p>
                                    {description && <p className="text-[10px] text-slate-600">{description}</p>}
                                  </div>
                                  {role.is_builtin && <Lock size={10} className="ml-auto text-slate-700" />}
                                </div>
                              );
                            })}
                            {availablePermissions.length === 0 && (
                              <p className="col-span-2 text-slate-600 text-xs text-center py-4">No permissions data available.</p>
                            )}
                          </div>
                          {isEditing && (
                            <div className="px-5 pb-4">
                              <button onClick={() => setEditingRoleId(null)} className="text-xs text-slate-500 hover:text-white transition">Cancel editing</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* EVENTS */}
              {tab === "events" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Repository Activity ({events.length})
                  </h3>
                  {events.length === 0 ? (
                    <div className="text-center py-12 text-slate-600 text-sm">
                      No events yet. Activity will appear here as members and roles change.
                    </div>
                  ) : (
                    <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden">
                      {events.map((ev, i) => {
                        const actorName = ev.actor_id
                          ? (userMap[ev.actor_id]?.name ?? ev.actor_id.slice(0, 8) + "…")
                          : "Superadmin";
                        return (
                          <div key={ev.id} className={`flex items-start gap-4 px-5 py-4 ${i < events.length - 1 ? "border-b border-slate-800/60" : ""}`}>
                            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-[10px] shrink-0 mt-0.5">
                              {ev.actor_id ? actorName[0].toUpperCase() : "⚙"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-sm font-medium text-white">{actorName}</span>
                                <EventTypeBadge type={ev.kind} />
                              </div>
                              <EventDetail kind={ev.kind} detail={ev.detail} userMap={userMap} />
                              <p className="text-[10px] text-slate-600 mt-1.5">
                                {new Date(ev.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ── EventDetail — czytelny opis szczegółów eventu ────────────────────────────

function EventDetail({
  kind,
  detail,
  userMap,
}: {
  kind: RepoEventKind | string | undefined;
  detail: Record<string, string> | null;
  userMap: Record<string, { name: string; email: string }>;
}) {
  if (!detail) return null;

  const userName = (id?: string) =>
    id ? (userMap[id]?.name ?? <code className="text-slate-400">{id.slice(0, 8)}…</code>) : "—";

  const roleName = (id?: string) =>
    id ? <span className="font-mono text-purple-400">{id}</span> : "—";

  let content: React.ReactNode = null;

  switch (kind) {
    case "member_added":
      content = (
        <>User <strong className="text-white">{userName(detail.user_id)}</strong> added with role {roleName(detail.role_id)}</>
      );
      break;
    case "member_removed":
      content = (
        <>User <strong className="text-white">{userName(detail.user_id)}</strong> removed</>
      );
      break;
    case "member_role_changed":
      content = (
        <>User <strong className="text-white">{userName(detail.user_id)}</strong> role changed: {roleName(detail.old_role_id)} → {roleName(detail.new_role_id)}</>
      );
      break;
    case "ownership_transferred":
      content = (
        <>Ownership transferred to <strong className="text-white">{userName(detail.new_owner_id ?? detail.user_id)}</strong></>
      );
      break;
    case "role_created":
      content = <>Role <span className="font-mono text-purple-400">{detail.role_name ?? detail.role_id}</span> created</>;
      break;
    case "role_updated":
      content = <>Role <span className="font-mono text-purple-400">{detail.role_name ?? detail.role_id}</span> updated</>;
      break;
    case "role_deleted":
      content = <>Role <span className="font-mono text-purple-400">{detail.role_name ?? detail.role_id}</span> deleted</>;
      break;
    default:
      // Fallback: pokaż surowe pola
      content = (
        <span className="font-mono">
          {Object.entries(detail).map(([k, v]) => (
            <span key={k} className="mr-3">
              <span className="text-slate-600">{k}:</span>{" "}
              <span className="text-slate-400">{v}</span>
            </span>
          ))}
        </span>
      );
  }

  return <p className="text-xs text-slate-400 mt-0.5">{content}</p>;
}

// ── EventTypeBadge ────────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<string, { label: string; color: string }> = {
  member_added:           { label: "member added",           color: "text-green-400 bg-green-500/10 border border-green-500/20" },
  member_removed:         { label: "member removed",         color: "text-red-400 bg-red-500/10 border border-red-500/20" },
  ownership_transferred:  { label: "ownership transferred",  color: "text-amber-400 bg-amber-500/10 border border-amber-500/20" },
  member_role_changed:    { label: "role changed",           color: "text-blue-400 bg-blue-500/10 border border-blue-500/20" },
  role_created:           { label: "role created",           color: "text-purple-400 bg-purple-500/10 border border-purple-500/20" },
  role_updated:           { label: "role updated",           color: "text-purple-400 bg-purple-500/10 border border-purple-500/20" },
  role_deleted:           { label: "role deleted",           color: "text-red-400 bg-red-500/10 border border-red-500/20" },
};

function EventTypeBadge({ type }: { type: string | undefined }) {
  if (!type) return null;
  const cfg = EVENT_CONFIG[type] ?? {
    label: type.replace(/_/g, " "),
    color: "text-slate-400 bg-slate-700/50 border border-slate-600",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}
