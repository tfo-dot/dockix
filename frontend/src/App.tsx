import React, { useState } from "react";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import UserInformation from "./pages/UserInformation";
import Project from "./pages/Project";
import Settings from "./pages/Settings";
import Onboarding from "./pages/Onboarding";
import Indexing from "./pages/Indexing";
import Documentation from "./pages/Documentation";
import ProjectManagement from "./pages/ProjectManagement";
import AdminDashboard from "./pages/AdminDashboard";

export type Page =
  | "landing"
  | "onboarding"
  | "indexing"
  | "dashboard"
  | "user"
  | "project"
  | "documentation"
  | "project-management"
  | "settings"
  | "admin";

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("landing");
  const [hasProjects, setHasProjects] = useState(false);

  const navigate = (page: Page) => setCurrentPage(page);

  const renderPage = () => {
    switch (currentPage) {
      case "landing":
        return (
          <LandingPage
            onStart={() => {
              if (hasProjects) navigate("dashboard");
              else navigate("onboarding");
            }}
          />
        );
      case "onboarding":
        return (
          <Onboarding
            onComplete={() => {
              navigate("indexing");
            }}
          />
        );
      case "indexing":
        return (
          <Indexing
            isFirstRepo={!hasProjects}
            onComplete={() => {
              setHasProjects(true);
              if (!hasProjects) navigate("project-management");
              else navigate("documentation");
            }}
          />
        );
      case "dashboard":
        return <Dashboard navigate={navigate} />;
      case "user":
        return <UserInformation navigate={navigate} />;
      case "project":
        return <Project navigate={navigate} />;
      case "documentation":
        return <Documentation navigate={navigate} />;
      case "project-management":
        return <ProjectManagement navigate={navigate} isNewProject={!hasProjects} onComplete={() => navigate("documentation")} />;
      case "settings":
        return <Settings navigate={navigate} />;
      case "admin":
        return <AdminDashboard navigate={navigate} />;
      default:
        return <LandingPage onStart={() => navigate("onboarding")} />;
    }
  };

  return (
    <>
      {renderPage()}
      {/* DEV NAV — remove in production */}
      <div className="fixed bottom-4 right-4 flex flex-wrap gap-1.5 bg-black/80 p-2 rounded-2xl border border-white/10 z-50 max-w-sm">
        {(
          [
            "landing",
            "onboarding",
            "indexing",
            "dashboard",
            "documentation",
            "project-management",
            "user",
            "project",
            "settings",
            "admin",
          ] as Page[]
        ).map((p) => (
          <button
            key={p}
            onClick={() => setCurrentPage(p)}
            className={`px-2 py-0.5 text-[9px] uppercase font-bold rounded-full transition ${
              currentPage === p
                ? "bg-green-500 text-black"
                : "text-white/60 hover:text-white"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </>
  );
}
