import { FaCode, FaMagic } from "react-icons/fa";

function Navbar() {
  return (
    <div
      className="navbar"
      style={{
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        borderBottom: "1px solid var(--border-color)",
        background: "rgba(18, 18, 23, 0.8)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        className="nav-left"
        style={{ display: "flex", alignItems: "center", gap: "12px" }}
      >
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
        <span
          style={{ fontWeight: 700, fontSize: "18px", letterSpacing: "-0.5px" }}
        >
          UI5<span style={{ color: "var(--accent-purple)" }}>Builder</span>
        </span>
      </div>

      <div className="nav-right">
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
