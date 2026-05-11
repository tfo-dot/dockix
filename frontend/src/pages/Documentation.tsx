import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import {
  ChevronRight, ChevronDown, FileCode, Folder, FolderOpen,
  ExternalLink, Tag, Box, Code2, Braces, Hash, AlertCircle,
  ChevronsDownUp, ChevronsUpDown, Link,
} from "lucide-react";
import type { Page, User as UserType } from "../App";

type SymbolKind = "function" | "struct" | "class" | "variable" | "trait";

interface Symbol {
  name: string; kind: SymbolKind; line: number;
  signature?: string; returnType?: string;
  params?: { name: string; type: string }[];
  comment?: string; valueType?: string; value?: string;
  parents?: string[]; constructors?: string[];
}

interface FileNode {
  name: string; type: "file" | "folder";
  path: string;
  children?: FileNode[]; symbols?: Symbol[]; empty?: boolean;
}

const FILE_TREE: FileNode[] = [
  {
    name: "src", type: "folder", path: "src", children: [
      {
        name: "main.rs", type: "file", path: "src/main.rs", symbols: [
          { name: "main", kind: "function", line: 5, signature: "fn main()", returnType: "()", params: [], comment: "Entry point of the application. Initializes the runtime and spawns worker threads." },
          { name: "Config", kind: "struct", line: 19, comment: "Global configuration loaded from environment variables.", parents: [], constructors: ["fn new() -> Self", "fn from_env() -> Result<Self, ConfigError>"] },
        ],
      },
      {
        name: "parser.rs", type: "file", path: "src/parser.rs", symbols: [
          { name: "parse_tokens", kind: "function", line: 12, signature: "fn parse_tokens(input: &str, opts: ParseOptions) -> ParseResult", returnType: "ParseResult", params: [{ name: "input", type: "&str" }, { name: "opts", type: "ParseOptions" }], comment: "Parses raw source input into a token stream using tree-sitter." },
          { name: "MAX_DEPTH", kind: "variable", line: 3, valueType: "u32", value: "64", comment: "Maximum recursion depth for the parser." },
        ],
      },
      { name: "broken.rs", type: "file", path: "src/broken.rs", symbols: [], empty: true },
    ],
  },
  {
    name: "include", type: "folder", path: "include", children: [
      {
        name: "kernel_api.h", type: "file", path: "include/kernel_api.h", symbols: [
          { name: "KernelApi", kind: "trait", line: 8, comment: "Core trait defining the interface for kernel modules.", parents: ["Send", "Sync"] },
        ],
      },
    ],
  },
];

const REPO_URL = "https://github.com/tfo-dot/dockix/blob/main/backend";
const BRANCH = "main";

const kindIcon = (kind: SymbolKind) => {
  const map: Record<SymbolKind, React.ReactNode> = {
    function: <Code2 size={12} />, struct: <Box size={12} />,
    class: <Hash size={12} />, variable: <Braces size={12} />, trait: <Tag size={12} />,
  };
  return map[kind];
};

const kindColor = (kind: SymbolKind) => ({
  function: "text-blue-400 bg-blue-500/10",
  struct: "text-purple-400 bg-purple-500/10",
  class: "text-orange-400 bg-orange-500/10",
  variable: "text-green-400 bg-green-500/10",
  trait: "text-pink-400 bg-pink-500/10",
}[kind]);

function getAllFolderPaths(nodes: FileNode[]): string[] {
  const paths: string[] = [];
  const traverse = (nodes: FileNode[]) => nodes.forEach(n => {
    if (n.type === "folder") { paths.push(n.path); if (n.children) traverse(n.children); }
  });
  traverse(nodes);
  return paths;
}

function findFileByPath(nodes: FileNode[], path: string): FileNode | null {
  for (const n of nodes) {
    if (n.path === path) return n;
    if (n.children) { const f = findFileByPath(n.children, path); if (f) return f; }
  }
  return null;
}

export default function Documentation({
  navigate, user, onLogout, docPath, setDocPath,
}: {
  navigate: (p: Page, path?: string) => void;
  user?: UserType | null;
  onLogout?: () => void;
  docPath?: string;
  setDocPath?: (p: string) => void;
}) {
  const allFolders = getAllFolderPaths(FILE_TREE);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(allFolders));
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(FILE_TREE[0].children![0]);
  const [selectedSymbol, setSelectedSymbol] = useState<Symbol | null>(FILE_TREE[0].children![0].symbols![0]);
  const [treeWidth, setTreeWidth] = useState(220);
  const [allFolded, setAllFolded] = useState(false);
  const [copied, setCopied] = useState(false);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  // Restore from docPath (hash routing)
  useEffect(() => {
    if (!docPath) return;
    const [filePath, symbolName] = docPath.split("::");
    const file = findFileByPath(FILE_TREE, filePath);
    if (file) {
      setSelectedFile(file);
      if (symbolName && file.symbols) {
        const sym = file.symbols.find(s => s.name === symbolName);
        if (sym) setSelectedSymbol(sym);
      }
    }
  }, []);

  const selectSymbol = (file: FileNode, sym: Symbol) => {
    setSelectedFile(file);
    setSelectedSymbol(sym);
    const path = `${file.path}::${sym.name}`;
    navigate("documentation", path);
    setDocPath?.(path);
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const s = new Set(prev);
      s.has(path) ? s.delete(path) : s.add(path);
      return s;
    });
  };

  const toggleFoldAll = () => {
    if (allFolded) { setExpandedFolders(new Set(allFolders)); setAllFolded(false); }
    else { setExpandedFolders(new Set()); setAllFolded(true); }
  };

  // Resizable panel drag
  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = treeWidth;
  };
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      setTreeWidth(Math.max(160, Math.min(400, startW.current + delta)));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderTree = (nodes: FileNode[], depth = 0): React.ReactNode =>
    nodes.map(node => {
      if (node.type === "folder") {
        const open = expandedFolders.has(node.path);
        return (
          <div key={node.path}>
            <div
              onClick={() => toggleFolder(node.path)}
              className="flex items-center gap-1.5 py-1.5 rounded-lg cursor-pointer hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 transition"
              style={{ paddingLeft: `${8 + depth * 14}px` }}
            >
              {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              {open ? <FolderOpen size={13} className="text-amber-400" /> : <Folder size={13} className="text-amber-400" />}
              <span className="text-xs font-medium truncate">{node.name}</span>
            </div>
            {open && node.children && renderTree(node.children, depth + 1)}
          </div>
        );
      }
      const isSelected = selectedFile?.path === node.path;
      return (
        <div key={node.path}>
          <div
            onClick={() => { setSelectedFile(node); setSelectedSymbol(node.symbols?.[0] ?? null); }}
            className={`flex items-center gap-1.5 py-1.5 rounded-lg cursor-pointer transition text-xs ${
              isSelected ? "bg-green-500/10 text-green-400" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            }`}
            style={{ paddingLeft: `${8 + depth * 14}px` }}
          >
            <FileCode size={12} />
            <span className="font-mono truncate">{node.name}</span>
            {node.empty && <AlertCircle size={9} className="ml-auto mr-1 text-amber-500 shrink-0" />}
          </div>
          {/* Symbol list — indented under file */}
          {isSelected && node.symbols && node.symbols.length > 0 && (
            <div>
              {node.symbols.map(sym => (
                <div
                  key={sym.name}
                  onClick={() => selectSymbol(node, sym)}
                  className={`flex items-center gap-1.5 py-1 rounded cursor-pointer transition text-[10px] font-mono ${
                    selectedSymbol?.name === sym.name ? "bg-green-500/10 text-green-400" : "text-slate-500 hover:text-slate-300"
                  }`}
                  style={{ paddingLeft: `${8 + (depth + 1) * 14}px` }}
                >
                  <span className={`${kindColor(sym.kind)} p-0.5 rounded`}>{kindIcon(sym.kind)}</span>
                  {sym.name}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    });

  return (
    <div className="flex min-h-screen bg-[#0f1115]">
      <Sidebar activePage="documentation" navigate={navigate} user={user} onLogout={onLogout} />

      {/* Left: File tree — resizable */}
      <div
        className="border-r border-slate-800 flex flex-col h-screen sticky top-0 bg-[#0c0f13] overflow-hidden"
        style={{ width: `${treeWidth}px`, minWidth: "160px", maxWidth: "400px" }}
      >
        <div className="p-2.5 border-b border-slate-800 flex items-center justify-between gap-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Files</p>
          <button
            onClick={toggleFoldAll}
            title={allFolded ? "Expand all" : "Collapse all"}
            className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition"
          >
            {allFolded ? <ChevronsUpDown size={13} /> : <ChevronsDownUp size={13} />}
          </button>
        </div>
        <div className="p-2 text-xs overflow-y-auto flex-1">{renderTree(FILE_TREE)}</div>
        {/* Drag handle */}
        <div
          onMouseDown={onMouseDown}
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-green-500/30 transition"
        />
      </div>

      {/* Center: Documentation */}
      <main className="flex-1 flex flex-col overflow-y-auto min-w-0">
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-[#0f1115]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2 text-sm text-slate-400 min-w-0 overflow-hidden">
            <span className="font-mono text-slate-600 truncate">{selectedFile?.path ?? "—"}</span>
            {selectedSymbol && (
              <>
                <ChevronRight size={12} className="shrink-0" />
                <span className={`font-mono font-bold ${kindColor(selectedSymbol.kind)} px-1.5 py-0.5 rounded text-xs shrink-0`}>
                  {selectedSymbol.name}
                </span>
              </>
            )}
          </div>
          <button
            onClick={copyLink}
            title="Copy shareable link"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white bg-slate-800/60 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition shrink-0 ml-4"
          >
            <Link size={12} />
            {copied ? "Copied!" : "Share"}
          </button>
        </header>

        <div className="p-8 max-w-3xl">
          {selectedFile?.empty ? (
            <EmptyDocView fileName={selectedFile.name} />
          ) : selectedSymbol ? (
            <SymbolDoc symbol={selectedSymbol} filePath={selectedFile?.path ?? ""} />
          ) : (
            <p className="text-slate-500 text-sm">Select a symbol from the file tree.</p>
          )}
        </div>
      </main>

      {/* Right: Metadata */}
      <div className="w-56 border-l border-slate-800 bg-[#0c0f13] h-screen sticky top-0 overflow-y-auto shrink-0">
        <div className="p-3.5 border-b border-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Metadata</p>
        </div>
        {selectedSymbol ? (
          <MetadataPanel symbol={selectedSymbol} filePath={selectedFile?.path ?? ""} />
        ) : (
          <p className="p-4 text-xs text-slate-600">No symbol selected.</p>
        )}
      </div>
    </div>
  );
}

function SymbolDoc({ symbol, filePath }: { symbol: Symbol; filePath: string }) {
  const githubUrl = `${REPO_URL}/${filePath}#L${symbol.line}`;
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${kindColor(symbol.kind)}`}>
            {kindIcon(symbol.kind)} {symbol.kind.charAt(0).toUpperCase() + symbol.kind.slice(1)}
          </span>
          <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-400 transition">
            <ExternalLink size={11} /> Line {symbol.line}
          </a>
        </div>
        <h1 className="text-2xl font-bold text-white font-mono">{symbol.name}</h1>
        {symbol.comment && (
          <p className="text-slate-400 text-sm leading-relaxed border-l-2 border-slate-700 pl-4">{symbol.comment}</p>
        )}
      </div>

      {symbol.signature && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Signature</h2>
          <pre className="bg-[#161b22] border border-slate-800 rounded-xl p-4 text-sm font-mono text-green-300 overflow-x-auto">{symbol.signature}</pre>
        </div>
      )}

      {symbol.params && symbol.params.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Parameters</h2>
          <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden">
            {symbol.params.map((p, i) => (
              <div key={p.name} className={`flex items-center gap-4 px-4 py-3 ${i < symbol.params!.length - 1 ? "border-b border-slate-800" : ""}`}>
                <code className="text-blue-400 font-mono text-sm w-28 shrink-0">{p.name}</code>
                <code className="text-purple-400 font-mono text-sm">{p.type}</code>
              </div>
            ))}
          </div>
        </div>
      )}

      {symbol.returnType && symbol.returnType !== "()" && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Returns</h2>
          <code className="text-sm font-mono text-orange-300 bg-[#161b22] border border-slate-800 px-3 py-1.5 rounded-lg">{symbol.returnType}</code>
        </div>
      )}

      {symbol.valueType && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Type & Value</h2>
          <div className="bg-[#161b22] border border-slate-800 rounded-xl p-4 flex gap-6">
            <div><p className="text-[10px] text-slate-500 mb-1">Type</p><code className="text-sm font-mono text-purple-400">{symbol.valueType}</code></div>
            {symbol.value && <div><p className="text-[10px] text-slate-500 mb-1">Value</p><code className="text-sm font-mono text-green-400">{symbol.value}</code></div>}
          </div>
        </div>
      )}

      {symbol.parents && symbol.parents.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Implements / Inherits</h2>
          <div className="flex flex-wrap gap-2">
            {symbol.parents.map(p => (
              <code key={p} className="text-xs font-mono text-pink-400 bg-pink-500/10 px-2.5 py-1 rounded-full border border-pink-500/20">{p}</code>
            ))}
          </div>
        </div>
      )}

      {symbol.constructors && symbol.constructors.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Constructors / Factory Methods</h2>
          <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden">
            {symbol.constructors.map((c, i) => (
              <div key={c} className={`px-4 py-3 font-mono text-sm text-slate-300 ${i < symbol.constructors!.length - 1 ? "border-b border-slate-800" : ""}`}>{c}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyDocView({ fileName }: { fileName: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 text-center">
      <AlertCircle size={32} className="text-amber-500/40 mb-4" />
      <h2 className="text-lg font-bold text-white mb-2">No readable symbols</h2>
      <p className="text-slate-500 text-sm max-w-sm">
        <code className="text-amber-400 font-mono">{fileName}</code> had parse errors during indexing
        and no symbols could be extracted. Re-index after fixing the syntax errors.
      </p>
    </div>
  );
}

function MetadataPanel({ symbol, filePath }: { symbol: Symbol; filePath: string }) {
  const githubUrl = `${REPO_URL}/${filePath}#L${symbol.line}`;
  return (
    <div className="p-4 space-y-5">
      <MetaRow label="Kind" value={symbol.kind} />
      <MetaRow label="Defined at" value={`Line ${symbol.line}`} />
      <MetaRow label="Branch" value={BRANCH} />
      {symbol.returnType && <MetaRow label="Return type" value={symbol.returnType} mono />}
      {symbol.params && <MetaRow label="Parameters" value={`${symbol.params.length}`} />}
      <div>
        <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest mb-2">Source</p>
        <a href={githubUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition font-mono break-all">
          <ExternalLink size={10} className="shrink-0" />
          {filePath}#L{symbol.line}
        </a>
      </div>
    </div>
  );
}

function MetaRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest mb-1">{label}</p>
      <p className={`text-sm text-slate-300 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
