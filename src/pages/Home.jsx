/**
 * Home.jsx — SAP Evening Horizon Theme
 * Sidebar + workspace use dark Evening Horizon surfaces.
 * Preview iframe is NOT touched — it renders its own UI5 theme.
 */
import { useState } from "react";
import PromptPanel from "../components/PromptPanel";
import FileExplorer from "../components/FileExplorer";
import MultiFileEditor from "../components/MultiFileEditor";
import PreviewFrame from "../components/PreviewFrame";
import { generateApp } from "../services/aiService";
import { FaTerminal, FaPlay, FaRobot, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import "../styles/layout.css";

function Home() {
  const [files, setFiles]               = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [tab, setTab]                   = useState("code");
  const [loading, setLoading]           = useState(false);
  const [appMeta, setAppMeta]           = useState(null);
  const [genError, setGenError]         = useState(null);

  async function handleGenerate(prompt) {
    if (!prompt || loading) return;
    setLoading(true);
    setGenError(null);
    setTab("code");
    try {
      const generated = await generateApp(prompt);
      setFiles(generated);
      const viewFile = generated.find(f => f.path.endsWith(".view.xml"));
      setSelectedFile(viewFile || generated[0] || null);
      const name = prompt
        .replace(/\b(create|generate|build|a|an|the|sap|ui5|fiori|app|application)\b/gi, "")
        .replace(/\s+/g, " ").trim().slice(0, 40);
      setAppMeta({
        name: name.charAt(0).toUpperCase() + name.slice(1) || "My App",
        description: `${generated.length} files generated`,
      });
    } catch (err) {
      console.error("handleGenerate error:", err);
      setGenError(err.message || "Something went wrong. Check the console.");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(updated) {
    setFiles(prev => prev.map(f => f.path === updated.path ? updated : f));
    setSelectedFile(updated);
  }

  // Evening Horizon status badge colors
  const statusColor  = loading ? "#5a96e3" : genError ? "#ff6b6b" : files.length > 0 ? "#45c66e" : "#5a7494";
  const statusBg     = loading ? "rgba(90,150,227,0.1)" : genError ? "rgba(255,107,107,0.1)" : files.length > 0 ? "rgba(69,198,110,0.1)" : "rgba(90,150,227,0.05)";
  const statusBorder = loading ? "rgba(90,150,227,0.25)" : genError ? "rgba(255,107,107,0.25)" : files.length > 0 ? "rgba(69,198,110,0.25)" : "rgba(90,150,227,0.12)";
  const statusBadge  = loading ? "Processing…" : genError ? "Error" : files.length > 0 ? `${files.length} Files` : "Ready";

  return (
    <div className="app-container">

      {/* ── Sidebar ─────────────────────────────────────── */}
      <div className="sidebar">
        <PromptPanel onGenerate={handleGenerate} loading={loading} />

        {/* Generating */}
        {loading && (
          <div style={{
            background: "rgba(90,150,227,0.1)",
            border: "1px solid rgba(90,150,227,0.2)",
            borderRadius: "6px", padding: "12px",
            display: "flex", alignItems: "center", gap: "10px",
          }}>
            <FaRobot className="spinning-icon" style={{ color: "#5a96e3", fontSize: "18px", flexShrink: 0 }}/>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#e5eaf0" }}>
                Generating app…
              </div>
              <div style={{ fontSize: "11px", color: "#5a7494", marginTop: "2px" }}>
                Building DynamicPage + MVC
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && genError && (
          <div style={{
            background: "rgba(255,107,107,0.08)",
            border: "1px solid rgba(255,107,107,0.22)",
            borderRadius: "6px", padding: "12px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", color: "#ff6b6b", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>
              <FaExclamationTriangle size={11}/> Generation failed
            </div>
            <div style={{ fontSize: "11px", color: "#c47a7a", lineHeight: 1.5 }}>{genError}</div>
          </div>
        )}

        {/* Success */}
        {!loading && files.length > 0 && !genError && (
          <div style={{
            background: "rgba(69,198,110,0.08)",
            border: "1px solid rgba(69,198,110,0.2)",
            borderRadius: "6px", padding: "12px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", color: "#45c66e", fontSize: "12px", fontWeight: 600, marginBottom: "8px" }}>
              <FaCheckCircle size={11}/> Generated Successfully
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {files.map(f => (
                <div key={f.path} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#5a7494" }}>
                  <span style={{ color: "#45c66e", fontSize: "9px" }}>✓</span>
                  <span style={{ fontFamily: "monospace" }}>{f.path.split("/").pop()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SAP info */}
        {!loading && (
          <div style={{
            background: "rgba(90,150,227,0.07)",
            border: "1px solid rgba(90,150,227,0.14)",
            borderRadius: "6px", padding: "11px",
          }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#5a96e3", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              SAP Standard
            </div>
            <div style={{ fontSize: "11px", color: "#5a7494", lineHeight: 1.5 }}>
              Uses <span style={{ color: "#8da6c0" }}>DynamicPage</span>,{" "}
              <span style={{ color: "#8da6c0" }}>SimpleForm</span> and real MVC —
              identical to production SAP Fiori apps.
            </div>
          </div>
        )}
      </div>

      {/* ── Workspace ───────────────────────────────────── */}
      <div className="workspace">

        {/* Header with tabs */}
        <div className="workspace-header">
          <div className="tabs">
            <button className={tab === "code" ? "active" : ""} onClick={() => setTab("code")}>
              <FaTerminal size={11}/> Code Editor
            </button>
            <button className={tab === "preview" ? "active" : ""} onClick={() => setTab("preview")}>
              <FaPlay size={10}/> Live Preview
            </button>
          </div>

          <div style={{
            fontSize: "11px", fontWeight: 500,
            padding: "3px 10px", borderRadius: "10px",
            background: statusBg, border: `1px solid ${statusBorder}`, color: statusColor,
          }}>
            {statusBadge}
          </div>
        </div>

        {/* Meta bar */}
        {appMeta && !loading && !genError && (
          <div className="app-meta-bar">
            <span style={{ fontSize: "13px" }}>📦</span>
            <span className="app-meta-name">{appMeta.name}</span>
            <span className="app-meta-desc">{appMeta.description}</span>
            <span className="app-meta-badge">UI5 1.120</span>
            <span className="app-meta-badge">sap_horizon</span>
            <span className="app-meta-badge">SAP Standard</span>
          </div>
        )}

        <div className="workspace-body">
          {tab === "code" && (
            <div className="code-view" style={{ animation: "fadeIn 0.2s ease" }}>
              <FileExplorer files={files} selectedFile={selectedFile} onFileSelect={setSelectedFile}/>
              <MultiFileEditor files={files} selectedFile={selectedFile} onChange={handleFileChange} isGenerating={loading}/>
            </div>
          )}
          {tab === "preview" && (
            <div className="preview-view" style={{ animation: "fadeIn 0.2s ease" }}>
              <PreviewFrame files={files}/>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;