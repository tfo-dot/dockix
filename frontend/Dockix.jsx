import { useState, useRef, useCallback } from "react";

const ACCENT = "#6C63FF";
const ACCENT_LIGHT = "#EEF0FF";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body, #root {
    font-family: 'DM Sans', sans-serif;
    background: #F4F6FB;
    min-height: 100vh;
    color: #1a1a2e;
  }

  .topbar {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 28px;
    background: #fff;
    border-bottom: 1px solid #e8eaf2;
  }
  .topbar-icon {
    width: 36px; height: 36px; border-radius: 10px;
    background: ${ACCENT};
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 15px;
  }
  .topbar-title { font-weight: 600; font-size: 15px; }
  .topbar-sub { font-size: 12px; color: #888; }
  .topbar-right { margin-left: auto; display: flex; gap: 8px; }

  .btn {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 16px; border-radius: 8px; font-size: 13px;
    font-weight: 500; cursor: pointer; border: 1.5px solid #dde0ef;
    background: #fff; color: #333; transition: all .15s;
    font-family: 'DM Sans', sans-serif;
  }
  .btn:hover { background: #f5f6fb; border-color: #bcc0d8; }
  .btn-primary {
    background: ${ACCENT}; color: #fff; border-color: ${ACCENT};
  }
  .btn-primary:hover { background: #5a52e0; border-color: #5a52e0; }
  .btn:disabled { opacity: .45; cursor: not-allowed; }

  .drop-screen {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; min-height: calc(100vh - 65px);
    padding: 40px;
  }
  .drop-zone {
    width: 100%; max-width: 840px;
    border: 2px dashed #c8cce8;
    border-radius: 20px;
    background: #fff;
    padding: 80px 40px;
    display: flex; flex-direction: column; align-items: center;
    cursor: pointer; transition: all .2s;
    position: relative;
  }
  .drop-zone.over {
    border-color: ${ACCENT};
    background: ${ACCENT_LIGHT};
  }
  .drop-icon {
    width: 72px; height: 72px; border-radius: 18px;
    background: ${ACCENT};
    display: flex; align-items: center; justify-content: center;
    font-size: 28px; color: #fff; margin-bottom: 22px;
  }
  .drop-title {
    font-size: 20px; font-weight: 600; margin-bottom: 6px; text-align: center;
  }
  .drop-title .py { color: #3572A5; }
  .drop-title .java { color: #b07219; }
  .drop-sub { font-size: 14px; color: #888; margin-bottom: 18px; }
  .drop-badge {
    display: flex; align-items: center; gap: 6px;
    background: #f4f6fb; border: 1px solid #dde0ef;
    border-radius: 20px; padding: 6px 14px;
    font-size: 12px; color: #666;
  }
  .drop-footer {
    margin-top: 22px; font-size: 12px; color: #aaa;
  }
  .error-msg {
    margin-top: 14px; padding: 10px 18px;
    background: #fff0f0; border: 1px solid #fca5a5;
    border-radius: 8px; font-size: 13px; color: #c0392b;
  }

  .loading-overlay {
    position: absolute; inset: 0; border-radius: 18px;
    background: rgba(255,255,255,.85);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 14px;
  }
  .spinner {
    width: 36px; height: 36px; border: 3px solid #e0e0f0;
    border-top-color: ${ACCENT};
    border-radius: 50%;
    animation: spin .7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-text { font-size: 14px; color: #666; font-weight: 500; }

  .editor-screen {
    display: flex; flex-direction: column; height: calc(100vh - 65px);
  }
  .editor-topbar {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 20px;
    background: #fff; border-bottom: 1px solid #e8eaf2;
  }
  .file-chip {
    display: flex; align-items: center; gap: 7px;
    font-weight: 500; font-size: 14px;
  }
  .file-chip-icon {
    width: 28px; height: 28px; background: ${ACCENT};
    border-radius: 7px; display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 11px;
  }
  .editor-body { display: flex; flex: 1; overflow: hidden; }

  .sidebar {
    width: 260px; flex-shrink: 0;
    border-right: 1px solid #e8eaf2;
    background: #fff; overflow-y: auto;
    padding: 16px 0;
  }
  .sidebar-label {
    font-size: 10px; font-weight: 600; letter-spacing: .08em;
    color: #aaa; padding: 0 16px 8px; text-transform: uppercase;
  }
  .nav-item {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 16px; cursor: pointer; font-size: 13px;
    color: #444; border-left: 3px solid transparent;
    transition: all .12s;
  }
  .nav-item:hover { background: #f4f6fb; color: #333; }
  .nav-item.active {
    background: ${ACCENT_LIGHT}; color: ${ACCENT};
    border-left-color: ${ACCENT}; font-weight: 500;
  }
  .nav-item-badge {
    margin-left: auto; font-size: 10px; padding: 1px 6px;
    border-radius: 10px; font-weight: 500;
  }
  .badge-class { background: #e8f4fd; color: #1e6fa8; }
  .badge-fn { background: #e8fdf0; color: #1a7c42; }
  .badge-mod { background: #fdf4e8; color: #8a5a00; }

  .content-area {
    flex: 1; overflow-y: auto; padding: 28px 36px;
    background: #f4f6fb;
  }
  .empty-state {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; height: 100%; color: #bbb; gap: 12px;
  }
  .empty-icon { font-size: 48px; opacity: .4; }
  .empty-text { font-size: 14px; }

  .doc-section {
    background: #fff; border: 1px solid #e8eaf2;
    border-radius: 14px; margin-bottom: 20px; overflow: hidden;
  }
  .doc-section-header {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 20px; border-bottom: 1px solid #f0f2fa;
    background: #fafbff;
  }
  .section-type-badge {
    font-size: 10px; font-weight: 600; padding: 2px 8px;
    border-radius: 5px; text-transform: uppercase; letter-spacing: .05em;
  }
  .type-class { background: #e8f4fd; color: #1e6fa8; }
  .type-function { background: #e8fdf0; color: #1a7c42; }
  .type-module { background: #fdf4e8; color: #8a5a00; }
  .section-name {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px; font-weight: 500; color: #222;
  }
  .reset-btn {
    margin-left: auto; font-size: 11px; color: #aaa; cursor: pointer;
    border: none; background: none; padding: 3px 8px;
    border-radius: 5px; transition: all .12s;
    font-family: 'DM Sans', sans-serif;
  }
  .reset-btn:hover { background: #f0f2fa; color: #555; }
  .doc-section-body { padding: 16px 20px; }
  .doc-label {
    font-size: 11px; font-weight: 600; color: #aaa;
    text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px;
  }
  .doc-textarea {
    width: 100%; border: 1.5px solid #e8eaf2; border-radius: 8px;
    padding: 10px 12px; font-size: 13px; line-height: 1.6;
    font-family: 'DM Sans', sans-serif; color: #333;
    resize: vertical; min-height: 70px; transition: border .15s;
    background: #fff;
  }
  .doc-textarea:focus { outline: none; border-color: ${ACCENT}; }
  .params-grid {
    display: grid; grid-template-columns: 140px 1fr;
    gap: 6px 10px; align-items: center; margin-top: 4px;
  }
  .param-name {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px; color: #555; padding: 6px 10px;
    background: #f4f6fb; border-radius: 6px;
  }
  .param-input {
    border: 1.5px solid #e8eaf2; border-radius: 6px;
    padding: 6px 10px; font-size: 12px; font-family: 'DM Sans', sans-serif;
    color: #333; transition: border .15s; background: #fff;
  }
  .param-input:focus { outline: none; border-color: ${ACCENT}; }
  .returns-row { display: flex; gap: 10px; align-items: center; margin-top: 4px; }
  .returns-type {
    font-family: 'JetBrains Mono', monospace; font-size: 12px;
    color: #6C63FF; background: ${ACCENT_LIGHT}; padding: 4px 10px;
    border-radius: 6px; white-space: nowrap;
  }
`;

function parsePython(code) {
  const result = { modules: [], classes: [], functions: [] };
  const lines = code.split("\n");
  let i = 0;

  const getDocstring = (startIdx) => {
    let j = startIdx;
    while (j < lines.length && lines[j].trim() === "") j++;
    const trimmed = lines[j]?.trim() || "";
    if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
      const quote = trimmed.startsWith('"""') ? '"""' : "'''";
      if (trimmed.slice(3).includes(quote)) {
        return trimmed.slice(3, trimmed.lastIndexOf(quote));
      }
      let doc = trimmed.slice(3);
      j++;
      while (j < lines.length && !lines[j].includes(quote)) {
        doc += " " + lines[j].trim();
        j++;
      }
      return doc.trim();
    }
    return "";
  };

  const moduleDoc = getDocstring(0);
  if (moduleDoc) result.modules.push({ name: "Module", docstring: moduleDoc });

  while (i < lines.length) {
    const line = lines[i];
    const classMatch = line.match(/^class\s+(\w+)/);
    const funcMatch = line.match(/^(def|async def)\s+(\w+)\(([^)]*)\)/);
    const methodMatch = line.match(/^\s+(def|async def)\s+(\w+)\(([^)]*)\)/);

    if (classMatch) {
      const doc = getDocstring(i + 1);
      result.classes.push({ name: classMatch[1], docstring: doc, methods: [] });
    } else if (funcMatch) {
      const params = funcMatch[3].split(",").map(p => p.trim()).filter(p => p && p !== "self");
      const doc = getDocstring(i + 1);
      result.functions.push({ name: funcMatch[2], docstring: doc, params, returns: "None" });
    } else if (methodMatch) {
      const params = methodMatch[3].split(",").map(p => p.trim()).filter(p => p && p !== "self");
      const doc = getDocstring(i + 1);
      const cls = result.classes[result.classes.length - 1];
      if (cls) cls.methods.push({ name: methodMatch[2], docstring: doc, params, returns: "None" });
    }
    i++;
  }
  return result;
}

function parseJava(code) {
  const result = { modules: [], classes: [], functions: [] };
  const classMatches = [...code.matchAll(/(?:public|private|protected)?\s*class\s+(\w+)/g)];
  classMatches.forEach(m => result.classes.push({ name: m[1], docstring: "", methods: [] }));
  const methodMatches = [...code.matchAll(/(?:public|private|protected)\s+\w+\s+(\w+)\(([^)]*)\)/g)];
  methodMatches.forEach(m => {
    const params = m[2].split(",").map(p => p.trim().split(" ").pop()).filter(Boolean);
    result.functions.push({ name: m[1], docstring: "", params, returns: "void" });
  });
  return result;
}

const CodeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </svg>
);
const FileIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
  </svg>
);
const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const CubeIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
  </svg>
);

export default function App() {
  const [screen, setScreen] = useState("drop");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState(null);
  const [docs, setDocs] = useState({});
  const [origDocs, setOrigDocs] = useState({});
  const [selected, setSelected] = useState(null);
  const fileRef = useRef();

  const buildInitialDocs = (data, name) => {
    const d = {};
    d[`mod__${name}`] = {
      type: "module", name,
      description: data.modules[0]?.docstring || `Moduł ${name}`,
    };
    data.classes.forEach(c => {
      d[`cls__${c.name}`] = {
        type: "class", name: c.name,
        description: c.docstring || `Klasa ${c.name}.`,
        methods: c.methods,
      };
      c.methods.forEach(m => {
        d[`mth__${c.name}__${m.name}`] = {
          type: "function", name: `${c.name}.${m.name}`,
          description: m.docstring || `Metoda ${m.name}.`,
          params: Object.fromEntries(m.params.map(p => [p, ""])),
          returns: m.returns,
        };
      });
    });
    data.functions.forEach(f => {
      d[`fn__${f.name}`] = {
        type: "function", name: f.name,
        description: f.docstring || `Funkcja ${f.name}.`,
        params: Object.fromEntries(f.params.map(p => [p, ""])),
        returns: f.returns,
      };
    });
    return d;
  };

  const processFile = (file) => {
    setError("");
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["py", "java"].includes(ext)) {
      setError("Nieobsługiwany format. Wybierz plik .py lub .java.");
      return;
    }
    if (file.size > 512000) {
      setError("Plik jest za duży. Maksymalny rozmiar to 500 KB.");
      return;
    }
    setLoading(true);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setTimeout(() => {
        const code = e.target.result;
        const data = ext === "py" ? parsePython(code) : parseJava(code);
        const d = buildInitialDocs(data, file.name);
        setDocs(d);
        setOrigDocs(JSON.parse(JSON.stringify(d)));
        setSelected(`mod__${file.name}`);
        setLoading(false);
        setScreen("editor");
      }, 900);
    };
    reader.readAsText(file);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onFileChange = (e) => { if (e.target.files[0]) processFile(e.target.files[0]); };

  const updateDoc = (key, field, val) => setDocs(d => ({ ...d, [key]: { ...d[key], [field]: val } }));
  const updateParam = (key, param, val) => setDocs(d => ({
    ...d, [key]: { ...d[key], params: { ...d[key].params, [param]: val } }
  }));
  const resetDoc = (key) => setDocs(d => ({ ...d, [key]: JSON.parse(JSON.stringify(origDocs[key])) }));

  const downloadHTML = () => {
    const sections = Object.entries(docs).map(([k, v]) => {
      const params = v.params ? Object.entries(v.params).map(([p, desc]) =>
        `<tr><td style="font-family:monospace;padding:4px 8px;background:#f4f6fb;border-radius:4px">${p}</td><td style="padding:4px 8px">${desc || "—"}</td></tr>`
      ).join("") : "";
      return `
        <div style="background:#fff;border:1px solid #e8eaf2;border-radius:12px;margin-bottom:16px;overflow:hidden">
          <div style="background:#fafbff;padding:12px 18px;border-bottom:1px solid #f0f2fa;display:flex;align-items:center;gap:8px">
            <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;text-transform:uppercase;letter-spacing:.05em;background:${v.type==="class"?"#e8f4fd":"#e8fdf0"};color:${v.type==="class"?"#1e6fa8":"#1a7c42"}">${v.type}</span>
            <span style="font-family:monospace;font-size:14px;font-weight:500">${v.name}</span>
          </div>
          <div style="padding:14px 18px">
            <p style="font-size:13px;color:#444;line-height:1.6;margin-bottom:${params?"12px":"0"}">${v.description}</p>
            ${params ? `<table style="width:100%;border-collapse:collapse;font-size:12px">${params}</table>` : ""}
            ${v.returns ? `<p style="margin-top:10px;font-size:12px;color:#888">Zwraca: <code style="background:#eef0ff;color:#6c63ff;padding:1px 6px;border-radius:4px">${v.returns}</code></p>` : ""}
          </div>
        </div>`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title>
      <style>body{font-family:system-ui,sans-serif;max-width:860px;margin:40px auto;padding:0 20px;background:#f4f6fb}
      h1{font-size:22px;margin-bottom:24px}span.sub{font-size:13px;color:#888;font-weight:400}</style></head>
      <body><h1>${fileName} <span class="sub">— dokumentacja</span></h1>${sections}</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = fileName.replace(/\.\w+$/, "") + "_docs.html"; a.click();
  };

  const downloadPDF = () => {
    const win = window.open("", "_blank");
    const sections = Object.entries(docs).map(([k, v]) => {
      const params = v.params ? Object.entries(v.params).map(([p, desc]) =>
        `<tr><td style="font-family:monospace;padding:4px 8px;background:#f4f6fb">${p}</td><td style="padding:4px 8px">${desc || "—"}</td></tr>`
      ).join("") : "";
      return `<div style="border:1px solid #e8eaf2;border-radius:8px;margin-bottom:14px;overflow:hidden;page-break-inside:avoid">
        <div style="background:#fafbff;padding:10px 16px;border-bottom:1px solid #f0f2fa">
          <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;text-transform:uppercase;background:${v.type==="class"?"#e8f4fd":"#e8fdf0"};color:${v.type==="class"?"#1e6fa8":"#1a7c42"}">${v.type}</span>
          <span style="font-family:monospace;font-size:13px;font-weight:500;margin-left:8px">${v.name}</span>
        </div>
        <div style="padding:12px 16px">
          <p style="font-size:12px;color:#444;line-height:1.5;margin-bottom:${params?"10px":"0"}">${v.description}</p>
          ${params ? `<table style="width:100%;border-collapse:collapse;font-size:11px">${params}</table>` : ""}
          ${v.returns ? `<p style="margin-top:8px;font-size:11px;color:#888">Zwraca: <code style="background:#eef0ff;color:#6c63ff;padding:1px 5px;border-radius:3px">${v.returns}</code></p>` : ""}
        </div></div>`;
    }).join("");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title>
      <style>body{font-family:system-ui,sans-serif;max-width:780px;margin:30px auto;padding:0 20px}
      h1{font-size:20px;margin-bottom:6px}p.meta{font-size:11px;color:#aaa;margin-bottom:24px}
      @page{margin:20mm}@media print{body{margin:0}}</style></head>
      <body><h1>${fileName}</h1><p class="meta">Wygenerowano: ${new Date().toLocaleDateString("pl-PL")} · DocGen</p>
      ${sections}</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  };

  const navItems = parsed ? [] : Object.entries(docs).map(([k, v]) => ({ key: k, ...v }));

  if (screen === "drop") return (
    <>
      <style>{styles}</style>
      <div className="topbar">
        <div className="topbar-icon"><CodeIcon /></div>
        <div>
          <div className="topbar-title">DocGen</div>
          <div className="topbar-sub">Generator dokumentacji kodu</div>
        </div>
      </div>
      <div className="drop-screen">
        <div
          className={`drop-zone${dragging ? " over" : ""}`}
          onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
          onClick={() => fileRef.current.click()}
        >
          {loading ? (
            <div className="loading-overlay">
              <div className="spinner" />
              <div className="loading-text">Analizuję plik...</div>
            </div>
          ) : null}
          <div className="drop-icon"><CodeIcon /></div>
          <div className="drop-title">
            Przeciągnij plik <span className="py">.py</span> lub <span className="java">.java</span> tutaj
          </div>
          <div className="drop-sub">lub kliknij, aby wybrać z dysku</div>
          <div className="drop-badge">
            <DownloadIcon />
            Maksymalny rozmiar: 500 KB
          </div>
          {error && <div className="error-msg">{error}</div>}
          <input ref={fileRef} type="file" accept=".py,.java" style={{ display: "none" }} onChange={onFileChange} />
        </div>
        <div className="drop-footer">Obsługiwane języki: Python (.py) · Java (.java)</div>
      </div>
    </>
  );

  const selDoc = docs[selected];
  const allItems = Object.entries(docs).map(([k, v]) => ({ key: k, ...v }));

  return (
    <>
      <style>{styles}</style>
      <div className="topbar">
        <div className="topbar-icon"><CodeIcon /></div>
        <div>
          <div className="topbar-title">DocGen</div>
          <div className="topbar-sub">Generator dokumentacji kodu</div>
        </div>
      </div>
      <div className="editor-screen">
        <div className="editor-topbar">
          <button className="btn" onClick={() => { setScreen("drop"); setDocs({}); setSelected(null); setFileName(""); }}>
            ← Wróć
          </button>
          <div className="file-chip">
            <div className="file-chip-icon"><CodeIcon /></div>
            {fileName}
          </div>
          <div className="topbar-right">
            <button className="btn" onClick={downloadHTML}><FileIcon /> Pobierz HTML</button>
            <button className="btn btn-primary" onClick={downloadPDF}><DownloadIcon /> Pobierz PDF</button>
          </div>
        </div>
        <div className="editor-body">
          <div className="sidebar">
            <div className="sidebar-label">Struktura</div>
            {allItems.map(item => (
              <div
                key={item.key}
                className={`nav-item${selected === item.key ? " active" : ""}`}
                onClick={() => setSelected(item.key)}
              >
                {item.type === "class" ? "◈" : item.type === "module" ? "◉" : "◦"} {item.name}
                <span className={`nav-item-badge ${item.type === "class" ? "badge-class" : item.type === "module" ? "badge-mod" : "badge-fn"}`}>
                  {item.type === "class" ? "cls" : item.type === "module" ? "mod" : "fn"}
                </span>
              </div>
            ))}
          </div>
          <div className="content-area">
            {!selDoc ? (
              <div className="empty-state">
                <div className="empty-icon"><CubeIcon /></div>
                <div className="empty-text">Wybierz element z drzewa nawigacji</div>
              </div>
            ) : (
              <div>
                <div className="doc-section">
                  <div className="doc-section-header">
                    <span className={`section-type-badge type-${selDoc.type}`}>{selDoc.type}</span>
                    <span className="section-name">{selDoc.name}</span>
                    <button className="reset-btn" onClick={() => resetDoc(selected)}>↺ Resetuj</button>
                  </div>
                  <div className="doc-section-body">
                    <div className="doc-label">Opis</div>
                    <textarea
                      className="doc-textarea"
                      value={selDoc.description}
                      onChange={e => updateDoc(selected, "description", e.target.value)}
                    />
                    {selDoc.params && Object.keys(selDoc.params).length > 0 && (
                      <>
                        <div className="doc-label" style={{ marginTop: 14 }}>Parametry</div>
                        <div className="params-grid">
                          {Object.entries(selDoc.params).map(([p, desc]) => (
                            <>
                              <div key={p + "_n"} className="param-name">{p}</div>
                              <input
                                key={p + "_v"}
                                className="param-input"
                                value={desc}
                                placeholder="Opis parametru..."
                                onChange={e => updateParam(selected, p, e.target.value)}
                              />
                            </>
                          ))}
                        </div>
                      </>
                    )}
                    {selDoc.returns && (
                      <>
                        <div className="doc-label" style={{ marginTop: 14 }}>Zwraca</div>
                        <div className="returns-row">
                          <span className="returns-type">{selDoc.returns}</span>
                          <input
                            className="param-input"
                            style={{ flex: 1 }}
                            value={selDoc.returnDesc || ""}
                            placeholder="Opis zwracanej wartości..."
                            onChange={e => updateDoc(selected, "returnDesc", e.target.value)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
