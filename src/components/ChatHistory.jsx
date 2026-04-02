/**
 * ChatHistory.jsx — Conversational message thread
 *
 * Displays user prompts and AI responses in a chat-style panel.
 * AI messages show generated file list, error state, or a typing indicator.
 * Auto-scrolls to the latest message.
 * Error bubbles expose a Retry button that re-sends the last user prompt.
 * User messages show an Edit pencil on hover — clicking opens an inline editor
 * that lets the user revise and re-generate from that point in the conversation.
 */
import { useEffect, useRef, useState } from "react";
import { FaRobot, FaUser, FaExclamationTriangle, FaCheckCircle, FaWrench, FaRedo, FaEdit } from "react-icons/fa";

const STARTER_TEMPLATES = [
  { label: "📊 Sales Dashboard",  prompt: "Create a sales dashboard for managers. Show four KPI cards: Total Revenue, New Orders, Active Customers, and Return Rate. Below that show a table of recent orders with columns Order ID, Customer, Amount, Status, and Date. Include a search bar to find orders and an Export button." },
  { label: "📋 Customer List",    prompt: "Create a page that shows a list of customers. Display their Name, Company, Email, Phone, and Status. Add a search bar to find customers and a Create button to add a new customer." },
  { label: "📈 Analytics Charts", prompt: "Create an analytics overview page for business managers. Show KPI cards for Total Sales, Active Users, and Conversion Rate. Below that add a bar chart showing monthly revenue for the last 6 months and a line chart for weekly active users." },
  { label: "📝 Employee Form",    prompt: "Create a form where HR can register a new employee. Include fields for First Name, Last Name, Email, Phone, Department, Contract Type, and Start Date. Add Submit, Cancel, and Reset buttons." },
];

function ChatHistory({ messages, loading, onRetry, onEdit, onTemplateSelect }) {
  const bottomRef             = useRef(null);
  const editTextareaRef       = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText]   = useState("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus the textarea whenever we enter edit mode
  useEffect(() => {
    if (editingId !== null) {
      editTextareaRef.current?.focus();
    }
  }, [editingId]);

  function startEdit(msg) {
    setEditingId(msg.id);
    setEditText(msg.text);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  function saveEdit(msgIndex) {
    const trimmed = editText.trim();
    if (!trimmed) return;
    cancelEdit();
    onEdit?.(msgIndex, trimmed);
  }

  function handleEditKeyDown(e, msgIndex) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      saveEdit(msgIndex);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  }

  if (messages.length === 0 && !loading) {
    return (
      <div className="chat-empty">
        <div className="chat-empty-icon">🤖</div>
        <div className="chat-empty-title">SAP UI5 Builder</div>
        <div className="chat-empty-subtitle">
          Describe any SAP Fiori app and I'll generate the complete code.
        </div>
        <div className="chat-empty-hints">
          {STARTER_TEMPLATES.map((t) => (
            <button
              key={t.label}
              className="chat-hint-chip"
              onClick={() => onTemplateSelect?.(t.prompt)}
              title={t.prompt}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-history">
      {messages.map((msg, idx) => (
        <div key={msg.id} className={`chat-message chat-message-${msg.role}`}>
          <div className={`chat-avatar chat-avatar-${msg.role}`}>
            {msg.role === "user" ? <FaUser size={9} /> : <FaRobot size={9} />}
          </div>

          <div className="chat-bubble">
            {msg.role === "user" ? (
              editingId === msg.id ? (
                /* ── Inline edit mode ── */
                <div className="chat-edit-wrapper">
                  <textarea
                    ref={editTextareaRef}
                    className="chat-edit-textarea"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, idx)}
                    rows={3}
                  />
                  <div className="chat-edit-actions">
                    <span className="chat-edit-hint"><kbd>Ctrl+Enter</kbd> to save · <kbd>Esc</kbd> to cancel</span>
                    <div className="chat-edit-btns">
                      <button className="chat-edit-cancel-btn" onClick={cancelEdit}>Cancel</button>
                      <button
                        className="chat-edit-save-btn"
                        onClick={() => saveEdit(idx)}
                        disabled={!editText.trim()}
                      >
                        Save &amp; Regenerate
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Normal user message ── */
                <div className="chat-user-content">
                  <div className="chat-text">{msg.text}</div>
                  {!loading && onEdit && (
                    <button
                      className="chat-edit-icon"
                      onClick={() => startEdit(msg)}
                      title="Edit this message and regenerate"
                    >
                      <FaEdit size={11} />
                    </button>
                  )}
                </div>
              )
            ) : msg.isError ? (
              <div className="chat-error-text">
                <FaExclamationTriangle size={11} />
                <span>{msg.text}</span>
                {onRetry && msg.retryPrompt && (
                  <button
                    className="chat-retry-btn"
                    onClick={() => onRetry(msg.retryPrompt)}
                    title="Retry this request"
                  >
                    <FaRedo size={9} /> Retry
                  </button>
                )}
              </div>
            ) : msg.isLoading ? (
              <div className="chat-typing">
                <span className="chat-dot" />
                <span className="chat-dot" />
                <span className="chat-dot" />
              </div>
            ) : (
              <div className="chat-result">
                <div className="chat-result-header">
                  {msg.isRefinement ? (
                    <>
                      <FaWrench size={10} style={{ color: "#f5a623" }} />
                      <span>Refined — {msg.files?.length} files updated</span>
                      <span className="chat-badge chat-badge-refine">refined</span>
                    </>
                  ) : (
                    <>
                      <FaCheckCircle size={10} style={{ color: "#45c66e" }} />
                      <span>Generated {msg.files?.length} files</span>
                      <span className="chat-badge chat-badge-new">new app</span>
                    </>
                  )}
                </div>
                <div className="chat-file-chips">
                  {msg.files?.map((f) => (
                    <span key={f.path} className="chat-file-chip">
                      {f.path.split("/").pop()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {loading && (
        <div className="chat-message chat-message-assistant">
          <div className="chat-avatar chat-avatar-assistant">
            <FaRobot size={9} />
          </div>
          <div className="chat-bubble">
            <div className="chat-typing">
              <span className="chat-dot" />
              <span className="chat-dot" />
              <span className="chat-dot" />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

export default ChatHistory;
