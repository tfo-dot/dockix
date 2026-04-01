export default function Log() {
  return (
    <footer className="mt-12 border-t border-slate-800 pt-6">
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
        Background Workers
      </h4>
      <div className="font-mono text-[11px] text-slate-600 space-y-1">
        <p className="flex gap-2">
          <span className="text-blue-500">[08:22:01]</span> RustWorker#1:
          Parsing tree-sitter AST for 'main.rs'...
        </p>
        <p className="flex gap-2">
          <span className="text-green-500">[08:21:58]</span> Storage: Indexed 45
          symbols in PostgreSQL.
        </p>
      </div>
    </footer>
  );
}
