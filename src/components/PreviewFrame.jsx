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

function PreviewFrame({ files, xml: xmlProp, capStatus = "idle", isCapProject = false }) {
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
  }, [xml, controllerJs, capStatus]);

  // Shared inline code block style used in error panels
  const codeStyle = {
    background: "#f0f0f0", border: "1px solid #ddd",
    borderRadius: "3px", padding: "1px 5px",
    fontFamily: "monospace", fontSize: "11px",
  };

  // ── CAP mode ──────────────────────────────────────────────────────────────
  // Show a seed-data preview immediately (no OData V4 connection needed).
  // The CDS service status is displayed via the CapStatusBadge in the header.
  if (isCapProject && xml) {
    const manifestFile = files?.find((f) => f.path === "webapp/manifest.json");
    const capSrcDoc = buildCAPPreviewHTML(xml, controllerJs, manifestFile?.content, files);
    return (
      <div style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Small info banner */}
        {/* Dynamic banner + optional error panel */}
        {(() => {
          const hasSmartControls = /xmlns:smartTable|xmlns:smartFilter|SmartTable|SmartFilterBar/i.test(xml);
          let odataUrl = "/odata/…/";
          try {
            const mf = JSON.parse(manifestFile?.content ?? "{}");
            odataUrl = mf["sap.ui5"]?.models?.[""]?.settings?.serviceUrl ?? odataUrl;
          } catch (_) {}

          const banner = (
            <div style={{
              fontSize: "11px", padding: "4px 12px",
              background: hasSmartControls ? "#fff8e1" : "#e8f4ea",
              borderBottom: `1px solid ${hasSmartControls ? "#ffe082" : "#b7dfbb"}`,
              color: hasSmartControls ? "#7a5a00" : "#1a7a2e",
              display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, flexWrap: "wrap",
            }}>
              {hasSmartControls ? (
                <>
                  <span style={{ fontWeight: 600 }}>SmartTable Preview</span>
                  <span style={{ color: "#555" }}>Seed data shown via sap.m.Table —</span>
                  <span>SmartTable/SmartFilterBar XML ready for OData V2 deployment</span>
                  <span>| OData V4 seed endpoint: <code style={{ background: "#fff3cd", padding: "1px 4px", borderRadius: "3px" }}>{odataUrl}</code></span>
                </>
              ) : (
                <>
                  <span style={{ fontWeight: 600 }}>CAP Preview</span>
                  <span style={{ color: "#555" }}>Showing seed data —</span>
                  <span>OData V4 live endpoint: <code style={{ background: "#d4edda", padding: "1px 4px", borderRadius: "3px" }}>{odataUrl}</code></span>
                </>
              )}
              {capStatus === "starting" && <span style={{ marginLeft: "auto", color: "#e67e00", fontWeight: 600 }}>⏳ CDS starting…</span>}
              {capStatus === "ready"    && <span style={{ marginLeft: "auto", color: "#1a7a2e", fontWeight: 600 }}>✅ OData live</span>}
              {capStatus === "error"    && <span style={{ marginLeft: "auto", color: "#c00",    fontWeight: 600 }}>⚠ CDS failed — see steps below</span>}
            </div>
          );

          // Expanded "run locally" panel — only when CDS deploy failed
          const errorPanel = capStatus === "error" && (
            <div style={{
              background: "#fff8f8", borderBottom: "1px solid #f5c6cb",
              padding: "12px 16px", fontSize: "12px", color: "#444", flexShrink: 0,
            }}>
              <div style={{ fontWeight: 700, color: "#c00", marginBottom: "8px" }}>
                ⚠ The local CDS service failed to start. The preview above still works with seed data.
              </div>
              <div style={{ fontWeight: 600, marginBottom: "6px", color: "#333" }}>
                To run the OData backend locally and connect SmartTable to live data:
              </div>
              <ol style={{ margin: "0 0 10px 18px", lineHeight: "1.9" }}>
                <li>Download the ZIP using the <strong>Download</strong> button in the file panel</li>
                <li>Unzip and open a terminal in the project folder</li>
                <li>Run: <code style={codeStyle}>npm install</code></li>
                <li>Run: <code style={codeStyle}>npx cds serve</code> — OData V4 starts at <code style={codeStyle}>http://localhost:4004</code></li>
                <li>Open <code style={codeStyle}>webapp/manifest.json</code> and verify <code style={codeStyle}>serviceUrl</code> matches the CDS path</li>
              </ol>
              {hasSmartControls && (
                <>
                  <div style={{ fontWeight: 600, marginBottom: "6px", color: "#7a5a00" }}>
                    To connect SmartTable/SmartFilterBar to a real SAP OData V2 backend:
                  </div>
                  <ol style={{ margin: "0 0 0 18px", lineHeight: "1.9" }}>
                    <li>In <code style={codeStyle}>webapp/manifest.json</code>, change the model type to <code style={codeStyle}>sap.ui.model.odata.v2.ODataModel</code></li>
                    <li>Set <code style={codeStyle}>serviceUrl</code> to your SAP Gateway endpoint (e.g. <code style={codeStyle}>/sap/opu/odata/sap/ZVENDOR_SRV/</code>)</li>
                    <li>Ensure the entity set name in <code style={codeStyle}>SmartTable entitySet="…"</code> matches your OData metadata</li>
                    <li>Deploy to SAP BTP or ABAP launchpad — SmartTable auto-reads columns from <code style={codeStyle}>$metadata</code></li>
                  </ol>
                </>
              )}
            </div>
          );

          return <>{banner}{errorPanel}</>;
        })()}
        <iframe
          key="cap-preview"
          srcDoc={capSrcDoc}
          title="CAP Preview"
          sandbox="allow-scripts allow-same-origin allow-forms"
          style={{ width: "100%", flex: 1, border: "none", display: "block" }}
        />
      </div>
    );
  }

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

  // Smart controls — in CAP mode we already handled above; here it means Floor Plan 6
  // (static advisory, no live CDS service)
  const smartControls = detectSmartControls(xml);
  if (smartControls.length > 0) {
    return (
      <div style={{ height: "100%", overflow: "auto" }}>
        <iframe
          srcDoc={buildSmartAdvisoryHTML(smartControls)}
          title="Smart Controls Advisory"
          sandbox="allow-scripts"
          style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        />
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

// ── Smart control detection ────────────────────────────────────────────────────
// SmartTable / SmartFilterBar require a live OData service. Attempting to load
// sap.ui.comp in the sandbox produces an immediate crash or blank render.
// Instead, we detect these controls and show an informative advisory.
function detectSmartControls(xml) {
  if (!xml) return [];
  const found = [];
  if (/xmlns:smartTable\s*=|<smartTable:SmartTable/.test(xml)) found.push("SmartTable");
  if (/xmlns:smartFilter\s*=|<smartFilter:SmartFilterBar/.test(xml)) found.push("SmartFilterBar");
  if (/sap\.ui\.comp\.smartform|<smartForm:/.test(xml)) found.push("SmartForm");
  return found;
}

function buildSmartAdvisoryHTML(smartControls) {
  const list = smartControls.map((c) => `<li>${c}</li>`).join("");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "72", Arial, Helvetica, sans-serif;
      background: #f5f5f5;
      display: flex; align-items: center; justify-content: center;
      height: 100vh; padding: 24px;
    }
    .card {
      background: #fff;
      border: 1px solid #d1e7f5;
      border-radius: 8px;
      padding: 32px 36px;
      max-width: 560px;
      width: 100%;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h2 { font-size: 18px; font-weight: 700; color: #1a5276; margin-bottom: 10px; }
    p  { font-size: 13px; color: #444; line-height: 1.6; margin-bottom: 14px; }
    .controls-list {
      background: #eaf4fb; border-radius: 6px;
      padding: 12px 16px; margin-bottom: 16px;
    }
    .controls-list h4 { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #1a5276; margin-bottom: 8px; }
    .controls-list ul { list-style: none; padding: 0; }
    .controls-list li {
      font-size: 13px; font-weight: 600; color: #154360;
      padding: 4px 0; border-bottom: 1px solid #d1e7f5;
    }
    .controls-list li:last-child { border: none; }
    .controls-list li::before { content: "✓  "; color: #0070f2; }
    .steps { counter-reset: step; }
    .step { display: flex; gap: 12px; margin-bottom: 10px; align-items: flex-start; }
    .step-num {
      background: #0070f2; color: #fff; border-radius: 50%;
      width: 22px; height: 22px; display: flex; align-items: center;
      justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0;
    }
    .step-text { font-size: 12px; color: #444; line-height: 1.5; }
    .badge {
      display: inline-block; background: #eaf4fb; border: 1px solid #aed6f1;
      color: #1a5276; font-size: 10px; font-weight: 700; padding: 2px 8px;
      border-radius: 10px; text-transform: uppercase; letter-spacing: .06em;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔗</div>
    <span class="badge">OData Required</span>
    <h2 style="margin-top:10px">Smart Controls — Code Generated Successfully</h2>
    <p>
      The following SAP smart controls have been generated and are <strong>ready for deployment</strong>.
      They require a live OData V2/V4 backend service to render data — they cannot be previewed
      in a static sandbox environment.
    </p>

    <div class="controls-list">
      <h4>Generated Smart Controls</h4>
      <ul>${list}</ul>
    </div>

    <p style="font-weight:600;color:#1a5276;">To use in your SAP project:</p>
    <div class="steps">
      <div class="step">
        <div class="step-num">1</div>
        <div class="step-text">Download the ZIP and unzip it. Open a terminal in the project folder.</div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div class="step-text">Run <code>npm install</code> then <code>npx cds serve</code> — this starts a local OData V4 service at <code>http://localhost:4004</code> with seed data.</div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div class="step-text">To connect to a real SAP OData V2 backend, change <code>manifest.json</code> model type to <code>sap.ui.model.odata.v2.ODataModel</code> and set <code>serviceUrl</code> to your SAP Gateway endpoint (e.g. <code>/sap/opu/odata/sap/ZVENDOR_SRV/</code>).</div>
      </div>
      <div class="step">
        <div class="step-num">4</div>
        <div class="step-text">Ensure the <code>entitySet</code> in the SmartTable XML matches your OData metadata entity set name. SmartTable auto-reads columns, SmartFilterBar auto-reads filters from <code>$metadata</code>.</div>
      </div>
      <div class="step">
        <div class="step-num">5</div>
        <div class="step-text">Deploy to SAP BTP or ABAP Launchpad. The app uses standard UI5 manifest routing — no additional config needed.</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Build the live CAP preview HTML.
 * The UI5 app runs against the real CDS OData V4 service at /odata/v4/<path>/.
 * manifest.json is injected inline so the OData model config is picked up.
 * The Vite dev-server proxy (or Nginx in production) forwards /odata/* → port 4004.
 */
/**
 * Build the CAP preview HTML using seed data instead of a live OData V4 connection.
 *
 * The approach:
 * 1. Extract seed records from `srv/data/*.json` in the generated files.
 * 2. Infer columns from the seed record keys.
 * 3. Build a clean sap.f.DynamicPage + sap.m.Table view (bypasses SmartTable issues).
 * 4. Delegate to buildPreviewHTML() for the actual srcdoc rendering.
 *
 * This eliminates every "sModelName must be a string or omitted" OData V4 assertion and
 * the SmartTable "no visible columns" problem — both are irrelevant for a preview.
 */
function buildCAPPreviewHTML(xml, controllerJs, manifestJson, files) {
  if (!xml) return "<html><body></body></html>";

  // ── 1. Read odataUri from manifest (shown as informational note) ────────
  let odataUri = "/odata/customer/";
  try {
    const mf = JSON.parse(manifestJson ?? "{}");
    const modelSettings = mf["sap.ui5"]?.models?.[""]?.settings;
    if (modelSettings?.serviceUrl) {
      odataUri = modelSettings.serviceUrl;
    } else {
      const firstDs = Object.values(mf["sap.app"]?.dataSources ?? {})[0];
      if (firstDs?.uri) odataUri = firstDs.uri;
    }
  } catch (_) {}

  // ── 2. Extract seed data from generated file tree ───────────────────────
  let seedData   = [];
  let seedFields = [];
  try {
    const seedFile = files?.find(
      (f) => f.path.startsWith("srv/data/") && f.path.endsWith(".json"),
    );
    if (seedFile) {
      const parsed = JSON.parse(seedFile.content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        seedData   = parsed;
        seedFields = Object.keys(parsed[0]);
      }
    }
  } catch (_) {}

  // ── 3. Extract page title from the generated XML ────────────────────────
  const titleM   = xml.match(/Title\s+text="([^"]+)"/);
  const pageTitle = titleM?.[1] || "Application";

  // ── 4. If no seed data, fall back to the original view ──────────────────
  if (seedFields.length === 0) {
    return buildPreviewHTML(xml, controllerJs);
  }

  // ── 5. Build a proper sap.m.Table view from seed fields ─────────────────
  const columns = seedFields
    .map((f) => `<Column><Text text="${f}"/></Column>`)
    .join("\n        ");

  const cells = seedFields
    .map((f) => {
      if (/status|state/i.test(f))
        return `<ObjectStatus text="{${f}}" state="{= \${${f}} === 'Active' ? 'Success' : \${${f}} === 'Inactive' ? 'Error' : 'Warning'}"/>`;
      if (/revenue|amount|price|total|qty|quantity/i.test(f))
        return `<ObjectNumber number="{${f}}" unit="USD"/>`;
      if (/(^id$|id$|^.*id$)/i.test(f))
        return `<ObjectIdentifier title="{${f}}"/>`;
      return `<Text text="{${f}}"/>`;
    })
    .join("\n              ");

  const fallbackView = `<mvc:View controllerName="com.ui5builder.app.controller.Main"
    xmlns:mvc="sap.ui.core.mvc"
    xmlns="sap.m"
    xmlns:f="sap.f"
    height="100%">
  <f:DynamicPage id="page" headerExpanded="true" toggleHeaderOnTitleClick="false">
    <f:title>
      <f:DynamicPageTitle>
        <f:heading><Title text="${pageTitle}"/></f:heading>
        <f:snappedHeading><Title text="${pageTitle}" wrapping="true"/></f:snappedHeading>
        <f:actions>
          <SearchField id="searchField" width="220px" placeholder="Search..."
                       liveChange=".onSearch"/>
          <Button text="Add" type="Emphasized" icon="sap-icon://add" press=".onAdd"/>
        </f:actions>
      </f:DynamicPageTitle>
    </f:title>
    <f:content>
      <Table id="mainTable"
             items="{/items}"
             growing="true"
             growingThreshold="20"
             alternateRowColors="true"
             noDataText="No records found">
        <headerToolbar>
          <OverflowToolbar>
            <Title text="${pageTitle}" level="H3"/>
            <ToolbarSpacer/>
            <Button icon="sap-icon://sort" tooltip="Sort"/>
          </OverflowToolbar>
        </headerToolbar>
        <columns>
          ${columns}
        </columns>
        <items>
          <ColumnListItem type="Navigation">
            <cells>
              ${cells}
            </cells>
          </ColumnListItem>
        </items>
      </Table>
    </f:content>
  </f:DynamicPage>
</mvc:View>`;

  // ── 6. Build controller with JSONModel + client-side search ─────────────
  const dataJson = JSON.stringify(seedData);
  const fallbackCtrl = `sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
    "use strict";
    return Controller.extend("com.ui5builder.app.controller.Main", {
        onInit: function () {
            this._aAll    = ${dataJson};
            this._oModel  = new JSONModel({ items: this._aAll });
            this.getView().setModel(this._oModel);
            console.info("[CAP Preview] Seed data loaded. OData V4 live at: ${odataUri}");
        },
        onSearch: function (oEvent) {
            var sQ = (oEvent.getParameter("newValue") || "").toLowerCase();
            this._oModel.setProperty("/items",
                sQ
                    ? this._aAll.filter(function (r) {
                          return Object.values(r).some(function (v) {
                              return String(v).toLowerCase().indexOf(sQ) !== -1;
                          });
                      })
                    : this._aAll
            );
        },
        onAdd: function () {
            sap.m.MessageToast.show("Add record — implement as needed");
        }
    });
});`;

  return buildPreviewHTML(fallbackView, fallbackCtrl);
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
    data-sap-ui-libs="sap.m,sap.f,sap.ui.core,sap.ui.layout,sap.ui.unified,sap.viz,sap.ui.table"
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
