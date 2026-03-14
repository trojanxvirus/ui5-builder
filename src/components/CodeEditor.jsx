import { useState } from "react";
import Editor from "@monaco-editor/react";
import { FaCopy, FaDownload, FaCheck } from "react-icons/fa";

function CodeEditor({ xml, isGenerating }) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(xml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset after 2s
  }

  function downloadXML() {
    const blob = new Blob([xml], { type: "text/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "view.xml";
    a.click();
  }

  return (
    <div
      className="editor-wrapper"
      style={{ position: "relative", height: "100%" }}
    >
      {/* Modern Toolbar */}
      <div
        className="editor-toolbar"
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "12px",
          padding: "12px 20px",
          background: "#0d0d10",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <button
          onClick={copyCode}
          className="toolbar-btn"
          style={{
            background: copied ? "#059669" : "#1c1c24",
            color: "white",
            border: "1px solid" + (copied ? "#059669" : "#27272a"),
            padding: "8px 16px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.3s ease",
            cursor: "pointer",
          }}
        >
          {copied ? <FaCheck size={12} /> : <FaCopy size={12} />}
          {copied ? "Copied!" : "Copy"}
        </button>

        <button
          onClick={downloadXML}
          className="toolbar-btn"
          style={{
            background: "transparent",
            color: "var(--text-main)",
            border: "1px solid #27272a",
            padding: "8px 16px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
          }}
        >
          <FaDownload size={12} /> Download
        </button>
      </div>

      {/* Editor Loading Overlay */}
      {isGenerating && (
        <div
          style={{
            position: "absolute",
            inset: "48px 0 0 0", // Below toolbar
            background: "rgba(9, 9, 11, 0.7)",
            backdropFilter: "blur(4px)",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent-purple)",
          }}
        >
          <div className="loader-line"></div>
          <span
            style={{
              marginTop: "12px",
              fontSize: "12px",
              fontWeight: "500",
              letterSpacing: "1px",
            }}
          >
            UPDATING SOURCE...
          </span>
        </div>
      )}

      <Editor
        height="calc(100% - 52px)"
        language="xml"
        theme="vs-dark"
        value={xml}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: "on",
          padding: { top: 20 },
          backgroundColor: "#0d0d10",
        }}
      />
    </div>
  );
}

export default CodeEditor;
