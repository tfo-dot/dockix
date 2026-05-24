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
import { authApi, userApi } from "./api/client";
import type { User as ApiUser } from "./api/client";

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
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
};

function pageFromHash(hash: string): Page | null {
  if (hash.startsWith("#/docs/")) return "documentation";
  if (hash.startsWith("#/guest/")) return "guest-docs";
  return null;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("landing");
  const [user, setUser] = useState<User | null>(null);
  const [currentRepo, setCurrentRepo] = useState<string>("");
  const [docPath, setDocPath] = useState<string>("");
  const [authLoading, setAuthLoading] = useState(true);

  // Przy starcie: jeśli jest token w localStorage, pobierz dane zalogowanego użytkownika
  useEffect(() => {
    if (authApi.isLoggedIn()) {
      userApi.me()
        .then((apiUser: ApiUser) => {
          setUser({
            id: apiUser.id,
            name: apiUser.name,
            email: apiUser.email,
            // Backend nie zwraca roli w /user/@me – domyślnie "user"
            // Superadmin jest rozróżniany przez x-api-key, nie przez pole w User
            role: "user",
          });
          setCurrentPage("dashboard");
        })
        .catch(() => {
          // Token wygasł lub nieważny
          localStorage.removeItem("dockix_token");
        })
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
  }, []);

  // Hash-based routing
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

  const handleLoginSuccess = (apiUser: ApiUser) => {
    setUser({
      id: apiUser.id,
      name: apiUser.name,
      email: apiUser.email,
      role: "user",
    });
    navigate("dashboard");
  };

  const handleLogout = async () => {
    // Zawsze czyścimy stan lokalny niezależnie od odpowiedzi backendu
    // (token może być już nieważny np. po zmianie hasła)
    try {
      await authApi.logout();
    } catch {
      // Ignorujemy błąd - token i tak usuwamy
      localStorage.removeItem("dockix_token");
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
            onStart={() => navigate("landing")} // LandingPage obsługuje login sam
            onGuest={() => navigate("guest-docs")}
            onLoginSuccess={handleLoginSuccess}
          />
        );
      case "onboarding":
        return (
          <Onboarding
            onComplete={(repoName: string) => {
              setCurrentRepo(repoName);
              navigate("indexing");
            }}
          />
        );
      case "indexing":
        return (
          <Indexing
            repoName={currentRepo}
            onComplete={() => navigate("project-management")}
          />
        );
      case "dashboard":
        return <Dashboard {...commonProps} />;
      case "project":
        return <Project {...commonProps} />;
      case "documentation":
        return (
          <Documentation
            {...commonProps}
            docPath={docPath}
            setDocPath={setDocPath}
          />
        );
      case "project-management":
        return <ProjectManagement {...commonProps} />;
      case "settings":
        return <Settings {...commonProps} />;
      case "admin":
        return <AdminDashboard {...commonProps} />;
      case "guest-docs":
        return <GuestDocumentation navigate={navigate} />;
      default:
        return <LandingPage onStart={() => navigate("landing")} onGuest={() => navigate("guest-docs")} onLoginSuccess={handleLoginSuccess} />;
    }
  };

  return <>{renderPage()}</>;
}
