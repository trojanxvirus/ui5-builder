/**
 * FileExplorer.jsx
 *
 * Displays generated app files as a collapsible folder tree.
 * Clicking a file selects it in the editor.
 */
import { useState } from "react";

// ─── File type → icon + color ─────────────────────────────────────────────────
function getFileIcon(path) {
  if (path.endsWith(".view.xml")) return { icon: "📄", color: "#60a5fa" };
  if (path.endsWith(".xml")) return { icon: "📄", color: "#60a5fa" };
  if (path.endsWith(".controller.js")) return { icon: "⚙️", color: "#f59e0b" };
  if (path.endsWith("Component.js")) return { icon: "🧩", color: "#a78bfa" };
  if (path.endsWith("models.js")) return { icon: "📦", color: "#34d399" };
  if (path.endsWith(".js")) return { icon: "📜", color: "#fbbf24" };
  if (path.endsWith(".json")) return { icon: "🗂️", color: "#f87171" };
  if (path.endsWith(".properties")) return { icon: "🌐", color: "#94a3b8" };
  return { icon: "📄", color: "#94a3b8" };
}

// ─── Build a tree structure from flat file paths ──────────────────────────────
function buildTree(files) {
  const root = {};

  files.forEach((file) => {
    const parts = file.path.split("/");
    let node = root;

    parts.forEach((part, idx) => {
      if (idx === parts.length - 1) {
        // Leaf: file
        if (!node.__files) node.__files = [];
        node.__files.push(file);
      } else {
        // Folder
        if (!node[part]) node[part] = {};
        node = node[part];
      }
    });
  });

  return root;
}

// ─── Recursive folder node ────────────────────────────────────────────────────
function FolderNode({
  name,
  node,
  files,
  selectedFile,
  onFileSelect,
  depth = 0,
}) {
  const [open, setOpen] = useState(true);

  const childFolders = Object.keys(node).filter((k) => k !== "__files");
  const childFiles = node.__files || [];

  return (
    <div className="file-tree-folder">
      <div
        className={`file-tree-folder-label ${open ? "open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        style={{ paddingLeft: `${14 + depth * 12}px` }}
      >
        {/* Chevron */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span style={{ fontSize: "14px" }}>{open ? "📂" : "📁"}</span>
        <span>{name}</span>
      </div>

      {open && (
        <div className="file-tree-children">
          {childFolders.map((folder) => (
            <FolderNode
              key={folder}
              name={folder}
              node={node[folder]}
              files={files}
              selectedFile={selectedFile}
              onFileSelect={onFileSelect}
              depth={depth + 1}
            />
          ))}
          {childFiles.map((file) => {
            const { icon, color } = getFileIcon(file.path);
            const name = file.path.split("/").pop();
            const isActive = selectedFile?.path === file.path;
            return (
              <div
                key={file.path}
                className={`file-tree-item ${isActive ? "active" : ""}`}
                onClick={() => onFileSelect(file)}
                style={{ paddingLeft: `${24 + depth * 12}px` }}
                title={file.path}
              >
                <span className="file-icon" style={{ color }}>
                  {icon}
                </span>
                <span>{name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function FileExplorer({ files, selectedFile, onFileSelect }) {
  if (!files || files.length === 0) {
    return (
      <div className="file-explorer">
        <div className="file-explorer-header">
          <span>EXPLORER</span>
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            padding: "20px",
            gap: "8px",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: "28px", opacity: 0.3 }}>📁</span>
          <span style={{ fontSize: "11px", opacity: 0.5 }}>
            Generate an app to see files
          </span>
        </div>
      </div>
    );
  }

  const tree = buildTree(files);
  const topLevelFolders = Object.keys(tree).filter((k) => k !== "__files");
  const topLevelFiles = tree.__files || [];

  return (
    <div className="file-explorer">
      <div className="file-explorer-header">
        <span>EXPLORER</span>
        <span style={{ fontSize: "11px", opacity: 0.5 }}>
          {files.length} files
        </span>
      </div>
      <div className="file-explorer-tree">
        {topLevelFolders.map((folder) => (
          <FolderNode
            key={folder}
            name={folder}
            node={tree[folder]}
            files={files}
            selectedFile={selectedFile}
            onFileSelect={onFileSelect}
            depth={0}
          />
        ))}
        {topLevelFiles.map((file) => {
          const { icon, color } = getFileIcon(file.path);
          const name = file.path.split("/").pop();
          const isActive = selectedFile?.path === file.path;
          return (
            <div
              key={file.path}
              className={`file-tree-item ${isActive ? "active" : ""}`}
              onClick={() => onFileSelect(file)}
              style={{ paddingLeft: "14px" }}
              title={file.path}
            >
              <span className="file-icon" style={{ color }}>
                {icon}
              </span>
              <span>{name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FileExplorer;
