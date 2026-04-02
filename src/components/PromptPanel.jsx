/**
 * PromptPanel.jsx — v5.0
 *
 * Redesigned prompt input for better UX:
 *   - Template/suggestion chips in a compact horizontal scroll row
 *   - Unified input card with auto-growing textarea
 *   - Clean toolbar bar: + button, mode badge, send / stop
 */
import { useState, useRef, useEffect } from "react";
import { IoArrowUp } from "react-icons/io5";
import { FaStop } from "react-icons/fa";

const REFINEMENT_SUGGESTIONS = [
  "Add a date range filter",
  "Add export to Excel button",
  "Add a pie chart for status",
  "Show colored status badges",
  "Add a Create dialog",
  "Add pagination (10 rows)",
];

function PromptPanel({ onGenerate, onStop, loading, isRefinement }) {
  const [prompt, setPrompt]             = useState("");
  const [showComingSoon, setShowComingSoon] = useState(false);
  const textareaRef                     = useRef(null);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [prompt]);

  function handleSubmit() {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;
    onGenerate(trimmed);
    setPrompt("");
  }

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="prompt-panel">

      {/* ── Refinement suggestion chips ── */}
      {!loading && isRefinement && (
        <div className="prompt-chips-row">
          {REFINEMENT_SUGGESTIONS.map((s) => (
            <button key={s} className="prompt-chip" onClick={() => setPrompt(s)} title={s}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* ── Input card ── */}
      <div className="prompt-input-card">
        <textarea
          ref={textareaRef}
          className="prompt-textarea"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isRefinement
              ? "Ask me to refine the app…"
              : "Describe the SAP Fiori app you want to build…"
          }
          disabled={loading}
          rows={1}
        />

        <div className="prompt-toolbar">
          {/* Left: + button */}
          <div className="prompt-toolbar-left">
            <div className="plus-btn-wrapper">
              <button
                className="plus-btn"
                onClick={() => setShowComingSoon((v) => !v)}
                title="More options"
              >
                +
              </button>
              {showComingSoon && (
                <div className="coming-soon-popover">
                  🚀 This feature will be added soon!
                  <button className="coming-soon-close" onClick={() => setShowComingSoon(false)}>✕</button>
                </div>
              )}
            </div>

            <span className={`prompt-mode-badge ${isRefinement ? "mode-refine" : "mode-new"}`}>
              {isRefinement ? "✎ Refine" : "✦ New"}
            </span>
          </div>

          {/* Right: hint + send/stop */}
          <div className="prompt-toolbar-right">
            <span className="prompt-hint"><kbd>⌘↵</kbd></span>
            {loading ? (
              <button className="stop-btn" onClick={onStop} title="Stop generating">
                <FaStop size={10} /> Stop
              </button>
            ) : (
              <button
                className="send-btn"
                onClick={handleSubmit}
                disabled={!prompt.trim()}
                title="Generate (Ctrl+Enter)"
              >
                <IoArrowUp size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PromptPanel;
