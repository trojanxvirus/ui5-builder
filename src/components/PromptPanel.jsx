/**
 * PromptPanel.jsx — v4.0 Conversational
 *
 * Context-aware chat input that shifts between two modes:
 *   - Fresh mode  (no files yet): "Describe Your App" + quick templates
 *   - Refine mode (files exist):  "Refine your app..." with refinement examples
 *
 * Ctrl/Cmd+Enter submits. Auto-expands textarea on focus.
 */
import { useState } from "react";
import { IoSparkles, IoArrowUp } from "react-icons/io5";
import { FaStop, FaPaperclip } from "react-icons/fa";

const INITIAL_TEMPLATES = [
  { label: "📊 Sales Dashboard",   prompt: "Create a sales dashboard for managers. Show four KPI cards: Total Revenue, New Orders, Active Customers, and Return Rate. Below that show a table of recent orders with columns Order ID, Customer, Amount, Status, and Date. Include a search bar to find orders and an Export button." },
  { label: "📝 Employee Form",      prompt: "Create a form where HR can register a new employee. Include fields for First Name, Last Name, Email, Phone, Department, Contract Type, and Start Date. Add Submit, Cancel, and Reset buttons." },
  { label: "📋 Customer List",      prompt: "Create a page that shows a list of customers. Display their Name, Company, Email, Phone, and Status. Add a search bar to find customers and a Create button to add a new customer." },
  { label: "🗂️ Order Details",     prompt: "Create a page to view details of an order. Show the customer name, order amount, and status at the top. Include tabs for Overview, Items in the order, and Notes." },
  { label: "🏪 Product Catalog",    prompt: "Create a product catalog page showing a table of products. Include Product ID, Name, Category, Price, Stock Level, and Status. Add a search bar and a button to create a new product." },
  { label: "📈 Analytics Charts",   prompt: "Create an analytics overview page for business managers. Show KPI cards for Total Sales, Active Users, and Conversion Rate. Below that add a bar chart showing monthly revenue for the last 6 months and a line chart for weekly active users." },
];

const REFINEMENT_SUGGESTIONS = [
  "Add a date range filter to the toolbar",
  "Change the table to show 10 rows with pagination",
  "Add an export to Excel button",
  "Add a pie chart showing status distribution",
  "Make the status column show colored badges",
  "Add a Create dialog with a form",
];

const INITIAL_PLACEHOLDER = `Describe the SAP Fiori app you want to build.

Examples:
• Create a sales dashboard with KPI cards and charts
• Create a customer list with search and filters
• Create an employee registration form`;

const REFINEMENT_PLACEHOLDER = `Ask me to refine the generated app.

Examples:
• Add a date filter to the toolbar
• Add a pie chart showing status distribution
• Change the table color for active status to green
• Add an export to Excel button`;

function PromptPanel({ onGenerate, onStop, loading, isRefinement }) {
  const [prompt, setPrompt]           = useState("");
  const [showTemplates, setShowTemplates] = useState(true);

  function handleSubmit() {
    const trimmed = prompt.trim();
    if (!trimmed) return;
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

      {/* Templates / Suggestions — shown only when not loading */}
      {!loading && (
        <div className="templates">
          <div
            className="templates-toggle"
            onClick={() => setShowTemplates((v) => !v)}
          >
            <span>{isRefinement ? "💡 Suggestions" : "⚡ Quick Templates"}</span>
            <span style={{ opacity: 0.5 }}>{showTemplates ? "▲" : "▼"}</span>
          </div>

          {showTemplates && (
            <div className="template-buttons">
              {isRefinement
                ? REFINEMENT_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setPrompt(s)}
                      disabled={loading}
                      title={s}
                    >
                      {s}
                    </button>
                  ))
                : INITIAL_TEMPLATES.map((t) => (
                    <button
                      key={t.label}
                      onClick={() => setPrompt(t.prompt)}
                      disabled={loading}
                      title={t.prompt}
                    >
                      {t.label}
                    </button>
                  ))}
            </div>
          )}
        </div>
      )}

      {/* Input area */}
      <div className="chat-input-area">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRefinement ? REFINEMENT_PLACEHOLDER : INITIAL_PLACEHOLDER}
          disabled={loading}
          rows={3}
          style={loading ? { opacity: 0.5 } : undefined}
        />

        <div className="chat-input-footer">
          <div className="chat-input-left">
            <button
              className="attach-btn"
              disabled
              title="Attach files — coming soon"
            >
              <FaPaperclip size={12} />
              <span className="attach-label">Attach</span>
              <span className="attach-soon-badge">Soon</span>
            </button>
            <span className="chat-input-hint">
              {isRefinement ? "Refining existing app" : "New app generation"}
              {" · "}
              <kbd>Ctrl+Enter</kbd> to send
            </span>
          </div>
          {loading ? (
            <button
              className="stop-btn"
              onClick={onStop}
              title="Stop generating"
            >
              <FaStop size={11} /> Stop
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
  );
}

export default PromptPanel;
