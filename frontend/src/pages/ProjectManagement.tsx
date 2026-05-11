import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import {
  ShieldCheck, Users, Eye, Edit3, Trash2, Plus, ChevronRight,
  X, Check, AlertCircle, Clock, Lock, Save, Mail,
} from "lucide-react";
import type { Page, User as UserType } from "../App";

interface Permission { id: string; label: string; description: string; }
interface Role { id: string; name: string; description: string; color: string; permissions: string[]; edited?: boolean; }
interface Member { id: string; name: string; email: string; roleId: string; joinedAt: string; }
interface Event { id: string; user: string; action: string; target: string; time: string; }

const ALL_PERMISSIONS: Permission[] = [
  { id: "read_docs", label: "Read Documentation", description: "View all generated documentation" },
  { id: "write_docs", label: "Edit Documentation", description: "Manually edit documentation entries" },
  { id: "sync_repo", label: "Sync Repository", description: "Trigger re-indexing of the repository" },
  { id: "manage_users", label: "Manage Users", description: "Invite, remove, and change roles" },
  { id: "manage_roles", label: "Manage Roles", description: "Create and modify roles" },
  { id: "delete_project", label: "Delete Project", description: "Permanently delete this project" },
];

const INITIAL_ROLES: Role[] = [
  { id: "admin", name: "Admin", description: "Full access to everything", color: "text-red-400 bg-red-500/10 border-red-500/20", permissions: ALL_PERMISSIONS.map(p => p.id) },
  { id: "editor", name: "Editor", description: "Can read and edit docs, sync repos", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", permissions: ["read_docs", "write_docs", "sync_repo"] },
  { id: "viewer", name: "Viewer", description: "Read-only access", color: "text-slate-400 bg-slate-700/50 border-slate-600", permissions: ["read_docs"] },
];

const INITIAL_MEMBERS: Member[] = [
  { id: "1", name: "User2137", email: "user2137@dockix.ai", roleId: "admin", joinedAt: "Mar 2024" },
  { id: "2", name: "Alice K.", email: "alice@corp.io", roleId: "editor", joinedAt: "Apr 2024" },
  { id: "3", name: "Bob D.", email: "bob@corp.io", roleId: "viewer", joinedAt: "May 2024" },
];

const MOCK_EVENTS: Event[] = [
  { id: "1", user: "User2137", action: "synced repository", target: "kernel-module-xyz", time: "2 min ago" },
  { id: "2", user: "Alice K.", action: "edited documentation for", target: "fn parse_tokens", time: "1 hour ago" },
  { id: "3", user: "User2137", action: "changed role of", target: "Bob D. → Viewer", time: "2 days ago" },
  { id: "4", user: "Alice K.", action: "triggered indexing for", target: "kernel-module-xyz", time: "3 days ago" },
];

type Tab = "users" | "roles" | "events";

// ── Invite Modal ──────────────────────────────────────────────────────────────
function InviteModal({ roles, onClose, onInvite }: {
  roles: Role[];
  onClose: () => void;
  onInvite: (email: string, roleId: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState(roles[1]?.id ?? roles[0]?.id);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <Modal title="Invite Member" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Email address</label>
          <div className="flex items-center gap-2 bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2.5 focus-within:border-green-500 transition-colors">
            <Mail size={14} className="text-slate-500 shrink-0" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="bg-transparent text-sm text-white outline-none flex-1 placeholder:text-slate-600"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Role</label>
          <select
            value={roleId}
            onChange={e => setRoleId(e.target.value)}
            className="w-full bg-[#0d1117] border border-slate-700 text-sm text-white rounded-lg px-3 py-2.5 focus:outline-none focus:border-green-500 transition-colors"
          >
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition text-sm">Cancel</button>
          <button
            disabled={!valid}
            onClick={() => { onInvite(email, roleId); onClose(); }}
            className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition text-sm"
          >
            Send Invite
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── New Role Modal ────────────────────────────────────────────────────────────
function NewRoleModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (name: string, description: string, permissions: string[]) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<string[]>(["read_docs"]);

  const toggle = (id: string) =>
    setPermissions(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  return (
    <Modal title="New Role" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Role name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Contributor"
            className="w-full bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Description</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Short description of this role"
            className="w-full bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Permissions</label>
          <div className="space-y-1.5">
            {ALL_PERMISSIONS.map(perm => {
              const has = permissions.includes(perm.id);
              return (
                <div
                  key={perm.id}
                  onClick={() => toggle(perm.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition ${has ? "bg-green-500/5 border-green-500/20" : "border-slate-800 hover:border-slate-700"}`}
                >
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
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition text-sm">Cancel</button>
          <button
            disabled={!name.trim()}
            onClick={() => { onCreate(name, description, permissions); onClose(); }}
            className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition text-sm"
          >
            Create Role
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Generic Modal shell ───────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition">
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProjectManagement({ navigate, user, onLogout, isNewProject = false, onComplete }: {
  navigate: (p: Page) => void;
  user?: UserType | null;
  onLogout?: () => void;
  isNewProject?: boolean;
  onComplete?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("users");
  const [roles, setRoles] = useState<Role[]>(INITIAL_ROLES);
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [previewRoleId, setPreviewRoleId] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showNewRole, setShowNewRole] = useState(false);
  const [savedRoleId, setSavedRoleId] = useState<string | null>(null);

  const previewRole = roles.find(r => r.id === previewRoleId);

  const togglePermission = (roleId: string, permId: string) => {
    setRoles(prev => prev.map(r =>
      r.id === roleId
        ? { ...r, permissions: r.permissions.includes(permId) ? r.permissions.filter(p => p !== permId) : [...r.permissions, permId], edited: true }
        : r
    ));
  };

  const saveRole = (roleId: string) => {
    setRoles(prev => prev.map(r => r.id === roleId ? { ...r, edited: false } : r));
    setEditingRoleId(null);
    setSavedRoleId(roleId);
    setTimeout(() => setSavedRoleId(null), 2000);
  };

  const handleInvite = (email: string, roleId: string) => {
    const newMember: Member = {
      id: Date.now().toString(),
      name: email.split("@")[0],
      email,
      roleId,
      joinedAt: "just now",
    };
    setMembers(prev => [...prev, newMember]);
  };

  const handleNewRole = (name: string, description: string, permissions: string[]) => {
    const colors = ["text-purple-400 bg-purple-500/10 border-purple-500/20", "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", "text-amber-400 bg-amber-500/10 border-amber-500/20"];
    const color = colors[roles.length % colors.length];
    setRoles(prev => [...prev, { id: name.toLowerCase().replace(/\s+/g, "-"), name, description, color, permissions }]);
  };

  const changeUserRole = (userId: string, roleId: string) => {
    setMembers(prev => prev.map(m => m.id === userId ? { ...m, roleId } : m));
  };

  return (
    <div className="flex min-h-screen bg-[#0f1115]">
      <Sidebar activePage="project-management" navigate={navigate} user={user} onLogout={onLogout} />

      {/* Modals */}
      {showInvite && <InviteModal roles={roles} onClose={() => setShowInvite(false)} onInvite={handleInvite} />}
      {showNewRole && <NewRoleModal onClose={() => setShowNewRole(false)} onCreate={handleNewRole} />}

      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Preview banner */}
        {previewRoleId && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-8 py-3 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <Eye size={15} className="text-amber-400" />
              <span className="text-sm text-amber-400 font-medium">
                Preview mode — viewing as <strong>{previewRole?.name}</strong>
              </span>
              <span className="text-xs text-amber-600">Editing is disabled.</span>
            </div>
            <button
              onClick={() => setPreviewRoleId(null)}
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition font-bold"
            >
              <X size={12} /> Exit Preview
            </button>
          </div>
        )}

        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-[#0f1115]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">Management</h2>
            {isNewProject && (
              <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
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
          {isNewProject && (
            <div className="mb-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle size={15} className="text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">Set up permissions before continuing</p>
                <p className="text-xs text-slate-500 mt-0.5">Configure roles and invite team members. You can change this later.</p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-900/50 border border-slate-800 rounded-xl p-1 mb-8 w-fit">
            {(["users", "roles", "events"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${tab === t ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}
              >
                {t === "users" && <Users size={11} className="inline mr-1.5" />}
                {t === "roles" && <ShieldCheck size={11} className="inline mr-1.5" />}
                {t === "events" && <Clock size={11} className="inline mr-1.5" />}
                {t}
              </button>
            ))}
          </div>

          {/* USERS */}
          {tab === "users" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Team Members ({members.length})</h3>
                <button
                  onClick={() => setShowInvite(true)}
                  className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/15 px-3 py-1.5 rounded-lg border border-green-500/20 font-bold transition"
                >
                  <Plus size={12} /> Invite
                </button>
              </div>
              <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden">
                {members.map((member, i) => {
                  const role = roles.find(r => r.id === member.roleId);
                  return (
                    <div key={member.id} className={`flex items-center justify-between px-5 py-4 ${i < members.length - 1 ? "border-b border-slate-800" : ""}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-bold text-xs">
                          {member.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{member.name}</p>
                          <p className="text-xs text-slate-500 font-mono">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] text-slate-600">Joined {member.joinedAt}</span>
                        {previewRoleId ? (
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${role?.color}`}>{role?.name}</span>
                        ) : (
                          <select
                            value={member.roleId}
                            onChange={e => changeUserRole(member.id, e.target.value)}
                            className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-2 py-1.5 focus:outline-none focus:border-green-500"
                          >
                            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                        )}
                        {!previewRoleId && (
                          <button className="p-1.5 hover:bg-red-500/10 text-slate-600 hover:text-red-400 rounded-lg transition">
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
                <button
                  onClick={() => setShowNewRole(true)}
                  className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/15 px-3 py-1.5 rounded-lg border border-green-500/20 font-bold transition"
                >
                  <Plus size={12} /> New Role
                </button>
              </div>
              <div className="space-y-4">
                {roles.map(role => {
                  const isEditing = editingRoleId === role.id;
                  const isAdmin = role.id === "admin";
                  const justSaved = savedRoleId === role.id;
                  return (
                    <div key={role.id} className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between p-5 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${role.color}`}>{role.name}</span>
                          <p className="text-xs text-slate-500">{role.description}</p>
                          {justSaved && (
                            <span className="text-[10px] text-green-400 flex items-center gap-1">
                              <Check size={10} /> Saved
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPreviewRoleId(previewRoleId === role.id ? null : role.id)}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-bold transition ${
                              previewRoleId === role.id
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                : "text-slate-400 hover:text-white border-slate-700 hover:border-slate-600"
                            }`}
                          >
                            <Eye size={12} /> Preview
                          </button>
                          {!isAdmin && !previewRoleId && (
                            <>
                              {isEditing ? (
                                <button
                                  onClick={() => saveRole(role.id)}
                                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-bold transition bg-green-600 hover:bg-green-500 text-white border-green-600"
                                >
                                  <Save size={12} /> Save
                                </button>
                              ) : (
                                <button
                                  onClick={() => setEditingRoleId(role.id)}
                                  className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-white rounded-lg transition"
                                >
                                  <Edit3 size={13} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="p-5 grid grid-cols-2 gap-2">
                        {ALL_PERMISSIONS.map(perm => {
                          const hasIt = role.permissions.includes(perm.id);
                          const canToggle = !isAdmin && !previewRoleId && isEditing;
                          return (
                            <div
                              key={perm.id}
                              onClick={() => canToggle && togglePermission(role.id, perm.id)}
                              className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                                hasIt ? "bg-green-500/5 border-green-500/15" : "border-slate-800 opacity-50"
                              } ${canToggle ? "cursor-pointer hover:border-slate-700" : "cursor-default"}`}
                            >
                              <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${hasIt ? "bg-green-500 text-black" : "bg-slate-800"}`}>
                                {hasIt && <Check size={10} />}
                              </div>
                              <div>
                                <p className="text-xs font-medium text-white">{perm.label}</p>
                                <p className="text-[10px] text-slate-600">{perm.description}</p>
                              </div>
                              {isAdmin && <Lock size={10} className="ml-auto text-slate-700" />}
                            </div>
                          );
                        })}
                      </div>
                      {isEditing && !isAdmin && (
                        <div className="px-5 pb-4">
                          <p className="text-[10px] text-slate-600">Click permissions to toggle. Press Save when done.</p>
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
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Project Activity</h3>
              <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden">
                {MOCK_EVENTS.map((ev, i) => (
                  <div key={ev.id} className={`flex items-start gap-4 px-5 py-4 ${i < MOCK_EVENTS.length - 1 ? "border-b border-slate-800" : ""}`}>
                    <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-[10px] shrink-0 mt-0.5">
                      {ev.user[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300">
                        <span className="font-medium text-white">{ev.user}</span>{" "}
                        {ev.action}{" "}
                        <span className="font-mono text-blue-400 text-xs">{ev.target}</span>
                      </p>
                      <p className="text-[10px] text-slate-600 mt-0.5">{ev.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
