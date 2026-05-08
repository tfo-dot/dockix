import React, { useState, useEffect } from "react";
import {
  Globe,
  GitBranch,
  Lock,
  Link,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Terminal,
  Tag,
  GitCommit,
  Loader,
  Eye,
  EyeOff,
} from "lucide-react";

type RepoType = "github" | "gitlab" | "ssh" | "https" | "unknown";
type AuthStep = "url" | "auth" | "branch" | "verify";

interface BranchOption {
  name: string;
  type: "branch" | "tag" | "commit";
  date?: string;
}

const MOCK_BRANCHES: BranchOption[] = [
  { name: "main", type: "branch", date: "2 hours ago" },
  { name: "develop", type: "branch", date: "1 day ago" },
  { name: "feature/docs-update", type: "branch", date: "3 days ago" },
  { name: "v2.1.0", type: "tag", date: "1 week ago" },
  { name: "v2.0.5", type: "tag", date: "1 month ago" },
  { name: "a3f9c12", type: "commit", date: "5 days ago" },
];

function detectRepoType(url: string): RepoType {
  if (!url) return "unknown";
  if (url.startsWith("git@github.com") || url.includes("github.com")) return "github";
  if (url.startsWith("git@gitlab.com") || url.includes("gitlab.com")) return "gitlab";
  if (url.startsWith("git@") || url.startsWith("ssh://")) return "ssh";
  if (url.startsWith("https://") || url.startsWith("http://")) return "https";
  return "unknown";
}

function isPrivateRepoLikely(url: string): boolean {
  return url.includes("ssh://") || url.startsWith("git@");
}

const RepoTypeTag = ({ type }: { type: RepoType }) => {
  const config: Record<RepoType, { label: string; color: string; icon: React.ReactNode }> = {
    github: { label: "GitHub", color: "text-white bg-slate-700 border-slate-600", icon: <Globe size={12} /> },
    gitlab: { label: "GitLab", color: "text-orange-400 bg-orange-500/10 border-orange-500/20", icon: <Terminal size={12} /> },
    ssh: { label: "SSH", color: "text-purple-400 bg-purple-500/10 border-purple-500/20", icon: <Lock size={12} /> },
    https: { label: "HTTPS", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: <Link size={12} /> },
    unknown: { label: "Unknown", color: "text-slate-500 bg-slate-800 border-slate-700", icon: <AlertCircle size={12} /> },
  };
  const c = config[type];
  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${c.color}`}>
      {c.icon} {c.label}
    </span>
  );
};

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<AuthStep>("url");
  const [url, setUrl] = useState("");
  const [repoType, setRepoType] = useState<RepoType>("unknown");
  const [needsAuth, setNeedsAuth] = useState(false);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [selectedRef, setSelectedRef] = useState<BranchOption | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<null | boolean>(null);

  useEffect(() => {
    const t = detectRepoType(url);
    setRepoType(t);
    setNeedsAuth(isPrivateRepoLikely(url));
  }, [url]);

  const handleUrlSubmit = () => {
    if (!url.trim()) return;
    if (needsAuth) setStep("auth");
    else setStep("branch");
  };

  const handleVerify = () => {
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      setVerified(true);
    }, 1800);
  };

  const steps = ["url", "auth", "branch", "verify"];
  const currentStepIndex = needsAuth ? steps.indexOf(step) : ["url", "branch", "verify"].indexOf(step);

  return (
    <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="mb-10">
          <img src="/logo.svg" alt="dockix" className="h-12 w-auto mb-8" />
          <h1 className="text-2xl font-bold text-white">Add your first repository</h1>
          <p className="text-slate-500 text-sm mt-1">
            Connect a Git repository to start generating documentation automatically.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {(needsAuth ? ["URL", "Auth", "Branch", "Verify"] : ["URL", "Branch", "Verify"]).map((s, i) => {
            const active = i === currentStepIndex;
            const done = i < currentStepIndex;
            return (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  active ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                  done ? "text-slate-400" : "text-slate-600"
                }`}>
                  {done ? <CheckCircle size={12} className="text-green-500" /> : <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[9px]">{i + 1}</span>}
                  {s}
                </div>
                {i < (needsAuth ? 3 : 2) && <div className="flex-1 h-px bg-slate-800" />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="bg-[#161b22] border border-slate-800 rounded-2xl p-8">

          {/* STEP: URL */}
          {step === "url" && (
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-3">
                  Repository URL
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://github.com/user/repo  or  git@github.com:user/repo.git"
                    className="w-full bg-[#0d1117] border border-slate-700 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-green-500 transition-colors pr-32 font-mono"
                    onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                  />
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

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "GitHub HTTPS", example: "https://github.com/user/repo" },
                  { label: "GitLab SSH", example: "git@gitlab.com:user/repo.git" },
                  { label: "Self-hosted", example: "https://git.example.com/repo" },
                ].map((ex) => (
                  <button
                    key={ex.label}
                    onClick={() => setUrl(ex.example)}
                    className="text-left p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition text-xs"
                  >
                    <p className="text-slate-400 font-medium">{ex.label}</p>
                    <p className="text-slate-600 font-mono mt-0.5 text-[9px] truncate">{ex.example}</p>
                  </button>
                ))}
              </div>

              <button
                onClick={handleUrlSubmit}
                disabled={!url.trim() || repoType === "unknown"}
                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2"
              >
                Continue <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* STEP: AUTH */}
          {step === "auth" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <Lock size={16} className="text-amber-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">Private repository detected</p>
                  <p className="text-xs text-slate-500 mt-0.5">Provide a personal access token or deploy key to continue.</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-3">
                  Personal Access Token
                </label>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-[#0d1117] border border-slate-700 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-green-500 transition-colors font-mono pr-12"
                  />
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-600 mt-2">
                  Required scopes: <code className="text-slate-400">repo</code> (for GitHub) or <code className="text-slate-400">read_repository</code> (GitLab)
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("url")}
                  className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition text-sm font-medium"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep("branch")}
                  disabled={!token.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
                >
                  Authenticate <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP: BRANCH */}
          {step === "branch" && (
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-3">
                  Select branch / tag / commit
                </label>
                <div className="space-y-2">
                  {MOCK_BRANCHES.map((ref) => {
                    const icon = ref.type === "branch"
                      ? <GitBranch size={14} />
                      : ref.type === "tag"
                      ? <Tag size={14} />
                      : <GitCommit size={14} />;
                    const isSelected = selectedRef?.name === ref.name;
                    return (
                      <div
                        key={ref.name}
                        onClick={() => setSelectedRef(ref)}
                        className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all border ${
                          isSelected
                            ? "bg-green-500/10 border-green-500/30 text-green-400"
                            : "bg-slate-800/40 border-slate-700/50 text-slate-300 hover:border-slate-600"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={isSelected ? "text-green-400" : "text-slate-500"}>{icon}</span>
                          <div>
                            <p className="font-mono text-sm font-medium">{ref.name}</p>
                            <p className="text-[10px] text-slate-500 capitalize">{ref.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-500">{ref.date}</span>
                          {isSelected && <CheckCircle size={14} className="text-green-500" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(needsAuth ? "auth" : "url")}
                  className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition text-sm font-medium"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep("verify")}
                  disabled={!selectedRef}
                  className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
                >
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP: VERIFY */}
          {step === "verify" && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white">Connection Summary</h3>
                <div className="bg-[#0d1117] rounded-xl p-4 space-y-3 border border-slate-800">
                  <SummaryRow label="Repository" value={url} mono />
                  <SummaryRow label="Type" value={<RepoTypeTag type={repoType} />} />
                  <SummaryRow label="Branch / Ref" value={selectedRef?.name ?? "—"} mono />
                  {needsAuth && <SummaryRow label="Auth" value="Personal access token ••••" />}
                </div>
              </div>

              {verified === null && !verifying && (
                <button
                  onClick={handleVerify}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2"
                >
                  Verify Connection
                </button>
              )}

              {verifying && (
                <div className="w-full py-3.5 rounded-xl border border-slate-700 flex items-center justify-center gap-3 text-slate-400 text-sm">
                  <Loader size={16} className="animate-spin" /> Verifying connection...
                </div>
              )}

              {verified === true && (
                <div className="space-y-3">
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
                    <CheckCircle size={18} className="text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-white">Connection successful</p>
                      <p className="text-xs text-slate-500">Repository is accessible and ready to index.</p>
                    </div>
                  </div>
                  <button
                    onClick={onComplete}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    Start Indexing <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {verified === false && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                  <AlertCircle size={18} className="text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-white">Connection failed</p>
                    <p className="text-xs text-slate-500">Check your URL and token, then try again.</p>
                  </div>
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
      {typeof value === "string" ? (
        <span className={`text-sm text-white ${mono ? "font-mono" : "font-medium"} max-w-xs truncate`}>{value}</span>
      ) : value}
    </div>
  );
}
