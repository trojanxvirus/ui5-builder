/**
 * Home.jsx — v4.3
 * Fix: surfaces API errors (402, 401, 429 etc.) visibly in the sidebar
 * Fix: generateApp now throws on API errors instead of silently falling back
 */
import { useState } from "react";
import PromptPanel from "../components/PromptPanel";
import FileExplorer from "../components/FileExplorer";
import MultiFileEditor from "../components/MultiFileEditor";
import PreviewFrame from "../components/PreviewFrame";
import { generateApp } from "../services/aiService";
import {
  FaTerminal,
  FaPlay,
  FaRobot,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import "../styles/layout.css";

function Home() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [tab, setTab] = useState("code");
  const [loading, setLoading] = useState(false);
  const [appMeta, setAppMeta] = useState(null);
  const [genError, setGenError] = useState(null);

  async function handleGenerate(prompt) {
    if (!prompt || loading) return;
    setLoading(true);
    setGenError(null);
    setTab("code");
    try {
      const generatedFiles = await generateApp(prompt);
      setFiles(generatedFiles);
      const viewFile = generatedFiles.find((f) => f.path.endsWith(".view.xml"));
      setSelectedFile(viewFile || generatedFiles[0] || null);
      const name = prompt
        .replace(/\b(create|generate|build|a|an|the|sap|ui5|fiori)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 40);
      setAppMeta({
        name: name.charAt(0).toUpperCase() + name.slice(1) || "My App",
        description: `${generatedFiles.length} files generated`,
        fileCount: generatedFiles.length,
      });
    } catch (err) {
      console.error("handleGenerate error:", err);
      setGenError(err.message || "Something went wrong. Check the console.");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(updatedFile) {
    setFiles((prev) =>
      prev.map((f) => (f.path === updatedFile.path ? updatedFile : f)),
    );
    setSelectedFile(updatedFile);
  }

  const statusBadge = loading
    ? "GENERATING..."
    : genError
      ? "ERROR"
      : files.length > 0
        ? `${files.length} FILES`
        : "IDLE";

  return (
    <div className="app-container">
      {/* LEFT SIDEBAR */}
      <div className="sidebar">
        <PromptPanel onGenerate={handleGenerate} loading={loading} />

        {loading && (
          <div
            style={{
              background: "rgba(139,92,246,0.05)",
              padding: "14px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              border: "1px solid var(--border-color)",
            }}
          >
            <FaRobot
              className="spinning-icon"
              style={{
                color: "var(--accent-purple)",
                fontSize: "20px",
                flexShrink: 0,
              }}
            />
            <div>
              <div
                style={{ fontSize: "13px", fontWeight: 600, color: "white" }}
              >
                AI generating app...
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  marginTop: "2px",
                }}
              >
                Building DynamicPage + MVC structure
              </div>
            </div>
          </div>
        )}

        {/* ERROR BANNER */}
        {!loading && genError && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              background: "rgba(239,68,68,0.07)",
              border: "1px solid rgba(239,68,68,0.3)",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#ef4444",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              <FaExclamationTriangle size={12} /> Generation failed
            </div>
            <div
              style={{ fontSize: "11px", color: "#fca5a5", lineHeight: 1.5 }}
            >
              {genError}
            </div>
          </div>
        )}

        {!loading && files.length > 0 && !genError && (
          <div
            style={{
              padding: "12px",
              borderRadius: "8px",
              background: "rgba(16,185,129,0.05)",
              border: "1px solid rgba(16,185,129,0.2)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#10b981",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              <FaCheckCircle /> App Generated Successfully
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                lineHeight: 1.6,
              }}
            >
              {files.map((f) => (
                <div
                  key={f.path}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <span style={{ color: "#10b981", fontSize: "9px" }}>✓</span>
                  <span style={{ fontFamily: "monospace" }}>
                    {f.path.split("/").pop()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && (
          <div
            style={{
              padding: "12px",
              borderRadius: "8px",
              background: "rgba(139,92,246,0.04)",
              border: "1px solid rgba(139,92,246,0.15)",
              fontSize: "11px",
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            <div
              style={{
                color: "var(--accent-purple)",
                fontWeight: 600,
                marginBottom: "4px",
              }}
            >
              💡 SAP Standard
            </div>
            Uses <strong style={{ color: "white" }}>DynamicPage</strong>,{" "}
            <strong style={{ color: "white" }}>SimpleForm</strong>,{" "}
            <strong style={{ color: "white" }}>IllustratedMessage</strong> and
            real MVC — identical to production SAP Fiori apps.
          </div>
        )}
      </div>

      {/* RIGHT WORKSPACE */}
      <div className="workspace">
        <div className="workspace-header">
          <div className="tabs">
            <button
              className={tab === "code" ? "active" : ""}
              onClick={() => setTab("code")}
            >
              <FaTerminal size={11} /> Code Editor
            </button>
            <button
              className={tab === "preview" ? "active" : ""}
              onClick={() => setTab("preview")}
            >
              <FaPlay size={10} /> Live Preview
            </button>
          </div>

          <div
            style={{
              fontSize: "11px",
              color: loading
                ? "var(--accent-purple)"
                : genError
                  ? "#ef4444"
                  : files.length > 0
                    ? "#10b981"
                    : "var(--text-muted)",
              background: "#1c1c24",
              padding: "4px 10px",
              borderRadius: "12px",
              border: "1px solid var(--border-color)",
              fontWeight: 500,
            }}
          >
            {statusBadge}
          </div>
        </div>

        {appMeta && !loading && !genError && (
          <div className="app-meta-bar">
            <span style={{ fontSize: "14px" }}>📦</span>
            <span className="app-meta-name">{appMeta.name}</span>
            <span className="app-meta-desc">{appMeta.description}</span>
            <span className="app-meta-badge">UI5 1.120</span>
            <span className="app-meta-badge">sap_horizon</span>
            <span className="app-meta-badge">SAP Standard</span>
          </div>
        )}

        <div className="workspace-body">
          {tab === "code" && (
            <div
              className="code-view"
              style={{ animation: "fadeIn 0.25s ease" }}
            >
              <FileExplorer
                files={files}
                selectedFile={selectedFile}
                onFileSelect={setSelectedFile}
              />
              <MultiFileEditor
                files={files}
                selectedFile={selectedFile}
                onChange={handleFileChange}
                isGenerating={loading}
              />
            </div>
          )}
          {tab === "preview" && (
            <div
              className="preview-view"
              style={{ animation: "fadeIn 0.25s ease" }}
            >
              <PreviewFrame files={files} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
