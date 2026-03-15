/**
 * MultiFileEditor.jsx
 *
 * Monaco-based code editor for the multi-file generated app.
 * Features:
 *   - Shows active file path in the toolbar
 *   - Language detection from file extension
 *   - Copy file content
 *   - Download single file
 *   - Download all files as ZIP (using jszip)
 *   - Loading overlay during generation
 */
import { useState } from "react";
import Editor from "@monaco-editor/react";
import JSZip from "jszip";
import { FaCopy, FaDownload, FaCheck } from "react-icons/fa";
import { FiDownloadCloud } from "react-icons/fi";

// ─── Language detection ───────────────────────────────────────────────────────
function detectLanguage(file) {
  if (!file) return "plaintext";
  const path = file.path || "";
  if (path.endsWith(".xml")) return "xml";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".js")) return "javascript";
  if (path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".properties")) return "ini";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".html")) return "html";
  return file.language || "plaintext";
}

// ─── File icon by extension ───────────────────────────────────────────────────
function getFileColor(path = "") {
  if (path.endsWith(".xml")) return "#60a5fa";
  if (path.endsWith(".json")) return "#f87171";
  if (path.endsWith(".properties")) return "#94a3b8";
  if (path.endsWith(".js")) return "#fbbf24";
  return "#94a3b8";
}

// ─── Main component ───────────────────────────────────────────────────────────
function MultiFileEditor({ files, selectedFile, onChange, isGenerating }) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const language = detectLanguage(selectedFile);
  const content = selectedFile?.content ?? "";
  const filePath = selectedFile?.path ?? "";

  // ── Copy current file ────────────────────────────────────────
  function handleCopy() {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Download current file ─────────────────────────────────────
  function handleDownloadFile() {
    if (!content || !filePath) return;
    const filename = filePath.split("/").pop();
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Download all files as ZIP ─────────────────────────────────
  async function handleDownloadAll() {
    if (!files || files.length === 0) return;
    setDownloading(true);
    try {
      const zip = new JSZip();
      files.forEach((file) => {
        zip.file(file.path, file.content);
      });
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ui5-app.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ZIP error:", err);
    } finally {
      setDownloading(false);
    }
  }

  // ── Handle editor content change ─────────────────────────────
  function handleEditorChange(value) {
    if (onChange && selectedFile) {
      onChange({ ...selectedFile, content: value ?? "" });
    }
  }

  return (
    <div className="multi-editor">
      {/* Toolbar */}
      <div className="editor-toolbar">
        <div
          className="editor-file-path"
          style={{
            color: filePath ? getFileColor(filePath) : "var(--text-muted)",
          }}
        >
          {filePath || "No file selected"}
        </div>

        <div className="editor-actions">
          {/* Copy */}
          <button
            onClick={handleCopy}
            className={`toolbar-btn ${copied ? "success" : ""}`}
            disabled={!content}
            title="Copy file content"
          >
            {copied ? <FaCheck size={11} /> : <FaCopy size={11} />}
            {copied ? "Copied!" : "Copy"}
          </button>

          {/* Download single file */}
          <button
            onClick={handleDownloadFile}
            className="toolbar-btn"
            disabled={!content}
            title="Download this file"
          >
            <FaDownload size={11} />
            File
          </button>

          {/* Download all as ZIP */}
          <button
            onClick={handleDownloadAll}
            className="toolbar-btn primary"
            disabled={!files || files.length === 0 || downloading}
            title="Download all files as ZIP"
          >
            <FiDownloadCloud size={13} />
            {downloading ? "Zipping..." : "Download All"}
          </button>
        </div>
      </div>

      {/* Editor body — relative container for overlay */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {/* Generation overlay */}
        {isGenerating && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(9, 9, 11, 0.75)",
              backdropFilter: "blur(4px)",
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              color: "var(--accent-purple)",
            }}
          >
            <div className="loader-line" />
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "1px",
              }}
            >
              GENERATING APP...
            </span>
          </div>
        )}

        {/* Empty state */}
        {!isGenerating && !selectedFile && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              gap: "12px",
            }}
          >
            <span style={{ fontSize: "40px", opacity: 0.2 }}>💻</span>
            <span style={{ fontSize: "13px", opacity: 0.4 }}>
              Select a file from the explorer
            </span>
          </div>
        )}

        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={content}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
            fontLigatures: true,
            wordWrap: "on",
            padding: { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
            renderLineHighlight: "all",
            cursorBlinking: "smooth",
            smoothScrolling: true,
            tabSize: 2,
          }}
        />
      </div>
    </div>
  );
}

export default MultiFileEditor;
