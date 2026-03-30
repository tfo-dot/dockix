import { useState, useRef } from "react";

const ACCENT = "#6C63FF";
const ACCENT_LIGHT = "#EEF0FF";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body, #root { font-family: 'DM Sans', sans-serif; background: #F4F6FB; min-height: 100vh; color: #1a1a2e; }

  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
  ::-webkit-scrollbar-thumb { background: #c8cce8; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: ${ACCENT}; }

  /* Login Screen */
  .login-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #F4F6FB; }
  .login-box { background: #fff; padding: 40px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); width: 100%; max-width: 360px; display: flex; flex-direction: column; align-items: center; }
  .login-title { font-size: 22px; font-weight: 600; margin-bottom: 8px; }
  .login-sub { font-size: 13px; color: #888; margin-bottom: 24px; text-align: center; }
  .password-container { position: relative; width: 100%; }
  .login-input { width: 100%; padding: 12px 16px; margin-bottom: 12px; border: 1.5px solid #e8eaf2; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 14px; transition: all .2s; background: #fafbff; color: #1a1a2e; }
  .login-input:focus { border-color: ${ACCENT}; outline: none; background: #fff; }
  .login-input-pass { padding-right: 70px; }
  .show-pass-btn { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 12px; color: ${ACCENT}; cursor: pointer; font-family: inherit; font-weight: 500; display: flex; align-items: center; gap: 4px; }
  .show-pass-btn:hover { color: #5a52e0; }
  .login-btn { width: 100%; justify-content: center; padding: 12px; margin-top: 8px; }

  /* History Section */
  .history-section { width: 100%; max-width: 840px; margin-top: 40px; text-align: left; }
  .history-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
  .history-list { display: flex; flex-direction: column; gap: 10px; }
  .history-item { display: flex; align-items: center; justify-content: space-between; background: #fff; padding: 14px 20px; border-radius: 12px; border: 1px solid #e8eaf2; cursor: pointer; transition: all .15s; }
  .history-item:hover { border-color: ${ACCENT}; background: ${ACCENT_LIGHT}; transform: translateY(-1px); }
  .history-item-name { font-weight: 500; font-size: 14px; display: flex; align-items: center; gap: 10px; }
  .history-item-date { font-size: 12px; color: #888; }
  .user-badge { font-size: 12px; color: #666; font-weight: 500; display: flex; align-items: center; gap: 6px; }

  /* UI Elements */
  .topbar { display: flex; align-items: center; gap: 10px; padding: 14px 28px; background: #fff; border-bottom: 1px solid #e8eaf2; }
  .topbar-icon { width: 36px; height: 36px; border-radius: 10px; background: ${ACCENT}; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 15px; }
  .topbar-title { font-weight: 600; font-size: 15px; }
  .topbar-sub { font-size: 12px; color: #888; }
  .topbar-right { margin-left: auto; display: flex; align-items: center; gap: 16px; }
  .btn { display: flex; align-items: center; gap: 6px; padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1.5px solid #dde0ef; background: #fff; color: #333; transition: all .15s; font-family: 'DM Sans', sans-serif; }
  .btn:hover { background: #f5f6fb; border-color: #bcc0d8; }
  .btn-primary { background: ${ACCENT}; color: #fff; border-color: ${ACCENT}; }
  .btn-primary:hover { background: #5a52e0; border-color: #5a52e0; }
  .btn:disabled { opacity: .45; cursor: not-allowed; }

  /* Main Screens */
  .drop-screen { display: flex; flex-direction: column; align-items: center; padding: 60px 20px; }
  .drop-zone { width: 100%; max-width: 840px; border: 2px dashed #c8cce8; border-radius: 20px; background: #fff; padding: 60px 40px; display: flex; flex-direction: column; align-items: center; cursor: pointer; position: relative; transition: all .2s; }
  .drop-zone.over { border-color: ${ACCENT}; background: ${ACCENT_LIGHT}; }
  .drop-icon { width: 64px; height: 64px; border-radius: 16px; background: ${ACCENT}; display: flex; align-items: center; justify-content: center; font-size: 24px; color: #fff; margin-bottom: 16px; }
  .drop-title { font-size: 18px; font-weight: 600; margin-bottom: 6px; text-align: center; }
  .drop-sub { font-size: 13px; color: #888; margin-bottom: 16px; }
  .drop-badge { display: flex; align-items: center; gap: 6px; background: #f4f6fb; border: 1px solid #dde0ef; border-radius: 20px; padding: 6px 14px; font-size: 12px; color: #666; }
  .error-msg { margin-top: 14px; padding: 10px 18px; background: #fff0f0; border: 1px solid #fca5a5; border-radius: 8px; font-size: 13px; color: #c0392b; width: 100%; max-width: 840px; text-align: center; }

  .github-section { width: 100%; max-width: 840px; margin-top: 24px; }
  .divider { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
  .divider-line { flex: 1; height: 1px; background: #e8eaf2; }
  .divider-text { font-size: 11px; color: #aaa; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }

  .loading-overlay { position: absolute; inset: 0; border-radius: 18px; background: rgba(255,255,255,.85); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; z-index: 10; }
  .spinner { width: 36px; height: 36px; border: 3px solid #e0e0f0; border-top-color: ${ACCENT}; border-radius: 50%; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-text { font-size: 14px; color: #666; font-weight: 500; }

  /* Editor Screen */
  .editor-screen { display: flex; flex-direction: column; height: calc(100vh - 65px); }
  .editor-topbar { display: flex; align-items: center; gap: 12px; padding: 10px 20px; background: #fff; border-bottom: 1px solid #e8eaf2; }
  .file-chip { display: flex; align-items: center; gap: 7px; font-weight: 500; font-size: 14px; }
  .file-chip-icon { width: 28px; height: 28px; background: ${ACCENT}; border-radius: 7px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; }
  .editor-body { display: flex; flex: 1; overflow: hidden; }

  .sidebar { width: 260px; flex-shrink: 0; border-right: 1px solid #e8eaf2; background: #fff; overflow-y: auto; padding: 16px 0; }
  .sidebar-label { font-size: 10px; font-weight: 600; letter-spacing: .08em; color: #aaa; padding: 0 16px 8px; text-transform: uppercase; }
  .nav-item { display: flex; align-items: center; gap: 8px; padding: 7px 16px; cursor: pointer; font-size: 13px; color: #444; border-left: 3px solid transparent; transition: all .12s; }
  .nav-item:hover { background: #f4f6fb; color: #333; }
  .nav-item.active { background: ${ACCENT_LIGHT}; color: ${ACCENT}; border-left-color: ${ACCENT}; font-weight: 500; }
  .nav-item-badge { margin-left: auto; font-size: 10px; padding: 1px 6px; border-radius: 10px; font-weight: 500; }
  .badge-class { background: #e8f4fd; color: #1e6fa8; }
  .badge-fn { background: #e8fdf0; color: #1a7c42; }
  .badge-mod { background: #fdf4e8; color: #8a5a00; }

  .content-area { flex: 1; overflow-y: auto; padding: 28px 36px; background: #f4f6fb; }
  .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #bbb; gap: 12px; }
  .empty-icon { font-size: 48px; opacity: .4; }
  .empty-text { font-size: 14px; }

  .doc-section { background: #fff; border: 1px solid #e8eaf2; border-radius: 14px; margin-bottom: 20px; overflow: hidden; }
  .doc-section-header { display: flex; align-items: center; gap: 10px; padding: 14px 20px; border-bottom: 1px solid #f0f2fa; background: #fafbff; }
  .section-type-badge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 5px; text-transform: uppercase; letter-spacing: .05em; }
  .type-class { background: #e8f4fd; color: #1e6fa8; }
  .type-function { background: #e8fdf0; color: #1a7c42; }
  .type-module { background: #fdf4e8; color: #8a5a00; }
  .section-name { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 500; color: #222; }
  .reset-btn { margin-left: auto; font-size: 11px; color: #aaa; cursor: pointer; border: none; background: none; padding: 3px 8px; border-radius: 5px; transition: all .12s; font-family: 'DM Sans', sans-serif; }
  .reset-btn:hover { background: #f0f2fa; color: #555; }
  .doc-section-body { padding: 16px 20px; }
  .doc-label { font-size: 11px; font-weight: 600; color: #aaa; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }
  .doc-textarea { width: 100%; border: 1.5px solid #e8eaf2; border-radius: 8px; padding: 10px 12px; font-size: 13px; line-height: 1.6; font-family: 'DM Sans', sans-serif; color: #333; resize: vertical; min-height: 70px; transition: border .15s; background: #fff; }
  .doc-textarea:focus { outline: none; border-color: ${ACCENT}; }
  .params-grid { display: grid; grid-template-columns: 140px 1fr; gap: 6px 10px; align-items: center; margin-top: 4px; }
  .param-name { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #555; padding: 6px 10px; background: #f4f6fb; border-radius: 6px; }
  .param-input { border: 1.5px solid #e8eaf2; border-radius: 6px; padding: 6px 10px; font-size: 12px; font-family: 'DM Sans', sans-serif; color: #333; transition: border .15s; background: #fff; }
  .param-input:focus { outline: none; border-color: ${ACCENT}; }
  .returns-row { display: flex; gap: 10px; align-items: center; margin-top: 4px; }
  .returns-type { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #6C63FF; background: ${ACCENT_LIGHT}; padding: 4px 10px; border-radius: 6px; white-space: nowrap; }
`;

// Ikony (Frontend)
const CodeIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> );
const FileIcon = () => ( <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> );
const DownloadIcon = () => ( <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> );
const CubeIcon = () => ( <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg> );
const UserIcon = () => ( <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> );
const EyeIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> );
const GithubIcon = () => ( <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg> );

export default function App() {
  // Stany UI
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [screen, setScreen] = useState("drop");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Pola formularzy
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [error, setError] = useState("");
  
  // Referencje
  const fileRef = useRef();

  // Modele danych (Stany gotowe do zasilenia z backendu)
  const [fileName, setFileName] = useState("");
  const [docs, setDocs] = useState({});
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);

  // MOCK: Akcje do podmiany na wywołania API
  const handleLogin = (e) => {
    e.preventDefault();
    // TODO: Zastąp wywołaniem API autoryzacji
    setIsLoggedIn(true);
    setError("");
  };

  const handleLogout = () => {
    // TODO: Zastąp wylogowaniem z API/usuwaniem tokena
    setIsLoggedIn(false);
    setUsernameInput("");
    setPasswordInput("");
    setScreen("drop");
    setDocs({});
  };

  const mockApiProcess = (name) => {
    // TODO: Zastąp wysyłaniem kodu na backend
    setLoading(true);
    setError("");
    setTimeout(() => {
      setFileName(name);
      
      // Przykładowe dane z "backendu"
      const fakeDocs = {
        [`mod__${name}`]: { type: "module", name: name, description: "To jest przykładowy opis wygenerowany przez przyszły backend." },
        "fn__example": { type: "function", name: "exampleFunction", description: "Opis funkcji z backendu.", params: { "arg1": "Opis parametru" }, returns: "int" }
      };
      
      setDocs(fakeDocs);
      setSelected(`mod__${name}`);
      setScreen("editor");
      
      setHistory(prev => [{ id: Date.now(), fileName: name, date: new Date().toLocaleString("pl-PL") }, ...prev]);
      setLoading(false);
    }, 1000);
  };

  const processFile = (file) => {
    if (!file) return;
    // Walidacje frontendowe (można rozbudować)
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["py", "java"].includes(ext)) { setError("Nieobsługiwany format."); return; }
    mockApiProcess(file.name);
  };

  const handleGithubFetch = (e) => {
    e.preventDefault();
    if (!githubUrl.trim()) return;
    // Wyciąganie nazwy pliku tylko dla mocka
    const urlParts = githubUrl.split("/");
    const fName = urlParts[urlParts.length - 1] || "github_file.py";
    mockApiProcess(fName);
    setGithubUrl("");
  };

  const loadFromHistory = (item) => {
    // TODO: Zastąp pobieraniem danych z backendu na podstawie ID historii
    setFileName(item.fileName);
    setScreen("editor");
  };

  const downloadReport = (format) => {
    // TODO: Zastąp pobieraniem wygenerowanego pliku z backendu
    alert(`Żądanie pobrania pliku ${format} zostało wysłane na backend!`);
  };

  // Aktualizacja stanu edytora (UI)
  const updateDoc = (key, field, val) => setDocs(d => ({ ...d, [key]: { ...d[key], [field]: val } }));
  const updateParam = (key, param, val) => setDocs(d => ({ ...d, [key]: { ...d[key], params: { ...d[key].params, [param]: val } } }));


  /* ------------------- RENDER ------------------- */
  
  if (!isLoggedIn) {
    return (
      <>
        <style>{styles}</style>
        <div className="login-screen">
          <div className="login-box">
            <div className="topbar-icon" style={{marginBottom: 16, width: 48, height: 48, fontSize: 20}}><CodeIcon /></div>
            <div className="login-title">Dockix Login</div>
            <div className="login-sub">Zaloguj się do generatora dokumentacji</div>
            <form onSubmit={handleLogin} style={{width: '100%'}}>
              <input className="login-input" placeholder="Login" value={usernameInput} onChange={e => setUsernameInput(e.target.value)} />
              <div className="password-container">
                <input className="login-input login-input-pass" type={showPassword ? "text" : "password"} placeholder="Hasło" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} />
                <button type="button" className="show-pass-btn" onClick={() => setShowPassword(!showPassword)}><EyeIcon /> {showPassword ? "Ukryj" : "Pokaż"}</button>
              </div>
              {error && <div style={{color: '#c0392b', fontSize: 12, marginBottom: 10, textAlign: 'center'}}>{error}</div>}
              <button type="submit" className="btn btn-primary login-btn">Zaloguj się</button>
            </form>
          </div>
        </div>
      </>
    );
  }

  const selDoc = docs[selected];
  const allItems = Object.entries(docs).map(([k, v]) => ({ key: k, ...v }));

  return (
    <>
      <style>{styles}</style>
      {screen === "drop" ? (
        <>
          <div className="topbar">
            <div className="topbar-icon"><CodeIcon /></div>
            <div><div className="topbar-title">Dockix</div><div className="topbar-sub">Generator dokumentacji kodu</div></div>
            <div className="topbar-right"><div className="user-badge"><UserIcon /> admin</div><button className="btn" onClick={handleLogout}>Wyloguj</button></div>
          </div>
          <div className="drop-screen">
            
            {error && <div className="error-msg" style={{marginBottom: 20}}>{error}</div>}

            <div className={`drop-zone${dragging ? " over" : ""}`} onDrop={(e) => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); }} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onClick={() => fileRef.current.click()}>
              {loading ? (<div className="loading-overlay"><div className="spinner" /><div className="loading-text">Przetwarzanie przez serwer...</div></div>) : null}
              <div className="drop-icon"><CodeIcon /></div>
              <div className="drop-title">Przeciągnij plik <span className="py">.py</span> lub <span className="java">.java</span> tutaj</div>
              <div className="drop-sub">lub kliknij, aby wybrać z dysku</div>
              <div className="drop-badge"><DownloadIcon /> Obsługa wkrótce połączona z API</div>
              <input ref={fileRef} type="file" accept=".py,.java" style={{ display: "none" }} onChange={(e) => { processFile(e.target.files[0]); }} />
            </div>

            <div className="github-section">
               <div className="divider">
                  <div className="divider-line"></div>
                  <div className="divider-text">LUB POBIERZ Z GITHUBA</div>
                  <div className="divider-line"></div>
               </div>
               <form onSubmit={handleGithubFetch} style={{ display: 'flex', gap: 10 }}>
                 <input 
                   className="login-input" 
                   style={{ margin: 0, flex: 1 }}
                   placeholder="Wklej link do pliku na GitHub"
                   value={githubUrl}
                   onChange={e => setGithubUrl(e.target.value)}
                 />
                 <button type="submit" className="btn btn-primary" style={{ margin: 0 }} disabled={loading || !githubUrl.trim()}>
                   <GithubIcon /> Analizuj
                 </button>
               </form>
            </div>

            {history.length > 0 && (
              <div className="history-section">
                <div className="history-title"><FileIcon /> Historia plików</div>
                <div className="history-list">
                  {history.map(item => (
                    <div key={item.id} className="history-item" onClick={() => loadFromHistory(item)}>
                      <div className="history-item-name"><span style={{color: ACCENT}}>●</span> {item.fileName}</div>
                      <div className="history-item-date">{item.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="editor-screen">
          <div className="editor-topbar">
            <button className="btn" onClick={() => { setScreen("drop"); setDocs({}); setSelected(null); setFileName(""); }}>← Wróć</button>
            <div className="file-chip"><div className="file-chip-icon"><CodeIcon /></div>{fileName}</div>
            <div className="topbar-right">
              <button className="btn" onClick={() => downloadReport('HTML')}><FileIcon /> Pobierz HTML</button>
              <button className="btn btn-primary" onClick={() => downloadReport('PDF')}><DownloadIcon /> Pobierz PDF</button>
            </div>
          </div>
          <div className="editor-body">
            <div className="sidebar">
              <div className="sidebar-label">Struktura (Z API)</div>
              {allItems.map(item => (<div key={item.key} className={`nav-item${selected === item.key ? " active" : ""}`} onClick={() => setSelected(item.key)}>{item.type === "class" ? "◈" : item.type === "module" ? "◉" : "◦"} {item.name}<span className={`nav-item-badge ${item.type === "class" ? "badge-class" : item.type === "module" ? "badge-mod" : "badge-fn"}`}>{item.type === "class" ? "cls" : item.type === "module" ? "mod" : "fn"}</span></div>))}
            </div>
            <div className="content-area">
              {!selDoc ? (<div className="empty-state"><div className="empty-icon"><CubeIcon /></div><div className="empty-text">Wybierz element z drzewa nawigacji</div></div>) : (
                <div className="doc-section">
                  <div className="doc-section-header"><span className={`section-type-badge type-${selDoc.type}`}>{selDoc.type}</span><span className="section-name">{selDoc.name}</span><button className="reset-btn" onClick={() => alert("Opcja resetu z serwera")}>↺ Reset</button></div>
                  <div className="doc-section-body">
                    <div className="doc-label">Opis</div>
                    <textarea className="doc-textarea" value={selDoc.description} onChange={e => updateDoc(selected, "description", e.target.value)} />
                    {selDoc.params && Object.keys(selDoc.params).length > 0 && (
                      <>
                        <div className="doc-label" style={{ marginTop: 14 }}>Parametry</div>
                        <div className="params-grid">
                          {Object.entries(selDoc.params).map(([p, desc]) => (
                            <div key={p} style={{display: 'contents'}}>
                              <div className="param-name">{p}</div>
                              <input className="param-input" value={desc} placeholder="Opis parametru..." onChange={e => updateParam(selected, p, e.target.value)} />
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
