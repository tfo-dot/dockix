import React from "react";
import {
  LayoutDashboard,
  User,
  FolderGit2,
  Settings,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import type { Page } from "../App";

interface SidebarProps {
  activePage: string;
  navigate?: (page: Page) => void;
}

export default function Sidebar({ activePage, navigate }: SidebarProps) {
  const go = (page: Page) => navigate && navigate(page);

  return (
    <aside className="w-64 border-r border-slate-800 flex flex-col p-6 gap-8 h-screen sticky top-0 bg-[#0f1115]">
      <div className="mb-4">
        <img src="/logo.svg" alt="dockix logo" className="h-16 w-auto" />
      </div>

      <nav className="flex flex-col gap-2">
        <SidebarItem
          icon={<LayoutDashboard size={20} />}
          label="Dashboard"
          active={activePage === "dashboard"}
          onClick={() => go("dashboard")}
        />
        <SidebarItem
          icon={<User size={20} />}
          label="User Information"
          active={activePage === "user"}
          onClick={() => go("user")}
        />
        <SidebarItem
          icon={<FolderGit2 size={20} />}
          label="Project"
          active={activePage === "project"}
          onClick={() => go("project")}
        />
        <SidebarItem
          icon={<BookOpen size={20} />}
          label="Documentation"
          active={activePage === "documentation"}
          onClick={() => go("documentation")}
        />
        <SidebarItem
          icon={<ShieldCheck size={20} />}
          label="Permissions"
          active={activePage === "project-management"}
          onClick={() => go("project-management")}
        />
        <SidebarItem
          icon={<Settings size={20} />}
          label="Settings"
          active={activePage === "settings"}
          onClick={() => go("settings")}
        />
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-green-500/10">
            U
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">User2137</p>
            <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider">
              Pro Account
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all
        ${
          active
            ? "bg-green-500/10 text-green-500 border border-green-500/20 shadow-inner"
            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        }
      `}
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </div>
  );
}
