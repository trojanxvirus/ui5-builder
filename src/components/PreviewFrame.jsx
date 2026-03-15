/**
 * PreviewFrame.jsx — v4.3
 *
 * Shell header redesigned to exactly match real SAP Fiori / SAP BTP shell.
 * Based on screenshot analysis of actual SAP shell bar:
 *
 * Background: #162033 (very dark navy)
 * Left:  back-arrow + blue-circle SAP icon + "SAP" text + "Product ▼"
 * Right: search + settings + bell + compact avatar circle
 */
import { useEffect, useRef, useState } from "react";
import { ClipLoader } from "react-spinners";

function extractControllerModuleKey(xml) {
  if (!xml) return null;
  const match = xml.match(/controllerName="([^"]+)"/);
  if (!match) return null;
  return match[1].replace(/\./g, "/") + ".controller.js";
}

function PreviewFrame({ files, xml: xmlProp }) {
  const [loading, setLoading] = useState(true);
  const [renderError, setRenderError] = useState(null);
  const handlerRef = useRef(null);
  const timeoutRef = useRef(null);

  const viewFile = files?.find(
    (f) =>
      f.path.endsWith(".view.xml") ||
      (f.language === "xml" && f.path.includes("view")),
  );
  const ctrlFile = files?.find((f) => f.path.endsWith(".controller.js"));

  const xml = viewFile?.content ?? xmlProp ?? "";
  const controllerJs = ctrlFile?.content ?? "";

  useEffect(() => {
    if (!xml) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setRenderError(null);
    if (handlerRef.current)
      window.removeEventListener("message", handlerRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setLoading(false), 20000);
    const handler = (event) => {
      if (event.data === "UI5_READY") {
        clearTimeout(timeoutRef.current);
        setLoading(false);
      } else if (
        typeof event.data === "string" &&
        event.data.startsWith("UI5_ERROR:")
      ) {
        clearTimeout(timeoutRef.current);
        setRenderError(event.data.replace("UI5_ERROR:", "").trim());
        setLoading(false);
      }
    };
    handlerRef.current = handler;
    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
      clearTimeout(timeoutRef.current);
    };
  }, [xml, controllerJs]);

  if (!xml) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#888",
          gap: "16px",
          background: "#f5f5f5",
        }}
      >
        <div style={{ fontSize: "56px" }}>🖼️</div>
        <div style={{ fontSize: "14px", fontWeight: 500 }}>
          Generate an app to see the live preview
        </div>
        <div style={{ fontSize: "12px", color: "#bbb" }}>
          Use the prompt panel on the left
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height: "100%", minHeight: "600px" }}>
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#f5f5f5",
            gap: "16px",
          }}
        >
          <ClipLoader size={40} color="#0070f3" />
          <div style={{ fontSize: "13px", color: "#666" }}>
            Loading SAP UI5 framework…
          </div>
          <div style={{ fontSize: "11px", color: "#aaa" }}>
            First load may take a few seconds
          </div>
        </div>
      )}
      {renderError && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 11,
            background: "#fff0f0",
            borderBottom: "1px solid #ffcccc",
            color: "#cc0000",
            padding: "10px 16px",
            fontSize: "12px",
            fontFamily: "monospace",
            lineHeight: 1.5,
            maxHeight: "120px",
            overflow: "auto",
          }}
        >
          <strong>⚠️ Render Error:</strong>
          <br />
          {renderError}
        </div>
      )}
      <iframe
        key={xml + controllerJs}
        srcDoc={buildPreviewHTML(xml, controllerJs)}
        title="SAP Fiori Preview"
        sandbox="allow-scripts allow-same-origin"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
      />
    </div>
  );
}

function buildPreviewHTML(xml, controllerJs) {
  if (!xml) return "<html><body></body></html>";

  const controllerModuleKey = extractControllerModuleKey(xml);
  const safeXml = JSON.stringify(xml);
  const safeCtrl = JSON.stringify(controllerJs || "");
  const safeModuleKey = JSON.stringify(controllerModuleKey || "");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>SAP Fiori</title>

  <script
    id="sap-ui-bootstrap"
    src="https://ui5.sap.com/1.120/resources/sap-ui-core.js"
    data-sap-ui-theme="sap_horizon"
    data-sap-ui-libs="sap.m,sap.f,sap.ui.core,sap.ui.layout,sap.ui.unified"
    data-sap-ui-async="true"
    data-sap-ui-compatVersion="edge"
    data-sap-ui-frameOptions="allow"
  ></script>

  <script>
    sap.ui.getCore().attachInit(function () {
      var sXml       = ${safeXml};
      var sCtrl      = ${safeCtrl};
      var sModuleKey = ${safeModuleKey};

      if (sCtrl && sModuleKey) {
        var oPreload = {};
        oPreload[sModuleKey] = sCtrl;
        sap.ui.require.preload(oPreload);
      }

      sap.ui.require(["sap/ui/core/mvc/XMLView", "sap/m/App"],
        function (XMLView, App) {
          XMLView.create({ definition: sXml })
            .then(function (oView) {
              new App({ pages: [oView], height: "100%" }).placeAt("ui5-content");
              window.parent.postMessage("UI5_READY", "*");
            })
            .catch(function (err) {
              console.error("UI5 render error:", err);
              document.getElementById("ui5-content").innerHTML =
                '<div style="padding:24px;color:#cc0000;font-family:monospace;' +
                'font-size:12px;line-height:1.6;white-space:pre-wrap">' +
                '<strong>Render Error:</strong>\\n' +
                (err.message || String(err))
                  .replace(/</g,"&lt;").replace(/>/g,"&gt;") + '</div>';
              window.parent.postMessage("UI5_ERROR:" + (err.message || String(err)), "*");
            });
        }
      );
    });
  </script>

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%; overflow: hidden;
      font-family: "72", "72full", Arial, Helvetica, sans-serif;
    }

    /* ── Page shell ─────────────────────────────────────────────── */
    #shell-root {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    /* ════════════════════════════════════════════════════════════
       SAP Fiori Shell Bar — pixel-matched to real SAP BTP / S4HANA
       Background: #162033  (extracted from screenshot)
       Height: 44px
    ════════════════════════════════════════════════════════════ */
    #shell-bar {
      display: flex;
      align-items: center;
      height: 44px;
      min-height: 44px;
      flex-shrink: 0;
      background: #162033;
      padding: 0 12px 0 8px;
      gap: 0;
      user-select: none;
    }

    /* ── Left group ──────────────────────────────────────────────── */
    .sb-left {
      display: flex;
      align-items: center;
      gap: 0;
      flex: 1;
      min-width: 0;
    }

    /* Back arrow button */
    .sb-back {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      color: rgba(255,255,255,0.7);
      flex-shrink: 0;
      transition: background 0.15s, color 0.15s;
    }
    .sb-back:hover { background: rgba(255,255,255,0.1); color: #fff; }
    .sb-back svg { width: 14px; height: 14px; }

    /* SAP product logo — blue circle with SAP icon inside */
    .sb-sap-logo {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 6px;
      height: 36px;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.15s;
      flex-shrink: 0;
    }
    .sb-sap-logo:hover { background: rgba(255,255,255,0.08); }

    /* Blue circle with SAP branding */
    .sb-sap-circle {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #0070F2;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .sb-sap-circle svg { width: 18px; height: 18px; }

    /* "SAP" text */
    .sb-sap-text {
      font-size: 13px;
      font-weight: 700;
      color: #fff;
      letter-spacing: 0.5px;
    }

    /* Product name + caret */
    .sb-product {
      display: flex;
      align-items: center;
      gap: 3px;
      padding: 4px 6px;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.15s;
      margin-left: 2px;
    }
    .sb-product:hover { background: rgba(255,255,255,0.08); }
    .sb-product-name {
      font-size: 12px;
      font-weight: 500;
      color: rgba(255,255,255,0.85);
      white-space: nowrap;
    }
    .sb-product-caret svg {
      width: 10px;
      height: 10px;
      color: rgba(255,255,255,0.6);
    }

    /* ── Right group ─────────────────────────────────────────────── */
    .sb-right {
      display: flex;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
    }

    /* Icon buttons */
    .sb-icon-btn {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      cursor: pointer;
      color: rgba(255,255,255,0.75);
      transition: background 0.15s, color 0.15s;
    }
    .sb-icon-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
    .sb-icon-btn svg { width: 16px; height: 16px; }

    /* Notification dot */
    .sb-notif-dot {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 6px;
      height: 6px;
      background: #0070F2;
      border-radius: 50%;
      border: 1.5px solid #162033;
    }

    /* User avatar — compact circle, no name text (matching real SAP) */
    .sb-user-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #3A6BB5;
      cursor: pointer;
      font-size: 10px;
      font-weight: 700;
      color: #fff;
      letter-spacing: 0.3px;
      transition: opacity 0.15s;
      flex-shrink: 0;
      margin-left: 4px;
      border: 1.5px solid rgba(255,255,255,0.2);
    }
    .sb-user-btn:hover { opacity: 0.85; }

    /* ── UI5 content ─────────────────────────────────────────────── */
    #ui5-content {
      flex: 1;
      overflow: hidden;
      min-height: 0;
      background: #f5f5f5;
    }
    #ui5-content .sapMApp { height: 100% !important; }
  </style>
</head>

<body class="sapUiBody sapUiSizeCozy">
<div id="shell-root">

  <!-- ════════════════════════════════════════════════════════════
       SAP Fiori Shell Bar — matches real SAP BTP / S4HANA 2024
  ════════════════════════════════════════════════════════════ -->
  <div id="shell-bar">

    <!-- Left -->
    <div class="sb-left">

      <!-- Back arrow (< shown in real SAP) -->
      <div class="sb-back" title="Back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </div>

      <!-- SAP blue circle logo + SAP text -->
      <div class="sb-sap-logo" title="SAP">
        <div class="sb-sap-circle">
          <!-- SAP logo mark — simplified white flower/petals icon -->
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text x="3" y="17"
              font-family="'Arial Black', Arial, sans-serif"
              font-weight="900"
              font-size="13"
              fill="white"
              letter-spacing="-0.5">SAP</text>
          </svg>
        </div>
        <span class="sb-sap-text">SAP</span>
      </div>

      <!-- Product name with caret -->
      <div class="sb-product" title="Product Menu">
        <span class="sb-product-name">Fiori Builder</span>
        <div class="sb-product-caret">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

    </div>

    <!-- Right: search, settings, bell, avatar -->
    <div class="sb-right">

      <!-- Search -->
      <div class="sb-icon-btn" title="Search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="7"/>
          <line x1="20.5" y1="20.5" x2="16" y2="16"/>
        </svg>
      </div>

      <!-- Settings -->
      <div class="sb-icon-btn" title="Settings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0
            1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0
            0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65
            1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65
            1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09
            A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2
            0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0
            0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65
            0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65
            0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65
            1.65 0 0 0-1.51 1z"/>
        </svg>
      </div>

      <!-- Notifications with blue dot -->
      <div class="sb-icon-btn" title="Notifications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span class="sb-notif-dot"></span>
      </div>

      <!-- User avatar circle — compact, no text (matches real SAP) -->
      <div class="sb-user-btn" title="John Smith">JS</div>

    </div>
  </div>

  <!-- UI5 app content -->
  <div id="ui5-content"></div>

</div>
</body>
</html>`;
}

export default PreviewFrame;
