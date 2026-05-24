import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import {
  ChevronRight, ChevronDown, FileCode, Folder, FolderOpen,
  ExternalLink, Tag, Box, Code2, Braces, Hash, AlertCircle,
  ChevronsDownUp, ChevronsUpDown, Link, Loader,
} from "lucide-react";
import { reposApi } from "../api/client";
import type { ParsedFile, ClassDoc, FunctionDoc } from "../api/client";
import type { Page, User } from "../App";

// ── Typy lokalne dla drzewa ───────────────────────────────────────────────────

type SymbolKind = "function" | "class" | "method" | "variable";

interface DocSymbol {
  name: string;
  kind: SymbolKind;
  line?: number;
  signature?: string;
  returnType?: string;
  params?: { name: string; type: string | null; default?: string | null }[];
  comment?: string;
  // dla klas:
  methods?: FunctionDoc[];
}

interface FileNode {
  name: string;
  type: "file" | "folder";
  path: string;
  language?: string;
  children?: FileNode[];
  symbols?: DocSymbol[];
  empty?: boolean;
}

// ── Pomocnicze: ParsedRepo → FileNode[] ──────────────────────────────────────

function buildFileTree(files: ParsedFile[]): FileNode[] {
  const root: FileNode[] = [];

  for (const file of files) {
    const parts = file.file_path.split("/");
    let current = root;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const dirPath = parts.slice(0, i + 1).join("/");
      let dir = current.find(n => n.type === "folder" && n.name === part);
      if (!dir) {
        dir = { name: part, type: "folder", path: dirPath, children: [] };
        current.push(dir);
      }
      current = dir.children!;
    }

    const symbols: DocSymbol[] = [];

    // Funkcje na poziomie pliku
    for (const fn of file.functions) {
      symbols.push({
        name: fn.name,
        kind: "function",
        returnType: fn.return_type ?? undefined,
        params: fn.parameters.map(p => ({ name: p.name, type: p.type_annotation, default: p.default_value })),
        comment: fn.docstring ?? undefined,
        signature: buildSignature(fn.name, fn.parameters, fn.return_type),
      });
    }

    // Klasy
    for (const cls of file.classes) {
      symbols.push({
        name: cls.name,
        kind: "class",
        comment: cls.docstring ?? undefined,
        methods: cls.methods,
      });
    }

    const fileName = parts[parts.length - 1];
    current.push({
      name: fileName,
      type: "file",
      path: file.file_path,
      language: file.language,
      symbols,
      empty: symbols.length === 0,
    });
  }

  return root;
}

function buildSignature(name: string, params: { name: string; type_annotation: string | null; default_value: string | null }[], ret: string | null): string {
  const paramStr = params
    .map(p => {
      let s = p.name;
      if (p.type_annotation) s += `: ${p.type_annotation}`;
      if (p.default_value) s += ` = ${p.default_value}`;
      return s;
    })
    .join(", ");
  return `${name}(${paramStr})${ret ? ` → ${ret}` : ""}`;
}

function getAllFolderPaths(nodes: FileNode[]): string[] {
  const paths: string[] = [];
  const traverse = (ns: FileNode[]) => ns.forEach(n => {
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

// ── Icons / colors ────────────────────────────────────────────────────────────

const kindIcon = (kind: SymbolKind) => {
  const map: Record<SymbolKind, React.ReactNode> = {
    function: <Code2 size={12} />, class: <Hash size={12} />,
    method: <Braces size={12} />, variable: <Box size={12} />,
  };
  return map[kind];
};

const kindColor = (kind: SymbolKind) => ({
  function: "text-blue-400 bg-blue-500/10",
  class: "text-orange-400 bg-orange-500/10",
  method: "text-purple-400 bg-purple-500/10",
  variable: "text-green-400 bg-green-500/10",
}[kind]);

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  navigate: (p: Page, path?: string) => void;
  user?: User | null;
  onLogout?: () => void;
  currentRepo?: string;
  docPath?: string;
  setDocPath?: (p: string) => void;
}

export default function Documentation({ navigate, user, onLogout, currentRepo, docPath, setDocPath }: Props) {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<DocSymbol | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [treeWidth, setTreeWidth] = useState(230);
  const [allFolded, setAllFolded] = useState(false);
  const [copied, setCopied] = useState(false);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  // Fetch analysis from backend
  useEffect(() => {
    if (!currentRepo) { setLoading(false); return; }
    setLoading(true);
    reposApi.analyze(currentRepo)
      .then(data => {
        const tree = buildFileTree(data.files);
        setFileTree(tree);
        const allFolders = getAllFolderPaths(tree);
        setExpandedFolders(new Set(allFolders));

        // Restore from URL hash or select first file/symbol
        if (docPath) {
          const [filePath, symbolName] = docPath.split("::");
          const file = findFileByPath(tree, filePath);
          if (file) {
            setSelectedFile(file);
            const sym = symbolName ? file.symbols?.find(s => s.name === symbolName) : file.symbols?.[0];
            setSelectedSymbol(sym ?? null);
            return;
          }
        }
        // Default: first file
        const firstFile = findFirstFile(tree);
        if (firstFile) {
          setSelectedFile(firstFile);
          const firstSym = firstFile.symbols?.[0] ?? null;
          setSelectedSymbol(firstSym);
          if (firstSym) {
            const path = `${firstFile.path}::${firstSym.name}`;
            window.location.hash = `/docs/${path}`;
            setDocPath?.(path);
          }
        }
      })
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load analysis"))
      .finally(() => setLoading(false));
  }, [currentRepo]);

  // Drag resize
  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true; startX.current = e.clientX; startW.current = treeWidth;
  };
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setTreeWidth(Math.max(160, Math.min(400, startW.current + e.clientX - startX.current)));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  const selectSymbol = (file: FileNode, sym: DocSymbol) => {
    setSelectedFile(file); setSelectedSymbol(sym);
    const path = `${file.path}::${sym.name}`;
    window.location.hash = `/docs/${path}`;
    setDocPath?.(path);
  };

  const toggleFolder = (path: string) =>
    setExpandedFolders(prev => { const s = new Set(prev); s.has(path) ? s.delete(path) : s.add(path); return s; });

  const toggleFoldAll = () => {
    if (allFolded) { setExpandedFolders(new Set(getAllFolderPaths(fileTree))); setAllFolded(false); }
    else { setExpandedFolders(new Set()); setAllFolded(true); }
  };

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
            <div onClick={() => toggleFolder(node.path)}
              className="flex items-center gap-1.5 py-1.5 rounded-lg cursor-pointer hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 transition"
              style={{ paddingLeft: `${8 + depth * 14}px` }}>
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
          <div onClick={() => {
            const firstSym = node.symbols?.[0] ?? null;
            setSelectedFile(node); setSelectedSymbol(firstSym);
            if (firstSym) { const p = `${node.path}::${firstSym.name}`; window.location.hash = `/docs/${p}`; setDocPath?.(p); }
            else { window.location.hash = `/docs/${node.path}`; setDocPath?.(node.path); }
          }}
            className={`flex items-center gap-1.5 py-1.5 rounded-lg cursor-pointer transition text-xs ${isSelected ? "bg-green-500/10 text-green-400" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"}`}
            style={{ paddingLeft: `${8 + depth * 14}px` }}>
            <FileCode size={12} />
            <span className="font-mono truncate">{node.name}</span>
            {node.empty && <AlertCircle size={9} className="ml-auto mr-1 text-amber-500 shrink-0" />}
          </div>
          {isSelected && node.symbols && node.symbols.length > 0 && node.symbols.map(sym => (
            <div key={sym.name} onClick={() => selectSymbol(node, sym)}
              className={`flex items-center gap-1.5 py-1 rounded cursor-pointer transition text-[10px] font-mono ${selectedSymbol?.name === sym.name ? "bg-green-500/10 text-green-400" : "text-slate-500 hover:text-slate-300"}`}
              style={{ paddingLeft: `${8 + (depth + 1) * 14}px` }}>
              <span className={`${kindColor(sym.kind)} p-0.5 rounded`}>{kindIcon(sym.kind)}</span>
              {sym.name}
            </div>
          ))}
        </div>
      );
    });

  return (
    <div className="flex min-h-screen bg-[#0f1115]">
      <Sidebar activePage="documentation" navigate={navigate} user={user} onLogout={onLogout} />

      {/* Left: file tree */}
      <div className="border-r border-slate-800 flex flex-col h-screen sticky top-0 bg-[#0c0f13] overflow-hidden relative"
        style={{ width: `${treeWidth}px` }}>
        <div className="p-2.5 border-b border-slate-800 flex items-center justify-between gap-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 truncate">
            {currentRepo ?? "No repo"}
          </p>
          <button onClick={toggleFoldAll} title={allFolded ? "Expand all" : "Collapse all"}
            className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition shrink-0">
            {allFolded ? <ChevronsUpDown size={13} /> : <ChevronsDownUp size={13} />}
          </button>
        </div>
        <div className="p-2 text-xs overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-600 gap-2">
              <Loader size={13} className="animate-spin" /> Loading...
            </div>
          ) : error ? (
            <p className="text-red-400 text-xs p-2">{error}</p>
          ) : fileTree.length === 0 ? (
            <p className="text-slate-600 text-xs p-2">No files found.</p>
          ) : renderTree(fileTree)}
        </div>
        <div onMouseDown={onMouseDown}
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-green-500/30 transition" />
      </div>

      {/* Center: docs */}
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
          <button onClick={copyLink} title="Copy shareable link"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white bg-slate-800/60 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition shrink-0 ml-4">
            <Link size={12} /> {copied ? "Copied!" : "Share"}
          </button>
        </header>

        <div className="p-8 max-w-3xl">
          {!currentRepo ? (
            <div className="flex flex-col items-center justify-center min-h-64 text-center">
              <AlertCircle size={32} className="text-slate-700 mb-4" />
              <p className="text-slate-500">No repository selected. Go to Dashboard first.</p>
            </div>
          ) : loading ? (
            <div className="flex items-center gap-2 text-slate-500 py-16">
              <Loader size={16} className="animate-spin" /> Loading analysis...
            </div>
          ) : error ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
          ) : selectedFile?.empty ? (
            <EmptyDocView fileName={selectedFile.name} language={selectedFile.language} />
          ) : selectedSymbol ? (
            <SymbolDoc symbol={selectedSymbol} repoName={currentRepo ?? ""} filePath={selectedFile?.path ?? ""} />
          ) : (
            <p className="text-slate-500 text-sm">Select a symbol from the file tree.</p>
          )}
        </div>
      </main>

      {/* Right: metadata */}
      <div className="w-56 border-l border-slate-800 bg-[#0c0f13] h-screen sticky top-0 overflow-y-auto shrink-0">
        <div className="p-3.5 border-b border-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Metadata</p>
        </div>
        {selectedSymbol && selectedFile ? (
          <MetadataPanel symbol={selectedSymbol} filePath={selectedFile.path} repoName={currentRepo ?? ""} />
        ) : selectedFile ? (
          <div className="p-4 space-y-4">
            <MetaRow label="File" value={selectedFile.name} mono />
            <MetaRow label="Path" value={selectedFile.path} mono />
            {selectedFile.language && <MetaRow label="Language" value={selectedFile.language} />}
            <MetaRow label="Symbols" value={selectedFile.empty ? "None found" : `${selectedFile.symbols?.length ?? 0}`} />
          </div>
        ) : (
          <p className="p-4 text-xs text-slate-600">No file selected.</p>
        )}
      </div>
    </div>
  );
}

function findFirstFile(nodes: FileNode[]): FileNode | null {
  for (const n of nodes) {
    if (n.type === "file") return n;
    if (n.children) { const f = findFirstFile(n.children); if (f) return f; }
  }
  return null;
}

function SymbolDoc({ symbol, repoName, filePath }: { symbol: DocSymbol; repoName: string; filePath: string }) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${kindColor(symbol.kind)}`}>
            {kindIcon(symbol.kind)} {symbol.kind}
          </span>
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
                <code className="text-blue-400 font-mono text-sm w-32 shrink-0">{p.name}</code>
                <code className="text-purple-400 font-mono text-sm flex-1">{p.type ?? "any"}</code>
                {p.default && <code className="text-slate-500 font-mono text-xs">= {p.default}</code>}
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

      {symbol.methods && symbol.methods.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Methods</h2>
          <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden">
            {symbol.methods.map((m, i) => (
              <div key={m.name} className={`px-4 py-3 ${i < symbol.methods!.length - 1 ? "border-b border-slate-800" : ""}`}>
                <code className="text-sm font-mono text-slate-300">{buildSignature(m.name, m.parameters, m.return_type)}</code>
                {m.docstring && <p className="text-xs text-slate-600 mt-1">{m.docstring}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyDocView({ fileName, language }: { fileName: string; language?: string }) {
  const unsupported = language && !["python", "javascript", "typescript", "rust", "java", "cpp", "c"].includes(language.toLowerCase());
  return (
    <div className="flex flex-col items-center justify-center min-h-64 text-center">
      <AlertCircle size={32} className="text-amber-500/40 mb-4" />
      <h2 className="text-lg font-bold text-white mb-2">No symbols found</h2>
      <p className="text-slate-500 text-sm max-w-sm">
        <code className="text-amber-400 font-mono">{fileName}</code>
        {unsupported
          ? ` — language "${language}" may not be supported by the parser yet.`
          : " had no extractable symbols. It may contain only configuration, comments, or non-parseable content."
        }
      </p>
      {language && (
        <span className="mt-3 text-[10px] font-mono text-slate-600 bg-slate-800 px-2 py-1 rounded">
          detected: {language}
        </span>
      )}
    </div>
  );
}

function MetadataPanel({ symbol, filePath, repoName }: { symbol: DocSymbol; filePath: string; repoName: string }) {
  return (
    <div className="p-4 space-y-5">
      <MetaRow label="Kind" value={symbol.kind} />
      <MetaRow label="File" value={filePath} mono />
      <MetaRow label="Repository" value={repoName} />
      {symbol.returnType && <MetaRow label="Return type" value={symbol.returnType} mono />}
      {symbol.params && <MetaRow label="Parameters" value={`${symbol.params.length}`} />}
      {symbol.methods && <MetaRow label="Methods" value={`${symbol.methods.length}`} />}
    </div>
  );
}

function MetaRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest mb-1">{label}</p>
      <p className={`text-sm text-slate-300 break-all ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
