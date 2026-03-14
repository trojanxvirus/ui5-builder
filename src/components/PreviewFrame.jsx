/**
 * PreviewFrame.jsx
 *
 * Renders a SAP UI5 XML View inside a sandboxed iframe using the UI5 CDN.
 * Wraps every preview in sap.m.Shell — the standard SAP Fiori shell header
 * with app title, SAP logo area, and a static profile avatar on the right.
 *
 * Shell props used:
 *   appWidthLimited  → false  (full width, like a real Fiori app)
 *   title            → app name shown in the shell bar
 *   headerRightItems → Avatar control for the static profile
 */
import { useEffect, useRef, useState } from "react";
import { ClipLoader } from "react-spinners";

function PreviewFrame({ xml }) {
  const [loading, setLoading] = useState(true);
  const [renderError, setRenderError] = useState(null);
  const handlerRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!xml) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setRenderError(null);

    if (handlerRef.current) {
      window.removeEventListener("message", handlerRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => setLoading(false), 18000);

    const handler = (event) => {
      if (event.data === "UI5_READY") {
        clearTimeout(timeoutRef.current);
        setLoading(false);
      } else if (event.data === "UI5_ERROR") {
        clearTimeout(timeoutRef.current);
        setRenderError(
          "UI5 render failed — check the XML for invalid controls or attributes.",
        );
        setLoading(false);
      }
    };

    handlerRef.current = handler;
    window.addEventListener("message", handler);

    return () => {
      window.removeEventListener("message", handler);
      clearTimeout(timeoutRef.current);
    };
  }, [xml]);

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
          Generate a UI to see the live preview
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
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#f5f5f5",
            zIndex: 10,
            gap: "16px",
          }}
        >
          <ClipLoader size={40} color="#0070f3" />
          <div style={{ fontSize: "13px", color: "#666" }}>
            Loading SAP UI5 framework from CDN…
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
            background: "#fff0f0",
            borderBottom: "1px solid #ffcccc",
            color: "#cc0000",
            padding: "10px 16px",
            fontSize: "13px",
            zIndex: 11,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>⚠️</span>
          <span>{renderError}</span>
        </div>
      )}

      <iframe
        key={xml}
        srcDoc={buildPreviewHTML(xml)}
        title="SAP UI5 Live Preview"
        sandbox="allow-scripts allow-same-origin"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          background: "white",
          display: "block",
        }}
      />
    </div>
  );
}

/**
 * Builds the full HTML document that bootstraps UI5 and renders the view
 * inside an sap.m.Shell — giving every preview the real SAP Fiori shell header.
 *
 * Shell renders:
 *   Left  → SAP logo square + app title "SAP Fiori"
 *   Right → static Avatar (profile initials "JS" for "John Smith")
 *
 * The XML view is placed as the single page inside an sap.m.App,
 * which is then set as the app content of the Shell.
 */
function buildPreviewHTML(xml) {
  if (!xml) return "<html><body></body></html>";

  const safeXml = JSON.stringify(xml);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>SAP Fiori Preview</title>
  <script
    id="sap-ui-bootstrap"
    src="https://ui5.sap.com/1.120/resources/sap-ui-core.js"
    data-sap-ui-theme="sap_horizon"
    data-sap-ui-libs="sap.m,sap.ui.core,sap.ui.layout,sap.ui.unified"
    data-sap-ui-async="true"
    data-sap-ui-compatVersion="edge"
    data-sap-ui-frameOptions="allow"
  ></script>

  <script>
    sap.ui.getCore().attachInit(function () {
      var sXml = ${safeXml};

      sap.ui.require([
        "sap/ui/core/mvc/XMLView",
        "sap/m/App",
        "sap/m/Shell",
        "sap/m/Avatar"
      ], function (XMLView, App, Shell, Avatar) {

        XMLView.create({ definition: sXml })
          .then(function (oView) {

            // Static profile avatar shown in the shell header right side
            var oAvatar = new Avatar({
              initials: "JS",
              displaySize: "XS",
              backgroundColor: "Accent6",
              tooltip: "John Smith — Developer"
            });

            // App wraps the generated view
            var oApp = new App({ pages: [oView] });

            // Shell provides the authentic SAP Fiori top bar
            var oShell = new Shell({
              title: "SAP Fiori",
              appWidthLimited: false,
              app: oApp,
              headerRightItems: [oAvatar]
            });

            oShell.placeAt("content");
            window.parent.postMessage("UI5_READY", "*");
          })
          .catch(function (err) {
            console.error("UI5 render error:", err);
            document.getElementById("content").innerHTML =
              '<div style="padding:24px;color:#cc0000;font-family:monospace;font-size:13px;line-height:1.6">'
              + '<strong>Render Error:</strong><br/>'
              + (err.message || String(err))
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
              + '</div>';
            window.parent.postMessage("UI5_ERROR", "*");
          });
      });
    });
  </script>

  <style>
    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      overflow: hidden;
    }
    #content {
      height: 100%;
    }
  </style>
</head>
<body class="sapUiBody sapUiSizeCozy">
  <div id="content"></div>
</body>
</html>`;
}

export default PreviewFrame;
