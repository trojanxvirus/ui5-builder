/**
 * CapStatusBadge.jsx — OData service health indicator for CAP projects.
 *
 * Shows the live status of the locally-running CDS service:
 *   idle     → not started (shouldn't be visible)
 *   starting → CDS process is booting (spinner)
 *   ready    → OData V4 service is live (green dot)
 *   error    → CDS failed to start (red, with retry button)
 */
import { FaCircle, FaRedo } from "react-icons/fa";
import { ClipLoader } from "react-spinners";

const STYLES = {
  idle: {
    bg: "rgba(90,150,227,0.08)",
    border: "rgba(90,150,227,0.2)",
    color: "#5a96e3",
    label: "OData idle",
  },
  starting: {
    bg: "rgba(245,166,35,0.08)",
    border: "rgba(245,166,35,0.25)",
    color: "#f5a623",
    label: "Starting OData…",
  },
  ready: {
    bg: "rgba(69,198,110,0.08)",
    border: "rgba(69,198,110,0.25)",
    color: "#45c66e",
    label: "OData V4 live",
  },
  error: {
    bg: "rgba(200,50,50,0.08)",
    border: "rgba(200,50,50,0.25)",
    color: "#c83232",
    label: "OData failed",
  },
};

function CapStatusBadge({ status = "idle", error, onRetry }) {
  const s = STYLES[status] ?? STYLES.idle;

  return (
    <div
      title={error ? `Error: ${error}` : `CAP OData service: ${status}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        fontSize: "11px",
        fontWeight: 500,
        padding: "3px 8px",
        borderRadius: "10px",
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
        userSelect: "none",
      }}
    >
      {status === "starting" ? (
        <ClipLoader size={9} color={s.color} />
      ) : (
        <FaCircle size={6} />
      )}
      {s.label}

      {status === "error" && onRetry && (
        <button
          onClick={onRetry}
          title="Retry CDS deploy"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: s.color,
            padding: "0 0 0 2px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <FaRedo size={9} />
        </button>
      )}
    </div>
  );
}

export default CapStatusBadge;
