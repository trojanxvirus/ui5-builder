/**
 * DragDropBuilder.jsx
 *
 * Visual drag-and-drop UI builder for SAP UI5 views.
 * Uses HTML5 native Drag and Drop API (no additional library needed).
 *
 * Left panel:  Component palette — draggable UI5 component cards
 * Right panel: Canvas — drop zone that builds the XML view
 *
 * Each palette item generates a verified, valid XML snippet.
 * "Apply to View" replaces the Main.view.xml in the files array.
 */
import { useState } from "react";
import { sanitizeXML } from "../utils/xmlSanitizer";

// ─── Palette item definitions ─────────────────────────────────────────────────
const PALETTE = [
  // Layout
  {
    id: "panel",
    label: "Panel",
    icon: "📦",
    category: "Layout",
    desc: "Collapsible content panel",
    xml: `<Panel headerText="My Panel" expandable="true" expanded="true">
  <headerToolbar>
    <Toolbar>
      <Title text="My Panel" level="H2"/>
      <ToolbarSpacer/>
    </Toolbar>
  </headerToolbar>
  <VBox class="sapUiContentPadding">
    <Text text="Panel content goes here"/>
  </VBox>
</Panel>`,
  },
  {
    id: "hbox",
    label: "HBox Row",
    icon: "▭",
    category: "Layout",
    desc: "Horizontal flex row",
    xml: `<HBox wrap="Wrap" class="sapUiSmallMarginBottom">
  <Button text="Action 1" type="Emphasized" class="sapUiSmallMarginEnd"/>
  <Button text="Action 2" type="Default"/>
</HBox>`,
  },

  // Data
  {
    id: "table",
    label: "Table",
    icon: "📊",
    category: "Data",
    desc: "Data table with search",
    xml: `<Table>
  <headerToolbar>
    <Toolbar>
      <Title text="Data Table" level="H2"/>
      <ToolbarSpacer/>
      <SearchField width="200px" placeholder="Search..."/>
      <Button icon="sap-icon://add" type="Emphasized" tooltip="Add"/>
    </Toolbar>
  </headerToolbar>
  <columns>
    <Column><Text text="ID"/></Column>
    <Column><Text text="Name"/></Column>
    <Column><Text text="Status"/></Column>
    <Column><Text text="Amount"/></Column>
  </columns>
  <items>
    <ColumnListItem>
      <cells>
        <Text text="001"/>
        <Text text="Acme Corporation"/>
        <ObjectStatus text="Active" state="Success"/>
        <ObjectNumber number="1200" unit="USD"/>
      </cells>
    </ColumnListItem>
    <ColumnListItem>
      <cells>
        <Text text="002"/>
        <Text text="TechCo Ltd"/>
        <ObjectStatus text="Pending" state="Warning"/>
        <ObjectNumber number="850" unit="USD"/>
      </cells>
    </ColumnListItem>
    <ColumnListItem>
      <cells>
        <Text text="003"/>
        <Text text="Global Inc"/>
        <ObjectStatus text="Inactive" state="Error"/>
        <ObjectNumber number="450" unit="USD"/>
      </cells>
    </ColumnListItem>
  </items>
</Table>`,
  },
  {
    id: "list",
    label: "List",
    icon: "📋",
    category: "Data",
    desc: "Item list with toolbar",
    xml: `<List>
  <headerToolbar>
    <Toolbar>
      <Title text="Items" level="H2"/>
      <ToolbarSpacer/>
      <SearchField width="200px" placeholder="Search items..."/>
      <Button icon="sap-icon://add" type="Emphasized"/>
    </Toolbar>
  </headerToolbar>
  <items>
    <StandardListItem title="John Smith" description="Senior Developer · Acme Corp" icon="sap-icon://person-placeholder" type="Navigation"/>
    <StandardListItem title="Jane Doe" description="Project Manager · TechCo" icon="sap-icon://person-placeholder" type="Navigation"/>
    <StandardListItem title="Bob Johnson" description="Designer · Global Inc" icon="sap-icon://person-placeholder" type="Navigation"/>
    <StandardListItem title="Alice Brown" description="Architect · InnovateCorp" icon="sap-icon://person-placeholder" type="Navigation"/>
  </items>
</List>`,
  },
  {
    id: "kpi-tiles",
    label: "KPI Tiles",
    icon: "🟦",
    category: "Data",
    desc: "4 KPI metric tiles",
    xml: `<HBox wrap="Wrap">
  <GenericTile header="Total Revenue" subheader="This Month" class="sapUiSmallMargin">
    <tileContent>
      <TileContent unit="USD">
        <content>
          <NumericContent value="284500" indicator="Up" valueColor="Good" withMargin="false"/>
        </content>
      </TileContent>
    </tileContent>
  </GenericTile>
  <GenericTile header="New Orders" subheader="Today" class="sapUiSmallMargin">
    <tileContent>
      <TileContent>
        <content>
          <NumericContent value="47" indicator="Up" valueColor="Good" withMargin="false"/>
        </content>
      </TileContent>
    </tileContent>
  </GenericTile>
  <GenericTile header="Active Customers" subheader="Current" class="sapUiSmallMargin">
    <tileContent>
      <TileContent>
        <content>
          <NumericContent value="312" indicator="Up" valueColor="Good" withMargin="false"/>
        </content>
      </TileContent>
    </tileContent>
  </GenericTile>
  <GenericTile header="Return Rate" subheader="This Month" class="sapUiSmallMargin">
    <tileContent>
      <TileContent unit="%">
        <content>
          <NumericContent value="3.2" indicator="Down" valueColor="Error" withMargin="false"/>
        </content>
      </TileContent>
    </tileContent>
  </GenericTile>
</HBox>`,
  },

  // Form inputs
  {
    id: "form",
    label: "Form Section",
    icon: "📝",
    category: "Input",
    desc: "Label + Input field pairs",
    xml: `<Panel headerText="Form Details" expandable="true" expanded="true">
  <VBox class="sapUiContentPadding">
    <Label text="Full Name" required="true"/>
    <Input placeholder="Enter full name" class="sapUiSmallMarginBottom"/>
    <Label text="Email Address"/>
    <Input placeholder="Enter email" class="sapUiSmallMarginBottom"/>
    <Label text="Phone Number"/>
    <Input placeholder="Enter phone number" class="sapUiSmallMarginBottom"/>
    <Label text="Notes"/>
    <TextArea placeholder="Additional notes..." rows="3" class="sapUiSmallMarginBottom" width="100%"/>
  </VBox>
</Panel>`,
  },
  {
    id: "select-form",
    label: "Select Field",
    icon: "▼",
    category: "Input",
    desc: "Dropdown select with items",
    xml: `<VBox>
  <Label text="Department"/>
  <Select class="sapUiSmallMarginBottom" width="300px">
    <core:Item key="hr" text="Human Resources"/>
    <core:Item key="fin" text="Finance"/>
    <core:Item key="it" text="Information Technology"/>
    <core:Item key="ops" text="Operations"/>
    <core:Item key="mkt" text="Marketing"/>
  </Select>
</VBox>`,
  },
  {
    id: "buttons",
    label: "Button Bar",
    icon: "🔘",
    category: "Input",
    desc: "Action buttons row",
    xml: `<HBox class="sapUiSmallMarginTop">
  <Button text="Save" type="Emphasized" class="sapUiSmallMarginEnd"/>
  <Button text="Cancel" type="Default" class="sapUiSmallMarginEnd"/>
  <Button text="Delete" type="Reject"/>
</HBox>`,
  },

  // Display
  {
    id: "object-header",
    label: "Object Header",
    icon: "🏷️",
    category: "Display",
    desc: "Object title + attributes",
    xml: `<ObjectHeader
  title="Order ORD-2045"
  number="4500"
  numberUnit="USD">
  <attributes>
    <ObjectAttribute title="Customer" text="Acme Corporation"/>
    <ObjectAttribute title="Created" text="2024-01-15"/>
    <ObjectAttribute title="Delivery" text="2024-02-01"/>
  </attributes>
  <statuses>
    <ObjectStatus title="Status" text="In Progress" state="Warning"/>
    <ObjectStatus title="Priority" text="High" state="Error"/>
  </statuses>
</ObjectHeader>`,
  },
  {
    id: "icontabbar",
    label: "Tab Bar",
    icon: "📑",
    category: "Display",
    desc: "IconTabBar with 3 tabs",
    xml: `<IconTabBar class="sapUiResponsiveContentPadding">
  <items>
    <IconTabFilter text="Overview" icon="sap-icon://home">
      <VBox class="sapUiSmallMargin">
        <Title text="Overview" level="H3" class="sapUiSmallMarginBottom"/>
        <Text text="Overview content goes here."/>
      </VBox>
    </IconTabFilter>
    <IconTabFilter text="Details" icon="sap-icon://detail-view">
      <VBox class="sapUiSmallMargin">
        <Title text="Details" level="H3" class="sapUiSmallMarginBottom"/>
        <Text text="Detail content goes here."/>
      </VBox>
    </IconTabFilter>
    <IconTabFilter text="History" icon="sap-icon://history">
      <VBox class="sapUiSmallMargin">
        <Title text="History" level="H3" class="sapUiSmallMarginBottom"/>
        <Text text="2024-01-15 — Record created" class="sapUiSmallMarginBottom"/>
        <Text text="2024-01-16 — Status updated"/>
      </VBox>
    </IconTabFilter>
  </items>
</IconTabBar>`,
  },
  {
    id: "progress",
    label: "Progress Bar",
    icon: "📈",
    category: "Display",
    desc: "Progress indicator",
    xml: `<VBox>
  <Label text="Completion Status"/>
  <ProgressIndicator
    percentValue="65"
    displayValue="65%"
    state="Success"
    class="sapUiSmallMarginBottom"
    width="100%"/>
</VBox>`,
  },
  {
    id: "message",
    label: "Message Strip",
    icon: "💬",
    category: "Display",
    desc: "Info / warning message",
    xml: `<MessageStrip
  text="This is an informational message for the user."
  type="Information"
  showIcon="true"
  class="sapUiSmallMarginBottom"/>`,
  },
];

// ─── Group palette by category ────────────────────────────────────────────────
const CATEGORIES = [...new Set(PALETTE.map((p) => p.category))];

// ─── Generate XML view from canvas items ──────────────────────────────────────
function buildXMLFromCanvas(items, pageTitle = "Generated Page") {
  if (items.length === 0) {
    return `<mvc:View
  xmlns:mvc="sap.ui.core.mvc"
  xmlns="sap.m"
  xmlns:core="sap.ui.core"
  controllerName="com.ui5builder.app.controller.Main"
  displayBlock="true">
  <Page title="${pageTitle}" showHeader="true" showNavButton="true">
    <content>
      <VBox class="sapUiContentPadding">
        <Text text="Drop components from the palette to build your UI."/>
      </VBox>
    </content>
  </Page>
</mvc:View>`;
  }

  const innerXML = items
    .map((item) =>
      item.xml
        .split("\n")
        .map((line) => "        " + line)
        .join("\n"),
    )
    .join("\n\n");

  return sanitizeXML(`<mvc:View
  xmlns:mvc="sap.ui.core.mvc"
  xmlns="sap.m"
  xmlns:core="sap.ui.core"
  controllerName="com.ui5builder.app.controller.Main"
  displayBlock="true">
  <Page title="${pageTitle}" showHeader="true" showNavButton="true">
    <content>
      <VBox class="sapUiContentPadding">
${innerXML}
      </VBox>
    </content>
  </Page>
</mvc:View>`);
}

// ─── Main Component ───────────────────────────────────────────────────────────
function DragDropBuilder({ onApplyToView }) {
  const [canvasItems, setCanvasItems] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pageTitle, setPageTitle] = useState("My Page");
  const [applied, setApplied] = useState(false);

  // ── Palette drag start ──────────────────────────────────────
  function handleDragStart(e, item) {
    e.dataTransfer.setData("text/plain", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "copy";
    setDraggingId(item.id);
  }

  function handleDragEnd() {
    setDraggingId(null);
  }

  // ── Canvas drop zone ────────────────────────────────────────
  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const item = JSON.parse(e.dataTransfer.getData("text/plain"));
      setCanvasItems((prev) => [
        ...prev,
        { ...item, instanceId: `${item.id}-${Date.now()}` },
      ]);
    } catch (err) {
      console.error("Drop error:", err);
    }
  }

  // ── Delete canvas item ──────────────────────────────────────
  function handleDelete(instanceId) {
    setCanvasItems((prev) => prev.filter((i) => i.instanceId !== instanceId));
  }

  // ── Apply to view file ──────────────────────────────────────
  function handleApply() {
    const xml = buildXMLFromCanvas(canvasItems, pageTitle);
    onApplyToView(xml);
    setApplied(true);
    setTimeout(() => setApplied(false), 2500);
  }

  // ── Clear canvas ────────────────────────────────────────────
  function handleClear() {
    setCanvasItems([]);
  }

  return (
    <div className="builder-view">
      {/* Left: Palette */}
      <div className="builder-palette">
        <div className="builder-palette-header">🎨 Component Palette</div>
        <div className="builder-palette-list">
          {CATEGORIES.map((cat) => (
            <div key={cat}>
              <div className="palette-category">{cat}</div>
              {PALETTE.filter((p) => p.category === cat).map((item) => (
                <div
                  key={item.id}
                  className={`palette-item ${draggingId === item.id ? "dragging" : ""}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragEnd={handleDragEnd}
                  title={item.desc}
                >
                  <span className="palette-item-icon">{item.icon}</span>
                  <div className="palette-item-info">
                    <div className="palette-item-label">{item.label}</div>
                    <div className="palette-item-desc">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Canvas */}
      <div className="builder-canvas-wrapper">
        <div className="builder-canvas-header">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flex: 1,
            }}
          >
            <span className="builder-canvas-title">🖼️ Canvas</span>
            <input
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              placeholder="Page title..."
              style={{
                background: "#1c1c24",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                padding: "4px 10px",
                color: "white",
                fontSize: "12px",
                width: "160px",
              }}
            />
            {canvasItems.length > 0 && (
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {canvasItems.length} component
                {canvasItems.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="builder-canvas-actions">
            <button
              className="toolbar-btn"
              onClick={handleClear}
              disabled={canvasItems.length === 0}
            >
              🗑️ Clear
            </button>
            <button
              className={`toolbar-btn ${applied ? "success" : "primary"}`}
              onClick={handleApply}
              disabled={!onApplyToView}
            >
              {applied ? "✓ Applied!" : "⚡ Apply to View"}
            </button>
          </div>
        </div>

        <div
          className={`builder-canvas ${isDragOver ? "drag-over" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {canvasItems.length === 0 ? (
            <div className="builder-empty">
              <div className="builder-empty-icon">⬇️</div>
              <div className="builder-empty-text">
                Drag components from the palette and drop them here
              </div>
              <div
                style={{ fontSize: "11px", opacity: 0.35, marginTop: "4px" }}
              >
                Click "Apply to View" to generate the XML
              </div>
            </div>
          ) : (
            canvasItems.map((item, idx) => (
              <div key={item.instanceId} className="canvas-item">
                <div className="canvas-item-order">{idx + 1}</div>
                <span className="canvas-item-icon">{item.icon}</span>
                <div className="canvas-item-info">
                  <div className="canvas-item-label">{item.label}</div>
                  <div className="canvas-item-sub">{item.desc}</div>
                </div>
                <button
                  className="canvas-item-delete"
                  onClick={() => handleDelete(item.instanceId)}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default DragDropBuilder;
