import React from "react";
import Sidebar from "../components/Sidebar";
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Globe, 
  Clock, 
  ChevronRight 
} from "lucide-react";

export default function UserInformation() {
  return (
    <div className="flex min-h-screen bg-[#0f1115]">
      {/* Wykorzystujemy wcześniej stworzony Sidebar */}
      <Sidebar activePage="user" />
      
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* HEADER */}
        <header className="h-20 border-b border-slate-800 flex items-center px-8 bg-[#0f1115]/50 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-white">User Information</h2>
        </header>

        <div className="p-8 max-w-4xl w-full">
          
          {/* PROFILE CARD */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden mb-8">
            <div className="h-32 bg-gradient-to-r from-green-900/20 via-slate-800 to-blue-900/10 border-b border-slate-800" />
            <div className="px-8 pb-8 flex flex-col md:flex-row gap-6">
              <div className="relative -mt-12">
                <div className="w-32 h-32 rounded-2xl bg-[#161b22] border-4 border-[#0f1115] flex items-center justify-center shadow-2xl">
                  <User size={64} className="text-slate-700" />
                </div>
              </div>
              <div className="pt-4 flex-1">
                <h3 className="text-2xl font-bold text-white">User2137</h3>
                <p className="text-slate-500">Fullstack Developer & Documentation Lead</p>
                <div className="flex gap-4 mt-4">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
                        <Globe size={12}/> Poland, EU
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
                        <Clock size={12}/> Joined March 2024
                    </span>
                </div>
              </div>
              <div className="md:pt-4">
                <button className="bg-white text-black font-bold px-6 py-2 rounded-lg text-sm hover:bg-slate-200 transition">
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* GRID Z DETALAMI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Account Details */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500 ml-1">Account Details</h4>
              <div className="bg-[#161b22] border border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Mail size={16}/>
                    <span className="text-[10px] uppercase font-bold tracking-tighter">Email Address</span>
                  </div>
                  <p className="text-sm font-medium text-white">user2137@dockix.ai</p>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <ShieldCheck size={16}/>
                    <span className="text-[10px] uppercase font-bold tracking-tighter">Security Status</span>
                  </div>
                  <p className="text-sm font-medium text-green-400">Two-Factor Auth Enabled</p>
                </div>
              </div>
            </div>

            {/* Platform Usage */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500 ml-1">Platform Usage</h4>
              <div className="bg-[#161b22] border border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-xs text-slate-400">Monthly Indexing Limit</span>
                    <span className="text-xs text-white font-mono">84 / 100</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 w-[84%]" />
                </div>
                <div className="pt-2">
                    <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 text-white">
                        Upgrade Plan <ChevronRight size={14} />
                    </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}