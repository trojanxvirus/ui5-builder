/**
 * aiService.js — v4.3
 *
 * v4.3 adds: GenericCard + hallucinated control fixes in FORBIDDEN list
 * v4.2 changes:
 *   - Calls /api/generate proxy instead of OpenRouter directly (no key in browser)
 *   - AbortController with 120s client-side timeout (prevents hung spinner)
 *   - VITE_OPENROUTER_KEY removed — use VITE_API_BASE=http://localhost:3001 instead
 */
import { sanitizeXML } from "../utils/xmlSanitizer";
import { generateFallbackApp } from "../utils/fileGenerator";

// Points to the Express proxy. Set VITE_API_BASE=http://localhost:3001 in .env.local
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";
const APP_ID = "com.ui5builder.app";
const CTRL_FQN = `${APP_ID}.controller.Main`;

// 120s client guard — proxy has its own 90s upstream timeout
const CLIENT_TIMEOUT_MS = 120_000;

const SYSTEM_PROMPT = `You are a senior SAP UI5 / Fiori developer. Generate a COMPLETE, FULLY INTERACTIVE, 100% SAP-STANDARD UI5 application following the latest SAP Fiori design guidelines.

══════════════════════════════════════════════════════════════
OUTPUT FORMAT — EXACTLY 6 ---FILE--- blocks, nothing else:
══════════════════════════════════════════════════════════════
---FILE:webapp/view/Main.view.xml:xml---
content
---ENDFILE---
---FILE:webapp/controller/Main.controller.js:javascript---
content
---ENDFILE---
---FILE:webapp/Component.js:javascript---
content
---ENDFILE---
---FILE:webapp/manifest.json:json---
content
---ENDFILE---
---FILE:webapp/model/models.js:javascript---
content
---ENDFILE---
---FILE:webapp/i18n/i18n.properties:properties---
content
---ENDFILE---

══════════════════════════════════════════════════════════════
XML VIEW — ROOT ELEMENT AND NAMESPACES
══════════════════════════════════════════════════════════════
<mvc:View
  xmlns:mvc="sap.ui.core.mvc"
  xmlns="sap.m"
  xmlns:f="sap.f"
  xmlns:form="sap.ui.layout.form"
  xmlns:core="sap.ui.core"
  controllerName="${CTRL_FQN}"
  displayBlock="true">

CRITICAL namespace conventions:
  xmlns:f="sap.f"                    → ONLY for sap.f controls (DynamicPage, DynamicPageTitle)
  xmlns:form="sap.ui.layout.form"    → ONLY for SimpleForm, FormContainer, FormElement
  NEVER use xmlns:f="sap.ui.layout.form" — wrong and will crash

══════════════════════════════════════════════════════════════
FLOOR PLAN 1 — LIST REPORT
══════════════════════════════════════════════════════════════
<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" xmlns:f="sap.f" xmlns:core="sap.ui.core" controllerName="${CTRL_FQN}" displayBlock="true">
  <f:DynamicPage id="dynamicPage" headerExpanded="true" toggleHeaderOnTitleClick="false">
    <f:title>
      <f:DynamicPageTitle>
        <f:heading><Title text="Customer List" level="H2"/></f:heading>
        <f:actions>
          <Button text="Create" type="Emphasized" press=".onCreate" icon="sap-icon://add"/>
          <Button icon="sap-icon://sort" type="Transparent" tooltip="Sort" press=".onSort"/>
        </f:actions>
      </f:DynamicPageTitle>
    </f:title>
    <f:content>
      <Table id="mainTable" items="{/items}" growing="true" growingThreshold="10">
        <noData>
          <IllustratedMessage illustrationType="sapIllus-EmptyList"
            title="No items found" description="Try adjusting your search or create a new record"/>
        </noData>
        <headerToolbar>
          <OverflowToolbar>
            <Title text="Items" level="H3"/><ToolbarSpacer/>
            <SearchField width="200px" liveChange=".onSearch" placeholder="Search..."/>
            <OverflowToolbarButton icon="sap-icon://filter" type="Transparent" press=".onFilter"/>
          </OverflowToolbar>
        </headerToolbar>
        <columns>
          <Column><Text text="Name"/></Column>
          <Column><Text text="Status"/></Column>
          <Column><Text text="Amount"/></Column>
        </columns>
        <items>
          <ColumnListItem type="Navigation" press=".onItemPress">
            <cells>
              <ObjectIdentifier title="{name}" text="{id}"/>
              <ObjectStatus text="{status}" state="{statusState}"/>
              <ObjectNumber number="{amount}" unit="USD"/>
            </cells>
          </ColumnListItem>
        </items>
      </Table>
    </f:content>
    <f:footer>
      <OverflowToolbar><ToolbarSpacer/>
        <Button text="Delete Selected" type="Reject" press=".onDelete"/>
      </OverflowToolbar>
    </f:footer>
  </f:DynamicPage>
</mvc:View>

══════════════════════════════════════════════════════════════
FLOOR PLAN 2 — OBJECT PAGE
══════════════════════════════════════════════════════════════
<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" xmlns:f="sap.f" xmlns:core="sap.ui.core" controllerName="${CTRL_FQN}" displayBlock="true">
  <f:DynamicPage id="dynamicPage" headerExpanded="true">
    <f:title>
      <f:DynamicPageTitle>
        <f:navigationActions>
          <Button icon="sap-icon://nav-back" type="Transparent" press=".onNavBack"/>
        </f:navigationActions>
        <f:heading><Title text="{/header/title}" level="H2"/></f:heading>
        <f:snappedHeading><Title text="{/header/title}" level="H3"/></f:snappedHeading>
        <f:actions>
          <Button text="Edit" type="Emphasized" press=".onEdit"/>
          <Button text="Delete" type="Reject" press=".onDelete"/>
        </f:actions>
      </f:DynamicPageTitle>
    </f:title>
    <f:header>
      <f:DynamicPageHeader pinnable="true">
        <HBox wrap="Wrap" class="sapUiSmallMargin">
          <VBox class="sapUiSmallMarginEnd">
            <Label text="Customer"/>
            <Text text="{/header/customer}" class="sapUiSmallMarginBottom"/>
          </VBox>
          <VBox class="sapUiSmallMarginEnd">
            <Label text="Total Amount"/>
            <ObjectNumber number="{/header/amount}" unit="USD" emphasized="true"/>
          </VBox>
          <VBox>
            <Label text="Status"/>
            <ObjectStatus text="{/header/status}" state="{/header/statusState}"/>
          </VBox>
        </HBox>
      </f:DynamicPageHeader>
    </f:header>
    <f:content>
      <IconTabBar id="tabBar" class="sapFDynamicPageAlignContent" expanded="true">
        <items>
          <IconTabFilter text="Overview" icon="sap-icon://home">
            <VBox class="sapUiSmallMargin">
              <ObjectHeader title="{/header/title}" number="{/header/amount}" numberUnit="USD">
                <attributes>
                  <ObjectAttribute title="Customer" text="{/header/customer}"/>
                  <ObjectAttribute title="Date" text="{/header/createdOn}"/>
                </attributes>
                <statuses>
                  <ObjectStatus title="Status" text="{/header/status}" state="{/header/statusState}"/>
                </statuses>
              </ObjectHeader>
            </VBox>
          </IconTabFilter>
          <IconTabFilter text="Items" icon="sap-icon://product">
            <Table items="{/lineItems}">
              <noData>
                <IllustratedMessage illustrationType="sapIllus-EmptyList"
                  title="No line items" description="Add items to this record"/>
              </noData>
              <columns>
                <Column><Text text="Material"/></Column>
                <Column><Text text="Qty"/></Column>
                <Column><Text text="Price"/></Column>
              </columns>
              <items>
                <ColumnListItem>
                  <cells>
                    <Text text="{material}"/>
                    <Text text="{quantity}"/>
                    <ObjectNumber number="{price}" unit="USD"/>
                  </cells>
                </ColumnListItem>
              </items>
            </Table>
          </IconTabFilter>
          <IconTabFilter text="Notes" icon="sap-icon://notes">
            <VBox class="sapUiSmallMargin">
              <TextArea value="{/notes}" rows="6" width="100%" placeholder="Add notes here..."/>
            </VBox>
          </IconTabFilter>
        </items>
      </IconTabBar>
    </f:content>
    <f:footer>
      <OverflowToolbar><ToolbarSpacer/>
        <Button text="Save" type="Emphasized" press=".onSave"/>
        <Button text="Cancel" type="Default" press=".onCancel"/>
      </OverflowToolbar>
    </f:footer>
  </f:DynamicPage>
</mvc:View>

══════════════════════════════════════════════════════════════
FLOOR PLAN 3 — FORM PAGE
══════════════════════════════════════════════════════════════
<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" xmlns:f="sap.f" xmlns:form="sap.ui.layout.form" xmlns:core="sap.ui.core" controllerName="${CTRL_FQN}" displayBlock="true">
  <f:DynamicPage id="dynamicPage">
    <f:title>
      <f:DynamicPageTitle>
        <f:navigationActions>
          <Button icon="sap-icon://nav-back" type="Transparent" press=".onNavBack"/>
        </f:navigationActions>
        <f:heading><Title text="Create Customer" level="H2"/></f:heading>
        <f:actions>
          <Button text="Save" type="Emphasized" press=".onSave"/>
          <Button text="Cancel" type="Default" press=".onCancel"/>
        </f:actions>
      </f:DynamicPageTitle>
    </f:title>
    <f:content>
      <form:SimpleForm id="createForm" editable="true" layout="ResponsiveGridLayout"
        labelSpanXL="4" labelSpanL="3" labelSpanM="4" labelSpanS="12"
        emptySpanXL="0" emptySpanL="0" emptySpanM="0" emptySpanS="0"
        columnsXL="2" columnsL="2" columnsM="1"
        class="sapFDynamicPageAlignContent">
        <form:content>
          <core:Title text="Personal Information"/>
          <Label text="First Name" required="true"/>
          <Input value="{/form/firstName}" valueState="{/form/firstNameState}"
                 valueStateText="First name is required" placeholder="Enter first name"/>
          <Label text="Last Name" required="true"/>
          <Input value="{/form/lastName}" valueState="{/form/lastNameState}"
                 valueStateText="Last name is required" placeholder="Enter last name"/>
          <Label text="Email"/>
          <Input value="{/form/email}" placeholder="name@example.com"/>
          <Label text="Phone"/>
          <Input value="{/form/phone}" placeholder="+1 234 567 890"/>
          <core:Title text="Company Information"/>
          <Label text="Company"/>
          <Select selectedKey="{/form/company}">
            <core:Item key="acme" text="Acme Corporation"/>
            <core:Item key="tech" text="TechCo Ltd"/>
            <core:Item key="global" text="Global Inc"/>
            <core:Item key="sap" text="SAP SE"/>
          </Select>
          <Label text="Department"/>
          <Select selectedKey="{/form/department}">
            <core:Item key="hr" text="Human Resources"/>
            <core:Item key="it" text="Information Technology"/>
            <core:Item key="fin" text="Finance"/>
            <core:Item key="ops" text="Operations"/>
          </Select>
          <Label text="Status"/>
          <Select selectedKey="{/form/status}">
            <core:Item key="Active" text="Active"/>
            <core:Item key="Inactive" text="Inactive"/>
          </Select>
        </form:content>
      </form:SimpleForm>
    </f:content>
    <f:footer>
      <OverflowToolbar><ToolbarSpacer/>
        <Button text="Save" type="Emphasized" press=".onSave"/>
        <Button text="Cancel" type="Default" press=".onCancel"/>
        <Button text="Reset" type="Transparent" press=".onReset"/>
      </OverflowToolbar>
    </f:footer>
  </f:DynamicPage>
</mvc:View>

══════════════════════════════════════════════════════════════
CONTROLLER PATTERN — follow exactly:
══════════════════════════════════════════════════════════════
sap.ui.define([
    "sap/ui/core/mvc/Controller","sap/ui/model/json/JSONModel",
    "sap/m/MessageToast","sap/m/MessageBox",
    "sap/ui/model/Filter","sap/ui/model/FilterOperator","sap/ui/Device"
], function (Controller, JSONModel, MessageToast, MessageBox, Filter, FilterOperator, Device) {
    "use strict";
    return Controller.extend("${CTRL_FQN}", {
        onInit: function () {
            var sClass = Device.support.touch ? "sapUiSizeCozy" : "sapUiSizeCompact";
            this.getView().addStyleClass(sClass);
            var oModel = new JSONModel({ items:[...], header:{...},
                form:{ firstName:"", lastName:"", firstNameState:"None", lastNameState:"None" }, busy:false });
            this.getView().setModel(oModel);
        },
        _validateForm: function () {
            var oModel=this.getView().getModel(), oForm=oModel.getProperty("/form"), bValid=true;
            if (!oForm.firstName) { oModel.setProperty("/form/firstNameState","Error"); bValid=false; }
            else oModel.setProperty("/form/firstNameState","None");
            if (!oForm.lastName) { oModel.setProperty("/form/lastNameState","Error"); bValid=false; }
            else oModel.setProperty("/form/lastNameState","None");
            return bValid;
        },
        onSave: function () {
            if (!this._validateForm()) { MessageBox.error("Please fill in all required fields."); return; }
            MessageToast.show("Changes saved successfully.");
        },
        onSearch: function (oEvent) {
            var sQuery=oEvent.getParameter("newValue")||"";
            var oTable=this.byId("mainTable")||this.byId("mainList");
            if (!oTable) return;
            var oBinding=oTable.getBinding("items");
            if (!oBinding) return;
            oBinding.filter(sQuery.trim()?[new Filter("name",FilterOperator.Contains,sQuery)]:[]);
        },
        onCreate: function () {
            var oModel=this.getView().getModel(), aItems=oModel.getProperty("/items");
            aItems.unshift({id:"NEW-"+Date.now(),name:"New Entry "+(aItems.length+1),status:"Active",statusState:"Success",amount:"0"});
            oModel.setProperty("/items",aItems);
            MessageToast.show("Record created. Total: "+aItems.length);
        },
        onDelete: function () {
            var oModel=this.getView().getModel(), aItems=oModel.getProperty("/items");
            if (!aItems||aItems.length===0) return;
            aItems.shift(); oModel.setProperty("/items",aItems);
            MessageToast.show("Record deleted. Remaining: "+aItems.length);
        },
        onFilter: function () { MessageToast.show("Filter — connect to sap.m.p13n.Engine in production."); },
        onExport: function () { MessageToast.show("Export — connect to sap.ui.export.Spreadsheet in production."); },
        onCancel: function () { MessageToast.show("Changes discarded."); },
        onReset: function () {
            var oModel=this.getView().getModel(), oForm=oModel.getProperty("/form");
            Object.keys(oForm).forEach(function(k){ if(!k.endsWith("State")) oForm[k]=""; else oForm[k]="None"; });
            oModel.setProperty("/form",oForm); MessageToast.show("Form reset.");
        },
        onNavBack: function () { window.history.go(-1); },
        onItemPress: function () { MessageToast.show("Item selected — detail navigation not available in preview."); }
    });
});

══════════════════════════════════════════════════════════════
SAP STANDARD UI QUALITY CHECKLIST:
══════════════════════════════════════════════════════════════
✅ IllustratedMessage for ALL empty states — NEVER noDataText attribute on Table/List
✅ valueState + valueStateText on every required Input
✅ /form/fieldState paths initialized to "None" in onInit JSONModel
✅ sap/ui/Device imported, content density set in every onInit
✅ _validateForm() present, called first in onSave

DATE FIELDS — DatePicker requires JavaScript Date objects, NOT plain strings:
❌ WRONG: { startDate: "2024-03-15" }   → DatePicker shows "The given date instance isn't valid"
✅ CORRECT: { startDate: new Date("2024-03-15") }  → DatePicker renders correctly
✅ ALSO OK: { startDate: null }  → DatePicker renders empty with no error

For ALL date fields in onInit JSONModel, always use new Date(...) or null:
    form: {
        startDate: new Date("2024-01-15"),
        endDate: null,
        ...
    }
For table/list data rows with date columns, use strings for Text controls but Date objects for DatePicker:
    { id: "001", name: "John", date: "2024-01-15" }  ← plain string is fine for <Text text="{date}"/>

══════════════════════════════════════════════════════════════
STRICTLY FORBIDDEN:
══════════════════════════════════════════════════════════════
❌ xmlns:f="sap.ui.layout.form"  → use xmlns:form="sap.ui.layout.form"
❌ <f:SimpleForm>                → use <form:SimpleForm>
❌ sap.m.Page                    → use sap.f.DynamicPage
❌ noDataText="..." on Table/List → use <noData><IllustratedMessage.../></noData>
❌ <Item> without core: prefix
❌ indicator="Neutral"           → use "None"
❌ Missing valueState model paths in onInit
❌ <GenericTile header="X"> AND also a child <header> aggregation — pick ONE, not both
❌ <TileContent> with more than one <content> child — only ONE <content> allowed
❌ <DynamicPageTitle> with more than one <f:heading> block

NON-EXISTENT CONTROLS — these crash with "failed to load" ModuleError:
❌ <GenericCard>   → DOES NOT EXIST in sap.m. Use <GenericTile> with <TileContent><NumericContent>
❌ <KPITile>       → DOES NOT EXIST. Use <GenericTile>
❌ <FlexBox>       → DOES NOT EXIST. Use <HBox> or <VBox>
❌ <CardHeader>    → DOES NOT EXIST inside GenericTile. Use header="" attribute on <GenericTile>
❌ <cardContent>   → DOES NOT EXIST. Use <tileContent> aggregation

CORRECT KPI TILE — always use this exact structure:
<GenericTile header="Total Revenue" subheader="This Month" class="sapUiSmallMargin">
  <tileContent>
    <TileContent unit="USD">
      <content>
        <NumericContent value="284500" indicator="Up" valueColor="Good" withMargin="false"/>
      </content>
    </TileContent>
  </tileContent>
</GenericTile>

CARDINALITY 0..1 RULES — these aggregations accept EXACTLY ONE child, never more:
❌ <TileContent> with multiple <content> children → keep ONLY ONE <content> block
❌ <f:heading> with multiple children → wrap in <VBox> if multiple controls needed
❌ <f:snappedHeading> with multiple children → wrap in <VBox>
❌ <noData> with multiple children → keep only ONE IllustratedMessage
❌ <GenericTile> with BOTH header="" attribute AND a <header> child element
Rule: if an aggregation sounds singular (heading, content, noData, snappedHeading) it takes ONE child.
Wrap multiple controls in <VBox> or <HBox> before placing in a 0..1 aggregation.

❌ MOST COMMON MISTAKE — <f:content> with multiple siblings:
WRONG:
  <f:content>
    <HBox>...</HBox>
    <Table>...</Table>      ← SECOND child → crashes with cardinality 0..1 error
  </f:content>

CORRECT — always wrap in VBox when putting multiple controls in f:content:
  <f:content>
    <VBox>
      <HBox>...</HBox>
      <Table>...</Table>
    </VBox>
  </f:content>

Return ONLY the 6 ---FILE--- blocks. No other text.`;

// ─── Parse file blocks ────────────────────────────────────────────────────────
function parseFileBlocks(text) {
  const files = [];

  // Primary parser: strict ---FILE:path:lang--- ... ---ENDFILE--- blocks
  const strict = /---FILE:([^:\n]+):([^-\n]+)---\n?([\s\S]*?)---ENDFILE---/g;
  let match;
  while ((match = strict.exec(text)) !== null) {
    const path = match[1].trim();
    const language = match[2].trim();
    const content = match[3].trim();
    if (path && content) files.push({ path, language, content });
  }
  if (files.length > 0) return files;

  // Fallback parser: handle truncated response where last ---ENDFILE--- is missing.
  // Splits on ---FILE: markers and takes content up to the next marker or end of string.
  const segments = text.split(/---FILE:/);
  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const headerEnd = seg.indexOf("---");
    if (headerEnd === -1) continue;
    const header = seg.slice(0, headerEnd).trim(); // "path:lang"
    const colonIdx = header.lastIndexOf(":");
    if (colonIdx === -1) continue;
    const path = header.slice(0, colonIdx).trim();
    const language = header.slice(colonIdx + 1).trim();
    // Content is everything after the closing --- of the header, before ---ENDFILE--- or end
    let body = seg.slice(headerEnd + 3);
    const endMarker = body.indexOf("---ENDFILE---");
    if (endMarker !== -1) body = body.slice(0, endMarker);
    body = body.trim();
    if (path && body) files.push({ path, language, content: body });
  }

  return files;
}

// ─── Post-process files ───────────────────────────────────────────────────────
function processFiles(files) {
  return files.map((file) => {
    if (file.path.endsWith(".xml")) {
      return { ...file, content: sanitizeXML(file.content) };
    }
    if (file.path.endsWith(".json")) {
      try {
        JSON.parse(file.content);
      } catch (e) {
        console.warn(`Invalid JSON in ${file.path}:`, e.message);
      }
    }
    if (file.path.endsWith(".controller.js")) {
      return { ...file, content: sanitizeController(file.content) };
    }
    return file;
  });
}

/**
 * Fixes common AI mistakes in generated controller JS.
 *
 * DATE STRINGS → new Date():
 * DatePicker binds to a Date object. When the AI writes plain ISO strings like
 * "2024-03-15" into the JSONModel, DatePicker logs "The given date instance isn't valid".
 *
 * This regex finds date-string patterns inside JSONModel data objects and wraps
 * them with new Date(...) so DatePicker gets a real Date object.
 *
 * Only applies to keys that look like date fields (contain "date", "Date", "from", "to",
 * "start", "end", "due", "created", "modified" in the key name).
 */
function sanitizeController(js) {
  if (!js) return js;
  let out = js;

  // Fix 1: ISO date strings on any date-like key → new Date(...)
  // e.g.  startDate: "2024-03-15"  →  startDate: new Date("2024-03-15")
  out = out.replace(
    /\b(\w*(?:[Dd]ate|[Ss]tart|[Ee]nd|[Dd]ue|[Ff]rom|[Cc]reated|[Mm]odified|[Dd]elivery|[Jj]oin|[Bb]irth|[Ii]ssued|[Ee]xpires)\w*)\s*:\s*"(\d{4}-\d{2}-\d{2})"/g,
    (match, key, dateStr) => `${key}: new Date("${dateStr}")`,
  );

  // Fix 2: Human-readable date strings on date-like keys → new Date(...)
  // e.g.  dueDate: "March 15, 2024"  →  dueDate: new Date("March 15, 2024")
  out = out.replace(
    /\b(\w*(?:[Dd]ate|[Ss]tart|[Ee]nd|[Dd]ue|[Cc]reated|[Dd]elivery|[Jj]oin)\w*)\s*:\s*"([A-Z][a-z]{2,8}\.?\s+\d{1,2},?\s+\d{4})"/g,
    (match, key, dateStr) => `${key}: new Date("${dateStr}")`,
  );

  // Fix 3: Catch-all for any remaining ISO strings on keys ending in "Date"
  // e.g.  orderDate: "2024-01-20"  (not caught by prefix patterns above)
  out = out.replace(
    /\b(\w+[Dd]ate)\s*:\s*"(\d{4}-\d{2}-\d{2})"/g,
    (match, key, dateStr) => `${key}: new Date("${dateStr}")`,
  );

  return out;
}

// ─── Retry helper — used when the AI returns a response without ---FILE--- blocks ──
// This happens when the prompt is long and the model hits its token limit mid-output.
// We retry once with max_tokens bumped to the proxy's hard cap and a tighter user message.
async function retryWithHigherTokens(prompt) {
  try {
    const res = await fetch(`${API_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat",
        max_tokens: 8000,
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Generate a SAP UI5 app for: ${prompt}

CRITICAL: Output EXACTLY 6 ---FILE--- blocks. Start immediately with ---FILE:webapp/view/Main.view.xml:xml--- on line 1.
Be concise — use 3-4 sample records, short descriptions. The output MUST fit within token limits.
Wrap all f:content children in a single VBox. Use DynamicPage. Follow all SAP standards.`,
          },
        ],
      }),
    });
    if (!res.ok) return generateFallbackApp(prompt);
    const data = await res.json();
    const rawText = data.choices?.[0]?.message?.content ?? "";
    const files = parseFileBlocks(rawText);
    if (files.length === 0) {
      console.warn(
        "retryWithHigherTokens: still no file blocks — using fallback",
      );
      return generateFallbackApp(prompt);
    }
    const processed = processFiles(files);
    const hasView = processed.some((f) => f.path.endsWith(".view.xml"));
    return hasView ? processed : generateFallbackApp(prompt);
  } catch (err) {
    console.error("retryWithHigherTokens error:", err);
    return generateFallbackApp(prompt);
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function generateApp(prompt) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: "deepseek/deepseek-chat",
        max_tokens: 8000, // increased from 6000 to reduce truncation
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Generate a complete, interactive SAP UI5 application for: ${prompt}

FLOOR PLAN SELECTION:
- List / catalog / dashboard / worklist → LIST REPORT
- Detail / record / order view          → OBJECT PAGE
- Create / edit form / registration     → FORM PAGE
- Mixed (list + detail)                 → LIST REPORT with IconTabBar

CHECKLIST before outputting:
✓ 6 ---FILE--- blocks only
✓ xmlns:f="sap.f" for DynamicPage, xmlns:form="sap.ui.layout.form" for SimpleForm
✓ sap.f.DynamicPage — NOT sap.m.Page
✓ All Tables: <noData><IllustratedMessage.../></noData> — NOT noDataText
✓ All required Inputs: valueState + valueStateText
✓ All /form/fieldState paths initialized to "None" in onInit
✓ sap/ui/Device imported, content density in onInit
✓ _validateForm() present, called from onSave
✓ Min 5 realistic sample records`,
          },
        ],
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Proxy error ${res.status}`);
    }

    const data = await res.json();
    const rawText = data.choices?.[0]?.message?.content ?? "";
    const files = parseFileBlocks(rawText);

    if (files.length === 0) {
      // The AI returned a response but without ---FILE--- markers.
      // This usually means the prompt was too long and the model hit its token limit.
      // Retry once with max_tokens bumped and a condensed user message.
      console.warn(
        "generateApp: No file blocks found — retrying with higher token limit",
      );
      clearTimeout(timeoutId);
      return retryWithHigherTokens(prompt);
    }

    const processed = processFiles(files);
    const hasView = processed.some((f) => f.path.endsWith(".view.xml"));

    if (!hasView) {
      console.warn("generateApp: No view file, using fallback");
      return generateFallbackApp(prompt);
    }

    return processed;
  } catch (err) {
    clearTimeout(timeoutId);

    // Timeout → use fallback silently (no credits/key errors, just slow AI)
    if (err.name === "AbortError") {
      console.error(
        "generateApp: client timeout after",
        CLIENT_TIMEOUT_MS / 1000,
        "s",
      );
      return generateFallbackApp(prompt);
    }

    // API errors (402, 401, 429 etc.) → throw so Home.jsx can show the message
    // These are actionable by the user — swallowing them into fallback is confusing
    const isApiError =
      err.message &&
      (err.message.includes("credits") ||
        err.message.includes("API key") ||
        err.message.includes("rate limit") ||
        err.message.includes("OpenRouter") ||
        err.message.includes("Proxy error"));

    if (isApiError) {
      console.error("generateApp API error:", err.message);
      throw err;
    }

    // Unexpected errors (parse failures, network blips) → fallback
    console.error("generateApp error:", err);
    return generateFallbackApp(prompt);
  }
}

export const generateXML = async (prompt) => {
  const files = await generateApp(prompt);
  const viewFile = files.find((f) => f.path.endsWith(".view.xml"));
  return viewFile?.content ?? "";
};
