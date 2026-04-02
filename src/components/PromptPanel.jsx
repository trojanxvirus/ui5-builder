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

const INITIAL_TEMPLATES = [
  { label: "📊 Sales Dashboard",  prompt: "Create a sales dashboard for managers. Show four KPI cards: Total Revenue, New Orders, Active Customers, and Return Rate. Below that show a table of recent orders with columns Order ID, Customer, Amount, Status, and Date. Include a search bar to find orders and an Export button." },
  { label: "📝 Employee Form",    prompt: "Create a form where HR can register a new employee. Include fields for First Name, Last Name, Email, Phone, Department, Contract Type, and Start Date. Add Submit, Cancel, and Reset buttons." },
  { label: "📋 Customer List",    prompt: "Create a page that shows a list of customers. Display their Name, Company, Email, Phone, and Status. Add a search bar to find customers and a Create button to add a new customer." },
  { label: "🗂️ Order Details",   prompt: "Create a page to view details of an order. Show the customer name, order amount, and status at the top. Include tabs for Overview, Items in the order, and Notes." },
  { label: "🏪 Product Catalog",  prompt: "Create a product catalog page showing a table of products. Include Product ID, Name, Category, Price, Stock Level, and Status. Add a search bar and a button to create a new product." },
  { label: "📈 Analytics Charts", prompt: "Create an analytics overview page for business managers. Show KPI cards for Total Sales, Active Users, and Conversion Rate. Below that add a bar chart showing monthly revenue for the last 6 months and a line chart for weekly active users." },
];

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

  const chips = isRefinement ? REFINEMENT_SUGGESTIONS : INITIAL_TEMPLATES.map((t) => t.label);
  const chipPrompts = isRefinement
    ? REFINEMENT_SUGGESTIONS
    : INITIAL_TEMPLATES.map((t) => t.prompt);

  return (
    <div className="prompt-panel">

      {/* ── Suggestion chips — horizontal scroll row ── */}
      {!loading && (
        <div className="prompt-chips-row">
          {chips.map((chip, i) => (
            <button
              key={chip}
              className="prompt-chip"
              onClick={() => setPrompt(chipPrompts[i])}
              title={chipPrompts[i]}
            >
              {chip}
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
