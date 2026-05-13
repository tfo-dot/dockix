import React, { useState, useEffect } from "react";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Onboarding from "./pages/Onboarding";
import Indexing from "./pages/Indexing";
import Documentation from "./pages/Documentation";
import ProjectManagement from "./pages/ProjectManagement";
import AdminDashboard from "./pages/AdminDashboard";
import Project from "./pages/Project";
import GuestDocumentation from "./pages/GuestDocumentation";

export type Page =
  | "landing"
  | "onboarding"
  | "indexing"
  | "dashboard"
  | "project"
  | "documentation"
  | "project-management"
  | "settings"
  | "admin"
  | "guest-docs";

export type User = {
  name: string;
  email: string;
  role: "admin" | "user";
};

const MOCK_USER: User = {
  name: "User2137",
  email: "user2137@dockix.ai",
  role: "admin",
};

function pageFromHash(hash: string): Page | null {
  if (hash.startsWith("#/docs/")) return "documentation";
  if (hash.startsWith("#/guest/")) return "guest-docs";
  return null;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("landing");
  const [hasProjects, setHasProjects] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [docPath, setDocPath] = useState<string>("");

  // Hash-based routing
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash;
      const page = pageFromHash(hash);
      if (!page) return;
      // Extract path portion
      const path = hash.startsWith("#/docs/")
        ? hash.slice("#/docs/".length)
        : hash.startsWith("#/guest/")
        ? hash.slice("#/guest/".length)
        : "";
      // Only navigate if page actually changes — don't re-mount on every hash update
      setCurrentPage(prev => {
        if (prev !== page) return page;
        return prev;
      });
      if (path) setDocPath(path);
    };
    window.addEventListener("hashchange", onHashChange);
    onHashChange();
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = (page: Page, path?: string) => {
    if (page === "documentation" && path) {
      window.location.hash = `/docs/${path}`;
      setDocPath(path);
    } else if (page === "guest-docs") {
      window.location.hash = `/guest/${path ?? ""}`;
    } else {
      window.location.hash = "";
    }
    setCurrentPage(page);
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    setUser(MOCK_USER);
    setHasProjects(true);
    navigate("dashboard");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setHasProjects(false);
    navigate("landing");
  };

  const renderPage = () => {
    switch (currentPage) {
      case "landing":
        return (
          <LandingPage
            onStart={() => {
              // Simulate login → if has projects go to dashboard, else onboarding
              handleLogin();
            }}
            onGuest={() => navigate("guest-docs")}
          />
        );
      case "onboarding":
        return <Onboarding onComplete={() => navigate("indexing")} />;
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
        return <Dashboard navigate={navigate} user={user} onLogout={handleLogout} />;
      case "project":
        return <Project navigate={navigate} user={user} onLogout={handleLogout} />;
      case "documentation":
        return <Documentation navigate={navigate} user={user} onLogout={handleLogout} docPath={docPath} setDocPath={setDocPath} />;
      case "project-management":
        return (
          <ProjectManagement
            navigate={navigate}
            user={user}
            onLogout={handleLogout}
            isNewProject={!hasProjects}
            onComplete={() => navigate("documentation")}
          />
        );
      case "settings":
        return <Settings navigate={navigate} user={user} onLogout={handleLogout} />;
      case "admin":
        return <AdminDashboard navigate={navigate} user={user} onLogout={handleLogout} />;
      case "guest-docs":
        return <GuestDocumentation navigate={navigate} />;
      default:
        return <LandingPage onStart={handleLogin} onGuest={() => navigate("guest-docs")} />;
    }
  };

  return <>{renderPage()}</>;
}
