/**
 * Navbar.jsx — v2.0
 */
import { FaCode, FaMagic } from "react-icons/fa";

function Navbar() {
  return (
    <div
      style={{
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        borderBottom: "1px solid var(--border-color)",
        background: "rgba(18, 18, 23, 0.95)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        flexShrink: 0,
      }}
    >
      {/* Left: Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            background: "var(--accent-purple)",
            padding: "8px",
            borderRadius: "8px",
            display: "flex",
          }}
        >
          <FaCode size={18} color="white" />
        </div>
        <div>
          <span
            style={{
              fontWeight: 700,
              fontSize: "18px",
              letterSpacing: "-0.5px",
            }}
          >
            UI5<span style={{ color: "var(--accent-purple)" }}>Builder</span>
          </span>
          <span
            style={{
              marginLeft: "8px",
              fontSize: "10px",
              color: "var(--text-muted)",
              background: "#1c1c24",
              padding: "2px 6px",
              borderRadius: "4px",
              border: "1px solid var(--border-color)",
              letterSpacing: "0.05em",
            }}
          >
            v2.0
          </span>
        </div>
      </div>

      {/* Right: Badge */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#10b981",
              display: "inline-block",
            }}
          />
          Full App Generation
        </div>
        <div
          style={{
            background: "rgba(139, 92, 246, 0.1)",
            border: "1px solid var(--accent-purple)",
            color: "var(--accent-purple)",
            padding: "4px 12px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <FaMagic size={10} />
          Fiori AI Core
        </div>
      </div>
    </div>
  );
}

export default Navbar;
