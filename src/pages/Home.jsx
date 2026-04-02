/**
 * Home.jsx — v6.0 CAP Full-Stack + Conversational Layout
 *
 * Adds CAP (Cloud Application Programming Model) support:
 * - generateCAPApp() is called when the AI produces a Floor Plan 7 result
 * - After generation, CDS files are deployed to the local server via capService
 * - capStatus tracks "idle" | "starting" | "ready" | "error"
 * - PreviewFrame receives capStatus so it can switch to live-OData iframe mode
 */
import { useState, useCallback } from "react";
import PromptPanel from "../components/PromptPanel";
import ChatHistory from "../components/ChatHistory";
import FileExplorer from "../components/FileExplorer";
import MultiFileEditor from "../components/MultiFileEditor";
import PreviewFrame from "../components/PreviewFrame";
import CapStatusBadge from "../components/CapStatusBadge";
import { generateApp, refineApp, generateCAPApp, generateSmartCAPApp, isCAPProject } from "../services/aiService";
import { deployCAP, stopCAP } from "../services/capService";
import { FaTerminal, FaPlay, FaPlus } from "react-icons/fa";
import "../styles/layout.css";

let _msgCounter = 0;
function nextId() { return ++_msgCounter; }

// Keywords that trigger full CAP generation (Floor Plan 7)
const CAP_KEYWORDS = /\b(cap|cds|odata backend|full.?stack|full stack|real data|production.?ready|deploy|real sap|sap hana|cds model|odata service)\b/i;

// Keywords that trigger SmartTable + CDS backend generation
const SMART_KEYWORDS = /\b(smart.?table|smart.?filter|smarttable|smartfilter|smart filter bar|smart form|sap\.ui\.comp)\b/i;

function Home() {
  const [conversation, setConversation]   = useState([]);
  const [files, setFiles]                 = useState([]);
  const [selectedFile, setSelectedFile]   = useState(null);
  const [tab, setTab]                     = useState("code");
  const [loading, setLoading]             = useState(false);
  const [appMeta, setAppMeta]             = useState(null);

  // CAP-specific state
  const [capStatus, setCapStatus]         = useState("idle"); // idle | starting | ready | error
  const [capError, setCapError]           = useState(null);
  const [isCapProject, setIsCapProject]   = useState(false);

  const isRefinementMode = files.length > 0;

  /** Deploy CDS files to the local server and update capStatus. */
  const handleCAPDeploy = useCallback(async (generatedFiles) => {
    setCapStatus("starting");
    setCapError(null);
    try {
      await deployCAP(generatedFiles);
      setCapStatus("ready");
    } catch (err) {
      console.error("CAP deploy error:", err);
      setCapError(err.message);
      setCapStatus("error");
    }
  }, []);

  async function handleGenerate(prompt) {
    if (!prompt || loading) return;

    const userMsgId = nextId();
    const aiMsgId   = nextId();

    setConversation((prev) => [
      ...prev,
      { id: userMsgId, role: "user", text: prompt },
      { id: aiMsgId,   role: "assistant", isLoading: true },
    ]);
    setLoading(true);
    setTab("code");

    try {
      let generated;
      const shouldGenerateCAP   = !isRefinementMode && CAP_KEYWORDS.test(prompt);
      const shouldGenerateSmart = !isRefinementMode && !shouldGenerateCAP && SMART_KEYWORDS.test(prompt);

      if (shouldGenerateCAP) {
        // Floor Plan 7 — full-stack CAP generation with sap.m.Table
        generated = await generateCAPApp(prompt);
      } else if (shouldGenerateSmart) {
        // SmartTable + SmartFilterBar with CDS seed data backend
        generated = await generateSmartCAPApp(prompt);
      } else if (isRefinementMode) {
        generated = await refineApp(prompt, files);
      } else {
        generated = await generateApp(prompt);
      }

      const capProject = isCAPProject(generated);
      setIsCapProject(capProject);
      setFiles(generated);

      const viewFile = generated.find((f) => f.path.endsWith(".view.xml"));
      setSelectedFile(viewFile || generated[0] || null);

      const appName = prompt
        .replace(/\b(create|generate|build|a|an|the|sap|ui5|fiori|app|application|add|make|update|change|remove|please|cap|cds|full.?stack)\b/gi, "")
        .replace(/\s+/g, " ").trim().slice(0, 40);

      setAppMeta({
        name: appName.charAt(0).toUpperCase() + appName.slice(1) || "My App",
        description: `${generated.length} files`,
        isCAP: capProject,
      });

      setConversation((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, isLoading: false, files: generated, isRefinement: isRefinementMode, isCAP: capProject }
            : m,
        ),
      );

      // For CAP projects, deploy CDS files to the local server (async, non-blocking)
      if (capProject) {
        setTab("preview"); // switch to preview tab so user sees the status badge
        handleCAPDeploy(generated);
      }
    } catch (err) {
      console.error("handleGenerate error:", err);
      setConversation((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, isLoading: false, isError: true, text: err.message || "Something went wrong.", retryPrompt: prompt }
            : m,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  function handleNewChat() {
    if (loading) return;
    setConversation([]);
    setFiles([]);
    setSelectedFile(null);
    setAppMeta(null);
    setTab("code");
    setIsCapProject(false);
    setCapStatus("idle");
    setCapError(null);
    // Stop any running CDS process
    stopCAP().catch(() => {});
  }

  function handleFileChange(updated) {
    setFiles((prev) => prev.map((f) => (f.path === updated.path ? updated : f)));
    setSelectedFile(updated);
  }

  // Status badge
  const statusColor  = loading ? "#5a96e3" : files.length > 0 ? "#45c66e" : "#5a7494";
  const statusBg     = loading ? "rgba(90,150,227,0.1)" : files.length > 0 ? "rgba(69,198,110,0.1)" : "rgba(90,150,227,0.05)";
  const statusBorder = loading ? "rgba(90,150,227,0.25)" : files.length > 0 ? "rgba(69,198,110,0.25)" : "rgba(90,150,227,0.12)";
  const statusBadge  = loading ? "Processing…" : files.length > 0 ? `${files.length} Files` : "Ready";

  return (
    <div className="app-container">

      {/* ── Sidebar (chat) ─────────────────────────────────────── */}
      <div className="sidebar">

        <div className="sidebar-header">
          <span className="sidebar-title">UI5 Builder</span>
          {conversation.length > 0 && (
            <button
              className="new-chat-btn"
              onClick={handleNewChat}
              disabled={loading}
              title="Start a new app"
            >
              <FaPlus size={9} /> New App
            </button>
          )}
        </div>

        <div className="chat-history-wrapper">
          <ChatHistory messages={conversation} loading={loading} onRetry={handleGenerate} />
        </div>

        <PromptPanel
          onGenerate={handleGenerate}
          loading={loading}
          isRefinement={isRefinementMode}
        />
      </div>

      {/* ── Workspace ───────────────────────────────────── */}
      <div className="workspace">

        <div className="workspace-header">
          <div className="tabs">
            <button className={tab === "code" ? "active" : ""} onClick={() => setTab("code")}>
              <FaTerminal size={11} /> Code Editor
            </button>
            <button className={tab === "preview" ? "active" : ""} onClick={() => setTab("preview")}>
              <FaPlay size={10} /> Live Preview
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* CAP OData service status badge */}
            {isCapProject && (
              <CapStatusBadge
                status={capStatus}
                error={capError}
                onRetry={() => handleCAPDeploy(files)}
              />
            )}

            <div style={{
              fontSize: "11px", fontWeight: 500,
              padding: "3px 10px", borderRadius: "10px",
              background: statusBg, border: `1px solid ${statusBorder}`, color: statusColor,
            }}>
              {statusBadge}
            </div>
          </div>
        </div>

        {appMeta && !loading && (
          <div className="app-meta-bar">
            <span style={{ fontSize: "13px" }}>{appMeta.isCAP ? "🏗️" : "📦"}</span>
            <span className="app-meta-name">{appMeta.name}</span>
            <span className="app-meta-desc">{appMeta.description}</span>
            <span className="app-meta-badge">UI5 1.120</span>
            <span className="app-meta-badge">sap_horizon</span>
            {appMeta.isCAP && (
              <span className="app-meta-badge" style={{ color: "#0070f2", borderColor: "rgba(0,112,242,0.3)", background: "rgba(0,112,242,0.08)" }}>
                CAP + OData V4
              </span>
            )}
            {isRefinementMode && !appMeta.isCAP && (
              <span className="app-meta-badge" style={{ color: "#f5a623", borderColor: "rgba(245,166,35,0.3)", background: "rgba(245,166,35,0.08)" }}>
                ✎ conversational
              </span>
            )}
          </div>
        )}

        <div className="workspace-body">
          {tab === "code" && (
            <div className="code-view" style={{ animation: "fadeIn 0.2s ease" }}>
              <FileExplorer files={files} selectedFile={selectedFile} onFileSelect={setSelectedFile} />
              <MultiFileEditor files={files} selectedFile={selectedFile} onChange={handleFileChange} isGenerating={loading} />
            </div>
          )}
          {tab === "preview" && (
            <div className="preview-view" style={{ animation: "fadeIn 0.2s ease" }}>
              <PreviewFrame
                files={files}
                capStatus={capStatus}
                isCapProject={isCapProject}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
