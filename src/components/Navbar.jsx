/**
 * Navbar — SAP Evening Horizon Shell Bar
 *
 * sapShellColor: #1c2228 (dark, same as page bg in Evening Horizon)
 * Shell border: #2e3840 (subtle separator)
 * SAP blue: #5a96e3 (brighter for dark background readability)
 * Height: 44px (SAP standard)
 */
function Navbar() {
  return (
    <header
      style={{
        height: "44px",
        minHeight: "44px",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px 0 4px",
        background: "#1c2228",
        borderBottom: "1px solid #2e3840",
        position: "sticky",
        top: 0,
        zIndex: 200,
      }}
    >
      {/* Left: back + SAP logo + product name */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <ShellBtn title="Back">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </ShellBtn>

        {/* SAP blue circle + SAP text */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "0 10px",
            height: "36px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.06)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <div
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              background: "#5a96e3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: "8px",
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "0.2px",
              }}
            >
              SAP
            </span>
          </div>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#e5eaf0" }}>
            SAP
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            width: "1px",
            height: "16px",
            background: "rgba(255,255,255,0.15)",
            margin: "0 2px",
          }}
        />

        {/* Product name + caret */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "3px",
            padding: "4px 8px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.06)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: "rgba(229,234,240,0.85)",
              whiteSpace: "nowrap",
            }}
          >
            UI5 Builder
          </span>
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(229,234,240,0.45)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Right: icons + avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
        <ShellBtn title="Search">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="20" y1="20" x2="16" y2="16" />
          </svg>
        </ShellBtn>

        <ShellBtn title="Settings">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06
              a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09
              A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83
              l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09
              A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83
              l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09
              a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83
              l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09
              a1.65 1.65 0 0 0-1.51 1z"
            />
          </svg>
        </ShellBtn>

        <ShellBtn title="Notifications" badge>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </ShellBtn>

        {/* User avatar */}
        <div
          title="John Smith"
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #3a6db5 0%, #2a52a0 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10px",
            fontWeight: 700,
            color: "#e5eaf0",
            cursor: "pointer",
            marginLeft: "6px",
            border: "1.5px solid rgba(229,234,240,0.2)",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          JS
        </div>
      </div>
    </header>
  );
}

function ShellBtn({ children, title, badge }) {
  return (
    <div
      title={title}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        cursor: "pointer",
        color: "rgba(229,234,240,0.65)",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.08)";
        e.currentTarget.style.color = "#e5eaf0";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "rgba(229,234,240,0.65)";
      }}
    >
      <div style={{ width: "16px", height: "16px" }}>{children}</div>
      {badge && (
        <div
          style={{
            position: "absolute",
            top: "6px",
            right: "6px",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "#5a96e3",
            border: "1.5px solid #1c2228",
          }}
        />
      )}
    </div>
  );
}

export default Navbar;
