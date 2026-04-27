import React, { useState } from "react";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import UserInformation from "./pages/UserInformation";
import Project from "./pages/Project";
import Settings from "./pages/Settings";

export default function App() {
  // Prosty system nawigacji oparty na stanie
  const [currentPage, setCurrentPage] = useState<"landing" | "dashboard" | "user" | "project" | "settings">("landing");

  // Funkcja renderująca odpowiednią stronę
  const renderPage = () => {
    switch (currentPage) {
      case "landing":
        return <LandingPage onStart={() => setCurrentPage("dashboard")} />;
      case "dashboard":
        return <Dashboard />;
      case "user":
        return <UserInformation />;
      case "project":
        return <Project />;
      case "settings":
        return <Settings />;
      default:
        return <LandingPage onStart={() => setCurrentPage("dashboard")} />;
    }
  };

  return (
    <>
      {renderPage()}
      
      {/* TYMCZASOWY PANEL DO TESTÓW (Usuń po dodaniu linków w Sidebarze) */}
      <div className="fixed bottom-4 right-4 flex gap-2 bg-black/80 p-2 rounded-full border border-white/10 z-50">
        {(["landing", "dashboard", "user", "project", "settings"] as const).map(p => (
          <button 
            key={p} 
            onClick={() => setCurrentPage(p)}
            className={`px-3 py-1 text-[10px] uppercase font-bold rounded-full ${currentPage === p ? 'bg-green-500 text-black' : 'text-white'}`}
          >
            {p}
          </button>
        ))}
      </div>
    </>
  );
}