import React, { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  FolderGit2,
  BookOpen,
  ShieldCheck,
  ChevronUp,
  Settings,
  LogOut,
  Shield,
  User,
} from "lucide-react";
import type { Page, User as UserType } from "../App";

interface SidebarProps {
  activePage: string;
  navigate: (page: Page) => void;
  user?: UserType | null;
  onLogout?: () => void;
}

export default function Sidebar({ activePage, navigate, user, onLogout }: SidebarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <aside className="w-64 border-r border-slate-800 flex flex-col p-6 gap-8 h-screen sticky top-0 bg-[#0f1115]">
      <div className="mb-2">
        <img src="/logo.svg" alt="dockix logo" className="h-14 w-auto" />
      </div>

      <nav className="flex flex-col gap-1.5">
        <SidebarItem
          icon={<LayoutDashboard size={18} />}
          label="Dashboard"
          active={activePage === "dashboard"}
          onClick={() => navigate("dashboard")}
        />
        <SidebarItem
          icon={<FolderGit2 size={18} />}
          label="Project"
          active={activePage === "project"}
          onClick={() => navigate("project")}
        />
        <SidebarItem
          icon={<BookOpen size={18} />}
          label="Documentation"
          active={activePage === "documentation"}
          onClick={() => navigate("documentation")}
        />
        <SidebarItem
          icon={<ShieldCheck size={18} />}
          label="Management"
          active={activePage === "project-management"}
          onClick={() => navigate("project-management")}
        />
      </nav>

      {/* Profile area */}
      <div className="mt-auto relative" ref={dropdownRef}>
        {/* Dropdown menu */}
        {profileOpen && (
          <div className="absolute bottom-full mb-2 left-0 right-0 bg-[#1a1f2e] border border-slate-700 rounded-xl overflow-hidden shadow-2xl shadow-black/40 z-50">
            <div className="px-4 py-3 border-b border-slate-700/60">
              <p className="text-xs text-slate-500 truncate">{user?.email ?? "—"}</p>
            </div>
            <DropdownItem
              icon={<User size={14} />}
              label="Profile & Account"
              onClick={() => { navigate("settings"); setProfileOpen(false); }}
            />
            <DropdownItem
              icon={<Settings size={14} />}
              label="Settings"
              onClick={() => { navigate("settings"); setProfileOpen(false); }}
            />
            {user?.role === "admin" && (
              <DropdownItem
                icon={<Shield size={14} />}
                label="Admin Dashboard"
                onClick={() => { navigate("admin"); setProfileOpen(false); }}
              />
            )}
            <div className="border-t border-slate-700/60">
              <DropdownItem
                icon={<LogOut size={14} />}
                label="Log out"
                danger
                onClick={() => { setProfileOpen(false); onLogout?.(); }}
              />
            </div>
          </div>
        )}

        {/* Profile button */}
        <button
          onClick={() => setProfileOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/60 transition border border-transparent hover:border-slate-700/50 group"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-green-500/10 shrink-0">
            {user?.name?.[0] ?? "U"}
          </div>
          <div className="overflow-hidden flex-1 text-left">
            <p className="text-sm font-medium text-white truncate">{user?.name ?? "User"}</p>
            <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider">
              {user?.role === "admin" ? "Admin" : "Pro Account"}
            </p>
          </div>
          <ChevronUp
            size={14}
            className={`text-slate-500 transition-transform ${profileOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>
    </aside>
  );
}

function SidebarItem({
  icon, label, active, onClick,
}: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all ${
        active
          ? "bg-green-500/10 text-green-500 border border-green-500/20"
          : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
      }`}
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </div>
  );
}

function DropdownItem({
  icon, label, onClick, danger = false,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition ${
        danger
          ? "text-red-400 hover:bg-red-500/10"
          : "text-slate-300 hover:bg-slate-700/50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
