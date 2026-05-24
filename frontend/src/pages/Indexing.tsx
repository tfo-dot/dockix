import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircle, Loader, Database, ChevronRight, Activity,
  AlertTriangle, RefreshCw,
} from "lucide-react";
import { reposApi } from "../api/client";
import type { RepoInfo } from "../api/client";

type VisualStage = "waiting" | "cloning" | "ready" | "failed";

interface Props {
  repoName: string;
  onComplete: () => void;
}

export default function Indexing({ repoName, onComplete }: Props) {
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [stage, setStage] = useState<VisualStage>("waiting");
  const [pollCount, setPollCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!repoName) return;

    const poll = async () => {
      try {
        const repos = await reposApi.list();
        if (!mounted.current) return;

        const repo = repos.find(r => r.name === repoName);
        if (!repo) {
          // Repo jeszcze nie widoczne — czekaj
          setStage("waiting");
          return;
        }

        setRepoInfo(repo);
        setPollCount(c => c + 1);

        switch (repo.status) {
          case "cloning":
            setStage("cloning");
            break;
          case "ready":
          case "syncing":
            setStage("ready");
            clearInterval(intervalId);
            break;
          case "clone_failed":
            setStage("failed");
            setError(repo.error ?? "Clone failed for unknown reason.");
            clearInterval(intervalId);
            break;
          case "sync_failed":
            setStage("failed");
            setError(repo.error ?? "Sync failed.");
            clearInterval(intervalId);
            break;
        }
      } catch (e) {
        if (!mounted.current) return;
        setError(e instanceof Error ? e.message : "Failed to reach backend");
        setStage("failed");
        clearInterval(intervalId);
      }
    };

    // Pierwsze sprawdzenie od razu, potem co 2 sekundy
    poll();
    const intervalId = setInterval(poll, 2000);
    return () => clearInterval(intervalId);
  }, [repoName]);

  return (
    <div className="min-h-screen bg-[#0f1115] flex flex-col items-center justify-start p-8 pt-16">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <img src="/logo.svg" alt="dockix" className="h-12 w-auto mb-6" />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Cloning Repository</h1>
              <p className="text-slate-500 text-sm mt-1 font-mono">{repoName}</p>
            </div>
            <StatusChip stage={stage} />
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {/* Status card */}
          <div className={`border rounded-2xl p-6 transition-all ${
            stage === "failed" ? "bg-red-500/5 border-red-500/20"
            : stage === "ready" ? "bg-green-500/5 border-green-500/20"
            : "bg-[#161b22] border-blue-500/30"
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                stage === "failed" ? "bg-red-500/10 text-red-400"
                : stage === "ready" ? "bg-green-500/10 text-green-500"
                : "bg-blue-500/10 text-blue-400"
              }`}>
                {stage === "failed" ? <AlertTriangle size={16} /> : stage === "ready" ? <CheckCircle size={16} /> : <Loader size={16} className="animate-spin" />}
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {stage === "waiting" && "Waiting for clone to start..."}
                  {stage === "cloning" && "Cloning repository..."}
                  {stage === "ready" && "Clone complete!"}
                  {stage === "failed" && "Clone failed"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {stage === "waiting" && "The background worker is starting up."}
                  {stage === "cloning" && `Polled ${pollCount} times — checking every 2 seconds.`}
                  {stage === "ready" && "Repository is ready for analysis."}
                  {stage === "failed" && error}
                </p>
              </div>
            </div>

            {/* Animowany pasek dla cloning */}
            {(stage === "cloning" || stage === "waiting") && (
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full animate-pulse w-2/3" />
              </div>
            )}

            {/* Status z backendu */}
            {repoInfo && (
              <div className="mt-4 pt-4 border-t border-slate-800/60 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-600 uppercase font-bold tracking-widest mb-1">Status</p>
                  <p className="font-mono text-slate-300">{repoInfo.status}</p>
                </div>
                <div>
                  <p className="text-slate-600 uppercase font-bold tracking-widest mb-1">Name</p>
                  <p className="font-mono text-slate-300">{repoInfo.name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Backend status */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database size={13} className="text-slate-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Backend status</span>
            </div>
            <div className="font-mono text-[11px] text-slate-600 space-y-1">
              <p className="flex gap-2">
                <span className="text-blue-500">[poll {pollCount}]</span>
                {stage === "waiting" && "GET /repos → waiting for repo to appear..."}
                {stage === "cloning" && `GET /repos → ${repoName}: status=cloning`}
                {stage === "ready" && `GET /repos → ${repoName}: status=ready`}
                {stage === "failed" && `GET /repos → ${repoName}: status=failed`}
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        {stage === "ready" && (
          <div className="bg-[#161b22] border border-green-500/20 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white mb-4">Repository ready</h3>
            <button onClick={onComplete}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2">
              Set Up Permissions <ChevronRight size={16} />
            </button>
          </div>
        )}

        {stage === "failed" && (
          <div className="bg-[#161b22] border border-red-500/20 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white mb-2">Something went wrong</h3>
            <p className="text-xs text-slate-500 mb-4">{error}</p>
            <button onClick={() => window.location.hash = ""}
              className="w-full py-3 border border-slate-700 text-slate-400 hover:text-white rounded-xl transition text-sm flex items-center justify-center gap-2">
              <RefreshCw size={14} /> Back to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusChip({ stage }: { stage: VisualStage }) {
  if (stage === "ready") return (
    <span className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
      <CheckCircle size={12} /> Complete
    </span>
  );
  if (stage === "failed") return (
    <span className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20">
      <AlertTriangle size={12} /> Failed
    </span>
  );
  return (
    <span className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20 animate-pulse">
      <Activity size={12} /> Running
    </span>
  );
}
