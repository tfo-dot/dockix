import React, { useState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Loader,
  FileCode,
  FileText,
  Database,
  ChevronRight,
  Activity,
} from "lucide-react";

interface FileEntry {
  name: string;
  status: "parsing" | "done" | "error";
  error?: string;
  symbols?: string[];
}

interface DiscoveredStats {
  rs: number;
  js: number;
  ts: number;
  py: number;
  other: number;
}

type IndexingStage = "discovery" | "parsing" | "storing" | "done";

const MOCK_FILES: FileEntry[] = [
  { name: "src/main.rs", status: "done", symbols: ["fn main", "struct Config", "impl Config::new"] },
  { name: "src/parser.rs", status: "done", symbols: ["fn parse_tokens", "fn tokenize", "struct Token"] },
  { name: "src/utils.rs", status: "done", symbols: ["fn format_output", "fn log_error"] },
  { name: "src/kernel_api.rs", status: "done", symbols: ["trait KernelApi", "impl KernelApi for Module"] },
  { name: "src/broken.rs", status: "error", error: "Parse error at line 45. Skipped function `handle_event`." },
  { name: "src/handler.rs", status: "done", symbols: ["fn handle_request", "fn route"] },
  { name: "include/types.h", status: "done", symbols: ["typedef uint32_t", "struct Header"] },
  { name: "tests/integration.rs", status: "done", symbols: ["fn test_parse", "fn test_output"] },
];

const MOCK_STATS: DiscoveredStats = { rs: 12, js: 3, ts: 8, py: 0, other: 5 };

function useIndexingSimulation(onDone: () => void) {
  const [stage, setStage] = useState<IndexingStage>("discovery");
  const [discoveryCount, setDiscoveryCount] = useState(0);
  const [parsedFiles, setParsedFiles] = useState<FileEntry[]>([]);
  const [storeProgress, setStoreProgress] = useState(0);

  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Phase 1: Discovery
  useEffect(() => {
    let count = 0;
    const target = 28;
    const id = setInterval(() => {
      if (!mounted.current) { clearInterval(id); return; }
      count += Math.floor(Math.random() * 4) + 1;
      if (count >= target) {
        count = target;
        clearInterval(id);
        setTimeout(() => {
          if (mounted.current) setStage("parsing");
        }, 800);
      }
      setDiscoveryCount(count);
    }, 120);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phase 2: Parsing
  useEffect(() => {
    if (stage !== "parsing") return;
    let i = 0;
    const id = setInterval(() => {
      if (!mounted.current) { clearInterval(id); return; }
      if (i >= MOCK_FILES.length) {
        clearInterval(id);
        setTimeout(() => {
          if (mounted.current) setStage("storing");
        }, 600);
        return;
      }
      const file = MOCK_FILES[i];
      if (file != null) {
        setParsedFiles((prev) => [...prev, file]);
      }
      i++;
    }, 350);
    return () => clearInterval(id);
  }, [stage]);

  // Phase 3: Storing
  useEffect(() => {
    if (stage !== "storing") return;
    let p = 0;
    const id = setInterval(() => {
      if (!mounted.current) { clearInterval(id); return; }
      p += Math.random() * 12 + 5;
      if (p >= 100) {
        p = 100;
        clearInterval(id);
        setStoreProgress(100);
        setTimeout(() => {
          if (!mounted.current) return;
          setStage("done");
          setTimeout(() => {
            if (mounted.current) onDoneRef.current();
          }, 50);
        }, 800);
        return;
      }
      setStoreProgress(Math.floor(p));
    }, 200);
    return () => clearInterval(id);
  }, [stage]);

  return { stage, discoveryCount, parsedFiles, storeProgress };
}

export default function Indexing({
  isFirstRepo,
  onComplete,
}: {
  isFirstRepo: boolean;
  onComplete: () => void;
}) {
  const [canProceed, setCanProceed] = useState(false);

  const { stage, discoveryCount, parsedFiles, storeProgress } = useIndexingSimulation(() => {
    setCanProceed(true);
  });

  const errorFiles = parsedFiles.filter((f) => f != null && f.status === "error");
  const doneFiles = parsedFiles.filter((f) => f != null && f.status === "done");

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [parsedFiles]);

  return (
    <div className="min-h-screen bg-[#0f1115] flex flex-col items-center justify-start p-8 pt-16">
      <div className="w-full max-w-3xl">
        <div className="mb-8">
          <img src="/logo.svg" alt="dockix" className="h-12 w-auto mb-6" />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Indexing Repository</h1>
              <p className="text-slate-500 text-sm mt-1 font-mono">kernel-module-xyz · main</p>
            </div>
            <div>
              {stage !== "done" ? (
                <span className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20 animate-pulse">
                  <Activity size={12} /> Engine running
                </span>
              ) : (
                <span className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
                  <CheckCircle size={12} /> Complete
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {/* Discovery */}
          <StageCard label="Discovery" icon={<FileText size={16} />} active={stage === "discovery"} done={stage !== "discovery"}>
            {stage === "discovery" ? (
              <div className="flex items-center gap-3">
                <Loader size={14} className="animate-spin text-blue-400" />
                <span className="text-sm text-slate-300">
                  Scanning filesystem...{" "}
                  <span className="font-mono font-bold text-white">{discoveryCount}</span> files found
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(MOCK_STATS).map(([ext, count]) =>
                  count > 0 ? (
                    <span key={ext} className="text-[10px] font-mono font-bold text-slate-300 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                      {count} .{ext}
                    </span>
                  ) : null
                )}
                <span className="text-[10px] font-mono font-bold text-slate-300 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                  {discoveryCount} total
                </span>
              </div>
            )}
          </StageCard>

          {/* Parsing */}
          <StageCard
            label="Parsing (Tree-sitter)"
            icon={<FileCode size={16} />}
            active={stage === "parsing"}
            done={stage === "storing" || stage === "done"}
            locked={stage === "discovery"}
          >
            {stage === "discovery" && <p className="text-xs text-slate-600">Waiting for discovery...</p>}
            {(stage === "parsing" || stage === "storing" || stage === "done") && (
              <div>
                <div ref={listRef} className="font-mono text-[11px] space-y-1 max-h-48 overflow-y-auto">
                  {parsedFiles.map((file, idx) => {
                    if (!file) return null;
                    return (
                      <div key={`${file.name}-${idx}`} className="flex items-start gap-2">
                        {file.status === "error" ? (
                          <AlertTriangle size={10} className="text-amber-400 mt-0.5 shrink-0" />
                        ) : (
                          <CheckCircle size={10} className="text-green-500 mt-0.5 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <span className={file.status === "error" ? "text-amber-400" : "text-slate-300"}>
                            {file.name}
                          </span>
                          {file.status === "error" && (
                            <p className="text-amber-600 text-[10px] mt-0.5">{file.error}</p>
                          )}
                          {file.symbols && file.status === "done" && (
                            <p className="text-slate-600 text-[10px]">
                              {file.symbols.slice(0, 3).join(", ")}
                              {file.symbols.length > 3 && ` +${file.symbols.length - 3} more`}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {stage === "parsing" && (
                    <div className="flex items-center gap-2 text-blue-400">
                      <Loader size={10} className="animate-spin" />
                      <span>Parsing...</span>
                    </div>
                  )}
                </div>
                {errorFiles.length > 0 && (stage === "storing" || stage === "done") && (
                  <div className="mt-3 p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                    <p className="text-[11px] text-amber-400 font-medium">
                      {errorFiles.length} file{errorFiles.length > 1 ? "s" : ""} had parse errors and were partially skipped
                    </p>
                  </div>
                )}
              </div>
            )}
          </StageCard>

          {/* Storing */}
          <StageCard
            label="Storing to Database"
            icon={<Database size={16} />}
            active={stage === "storing"}
            done={stage === "done"}
            locked={stage === "discovery" || stage === "parsing"}
          >
            {(stage === "discovery" || stage === "parsing") && (
              <p className="text-xs text-slate-600">Waiting for parsing...</p>
            )}
            {(stage === "storing" || stage === "done") && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Indexing symbols into PostgreSQL</span>
                  <span className="font-mono text-white">{storeProgress}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 transition-all duration-200" style={{ width: `${storeProgress}%` }} />
                </div>
              </div>
            )}
          </StageCard>
        </div>

        {canProceed && (
          <div className="bg-[#161b22] border border-green-500/20 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white mb-4">Indexing Complete</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <SummaryMetric label="Files Indexed" value={`${doneFiles.length}`} />
              <SummaryMetric label="Parse Errors" value={`${errorFiles.length}`} warn={errorFiles.length > 0} />
              <SummaryMetric label="Symbols Found" value="342" />
            </div>
            <button
              onClick={onComplete}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2"
            >
              {isFirstRepo ? "Set Up Permissions" : "View Documentation"}
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StageCard({
  label, icon, active, done, locked, children,
}: {
  label: string; icon: React.ReactNode; active: boolean; done: boolean; locked?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={`border rounded-2xl p-5 transition-all ${
      active ? "bg-[#161b22] border-blue-500/30 shadow-[0_0_30px_-10px_rgba(59,130,246,0.15)]"
      : done ? "bg-[#161b22] border-slate-800"
      : "bg-slate-900/20 border-slate-800/50 opacity-50"
    }`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
          done ? "bg-green-500/10 text-green-500" : active ? "bg-blue-500/10 text-blue-400" : "bg-slate-800 text-slate-600"
        }`}>
          {done ? <CheckCircle size={14} /> : active ? <Loader size={14} className="animate-spin" /> : icon}
        </div>
        <span className="text-sm font-bold text-white">{label}</span>
        {done && <span className="ml-auto text-[10px] text-green-500 font-bold uppercase">Done</span>}
        {active && <span className="ml-auto text-[10px] text-blue-400 font-bold uppercase animate-pulse">Running</span>}
      </div>
      <div className="ml-10">{children}</div>
    </div>
  );
}

function SummaryMetric({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${warn ? "text-amber-400" : "text-white"}`}>{value}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}
