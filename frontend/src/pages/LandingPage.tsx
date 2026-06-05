import React, { useState } from "react";
import {
  Terminal, Activity, Layers, Table as TableIcon,
  ArrowRight, Eye, Loader, AlertCircle, Key, ChevronDown, CheckCircle,
} from "lucide-react";
import { authApi, userApi } from "../api/client";
import type { MeResponse } from "../api/client";

interface Props {
  onGuest: () => void;
  onLoginSuccess: (res: MeResponse) => void;
  sessionExpired?: boolean;
}

type Mode = "signin" | "signup";

export default function LandingPage({ onGuest, onLoginSuccess, sessionExpired }: Props) {
  const [mode, setMode] = useState<Mode>("signin");

  // Wspólne pola
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Pola rejestracji
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Superadmin API key section
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  const resetFields = () => {
    setError(null);
    setPassword("");
    setConfirmPassword("");
  };

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true); setError(null);
    try {
      await authApi.login(email, password);
      const me = await userApi.me();
      onLoginSuccess(me);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!name || !email || !password) return;
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true); setError(null);
    try {
      // 1. Utwórz konto (publiczna rejestracja — endpoint działa bez auth)
      await userApi.create({ name, email, password });
      // 2. Automatyczny login utworzonymi danymi
      await authApi.login(email, password);
      const me = await userApi.me();
      onLoginSuccess(me);
    } catch (e) {
      // 409 = email zajęty, 400 = błędne dane
      const msg = e instanceof Error ? e.message : "Registration failed";
      setError(
        msg.toLowerCase().includes("conflict") || msg.includes("409")
          ? "An account with this email already exists."
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApiKeyLogin = async () => {
    if (!apiKey.trim()) return;
    setApiKeyLoading(true); setApiKeyError(null);
    try {
      const ok = await authApi.loginWithApiKey(apiKey.trim());
      if (!ok) {
        setApiKeyError("Key is valid but does not have superadmin access.");
        return;
      }
      const me = await userApi.me();
      onLoginSuccess(me);
    } catch (e) {
      setApiKeyError(e instanceof Error ? e.message : "Invalid key");
    } finally {
      setApiKeyLoading(false);
    }
  };

  const submit = mode === "signin" ? handleLogin : handleSignup;
  const canSubmit = mode === "signin"
    ? Boolean(email && password)
    : Boolean(name && email && password && confirmPassword);

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-300 font-sans selection:bg-green-500/30">
      <nav className="p-8">
        <img src="/logo.svg" alt="dockix logo" className="h-20 w-auto" />
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left: Analysis Engine mockup */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 to-blue-500/20 blur opacity-25" />
          <div className="relative bg-[#161b22] border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
            <div className="bg-[#0d1117] px-4 py-2 border-b border-slate-800 flex items-center justify-between">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/20" />
                <div className="w-3 h-3 rounded-full bg-amber-500/20" />
                <div className="w-3 h-3 rounded-full bg-green-500/20" />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Analysis Engine</span>
            </div>
            <div className="p-6 font-mono text-sm leading-relaxed">
              <CodeLine n={6}  content={<><span className="text-blue-400">def</span> <span className="text-yellow-200">parse_code</span>(d):</>} />
              <CodeLine n={7}  content={<span className="text-slate-400 pl-4 block"># processing AST nodes...</span>} />
              <CodeLine n={8}  content={<><span className="text-blue-400">def</span> <span className="text-yellow-200">build_docs</span>(tokens):</>} />
              <CodeLine n={9}  content={<span className="pl-4 block">current = parse_code(tokens)</span>} />
              <CodeLine n={10} content={<span className="pl-4 block"><span className="text-purple-400">return</span> <span className="text-orange-300">True</span></span>} />
              <CodeLine n={11} content={<><span className="text-blue-400">if</span> (symbols) {"{"}</>} />
              <CodeLine n={12} content={<span className="pl-4 block text-green-400">docs.generate();</span>} />
              <CodeLine n={13} content={<span className="pl-4 block text-purple-400">return <span className="text-slate-300">output</span></span>} />
            </div>
          </div>
        </div>

        {/* Right: Auth */}
        <div className="flex flex-col gap-5">
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl">
            {/* Tab switcher */}
            <div className="flex gap-1 bg-[#0d1117] border border-slate-800 rounded-xl p-1 mb-6">
              <button
                onClick={() => { setMode("signin"); resetFields(); }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${mode === "signin" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}
              >
                Sign in
              </button>
              <button
                onClick={() => { setMode("signup"); resetFields(); }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${mode === "signup" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}
              >
                Sign up
              </button>
            </div>

            <p className="text-slate-500 text-sm mb-6">
              {mode === "signin" ? "Log in to your Dockix account." : "Create a new Dockix account."}
            </p>

            {sessionExpired && mode === "signin" && (
              <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5 mb-4">
                <AlertCircle size={14} /> Session expired. Please sign in again.
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 mb-4">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="space-y-3 mb-5">
              {/* Name — tylko przy rejestracji */}
              {mode === "signup" && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full bg-[#0d1117] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500 transition-colors" />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  onKeyDown={e => e.key === "Enter" && submit()}
                  className="w-full bg-[#0d1117] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500 transition-colors" />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
                  onKeyDown={e => e.key === "Enter" && submit()}
                  className="w-full bg-[#0d1117] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500 transition-colors" />
              </div>

              {/* Confirm password — tylko przy rejestracji */}
              {mode === "signup" && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    onKeyDown={e => e.key === "Enter" && submit()}
                    className={`w-full bg-[#0d1117] border rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-colors ${
                      confirmPassword && password !== confirmPassword
                        ? "border-red-500/50 focus:border-red-500"
                        : "border-slate-700 focus:border-green-500"
                    }`} />
                  {confirmPassword && password === confirmPassword && (
                    <p className="text-[10px] text-green-400 mt-1 flex items-center gap-1"><CheckCircle size={10} /> Passwords match</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={submit} disabled={loading || !canSubmit}
                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl transition flex items-center justify-center gap-2 group">
                {loading
                  ? <><Loader size={16} className="animate-spin" /> {mode === "signin" ? "Signing in..." : "Creating account..."}</>
                  : <>{mode === "signin" ? "Sign in" : "Create account"} <ArrowRight size={16} className="group-hover:translate-x-1 transition" /></>}
              </button>
              <button onClick={onGuest}
                className="w-full border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white font-medium py-3 px-6 rounded-xl transition flex items-center justify-center gap-2">
                <Eye size={15} /> Browse docs as guest
              </button>
            </div>
          </div>

          {/* Superadmin API Key section */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowApiKey(v => !v)}
              className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-900/30 hover:bg-slate-800/40 transition text-left"
            >
              <div className="flex items-center gap-2">
                <Key size={14} className="text-slate-500" />
                <span className="text-xs font-bold text-slate-500">Superadmin access</span>
                <span className="text-[10px] text-slate-600">— use key from backend startup</span>
              </div>
              <ChevronDown size={14} className={`text-slate-600 transition-transform ${showApiKey ? "rotate-180" : ""}`} />
            </button>

            {showApiKey && (
              <div className="px-5 pb-5 pt-4 bg-slate-900/20 space-y-3">
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  When you start the backend, the terminal shows:<br />
                  <code className="text-slate-400 bg-slate-800 px-1 rounded">WARNING: Generated superadmin key: &lt;key&gt;</code><br />
                  Paste that key here. It is stored in localStorage as <code className="text-slate-400">dockix_api_key</code> and sent as <code className="text-slate-400">x-api-key</code> header.
                </p>

                {apiKeyError && (
                  <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <AlertCircle size={12} /> {apiKeyError}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleApiKeyLogin()}
                    placeholder="Paste superadmin key..."
                    className="flex-1 bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <button
                    onClick={handleApiKeyLogin}
                    disabled={!apiKey.trim() || apiKeyLoading}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg transition text-xs flex items-center gap-2"
                  >
                    {apiKeyLoading ? <Loader size={13} className="animate-spin" /> : <Key size={13} />}
                    Login
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={<Activity size={15} />} text="Automated Flowcharts" />
            <FeatureItem icon={<Terminal size={15} />} text="Team Activity Logs" />
            <FeatureItem icon={<TableIcon size={15} />} text="Data Tables" />
            <FeatureItem icon={<Layers size={15} />} text="Indexing Process" />
          </div>
        </div>
      </main>
    </div>
  );
}

function CodeLine({ n, content }: { n: number; content: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <span className="text-slate-600 text-right w-4 shrink-0">{n}</span>
      <p className="flex-1">{content}</p>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 bg-slate-900/30 border border-slate-800/50 p-3 rounded-lg">
      <div className="text-green-500">{icon}</div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{text}</span>
    </div>
  );
}
