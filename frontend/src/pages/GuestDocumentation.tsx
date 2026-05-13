import React, { useState, useEffect } from "react";
import {
  ChevronRight, ChevronDown, FileCode, Folder, FolderOpen,
  ExternalLink, Tag, Box, Code2, Braces, Hash, AlertCircle,
  LogIn, Eye,
} from "lucide-react";
import type { Page } from "../App";

// Simplified read-only version of Documentation for guests
// Reuses same FILE_TREE structure but without sidebar and edit capabilities

type SymbolKind = "function" | "struct" | "class" | "variable" | "trait";

interface Symbol {
  name: string; kind: SymbolKind; line: number;
  signature?: string; returnType?: string;
  params?: { name: string; type: string }[];
  comment?: string; valueType?: string; value?: string;
  parents?: string[]; constructors?: string[];
}

interface FileNode {
  name: string; type: "file" | "folder"; path: string;
  children?: FileNode[]; symbols?: Symbol[]; empty?: boolean;
}

const FILE_TREE: FileNode[] = [
  {
    name: "src", type: "folder", path: "src", children: [
      {
        name: "main.rs", type: "file", path: "src/main.rs", symbols: [
          { name: "main", kind: "function", line: 5, signature: "fn main()", returnType: "()", params: [], comment: "Entry point of the application." },
          { name: "Config", kind: "struct", line: 19, comment: "Global configuration loaded from environment variables.", parents: [], constructors: ["fn new() -> Self"] },
        ],
      },
      {
        name: "parser.rs", type: "file", path: "src/parser.rs", symbols: [
          { name: "parse_tokens", kind: "function", line: 12, signature: "fn parse_tokens(input: &str) -> ParseResult", returnType: "ParseResult", params: [{ name: "input", type: "&str" }], comment: "Parses raw source input into a token stream." },
        ],
      },
    ],
  },
];

const REPO_URL = "https://github.com/tfo-dot/dockix/blob/main/backend";

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

export default function GuestDocumentation({ navigate }: { navigate: (p: Page) => void }) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["src"]));
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(FILE_TREE[0].children![0]);
  const [selectedSymbol, setSelectedSymbol] = useState<Symbol | null>(FILE_TREE[0].children![0].symbols![0]);

  // Set URL hash on mount and on symbol change
  const pushHash = (file: FileNode, sym: Symbol) => {
    window.location.hash = `/guest/${file.path}::${sym.name}`;
  };

  useEffect(() => {
    const defaultFile = FILE_TREE[0].children![0];
    const defaultSym = defaultFile?.symbols?.[0];
    if (defaultFile && defaultSym) pushHash(defaultFile, defaultSym);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectSymbol = (file: FileNode, sym: Symbol) => {
    setSelectedFile(file);
    setSelectedSymbol(sym);
    pushHash(file, sym);
  };

  const toggleFolder = (path: string) =>
    setExpandedFolders(prev => { const s = new Set(prev); s.has(path) ? s.delete(path) : s.add(path); return s; });

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
              <span className="text-xs font-medium">{node.name}</span>
            </div>
            {open && node.children && renderTree(node.children, depth + 1)}
          </div>
        );
      }
      const isSelected = selectedFile?.path === node.path;
      return (
        <div key={node.path}>
          <div onClick={() => {
              const firstSym = node.symbols?.[0];
              setSelectedFile(node);
              setSelectedSymbol(firstSym ?? null);
              if (firstSym) pushHash(node, firstSym);
            }}
            className={`flex items-center gap-1.5 py-1.5 rounded-lg cursor-pointer transition text-xs ${isSelected ? "bg-green-500/10 text-green-400" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"}`}
            style={{ paddingLeft: `${8 + depth * 14}px` }}>
            <FileCode size={12} />
            <span className="font-mono">{node.name}</span>
          </div>
          {isSelected && node.symbols?.map(sym => (
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
      {/* Minimal top bar instead of sidebar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-[#0f1115]/90 border-b border-slate-800 backdrop-blur-md flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="dockix" className="h-8 w-auto" />
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
            <Eye size={11} /> Guest view — read only
          </div>
        </div>
        <button
          onClick={() => navigate("landing")}
          className="flex items-center gap-2 text-sm font-bold text-white bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg transition"
        >
          <LogIn size={15} /> Sign in for full access
        </button>
      </div>

      {/* Left: file tree */}
      <div className="w-52 border-r border-slate-800 flex flex-col bg-[#0c0f13] pt-14">
        <div className="p-2.5 border-b border-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">kernel-module-xyz</p>
        </div>
        <div className="p-2 text-xs overflow-y-auto flex-1">{renderTree(FILE_TREE)}</div>
      </div>

      {/* Center */}
      <main className="flex-1 flex flex-col overflow-y-auto pt-14">
        <div className="px-6 py-2 border-b border-slate-800 flex items-center gap-2 text-xs text-slate-500">
          <span className="font-mono">{selectedFile?.path}</span>
          {selectedSymbol && <><ChevronRight size={11} /><span className="font-mono text-slate-400">{selectedSymbol.name}</span></>}
        </div>
        <div className="p-8 max-w-3xl">
          {selectedSymbol ? <GuestSymbolDoc symbol={selectedSymbol} filePath={selectedFile?.path ?? ""} /> : <p className="text-slate-500 text-sm">Select a symbol.</p>}
        </div>
      </main>

      {/* Right: metadata */}
      <div className="w-52 border-l border-slate-800 bg-[#0c0f13] pt-14 overflow-y-auto">
        <div className="p-3.5 border-b border-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Metadata</p>
        </div>
        {selectedSymbol && (
          <div className="p-4 space-y-4">
            <MetaRow label="Kind" value={selectedSymbol.kind} />
            <MetaRow label="Line" value={`${selectedSymbol.line}`} />
            {selectedSymbol.returnType && <MetaRow label="Returns" value={selectedSymbol.returnType} mono />}
            <div>
              <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest mb-1.5">Source</p>
              <a href={`${REPO_URL}/${selectedFile?.path}#L${selectedSymbol.line}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-mono break-all">
                <ExternalLink size={10} className="shrink-0" /> View on GitHub
              </a>
            </div>
            {/* CTA */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-[10px] text-slate-500 mb-2">Sign in to see full metadata, edit docs and manage access.</p>
              <button onClick={() => navigate("landing")} className="w-full py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition">
                Sign in
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GuestSymbolDoc({ symbol, filePath }: { symbol: Symbol; filePath: string }) {
  const githubUrl = `${REPO_URL}/${filePath}#L${symbol.line}`;
  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${kindColor(symbol.kind)}`}>
            {kindIcon(symbol.kind)} {symbol.kind}
          </span>
          <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-400 transition">
            <ExternalLink size={11} /> Line {symbol.line}
          </a>
        </div>
        <h1 className="text-2xl font-bold text-white font-mono">{symbol.name}</h1>
        {symbol.comment && <p className="text-slate-400 text-sm leading-relaxed border-l-2 border-slate-700 pl-4">{symbol.comment}</p>}
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
