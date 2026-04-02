/**
 * ChatHistory.jsx — Conversational message thread
 *
 * Displays user prompts and AI responses in a chat-style panel.
 * AI messages show generated file list, error state, or a typing indicator.
 * Auto-scrolls to the latest message.
 * Error bubbles expose a Retry button that re-sends the last user prompt.
 */
import { useEffect, useRef } from "react";
import { FaRobot, FaUser, FaExclamationTriangle, FaCheckCircle, FaWrench, FaRedo } from "react-icons/fa";

function ChatHistory({ messages, loading, onRetry }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (messages.length === 0 && !loading) {
    return (
      <div className="chat-empty">
        <div className="chat-empty-icon">🤖</div>
        <div className="chat-empty-title">SAP UI5 Builder</div>
        <div className="chat-empty-subtitle">
          Describe any SAP Fiori app and I'll generate the complete code — or ask me to refine it afterwards.
        </div>
        <div className="chat-empty-hints">
          <span className="chat-hint-chip">📊 Sales dashboard</span>
          <span className="chat-hint-chip">📋 Customer list</span>
          <span className="chat-hint-chip">📈 Analytics charts</span>
          <span className="chat-hint-chip">📝 Employee form</span>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-history">
      {messages.map((msg) => (
        <div key={msg.id} className={`chat-message chat-message-${msg.role}`}>
          <div className={`chat-avatar chat-avatar-${msg.role}`}>
            {msg.role === "user" ? <FaUser size={9} /> : <FaRobot size={9} />}
          </div>

          <div className="chat-bubble">
            {msg.role === "user" ? (
              <div className="chat-text">{msg.text}</div>
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
