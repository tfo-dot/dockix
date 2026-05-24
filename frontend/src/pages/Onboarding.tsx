import React, { useState, useEffect } from "react";
import {
  Globe, GitBranch, Lock, Link, CheckCircle, AlertCircle,
  ChevronRight, Terminal, Tag, GitCommit, Loader, Eye, EyeOff,
} from "lucide-react";
import { reposApi, ApiError } from "../api/client";
import type { PrefetchResponse } from "../api/client";

type RepoType = "github" | "gitlab" | "ssh" | "https" | "unknown";
type AuthStep = "url" | "auth" | "branch" | "verify";

interface BranchOption {
  name: string;
  type: "branch" | "tag";
}

function detectRepoType(url: string): RepoType {
  if (!url) return "unknown";
  if (url.startsWith("git@github.com") || url.includes("github.com")) return "github";
  if (url.startsWith("git@gitlab.com") || url.includes("gitlab.com")) return "gitlab";
  if (url.startsWith("git@") || url.startsWith("ssh://")) return "ssh";
  if (url.startsWith("https://") || url.startsWith("http://")) return "https";
  return "unknown";
}

function isPrivateRepoLikely(url: string): boolean {
  return url.startsWith("git@") || url.startsWith("ssh://");
}

const RepoTypeTag = ({ type }: { type: RepoType }) => {
  const config: Record<RepoType, { label: string; color: string }> = {
    github: { label: "GitHub", color: "text-white bg-slate-700 border-slate-600" },
    gitlab: { label: "GitLab", color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
    ssh: { label: "SSH", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
    https: { label: "HTTPS", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    unknown: { label: "Unknown", color: "text-slate-500 bg-slate-800 border-slate-700" },
  };
  const c = config[type];
  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${c.color}`}>
      <Globe size={11} /> {c.label}
    </span>
  );
};

export default function Onboarding({ onComplete }: { onComplete: (repoName: string) => void }) {
  const [step, setStep] = useState<AuthStep>("url");
  const [url, setUrl] = useState("");
  const [repoName, setRepoName] = useState("");
  const [repoType, setRepoType] = useState<RepoType>("unknown");
  const [needsAuth, setNeedsAuth] = useState(false);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedRef, setSelectedRef] = useState<BranchOption | null>(null);
  const [fetchingBranches, setFetchingBranches] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    setRepoType(detectRepoType(url));
    setNeedsAuth(isPrivateRepoLikely(url));
  }, [url]);

  // Automatyczna nazwa repo z URL
  useEffect(() => {
    if (!url) return;
    const parts = url.replace(/\.git$/, "").split("/");
    const suggested = parts[parts.length - 1] ?? "";
    setRepoName(suggested);
  }, [url]);

  const handleUrlNext = () => {
    if (!url.trim() || repoType === "unknown") return;
    if (needsAuth) setStep("auth");
    else fetchBranches();
  };

  const fetchBranches = async (authToken?: string) => {
    setFetchingBranches(true);
    setFetchError(null);
    try {
      const data: PrefetchResponse = await reposApi.prefetch(url, (authToken ?? token) || undefined);
      const opts: BranchOption[] = [
        ...data.branches.map(b => ({ name: b, type: "branch" as const })),
        ...data.tags.map(t => ({ name: t, type: "tag" as const })),
      ];
      setBranches(opts);
      // Zaznacz domyślny branch
      if (data.default_branch) {
        const def = opts.find(o => o.name === data.default_branch);
        if (def) setSelectedRef(def);
      } else if (opts.length > 0) {
        setSelectedRef(opts[0]);
      }
      setStep("branch");
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Failed to fetch branches");
    } finally {
      setFetchingBranches(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedRef || !repoName.trim()) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      await reposApi.clone({
        url,
        name: repoName,
        token: token || undefined,
        branch: selectedRef.name,
        depth: 1,
      });
      setVerified(true);
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 409
        ? "A repository with this name already exists."
        : e instanceof ApiError && e.status === 429
        ? "Too many concurrent clones. Try again in a moment."
        : e instanceof Error ? e.message : "Clone failed";
      setVerifyError(msg);
    } finally {
      setVerifying(false);
    }
  };

  const steps = needsAuth ? ["URL", "Auth", "Branch", "Verify"] : ["URL", "Branch", "Verify"];
  const stepKeys: AuthStep[] = needsAuth ? ["url", "auth", "branch", "verify"] : ["url", "branch", "verify"];
  const currentStepIndex = stepKeys.indexOf(step);

  return (
    <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <div className="mb-10">
          <img src="/logo.svg" alt="dockix" className="h-12 w-auto mb-8" />
          <h1 className="text-2xl font-bold text-white">Add repository</h1>
          <p className="text-slate-500 text-sm mt-1">Connect a Git repository to start generating documentation.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                i === currentStepIndex ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : i < currentStepIndex ? "text-slate-400" : "text-slate-600"
              }`}>
                {i < currentStepIndex
                  ? <CheckCircle size={12} className="text-green-500" />
                  : <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[9px]">{i + 1}</span>
                }
                {s}
              </div>
              {i < steps.length - 1 && <div className="flex-1 h-px bg-slate-800" />}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-[#161b22] border border-slate-800 rounded-2xl p-8">

          {/* URL */}
          {step === "url" && (
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-3">Repository URL</label>
                <div className="relative">
                  <input type="text" value={url} onChange={e => setUrl(e.target.value)}
                    placeholder="https://github.com/user/repo  or  git@github.com:user/repo.git"
                    className="w-full bg-[#0d1117] border border-slate-700 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-green-500 transition-colors pr-32 font-mono"
                    onKeyDown={e => e.key === "Enter" && handleUrlNext()} />
                  {repoType !== "unknown" && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <RepoTypeTag type={repoType} />
                    </div>
                  )}
                </div>
                {needsAuth && (
                  <p className="mt-2 text-xs text-amber-400 flex items-center gap-1.5">
                    <Lock size={11} /> SSH URL detected — authentication required
                  </p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Repository name (used as identifier)</label>
                <input type="text" value={repoName} onChange={e => setRepoName(e.target.value)}
                  placeholder="my-repo"
                  className="w-full bg-[#0d1117] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500 transition-colors font-mono" />
              </div>
              {fetchError && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                  <AlertCircle size={14} /> {fetchError}
                </div>
              )}
              <button onClick={handleUrlNext}
                disabled={!url.trim() || repoType === "unknown" || !repoName.trim() || fetchingBranches}
                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2">
                {fetchingBranches ? <><Loader size={14} className="animate-spin" /> Fetching branches...</> : <>Continue <ChevronRight size={16} /></>}
              </button>
            </div>
          )}

          {/* AUTH */}
          {step === "auth" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <Lock size={16} className="text-amber-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">Private repository</p>
                  <p className="text-xs text-slate-500 mt-0.5">Provide a personal access token to continue.</p>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-3">Personal Access Token</label>
                <div className="relative">
                  <input type={showToken ? "text" : "password"} value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-[#0d1117] border border-slate-700 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-green-500 transition-colors font-mono pr-12" />
                  <button onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {fetchError && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                  <AlertCircle size={14} /> {fetchError}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep("url")} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white transition text-sm">Back</button>
                <button onClick={() => fetchBranches(token)} disabled={!token.trim() || fetchingBranches}
                  className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">
                  {fetchingBranches ? <><Loader size={14} className="animate-spin" /> Fetching...</> : <>Authenticate <ChevronRight size={16} /></>}
                </button>
              </div>
            </div>
          )}

          {/* BRANCH */}
          {step === "branch" && (
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-3">
                  Select branch or tag ({branches.length} found)
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {branches.map(ref => {
                    const icon = ref.type === "branch" ? <GitBranch size={14} /> : <Tag size={14} />;
                    const isSelected = selectedRef?.name === ref.name;
                    return (
                      <div key={ref.name} onClick={() => setSelectedRef(ref)}
                        className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition border ${
                          isSelected ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-slate-800/40 border-slate-700/50 text-slate-300 hover:border-slate-600"
                        }`}>
                        <div className="flex items-center gap-3">
                          <span className={isSelected ? "text-green-400" : "text-slate-500"}>{icon}</span>
                          <div>
                            <p className="font-mono text-sm font-medium">{ref.name}</p>
                            <p className="text-[10px] text-slate-500 capitalize">{ref.type}</p>
                          </div>
                        </div>
                        {isSelected && <CheckCircle size={14} className="text-green-500" />}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(needsAuth ? "auth" : "url")} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white transition text-sm">Back</button>
                <button onClick={() => setStep("verify")} disabled={!selectedRef}
                  className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* VERIFY */}
          {step === "verify" && (
            <div className="space-y-6">
              <div className="bg-[#0d1117] rounded-xl p-4 space-y-3 border border-slate-800">
                <SummaryRow label="Repository" value={url} mono />
                <SummaryRow label="Name" value={repoName} mono />
                <SummaryRow label="Type" value={<RepoTypeTag type={repoType} />} />
                <SummaryRow label="Branch / Ref" value={selectedRef?.name ?? "—"} mono />
              </div>

              {verifyError && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                  <AlertCircle size={14} /> {verifyError}
                </div>
              )}

              {!verified ? (
                <button onClick={handleVerify} disabled={verifying}
                  className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2">
                  {verifying ? <><Loader size={14} className="animate-spin" /> Starting clone...</> : "Start Cloning"}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
                    <CheckCircle size={18} className="text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-white">Clone started</p>
                      <p className="text-xs text-slate-500">Repository is being cloned in the background.</p>
                    </div>
                  </div>
                  <button onClick={() => onComplete(repoName)}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2">
                    Track progress <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      {typeof value === "string"
        ? <span className={`text-sm text-white ${mono ? "font-mono" : "font-medium"} max-w-xs truncate`}>{value}</span>
        : value}
    </div>
  );
}
