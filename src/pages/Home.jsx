import { useState } from "react";
import PromptPanel from "../components/PromptPanel";
import CodeEditor from "../components/CodeEditor";
import PreviewFrame from "../components/PreviewFrame";
import { generateXML } from "../services/aiService";
import { validateXML } from "../utils/xmlValidator";
import { FaTerminal, FaPlay, FaRobot, FaCheckCircle } from "react-icons/fa";
import "../styles/layout.css";

function Home() {
  const [xml, setXML] = useState("");
  const [tab, setTab] = useState("code");
  const [loading, setLoading] = useState(false);

  async function handleGenerate(prompt) {
    if (!prompt) return;

    setLoading(true);

    try {
      const result = await generateXML(prompt);
      const validation = validateXML(result);

      if (!validation.valid) {
        console.warn(validation.message);
      }

      setXML(result);
      // Automatically switch to code tab to show the progress/result
      setTab("code");
    } catch (err) {
      console.error("Generation Error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-container">
      {/* LEFT SIDEBAR: AI CONTROLS */}
      <div className="sidebar">
        <PromptPanel onGenerate={handleGenerate} />

        {loading && (
          <div
            className="loading-box"
            style={{
              borderLeft: "3px solid var(--accent-purple)",
              background: "rgba(139, 92, 246, 0.05)",
              padding: "16px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginTop: "10px",
              border: "1px solid var(--border-color)",
            }}
          >
            <FaRobot
              className="spinning-icon"
              style={{ color: "var(--accent-purple)", fontSize: "20px" }}
            />
            <div>
              <div
                style={{ fontSize: "13px", fontWeight: "600", color: "white" }}
              >
                AI at work...
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                Generating Fiori XML
              </div>
            </div>
          </div>
        )}

        {!loading && xml && (
          <div
            style={{
              padding: "12px",
              borderRadius: "8px",
              background: "rgba(16, 185, 129, 0.05)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#10b981",
              fontSize: "12px",
            }}
          >
            <FaCheckCircle /> View Generated Successfully
          </div>
        )}
      </div>

      {/* RIGHT MAIN: WORKSPACE */}
      <div className="workspace">
        <div className="workspace-header">
          <div className="tabs">
            <button
              className={tab === "code" ? "active" : ""}
              onClick={() => setTab("code")}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <FaTerminal size={12} /> Code Editor
              </div>
            </button>

            <button
              className={tab === "preview" ? "active" : ""}
              onClick={() => setTab("preview")}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <FaPlay size={10} /> Live Preview
              </div>
            </button>
          </div>

          <div
            className="status-badge"
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              background: "#1c1c24",
              padding: "4px 10px",
              borderRadius: "12px",
              border: "1px solid var(--border-color)",
            }}
          >
            {loading ? "PROCESSING..." : xml ? "V1.0 STANDALONE" : "IDLE"}
          </div>
        </div>

        <div
          className="workspace-body"
          style={{ height: "100%", overflow: "hidden" }}
        >
          {tab === "code" && (
            <div style={{ height: "100%", animation: "fadeIn 0.3s ease" }}>
              {/* Added isGenerating prop to trigger the internal loader */}
              <CodeEditor xml={xml} isGenerating={loading} />
            </div>
          )}

          {tab === "preview" && (
            <div
              className="preview-container"
              style={{ height: "100%", padding: "20px" }}
            >
              <div
                className="preview-window"
                style={{ height: "100%", background: "white" }}
              >
                {/* The key={xml} forces the iframe to refresh when new code arrives */}
                <PreviewFrame key={xml} xml={xml} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
