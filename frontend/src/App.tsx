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
import { authApi, userApi, isSuperadminResponse } from "./api/client";
import type { MeResponse } from "./api/client";

export type Page =
  | "landing" | "onboarding" | "indexing" | "dashboard" | "project"
  | "documentation" | "project-management" | "settings" | "admin" | "guest-docs";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
};

// Superadmin placeholder gdy /user/@me zwraca tylko {role:"superadmin"}
const SUPERADMIN_USER: User = {
  id: "superadmin",
  name: "Superadmin",
  email: "",
  role: "admin",
};

function pageFromHash(hash: string): Page | null {
  if (hash.startsWith("#/docs/")) return "documentation";
  if (hash.startsWith("#/guest/")) return "guest-docs";
  return null;
}

function meToUser(res: MeResponse): User {
  if (isSuperadminResponse(res)) return SUPERADMIN_USER;
  return { id: res.id, name: res.name, email: res.email, role: "user" };
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("landing");
  const [user, setUser] = useState<User | null>(null);
  const [currentRepo, setCurrentRepo] = useState<string>("");
  const [docPath, setDocPath] = useState<string>("");
  const [authLoading, setAuthLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Przy starcie: jeśli jest token lub api key, odtwórz sesję
  useEffect(() => {
    if (authApi.isLoggedIn()) {
      userApi.me()
        .then((res: MeResponse) => {
          setUser(meToUser(res));
          setCurrentPage("dashboard");
        })
        .catch(() => {
          // Token wygasł lub backend zrestartował się (nowy superadmin key)
          authApi.clearAll();
          setSessionExpired(true);
        })
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
  }, []);

  // Hash routing
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash;
      const page = pageFromHash(hash);
      if (!page) return;
      const path = hash.startsWith("#/docs/")
        ? hash.slice("#/docs/".length)
        : hash.startsWith("#/guest/")
        ? hash.slice("#/guest/".length)
        : "";
      setCurrentPage(prev => prev !== page ? page : prev);
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

  const handleLoginSuccess = (res: MeResponse) => {
    setUser(meToUser(res));
    navigate("dashboard");
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      authApi.clearAll();
    } finally {
      setUser(null);
      setCurrentRepo("");
      navigate("landing");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const commonProps = { navigate, user, onLogout: handleLogout, currentRepo, setCurrentRepo };

  const renderPage = () => {
    switch (currentPage) {
      case "landing":
        return (
          <LandingPage
            onGuest={() => navigate("guest-docs")}
            onLoginSuccess={handleLoginSuccess}
            sessionExpired={sessionExpired}
          />
        );
      case "onboarding":
        return <Onboarding onComplete={(repoName: string) => { setCurrentRepo(repoName); navigate("indexing"); }} />;
      case "indexing":
        return <Indexing repoName={currentRepo} onComplete={() => navigate("project-management")} />;
      case "dashboard":        return <Dashboard {...commonProps} />;
      case "project":          return <Project {...commonProps} />;
      case "documentation":    return <Documentation {...commonProps} docPath={docPath} setDocPath={setDocPath} />;
      case "project-management": return <ProjectManagement {...commonProps} />;
      case "settings":         return <Settings {...commonProps} />;
      case "admin":            return <AdminDashboard {...commonProps} />;
      case "guest-docs":       return <GuestDocumentation navigate={navigate} />;
      default:
        return <LandingPage onGuest={() => navigate("guest-docs")} onLoginSuccess={handleLoginSuccess} />;
    }
  };

  return <>{renderPage()}</>;
}
