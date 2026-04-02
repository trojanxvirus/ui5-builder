/**
 * aiService.js — v5.0
 *
 * v5.0:
 *   - Conversational: refineApp() for iterative refinements with context
 *   - Floor Plan 4: VizFrame charts (sap.viz) with FlattenedDataset
 *   - Floor Plan 5: sap.ui.table.Table (grid table) for large datasets
 *   - Smart controls advisory in FORBIDDEN: use m.Table/OverflowToolbar instead
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
FLOOR PLAN 4 — ANALYTICS / CHARTS (VizFrame)
══════════════════════════════════════════════════════════════
For dashboards with charts use sap.viz.ui5.controls.VizFrame.
Required namespaces in the VIEW (only 2 — NO vizFeeds namespace):
  xmlns:viz="sap.viz.ui5.controls"
  xmlns:vizData="sap.viz.ui5.data"

CRITICAL — DO NOT declare xmlns:vizFeeds in the view. The module
sap/viz/ui5/api/feeds/FeedItem.js does NOT exist and causes a script load error.
Feeds MUST be wired programmatically in the controller using _setupCharts().

IMPORTANT: Add "sap.viz": {} to manifest.json sap.ui5.dependencies.libs.

Feed UIDs by vizType:
  bar / column / line  → uid="categoryAxis" (Dimension) + uid="valueAxis" (Measure)
  pie / donut          → uid="color" (Dimension) + uid="size" (Measure)

DONUT/PIE chart — follow this exact structure (NO variations):
<viz:VizFrame id="regionChart" vizType="donut" width="100%" height="300px" uiConfig="{applicationSet:'fiori'}">
  <viz:dataset>
    <vizData:FlattenedDataset data="{/regionData}">
      <vizData:dimensions>
        <vizData:DimensionDefinition name="Region" value="{Region}"/>
      </vizData:dimensions>
      <vizData:measures>
        <vizData:MeasureDefinition name="Share" value="{Share}"/>
      </vizData:measures>
    </vizData:FlattenedDataset>
  </viz:dataset>
</viz:VizFrame>
Controller model data (names MUST match DimensionDefinition/MeasureDefinition name attributes exactly):
  regionData: [{ Region:"North",Share:35 },{ Region:"South",Share:25 },{ Region:"East",Share:20 },{ Region:"West",Share:20 }]
aCharts entry: { id: "regionChart", dimUid: "color", valUid: "size" }
IMPORTANT: Use double quotes for all XML attributes. NEVER use single quotes.

── VIEW (no <viz:feeds> block at all) ──────────────────────────────────────────
<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" xmlns:f="sap.f"
  xmlns:viz="sap.viz.ui5.controls" xmlns:vizData="sap.viz.ui5.data"
  controllerName="${CTRL_FQN}" displayBlock="true">
  <f:DynamicPage id="dynamicPage">
    <f:title>
      <f:DynamicPageTitle>
        <f:heading><Title text="Sales Analytics" level="H2"/></f:heading>
      </f:DynamicPageTitle>
    </f:title>
    <f:content>
      <VBox>
        <HBox wrap="Wrap" justifyContent="SpaceBetween" class="sapUiSmallMargin">
          <GenericTile header="Total Revenue" subheader="This Year" class="sapUiSmallMarginEnd sapUiSmallMarginBottom">
            <tileContent>
              <TileContent unit="USD">
                <content><NumericContent value="284500" indicator="Up" valueColor="Good" withMargin="false"/></content>
              </TileContent>
            </tileContent>
          </GenericTile>
          <GenericTile header="New Orders" subheader="This Month" class="sapUiSmallMarginEnd sapUiSmallMarginBottom">
            <tileContent>
              <TileContent>
                <content><NumericContent value="142" indicator="Up" valueColor="Good" withMargin="false"/></content>
              </TileContent>
            </tileContent>
          </GenericTile>
        </HBox>
        <Panel headerText="Monthly Revenue" class="sapUiMediumMarginBegin sapUiMediumMarginEnd">
          <viz:VizFrame id="revenueChart" width="100%" height="300px" vizType="bar"
            uiConfig="{applicationSet:'fiori'}">
            <viz:dataset>
              <vizData:FlattenedDataset data="{/chartData}">
                <vizData:dimensions>
                  <vizData:DimensionDefinition name="Month" value="{month}"/>
                </vizData:dimensions>
                <vizData:measures>
                  <vizData:MeasureDefinition name="Revenue" value="{revenue}"/>
                </vizData:measures>
              </vizData:FlattenedDataset>
            </viz:dataset>
          </viz:VizFrame>
        </Panel>
      </VBox>
    </f:content>
  </f:DynamicPage>
</mvc:View>

── CONTROLLER — always follow this exact pattern for charts ────────────────────
sap.ui.define([
    "sap/ui/core/mvc/Controller","sap/ui/model/json/JSONModel",
    "sap/m/MessageToast","sap/m/MessageBox",
    "sap/viz/ui5/controls/common/feeds/FeedItem",
    "sap/ui/Device"
], function (Controller, JSONModel, MessageToast, MessageBox, FeedItem, Device) {
    "use strict";
    return Controller.extend("${CTRL_FQN}", {
        onInit: function () {
            var sClass = Device.support.touch ? "sapUiSizeCozy" : "sapUiSizeCompact";
            this.getView().addStyleClass(sClass);
            var oModel = new JSONModel({
                monthlyData:  [{ month:"Jan",revenue:45000 },{ month:"Feb",revenue:52000 },{ month:"Mar",revenue:48000 },
                                { month:"Apr",revenue:61000 },{ month:"May",revenue:55000 },{ month:"Jun",revenue:67000 }],
                weeklyData:   [{ week:"W1",users:8200 },{ week:"W2",users:9100 },{ week:"W3",users:10200 },
                                { week:"W4",users:11500 },{ week:"W5",users:12480 },{ week:"W6",users:13200 }],
                statusData:   [{ status:"Active",count:540 },{ status:"Inactive",count:120 },{ status:"Pending",count:80 }]
            });
            this.getView().setModel(oModel);
            this._setupCharts();
        },

        // ── Chart feeds — self-referencing pattern ──────────────────────────────
        // Reads dimension/measure names DIRECTLY from the FlattenedDataset in the view.
        // This eliminates [50017] "Invalid data binding" — a feed-vs-definition name
        // mismatch that happens when strings are copied manually between view and controller.
        //
        // dimUid: "categoryAxis" for bar/column/line  |  "color" for pie/donut
        // valUid: "valueAxis"    for bar/column/line  |  "size"  for pie/donut
        //
        // To ADD a chart: add one line to aCharts  +  add the VizFrame to the view.
        // To REMOVE a chart: remove the line from aCharts  +  remove the VizFrame.
        // NEVER hardcode dimension/measure name strings here — always let getDataset() supply them.
        _setupCharts: function () {
            var aCharts = [
                { id: "revenueChart", dimUid: "categoryAxis", valUid: "valueAxis" },
                { id: "usersChart",   dimUid: "categoryAxis", valUid: "valueAxis" },
                { id: "statusChart",  dimUid: "color",        valUid: "size"      }
            ];
            aCharts.forEach(function (cfg) {
                var c = this.byId(cfg.id);
                if (!c) return;
                var oDs = c.getDataset();
                if (!oDs) return;
                var aDims = oDs.getDimensions();
                var aMeas = oDs.getMeasures();
                if (!aDims.length || !aMeas.length) return;
                var sDimName  = aDims[0].getName();
                var sMeasName = aMeas[0].getName();
                if (!sDimName || !sMeasName) return;
                c.destroyFeeds();
                c.addFeed(new FeedItem({ uid: cfg.dimUid, type: "Dimension", values: [sDimName]  }));
                c.addFeed(new FeedItem({ uid: cfg.valUid, type: "Measure",   values: [sMeasName] }));
            }.bind(this));
        }
    });
});

RULES for charts:
✅ ALWAYS import "sap/viz/ui5/controls/common/feeds/FeedItem" in the controller
✅ ALWAYS call this._setupCharts() at the end of onInit
✅ ALWAYS use the self-referencing aCharts array — dimUid/valUid only, NO name strings
✅ ALWAYS use c.getDataset().getDimensions()[0].getName() — never hardcode "Month", "Revenue" etc.
✅ ALWAYS call c.destroyFeeds() before addFeed() — prevents duplicate-feed errors on re-init
✅ ALWAYS null-guard: if (!c) return; and if (!oDs) return;
✅ NEVER add xmlns:vizFeeds to the view — causes fatal script load error
✅ NEVER put <viz:feeds> in XML — feeds are in _setupCharts only
✅ NEVER copy dimension/measure name strings from view to controller — [50017] risk
✅ When adding a chart: add one entry to aCharts + add VizFrame+dataset to the view
✅ When asked to add a chart, KEEP all existing aCharts entries — only append the new one

══════════════════════════════════════════════════════════════
FLOOR PLAN 5 — GRID TABLE (sap.ui.table.Table)
══════════════════════════════════════════════════════════════
For large datasets with row selection/sorting/column resizing use sap.ui.table.Table.
Required namespace: xmlns:table="sap.ui.table"
Add "sap.ui.table": {} to manifest.json libs.

CRITICAL — sap.ui.table.Table uses "rows" binding, NOT "items":
  rows="{/items}"   ← CORRECT
  items="{/items}"  ← WRONG (will crash)

Column structure — use named aggregations <table:label> and <table:template>:
<table:Table id="gridTable" rows="{/items}" visibleRowCount="10"
  selectionMode="MultiToggle" enableColumnReordering="true" width="100%">
  <table:toolbar>
    <OverflowToolbar>
      <Title text="Products" level="H3"/><ToolbarSpacer/>
      <SearchField width="200px" liveChange=".onSearch"/>
      <Button text="Export" icon="sap-icon://excel-attachment" type="Transparent" press=".onExport"/>
    </OverflowToolbar>
  </table:toolbar>
  <table:columns>
    <table:Column width="120px">
      <table:label><Label text="Product ID"/></table:label>
      <table:template><Text text="{id}" wrapping="false"/></table:template>
    </table:Column>
    <table:Column width="200px">
      <table:label><Label text="Name"/></table:label>
      <table:template><Text text="{name}" wrapping="false"/></table:template>
    </table:Column>
    <table:Column width="120px">
      <table:label><Label text="Status"/></table:label>
      <table:template><ObjectStatus text="{status}" state="{statusState}"/></table:template>
    </table:Column>
  </table:columns>
</table:Table>

══════════════════════════════════════════════════════════════
FLOOR PLAN 6 — SMART CONTROLS (SmartTable + SmartFilterBar)
══════════════════════════════════════════════════════════════
Use this floor plan when the user explicitly asks for SmartTable, SmartFilter,
SmartFilterBar, or a "production / real SAP / OData-connected" list report.

IMPORTANT: SmartTable and SmartFilterBar REQUIRE a live OData V2/V4 service at
runtime to render columns and filters. They are CORRECT and DEPLOYABLE in this
generated code. The preview will show an OData advisory (not a crash).

Required namespaces:
  xmlns:smartTable="sap.ui.comp.smarttable"
  xmlns:smartFilter="sap.ui.comp.smartfilterbar"

Required manifest change — replace the default JSONModel with an ODataModel:
  "dataSources": {
    "mainService": {
      "uri": "/sap/opu/odata/sap/Z_<ENTITY>_SRV/",
      "type": "OData",
      "settings": { "odataVersion": "2.0" }
    }
  }
  ...and in sap.ui5.models:
  "": {
    "type": "sap.ui.model.odata.v2.ODataModel",
    "dataSource": "mainService",
    "preload": true,
    "settings": { "defaultBindingMode": "TwoWay" }
  }

── VIEW EXAMPLE ────────────────────────────────────────────────────────────────
<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" xmlns:f="sap.f"
  xmlns:smartTable="sap.ui.comp.smarttable"
  xmlns:smartFilter="sap.ui.comp.smartfilterbar"
  controllerName="${CTRL_FQN}" displayBlock="true">
  <f:DynamicPage id="dynamicPage" headerExpanded="true" toggleHeaderOnTitleClick="false">
    <f:title>
      <f:DynamicPageTitle>
        <f:heading><Title text="Customer List" level="H2"/></f:heading>
        <f:actions>
          <Button text="New Customer" type="Emphasized" icon="sap-icon://add" press=".onCreate"/>
          <Button text="Export" icon="sap-icon://excel-attachment" type="Transparent" press=".onExport"/>
        </f:actions>
      </f:DynamicPageTitle>
    </f:title>
    <f:header>
      <f:DynamicPageHeader pinnable="true">
        <smartFilter:SmartFilterBar id="smartFilterBar"
          entitySet="CustomerSet"
          search=".onSearch"
          useToolbar="true">
        </smartFilter:SmartFilterBar>
      </f:DynamicPageHeader>
    </f:header>
    <f:content>
      <smartTable:SmartTable id="smartTable"
        entitySet="CustomerSet"
        smartFilterId="smartFilterBar"
        tableType="Table"
        header="Customers"
        showRowCount="true"
        useExportToExcel="true"
        useVariantManagement="false"
        enableAutoBinding="true"
        initiallyVisibleFields="CustomerID,Name,City,Country,Status">
      </smartTable:SmartTable>
    </f:content>
    <f:footer>
      <OverflowToolbar>
        <ToolbarSpacer/>
        <Button text="Delete Selected" type="Reject" press=".onDelete"/>
      </OverflowToolbar>
    </f:footer>
  </f:DynamicPage>
</mvc:View>

── CONTROLLER for SmartTable ────────────────────────────────────────────────────
sap.ui.define([
    "sap/ui/core/mvc/Controller","sap/m/MessageToast","sap/m/MessageBox","sap/ui/Device"
], function (Controller, MessageToast, MessageBox, Device) {
    "use strict";
    return Controller.extend("${CTRL_FQN}", {
        onInit: function () {
            var sClass = Device.support.touch ? "sapUiSizeCozy" : "sapUiSizeCompact";
            this.getView().addStyleClass(sClass);
        },
        onSearch: function () {
            var oSmartTable = this.byId("smartTable");
            if (oSmartTable) oSmartTable.rebindTable();
        },
        onCreate: function () { MessageToast.show("Navigate to create form."); },
        onDelete: function () {
            MessageBox.confirm("Delete selected records?", {
                onClose: function (sAction) {
                    if (sAction === "OK") MessageToast.show("Records deleted.");
                }
            });
        },
        onExport: function () { MessageToast.show("Export triggered — connect sap.ui.export.Spreadsheet."); }
    });
});

── MANIFEST for SmartTable (OData V2) ──────────────────────────────────────────
Replace the sap.ui5.models section and add dataSources to sap.app:
  "sap.app": {
    ...,
    "dataSources": {
      "mainService": {
        "uri": "/sap/opu/odata/sap/Z_CUSTOMER_SRV/",
        "type": "OData",
        "settings": { "odataVersion": "2.0" }
      }
    }
  },
  "sap.ui5": {
    "dependencies": { "libs": { "sap.m": {}, "sap.f": {}, "sap.ui.core": {}, "sap.ui.comp": {}, "sap.ui.layout": {} } },
    "models": {
      "": {
        "type": "sap.ui.model.odata.v2.ODataModel",
        "dataSource": "mainService",
        "preload": true,
        "settings": { "defaultBindingMode": "TwoWay" }
      },
      "i18n": { "type": "sap.ui.model.resource.ResourceModel", "settings": { "bundleName": "${APP_ID}.i18n.i18n" } }
    }
  }

FLOOR PLAN SELECTION for Smart controls:
  "smart table", "smarttable", "SmartTable" in the prompt → use Floor Plan 6
  "smart filter", "SmartFilterBar"                        → use Floor Plan 6
  "OData list", "connected to SAP backend/OData"          → use Floor Plan 6
  "production SAP Fiori", "real SAP app"                  → use Floor Plan 6

══════════════════════════════════════════════════════════════
FLOOR PLAN 7 — SAP CAP FULL-STACK APPLICATION
══════════════════════════════════════════════════════════════
Use Floor Plan 7 when the user asks for a CAP app, full-stack app,
OData backend, CDS model, real data, or production-ready SAP project.

Floor Plan 7 generates EXACTLY 7 files — NO MORE, NO LESS:
  webapp/view/Main.view.xml         → sap.f.DynamicPage + sap.m.Table (OData V4 binding)
  webapp/controller/Main.controller.js → search/filter controller (no JSONModel)
  webapp/manifest.json              → OData V4 model pointing to /odata/<path>/
  db/schema.cds                     → CDS entity definitions (no cuid/managed)
  srv/service.cds                   → CDS service + annotate block
  srv/data/com.ui5builder.app-<Entity>.json → 8-12 seed records
  package.json                      → CAP config: sqlite in-memory

── FILE MARKERS for Floor Plan 7 ───────────────────────────────────────────────
---FILE:webapp/view/Main.view.xml:xml---
---FILE:webapp/controller/Main.controller.js:js---
---FILE:webapp/manifest.json:json---
---FILE:db/schema.cds:cds---
---FILE:srv/service.cds:cds---
---FILE:srv/data/com.ui5builder.app-<Entity>.json:json---
---FILE:package.json:json---

── db/schema.cds ────────────────────────────────────────────────────────────────
namespace com.ui5builder.app;

entity Customers {
    key CustomerID : String(10);
    Name    : String(100);
    City    : String(50);
    Country : String(50);
    Status  : String(20);
    Revenue : Decimal(15,2);
}

── srv/service.cds — CRITICAL: use annotate block, NO inline annotations ─────────
using { com.ui5builder.app as app } from '../db/schema';

@path: '/customer'
service CustomerService {
    entity Customers as projection on app.Customers;
}

annotate CustomerService.Customers with @(
    UI.SelectionFields: [CustomerID, Name, Status],
    UI.LineItem: [
        { Value: CustomerID },
        { Value: Name },
        { Value: City },
        { Value: Country },
        { Value: Status },
        { Value: Revenue }
    ]
);

CDS RULES: ✅ curly-brace using  ✅ annotate block  ✅ { Value: X } only
❌ NO $Type  ❌ NO Label  ❌ NO trailing commas  ❌ NO inline entity annotations

── package.json — output ONLY valid JSON, nothing after the closing brace ────────
{
  "name": "ui5builder-cap-app",
  "version": "1.0.0",
  "cds": {
    "requires": {
      "db": { "kind": "sqlite", "credentials": { "database": ":memory:" } }
    }
  }
}

── webapp/view/Main.view.xml — sap.m.Table with V4 binding (NEVER SmartTable) ───
<mvc:View controllerName="com.ui5builder.app.controller.Main"
    xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" xmlns:f="sap.f" height="100%">
    <f:DynamicPage id="page" headerExpanded="true" toggleHeaderOnTitleClick="false">
        <f:title>
            <f:DynamicPageTitle>
                <f:heading><Title text="Customer Management"/></f:heading>
                <f:actions>
                    <SearchField id="searchField" width="220px" placeholder="Search..."
                                 liveChange=".onSearch"/>
                    <Button text="Add" type="Emphasized" icon="sap-icon://add" press=".onAdd"/>
                </f:actions>
            </f:DynamicPageTitle>
        </f:title>
        <f:content>
            <Table id="mainTable"
                   items="{path: '/Customers', parameters: {$count: true}}"
                   growing="true" growingThreshold="20" mode="MultiSelect"
                   noDataText="No records found">
                <headerToolbar>
                    <OverflowToolbar>
                        <Title text="Customers" level="H3"/>
                        <ToolbarSpacer/>
                        <Button icon="sap-icon://sort"   tooltip="Sort"/>
                        <Button icon="sap-icon://filter" tooltip="Filter"/>
                    </OverflowToolbar>
                </headerToolbar>
                <columns>
                    <Column><Text text="ID"/></Column>
                    <Column><Text text="Name"/></Column>
                    <Column><Text text="City"/></Column>
                    <Column><Text text="Country"/></Column>
                    <Column><Text text="Status"/></Column>
                    <Column hAlign="End"><Text text="Revenue"/></Column>
                </columns>
                <items>
                    <ColumnListItem type="Navigation">
                        <cells>
                            <ObjectIdentifier title="{CustomerID}"/>
                            <Text text="{Name}"/>
                            <Text text="{City}"/>
                            <Text text="{Country}"/>
                            <ObjectStatus text="{Status}"
                                state="{= \${Status} === 'Active' ? 'Success' : \${Status} === 'Inactive' ? 'Error' : 'Warning'}"/>
                            <ObjectNumber number="{Revenue}" unit="USD"/>
                        </cells>
                    </ColumnListItem>
                </items>
            </Table>
        </f:content>
    </f:DynamicPage>
</mvc:View>

── webapp/manifest.json for CAP ─────────────────────────────────────────────────
serviceUrl RULE: "/odata/{@path}/" — e.g. @path:'/customer' → "/odata/customer/"
❌ NEVER "/odata/v4/..." — proxy strips /odata and sends the rest directly to CDS.
{
    "sap.app": { "id": "com.ui5builder.app", "type": "application",
                 "applicationVersion": { "version": "1.0.0" } },
    "sap.ui5": {
        "rootView": { "viewName": "com.ui5builder.app.view.Main", "type": "XML",
                      "async": true, "id": "mainView" },
        "dependencies": { "minUI5Version": "1.60.0",
                          "libs": { "sap.m": {}, "sap.f": {}, "sap.ui.core": {} } },
        "models": {
            "": {
                "type": "sap.ui.model.odata.v4.ODataModel",
                "settings": {
                    "serviceUrl": "/odata/customer/",
                    "synchronizationMode": "None",
                    "operationMode": "Server",
                    "autoExpandSelect": true
                }
            }
        }
    }
}

── webapp/controller/Main.controller.js ─────────────────────────────────────────
sap.ui.define(["sap/ui/core/mvc/Controller","sap/ui/model/Filter","sap/ui/model/FilterOperator"],
function(Controller, Filter, FilterOperator) {
    "use strict";
    return Controller.extend("com.ui5builder.app.controller.Main", {
        onInit: function() {},
        onSearch: function(oEvent) {
            var sQuery = oEvent.getParameter("newValue");
            var oBinding = this.byId("mainTable").getBinding("items");
            if (sQuery) {
                oBinding.filter([new Filter({
                    filters: [new Filter("Name", FilterOperator.Contains, sQuery),
                              new Filter("CustomerID", FilterOperator.Contains, sQuery)],
                    and: false
                })]);
            } else { oBinding.filter([]); }
        },
        onAdd: function() { sap.m.MessageToast.show("Add — implement as needed"); }
    });
});

FLOOR PLAN 7 RULES:
✅ ALWAYS output exactly 7 files with the markers above
✅ CDS namespace MUST be com.ui5builder.app (never change)
✅ Seed data filename: com.ui5builder.app-<EntityName>.json
✅ manifest serviceUrl: "/odata/{@path-value}/" (no /v4/)
✅ Use sap.m.Table + sap.f.DynamicPage — NOT SmartTable/SmartFilterBar
❌ NEVER use SmartTable, SmartFilterBar, or sap.ui.comp
❌ NEVER use JSONModel or hardcoded data
❌ NEVER add /v4/ to the serviceUrl

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

══════════════════════════════════════════════════════════════
STATUS FILTER — always follow this exact pattern
══════════════════════════════════════════════════════════════
When a status filter Select/ComboBox is needed in the toolbar:

RULE 1 — Select item keys MUST exactly match (case-sensitive) the status string values
         stored in the JSONModel. If model data has status:"Active" then key="Active".
         NEVER use lowercase keys like key="active" when data has "Active" — EQ filter returns zero results.

RULE 2 — Always use a _applyFilters() helper that combines search + status in one call.
         NEVER let onSearch and onStatusFilter overwrite each other's filter array.

RULE 3 — Always include an "All" option with key="" that clears the status filter.

CORRECT PATTERN — use this for every list/table with both a search field and a status filter:

VIEW — Select in OverflowToolbar:
  <Select id="statusFilter" width="150px" change=".onStatusFilter" forceSelection="false">
    <core:Item key="" text="All Statuses"/>
    <core:Item key="Active" text="Active"/>
    <core:Item key="Inactive" text="Inactive"/>
    <core:Item key="Pending" text="Pending"/>
  </Select>

CONTROLLER — combined filter helper:
  _applyFilters: function () {
      var sQuery  = this.byId("searchField") ? this.byId("searchField").getValue() : "";
      var oSelect = this.byId("statusFilter");
      var sStatus = oSelect ? oSelect.getSelectedKey() : "";
      var aFilters = [];
      if (sQuery.trim()) {
          aFilters.push(new Filter("name", FilterOperator.Contains, sQuery));
      }
      if (sStatus) {
          aFilters.push(new Filter("status", FilterOperator.EQ, sStatus));
      }
      var oTable = this.byId("mainTable") || this.byId("mainList");
      if (oTable) oTable.getBinding("items").filter(aFilters);
  },
  onSearch: function (oEvent) {
      this._applyFilters();
  },
  onStatusFilter: function () {
      this._applyFilters();
  },

❌ NEVER use separate filter arrays in onSearch and onStatusFilter — they overwrite each other
❌ NEVER use key="active" when model data has status:"Active" — case must match exactly
❌ NEVER omit the "All" / key="" item — user cannot clear the filter otherwise

Return ONLY the 6 ---FILE--- blocks. No other text.\`;

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
// sanitizeFiles: per-file transforms (XML, JSON, controller, CDS) — no cross-file logic.
function sanitizeFiles(files) {
  return files.map((file) => {
    if (file.path.endsWith(".xml")) {
      return { ...file, content: sanitizeXML(file.content) };
    }
    // CAP package.json — ensure valid JSON (AI sometimes appends extra text)
    if (file.path === "package.json") {
      return { ...file, content: sanitizeCAPPackageJson(file.content) };
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
    if (file.path.endsWith(".cds")) {
      return { ...file, content: sanitizeCDS(file.content) };
    }
    return file;
  });
}

// processFiles: sanitize + cross-file VizFrame fix (used for fresh generation).
function processFiles(files) {
  // Cross-file fix: rebuild _setupCharts from the actual view content so feed
  // values always match DimensionDefinition/MeasureDefinition name attributes.
  // This eliminates [50017] "Invalid data binding" regardless of what the AI wrote.
  return crossFixVizCharts(sanitizeFiles(files));
}

// ─── Cross-file VizFrame fixer ────────────────────────────────────────────────
// Reads every <viz:VizFrame id="..." vizType="..."> from the view XML, then
// REWRITES _setupCharts in the controller from scratch — guaranteed correct IDs,
// correct dimUid/valUid per vizType, and the self-referencing getName() pattern
// that can never produce a [50017] name mismatch.
function crossFixVizCharts(files) {
  const viewFile = files.find((f) => f.path.endsWith(".view.xml"));
  const ctrlFile = files.find((f) => f.path.endsWith(".controller.js"));
  if (!viewFile || !ctrlFile) return files;
  if (!viewFile.content.includes("viz:VizFrame")) return files; // no charts — skip

  // ── 1. Extract all VizFrame elements ────────────────────────────────────────
  // Use ["'] to handle both single-quoted and double-quoted attribute values —
  // the AI occasionally generates single-quoted attributes which broke the old regex.
  const vizRe = /<viz:VizFrame\b([^>]*)>/g;
  const charts = [];
  let m;
  while ((m = vizRe.exec(viewFile.content)) !== null) {
    const attrs     = m[1];
    const idMatch   = attrs.match(/\bid\s*=\s*["']([^"']+)["']/);
    const typeMatch = attrs.match(/\bvizType\s*=\s*["']([^"']+)["']/);
    if (!idMatch) continue;
    const vizType = (typeMatch?.[1] ?? "bar").toLowerCase();
    const isPie   = /pie|donut/.test(vizType);
    charts.push({
      id:     idMatch[1],
      dimUid: isPie ? "color"       : "categoryAxis",
      valUid: isPie ? "size"        : "valueAxis",
    });
  }

  if (charts.length === 0) return files;

  // ── 2. Build a correct _setupCharts body ────────────────────────────────────
  const entries = charts
    .map((c) => `                { id: "${c.id}", dimUid: "${c.dimUid}", valUid: "${c.valUid}" }`)
    .join(",\n");

  const setupChartsFn =
`        _setupCharts: function () {
            var aCharts = [
${entries}
            ];
            aCharts.forEach(function (cfg) {
                var c = this.byId(cfg.id);
                if (!c) return;
                var oDs = c.getDataset();
                if (!oDs) return;
                var aDims = oDs.getDimensions();
                var aMeas = oDs.getMeasures();
                if (!aDims.length || !aMeas.length) return;
                var sDimName  = aDims[0].getName();
                var sMeasName = aMeas[0].getName();
                if (!sDimName || !sMeasName) return; // getName() returned falsy — skip to avoid [50017]
                c.destroyFeeds();
                c.addFeed(new FeedItem({ uid: cfg.dimUid, type: "Dimension", values: [sDimName]  }));
                c.addFeed(new FeedItem({ uid: cfg.valUid, type: "Measure",   values: [sMeasName] }));
            }.bind(this));
        }`;

  // ── 3. Patch controller ──────────────────────────────────────────────────────
  let ctrl = ctrlFile.content;

  // 3a. Ensure FeedItem is imported.
  // Strategy: insert the module path and the matching parameter name together
  // right after the first listed module ("sap/ui/core/mvc/Controller"), keeping
  // the define array and function-param positions in sync.
  if (!ctrl.includes("FeedItem")) {
    ctrl = ctrl.replace(
      /"sap\/ui\/core\/mvc\/Controller"/,
      '"sap/ui/core/mvc/Controller",\n    "sap/viz/ui5/controls/common/feeds/FeedItem"',
    );
    ctrl = ctrl.replace(
      /function\s*\(\s*(Controller)\b/,
      "function ($1, FeedItem",
    );
  }

  // 3b. Replace existing _setupCharts method definition OR insert it into Controller.extend
  //
  // IMPORTANT: ctrl.indexOf("_setupCharts") would also match the CALL this._setupCharts()
  // inside onInit, which points to the wrong opening brace. We specifically search for the
  // METHOD DEFINITION pattern: "_setupCharts:" (object literal) or "_setupCharts(" at
  // line-start (shorthand method). This avoids false matches on the call site.
  const defRe = /(?:^|\n)([ \t]*)(_setupCharts\s*:\s*function\b|_setupCharts\s*\(\s*\)\s*\{)/m;
  const defMatch = defRe.exec(ctrl);

  if (defMatch) {
    // Found the method definition — replace it with the generated version
    const setupStart = defMatch.index + (defMatch[0].startsWith("\n") ? 1 : 0) + defMatch[1].length;
    const openBrace  = ctrl.indexOf("{", setupStart);
    if (openBrace !== -1) {
      let depth = 1;
      let i     = openBrace + 1;
      while (i < ctrl.length && depth > 0) {
        if (ctrl[i] === "{")      depth++;
        else if (ctrl[i] === "}") depth--;
        i++;
      }
      ctrl = ctrl.slice(0, setupStart) + setupChartsFn + ctrl.slice(i);
    }
  } else {
    // _setupCharts is missing — insert it inside Controller.extend's object literal.
    //
    // DO NOT use lastIndexOf("});") — it finds the outermost sap.ui.define closing,
    // not Controller.extend's closing, which places the method outside the return value
    // and creates an "Unexpected token ':'" syntax error.
    //
    // Instead: locate Controller.extend("...", { via regex, then brace-count to its
    // closing } and insert just before it.
    const extendRe = /Controller\.extend\s*\(\s*["'][^"']*["']\s*,\s*\{/;
    const extendMatch = extendRe.exec(ctrl);
    if (extendMatch) {
      // extendMatch[0] ends with '{' which is the object literal opening brace
      const objOpenBrace = extendMatch.index + extendMatch[0].length - 1;
      let depth = 1;
      let j     = objOpenBrace + 1;
      while (j < ctrl.length && depth > 0) {
        if (ctrl[j] === "{")      depth++;
        else if (ctrl[j] === "}") depth--;
        j++;
      }
      // j-1 = position of closing }, insert _setupCharts just before it
      const closingBracePos = j - 1;
      ctrl =
        ctrl.slice(0, closingBracePos) +
        ",\n" +
        setupChartsFn +
        "\n    " +
        ctrl.slice(closingBracePos);
    }
  }

  // 3c. Ensure this._setupCharts() is called inside onInit
  if (!ctrl.includes("_setupCharts()")) {
    ctrl = ctrl.replace(
      /(this\.getView\(\)\.setModel\([^;]+;)/,
      "$1\n            this._setupCharts();",
    );
  }

  // ── 4. Inject missing chart data into the JSONModel ─────────────────────────
  // The AI sometimes forgets to add the data array for a newly added chart,
  // or uses wrong property names (case mismatch, generic "name"/"value" keys).
  // Parse every FlattenedDataset in the view, extract its data-binding path and
  // the actual property names from DimensionDefinition/MeasureDefinition value
  // bindings, then inject default rows if the controller doesn't have that key.
  const dsRe = /<(?:viz:|vizData:)?FlattenedDataset\b([^>]*)>([\s\S]*?)<\/(?:viz:|vizData:)?FlattenedDataset>/g;
  let dsMatch;
  while ((dsMatch = dsRe.exec(viewFile.content)) !== null) {
    const dsAttrs = dsMatch[1];
    const dsBody  = dsMatch[2];

    const dataKeyM = dsAttrs.match(/\bdata\s*=\s*["']\{\/(\w+)\}["']/);
    if (!dataKeyM) continue;
    const dataKey = dataKeyM[1];

    const dimPropM  = dsBody.match(/DimensionDefinition[^>]*\bvalue\s*=\s*["']\{([^}]+)\}["']/);
    const measPropM = dsBody.match(/MeasureDefinition[^>]*\bvalue\s*=\s*["']\{([^}]+)\}["']/);
    if (!dimPropM || !measPropM) continue;
    const dimProp  = dimPropM[1];   // e.g. "Region"
    const measProp = measPropM[1];  // e.g. "Share"

    // Check whether the controller already has this data key populated
    const hasData = new RegExp(`\\b${dataKey}\\s*:`).test(ctrl);
    if (!hasData) {
      // Inject 4 default rows using the EXACT same property names as the bindings
      const rows = [
        `{ ${dimProp}: "Category A", ${measProp}: 35 }`,
        `{ ${dimProp}: "Category B", ${measProp}: 25 }`,
        `{ ${dimProp}: "Category C", ${measProp}: 22 }`,
        `{ ${dimProp}: "Category D", ${measProp}: 18 }`,
      ].join(", ");
      const injection = `\n                ${dataKey}: [${rows}]`;

      // Insert into the first JSONModel constructor object
      ctrl = ctrl.replace(
        /(new (?:sap\.ui\.model\.json\.)?JSONModel\s*\(\s*\{)([\s\S]*?)(\}\s*\))/,
        (_, open, body, close) => {
          const needComma = body.trimEnd().length > 0 && !body.trimEnd().endsWith(",");
          return `${open}${body}${needComma ? "," : ""}${injection}\n            ${close}`;
        },
      );
      console.log(`crossFixVizCharts: injected default data for "${dataKey}" (${dimProp}/${measProp})`);
    }
  }

  console.log(
    `crossFixVizCharts: rewrote _setupCharts for ${charts.length} chart(s):`,
    charts.map((c) => c.id).join(", "),
  );

  return files.map((f) =>
    f.path.endsWith(".controller.js") ? { ...f, content: ctrl } : f,
  );
}

/**
 * Fixes common AI mistakes in generated controller JS.
 *
 * 1. DATE STRINGS → new Date()
 *    DatePicker binds to a Date object; plain ISO strings cause "date instance isn't valid".
 *
 * 2. addFeed() missing destroyFeeds() guard
 *    When the AI adds feeds without calling destroyFeeds() first, re-running onInit
 *    (e.g. in the preview sandbox) duplicates feeds and causes "already registered" errors.
 *    We insert destroyFeeds() just before the first addFeed() call on the same variable.
 */
function sanitizeController(js) {
  if (!js) return js;
  let out = js;

  // Fix 00: Upgrade old aFeeds-with-name-strings to self-referencing aCharts pattern.
  // Pattern detected: { id:"...", dim:"...", meas:"...", dimUid:"...", valUid:"..." }
  // The dim/meas keys are dangerous — they must match DimensionDefinition/MeasureDefinition
  // name attributes exactly. Replace the entire forEach body with the self-referencing version.
  if (/\bid\s*:\s*["'][^"']+["']\s*,\s*dim\s*:\s*["']/.test(out)) {
    // Rewrite the forEach body to read names from the dataset instead of the config object
    out = out.replace(
      /aFeeds\.forEach\(function\s*\(f\)\s*\{[\s\S]*?\}\.bind\(this\)\);/g,
      `aCharts.forEach(function (cfg) {
                var c = this.byId(cfg.id);
                if (!c) return;
                var oDs = c.getDataset();
                if (!oDs) return;
                var aDims = oDs.getDimensions();
                var aMeas = oDs.getMeasures();
                if (!aDims.length || !aMeas.length) return;
                c.destroyFeeds();
                c.addFeed(new FeedItem({ uid: cfg.dimUid, type: "Dimension", values: [aDims[0].getName()] }));
                c.addFeed(new FeedItem({ uid: cfg.valUid, type: "Measure",   values: [aMeas[0].getName()] }));
            }.bind(this));`
    );
    // Also rename the array variable and strip dim/meas keys from config objects
    out = out.replace(/\bvar\s+aFeeds\s*=\s*\[/, "var aCharts = [");
    out = out.replace(/\{\s*id\s*:\s*("[\w]+")\s*,\s*dim\s*:\s*"[^"]*"\s*,\s*meas\s*:\s*"[^"]*"\s*,\s*(dimUid\s*:\s*"[^"]*")\s*,\s*(valUid\s*:\s*"[^"]+")\s*\}/g,
      "{ id: $1, $2, $3 }");
  }

  // Fix 0: Insert oX.destroyFeeds() immediately before oX.addFeed() when missing.
  // Handles both the aFeeds forEach pattern and the legacy var oX = this.byId() pattern.
  // Regex: finds "    c.addFeed(" or "    oChart.addFeed(" on its own line and checks if
  // destroyFeeds is already there; if not, prepends it.
  out = out.replace(
    /^([ \t]+)((\w+)\.addFeed\()/gm,
    (match, indent, addCall, varName) => {
      // Only act on typical chart variable names (c, o*, or ends with Chart/chart)
      if (!/^(c|o[A-Z]|\w+[Cc]hart)$/.test(varName)) return match;
      // If the same variable already has destroyFeeds in the preceding 3 lines, skip
      const idx = out.indexOf(match);
      const preceding = out.slice(Math.max(0, idx - 300), idx);
      if (preceding.includes(`${varName}.destroyFeeds()`)) return match;
      return `${indent}${varName}.destroyFeeds();\n${match}`;
    }
  );

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
- List / catalog / worklist / table     → LIST REPORT (Floor Plan 1)
- Detail / record / order view          → OBJECT PAGE (Floor Plan 2)
- Create / edit form / registration     → FORM PAGE (Floor Plan 3)
- Analytics / charts / KPI / dashboard  → ANALYTICS (Floor Plan 4, use VizFrame)
- Large dataset / grid / analytical     → GRID TABLE (Floor Plan 5, sap.ui.table)
- SmartTable / SmartFilter (preview)    → SMART CONTROLS (Floor Plan 6, sap.ui.comp)
- CAP / full-stack / OData backend      → CAP APP (Floor Plan 7, CDS + sap.m.Table)
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

// ─── Refinement system prompt ─────────────────────────────────────────────────
// Intentionally minimal (~700 chars) so the output token budget is preserved for
// the actual file content. The full SYSTEM_PROMPT is 8 000+ chars and leaves too
// little room for the response when combined with the view/controller context —
// causing truncation, missing ---FILE--- markers, and spurious fallbacks.
const REFINEMENT_SYSTEM_PROMPT = `You are a senior SAP UI5 developer making targeted modifications to an existing app.

OUTPUT: Output ONLY the ---FILE--- blocks for the files you actually changed.
Unchanged files do NOT need to appear in the output.
Use the same marker format:
---FILE:webapp/view/Main.view.xml:xml---
content
---ENDFILE---

NAMESPACE RULES (never break):
  xmlns:f="sap.f"                       → DynamicPage/DynamicPageTitle only
  xmlns:form="sap.ui.layout.form"       → SimpleForm only (NEVER xmlns:f="sap.ui.layout.form")
  xmlns:viz="sap.viz.ui5.controls"      + xmlns:vizData="sap.viz.ui5.data" (NO vizFeeds in view — feeds are programmatic)
  xmlns:table="sap.ui.table"            → sap.ui.table.Table; use rows="{/path}" NOT items

STRICTLY FORBIDDEN:
❌ xmlns:f="sap.ui.layout.form"          — crashes; always use xmlns:form
❌ xmlns:vizFeeds in the view            — module does not exist; feeds are programmatic only
❌ <viz:feeds> block in XML             — feeds go in _setupCharts(), never in XML
❌ Hardcoding dim/meas name strings in aCharts — use getDataset().getDimensions()[0].getName()
❌ noDataText on Table/List              — use <noData><IllustratedMessage/></noData>
❌ <GenericCard> <KPITile> <FlexBox>     — do not exist in sap.m
❌ <f:content> with multiple direct children — wrap in <VBox>
❌ <TileContent> with multiple <content> children — keep exactly ONE
❌ indicator="Neutral"                   — use "None"

CHART RULE: _setupCharts aCharts entries must ONLY contain { id, dimUid, valUid }.
The dimension and measure names are read at runtime from c.getDataset().getDimensions/getMeasures().
This prevents [50017] "Invalid data binding" errors caused by name mismatches.

STATUS FILTER RULE: Select item key values MUST exactly match (case-sensitive) the status strings
in the JSONModel. Use _applyFilters() to combine search + status — never overwrite filters separately.
❌ key="active" when model has status:"Active" → EQ filter returns zero results.

RULE: Only change what was explicitly requested. Preserve all other structure, bindings, and logic.
Output ONLY the files that changed.\`;

// ─── Merge helper ─────────────────────────────────────────────────────────────
// Combines the AI's partial output (only changed files) with the original full
// file set so we always have a valid 6-file app even when the AI omits unchanged files.
function mergeRefinedFiles(lastFiles, refinedFiles) {
  const merged = lastFiles.map((orig) => {
    const updated = refinedFiles.find((r) => r.path === orig.path);
    return updated ? { ...orig, content: updated.content } : orig;
  });
  // Attach any new file paths the AI may have added
  refinedFiles.forEach((r) => {
    if (!merged.find((m) => m.path === r.path)) merged.push(r);
  });
  return merged;
}

// ─── Conversational refinement ────────────────────────────────────────────────
// Uses a lean REFINEMENT_SYSTEM_PROMPT so the output token budget isn't wasted on
// floor-plan examples the AI doesn't need for a small edit.
// The AI returns only changed files; we merge them back into the original 6.
//
// Context limits — intentionally generous so multi-chart views/controllers are
// never truncated mid-way (truncation is what causes the AI to drop existing
// charts when asked to add a new one).
const VIEW_CTX_LIMIT = 6000;
const CTRL_CTX_LIMIT = 4000;

export async function refineApp(refinementPrompt, lastFiles) {
  const lastView       = lastFiles.find((f) => f.path.endsWith(".view.xml"))?.content ?? "";
  const lastController = lastFiles.find((f) => f.path.endsWith(".controller.js"))?.content ?? "";

  const viewSnippet = lastView.length > VIEW_CTX_LIMIT
    ? lastView.slice(0, VIEW_CTX_LIMIT) + "\n  <!-- ...truncated -->\n</mvc:View>"
    : lastView;
  const ctrlSnippet = lastController.length > CTRL_CTX_LIMIT
    ? lastController.slice(0, CTRL_CTX_LIMIT) + "\n    // ...truncated\n  });\n});"
    : lastController;

  const abortCtrl = new AbortController();
  const timeoutId = setTimeout(() => abortCtrl.abort(), CLIENT_TIMEOUT_MS);

  const buildBody = (userMsg) =>
    JSON.stringify({
      model: "deepseek/deepseek-chat",
      max_tokens: 6000,
      temperature: 0.2,
      messages: [
        { role: "system", content: REFINEMENT_SYSTEM_PROMPT },
        { role: "user",   content: userMsg },
      ],
    });

  const fullUserMsg = `CURRENT VIEW XML:
${viewSnippet}

CURRENT CONTROLLER (excerpt):
${ctrlSnippet}

CHANGE REQUEST: ${refinementPrompt}

IMPORTANT RULES FOR THIS MODIFICATION:
- Preserve ALL existing VizFrame charts in the view — do NOT remove any unless explicitly asked.
- In _setupCharts(), keep ALL existing aCharts entries — only append or remove the one(s) mentioned.
- aCharts entries contain ONLY { id, dimUid, valUid } — NO dim/meas name strings.
- Dimension and measure names are read at runtime: c.getDataset().getDimensions()[0].getName()
- Every aCharts entry MUST have a matching VizFrame id in the view XML.
- WHEN ADDING A NEW CHART: output BOTH view.xml AND controller.js.
  The controller MUST add the chart's data array to the JSONModel.
  DATA NAMING RULE — this is the most common failure: the JS object keys in the data array
  MUST EXACTLY match (character for character, case-sensitive) the value="{...}" bindings in
  the DimensionDefinition and MeasureDefinition. Example:
    view:       <DimensionDefinition name="Region" value="{Region}"/>
                <MeasureDefinition   name="Share"  value="{Share}"/>
    controller: regionData: [{ Region: "North", Share: 35 }, { Region: "South", Share: 25 }, ...]
  ✅ JS key "Region" matches value="{Region}". ✅ JS key "Share" matches value="{Share}".
  ❌ Using { region: ... } or { name: ..., value: ... } causes "No data" — NEVER do this.
- Use double quotes for ALL XML attribute values (never single quotes).
- Output only the ---FILE--- blocks for files you changed. Do not repeat unchanged files.`;

  try {
    const res = await fetch(`${API_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: abortCtrl.signal,
      body: buildBody(fullUserMsg),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Proxy error ${res.status}`);
    }

    const data    = await res.json();
    const rawText = data.choices?.[0]?.message?.content ?? "";
    let   refined = parseFileBlocks(rawText);

    // ── Retry once with view-only context if parsing failed ──────────────────
    // (Do NOT fall back to fresh generation — the user wants a modification.)
    if (refined.length === 0) {
      console.warn("refineApp: no file blocks on first attempt — retrying with view-only context");
      const abortCtrl2 = new AbortController();
      const tid2 = setTimeout(() => abortCtrl2.abort(), CLIENT_TIMEOUT_MS);

      const retryMsg = `CURRENT VIEW XML:
${viewSnippet}

CHANGE REQUEST: ${refinementPrompt}

Rules: Preserve ALL existing VizFrame charts. aCharts entries are { id, dimUid, valUid } only.
Feeds are wired via c.getDataset().getDimensions()[0].getName() — no hardcoded name strings.
Output only the ---FILE--- blocks for files you changed.`;

      const res2 = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortCtrl2.signal,
        body: buildBody(retryMsg),
      });
      clearTimeout(tid2);

      if (res2.ok) {
        const data2 = await res2.json();
        const raw2  = data2.choices?.[0]?.message?.content ?? "";
        refined = parseFileBlocks(raw2);
      }
    }

    // ── Merge partial output into the original 6 files ────────────────────────
    if (refined.length === 0) {
      // Both attempts produced no parseable blocks — surface an error instead
      // of silently regenerating so the user knows something went wrong
      throw new Error("Refinement produced no output. Try rephrasing your request.");
    }

    // 1. Per-file sanitize the AI's partial output (XML, controller, JSON fixes)
    const sanitized = sanitizeFiles(refined);

    // 2. Merge partial output into the full file set so the view + controller
    //    are both present for the cross-file VizFrame fixer.
    const merged = mergeRefinedFiles(lastFiles, sanitized);

    // 3. CRITICAL: run crossFixVizCharts on the MERGED result, not the partial
    //    AI output. When the AI only returns the controller (no view), the partial
    //    set has no view → crossFixVizCharts can't detect the donut vizType →
    //    assigns wrong dimUid "categoryAxis" instead of "color" → [50017].
    return crossFixVizCharts(merged);
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === "AbortError") {
      throw new Error("Request timed out. Try a shorter or simpler refinement.");
    }

    const isApiError =
      err.message &&
      (err.message.includes("credits") ||
        err.message.includes("API key") ||
        err.message.includes("rate limit") ||
        err.message.includes("OpenRouter") ||
        err.message.includes("Proxy error"));

    if (isApiError) throw err;

    // Re-throw user-facing errors (empty output message from above, etc.)
    throw err;
  }
}

// ─── CAP system prompt ────────────────────────────────────────────────────────
// Focused prompt for Floor Plan 7: CDS + UI5 full-stack generation.
// Kept separate so it doesn't bloat the standard SYSTEM_PROMPT token budget.
// ─── Smart Controls + seeded OData prompt ────────────────────────────────────
// Used when user explicitly asks for SmartTable/SmartFilterBar.
// Generates: SmartTable + SmartFilterBar view (real XML, downloadable) +
//            full CDS backend (schema, service with @UI annotations, seed data).
// Preview renders seed data via buildCAPPreviewHTML (sap.m.Table fallback).
const SMART_CAP_SYSTEM_PROMPT = `You are a senior SAP UI5 + CAP developer.
The user wants a SmartTable + SmartFilterBar app backed by a local CDS OData V4 service.

OUTPUT FORMAT — exactly 7 ---FILE--- blocks in this exact order:
---FILE:webapp/view/Main.view.xml:xml---
---FILE:webapp/controller/Main.controller.js:js---
---FILE:webapp/manifest.json:json---
---FILE:db/schema.cds:cds---
---FILE:srv/service.cds:cds---
---FILE:srv/data/com.ui5builder.app-<Entity>.json:json---
---FILE:package.json:json---

══ EXACT TEMPLATES ══

── webapp/view/Main.view.xml ────────────────────────────────────────────────
Use SmartTable + SmartFilterBar inside sap.f.DynamicPage. Include correct namespaces.

<mvc:View controllerName="com.ui5builder.app.controller.Main"
    xmlns:mvc="sap.ui.core.mvc"
    xmlns="sap.m"
    xmlns:f="sap.f"
    xmlns:smartTable="sap.ui.comp.smarttable"
    xmlns:smartFilter="sap.ui.comp.smartfilterbar"
    height="100%">
    <f:DynamicPage id="page" headerExpanded="true" toggleHeaderOnTitleClick="false">
        <f:title>
            <f:DynamicPageTitle>
                <f:heading><Title text="Customer Management"/></f:heading>
                <f:actions>
                    <Button text="Add" type="Emphasized" icon="sap-icon://add" press=".onAdd"/>
                </f:actions>
            </f:DynamicPageTitle>
        </f:title>
        <f:content>
            <VBox>
                <smartFilter:SmartFilterBar id="smartFilterBar"
                    entityType="CustomerService.Customers"
                    considerSelectionVariants="true"
                    search=".onSearch"/>
                <smartTable:SmartTable id="smartTable"
                    entitySet="Customers"
                    smartFilterId="smartFilterBar"
                    tableType="ResponsiveTable"
                    header="Customers"
                    showRowCount="true"
                    enableAutoBinding="true"
                    useExportToExcel="true"/>
            </VBox>
        </f:content>
    </f:DynamicPage>
</mvc:View>

ADAPT entity names, entityType namespace, header text to the domain.

── webapp/controller/Main.controller.js ─────────────────────────────────────
sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
    "use strict";
    return Controller.extend("com.ui5builder.app.controller.Main", {
        onInit: function () {},
        onSearch: function () {
            this.byId("smartTable").rebindTable();
        },
        onAdd: function () {
            sap.m.MessageToast.show("Add record — implement as needed");
        }
    });
});

── webapp/manifest.json ─────────────────────────────────────────────────────
Follow the same structure as the CAP template: set "sap.ui5".models[""].type to
"sap.ui.model.odata.v4.ODataModel" and serviceUrl to "/odata/<servicePath>/".
The <servicePath> MUST match @path in srv/service.cds (e.g. "customer").

── db/schema.cds, srv/service.cds, srv/data/*.json, package.json ─────────────
Use EXACTLY the same rules as the CAP template:
- db/schema.cds: entity with plain scalar fields (no cuid/managed)
- srv/service.cds: expose entity, add @UI.LineItem and @UI.SelectionFields via annotate block
- srv/data: realistic seed JSON, 10+ records
- package.json: SQLite in-memory, @sap/cds dependency
`;

const CAP_SYSTEM_PROMPT = `You are a senior SAP CAP (Cloud Application Programming Model) developer.
Generate a complete full-stack SAP CAP application with a proper SAP Fiori UI5 frontend.

OUTPUT FORMAT — exactly 7 ---FILE--- blocks in this exact order:
---FILE:webapp/view/Main.view.xml:xml---
---FILE:webapp/controller/Main.controller.js:js---
---FILE:webapp/manifest.json:json---
---FILE:db/schema.cds:cds---
---FILE:srv/service.cds:cds---
---FILE:srv/data/com.ui5builder.app-<Entity>.json:json---
---FILE:package.json:json---

══ EXACT TEMPLATES (substitute entity/field names for the domain) ══

── webapp/view/Main.view.xml ────────────────────────────────────────────────────
Use sap.f.DynamicPage + sap.m.Table with OData V4 binding. NEVER use SmartTable.

<mvc:View controllerName="com.ui5builder.app.controller.Main"
    xmlns:mvc="sap.ui.core.mvc"
    xmlns="sap.m"
    xmlns:f="sap.f"
    height="100%">
    <f:DynamicPage id="page" headerExpanded="true" toggleHeaderOnTitleClick="false">
        <f:title>
            <f:DynamicPageTitle>
                <f:heading><Title text="Customer Management"/></f:heading>
                <f:actions>
                    <SearchField id="searchField" width="220px" placeholder="Search..."
                                 liveChange=".onSearch"/>
                    <Button text="Add" type="Emphasized" icon="sap-icon://add" press=".onAdd"/>
                </f:actions>
            </f:DynamicPageTitle>
        </f:title>
        <f:content>
            <Table id="mainTable"
                   items="{path: '/Customers', parameters: {$count: true}}"
                   growing="true" growingThreshold="20" mode="MultiSelect"
                   noDataText="No records found">
                <headerToolbar>
                    <OverflowToolbar>
                        <Title text="Customers" level="H3"/>
                        <ToolbarSpacer/>
                        <Button icon="sap-icon://sort"   tooltip="Sort"/>
                        <Button icon="sap-icon://filter" tooltip="Filter"/>
                    </OverflowToolbar>
                </headerToolbar>
                <columns>
                    <Column><Text text="ID"/></Column>
                    <Column><Text text="Name"/></Column>
                    <Column><Text text="City"/></Column>
                    <Column><Text text="Country"/></Column>
                    <Column><Text text="Status"/></Column>
                    <Column hAlign="End"><Text text="Revenue"/></Column>
                </columns>
                <items>
                    <ColumnListItem type="Navigation">
                        <cells>
                            <ObjectIdentifier title="{CustomerID}"/>
                            <Text text="{Name}"/>
                            <Text text="{City}"/>
                            <Text text="{Country}"/>
                            <ObjectStatus text="{Status}"
                                state="{= \${Status} === 'Active' ? 'Success' : \${Status} === 'Inactive' ? 'Error' : 'Warning'}"/>
                            <ObjectNumber number="{Revenue}" unit="USD"/>
                        </cells>
                    </ColumnListItem>
                </items>
            </Table>
        </f:content>
    </f:DynamicPage>
</mvc:View>

ADAPT to the domain: change entity name, field names, column headers, and ObjectStatus states.

── webapp/controller/Main.controller.js ──────────────────────────────────────────
sap.ui.define(["sap/ui/core/mvc/Controller","sap/ui/model/Filter","sap/ui/model/FilterOperator"],
function(Controller, Filter, FilterOperator) {
    "use strict";
    return Controller.extend("com.ui5builder.app.controller.Main", {
        onInit: function() {},
        onSearch: function(oEvent) {
            var sQuery = oEvent.getParameter("newValue");
            var oBinding = this.byId("mainTable").getBinding("items");
            if (sQuery) {
                oBinding.filter([new Filter({
                    filters: [
                        new Filter("Name", FilterOperator.Contains, sQuery),
                        new Filter("CustomerID", FilterOperator.Contains, sQuery)
                    ], and: false
                })]);
            } else {
                oBinding.filter([]);
            }
        },
        onAdd: function() {
            sap.m.MessageToast.show("Add functionality — implement as needed");
        }
    });
});

── webapp/manifest.json ──────────────────────────────────────────────────────────
{
    "sap.app": {
        "id": "com.ui5builder.app",
        "type": "application",
        "applicationVersion": { "version": "1.0.0" }
    },
    "sap.ui5": {
        "rootView": {
            "viewName": "com.ui5builder.app.view.Main",
            "type": "XML",
            "async": true,
            "id": "mainView"
        },
        "dependencies": {
            "minUI5Version": "1.60.0",
            "libs": { "sap.m": {}, "sap.f": {}, "sap.ui.core": {} }
        },
        "models": {
            "": {
                "type": "sap.ui.model.odata.v4.ODataModel",
                "settings": {
                    "serviceUrl": "/odata/customer/",
                    "synchronizationMode": "None",
                    "operationMode": "Server",
                    "autoExpandSelect": true
                }
            }
        }
    }
}

serviceUrl RULE: ALWAYS "/odata/{@path-value}/" — e.g. @path:'/orders' → "/odata/orders/"
❌ NEVER use "/odata/v4/..." — the proxy strips /odata and sends the rest directly to CDS.

── db/schema.cds ────────────────────────────────────────────────────────────────
namespace com.ui5builder.app;

entity Customers {
    key CustomerID : String(10);
    Name           : String(100);
    City           : String(50);
    Country        : String(50);
    Status         : String(20);
    Revenue        : Decimal(15,2);
}

── srv/service.cds ──────────────────────────────────────────────────────────────
CRITICAL — use EXACTLY this form (annotate block, no inline annotations):

using { com.ui5builder.app as app } from '../db/schema';

@path: '/customer'
service CustomerService {
    entity Customers as projection on app.Customers;
}

annotate CustomerService.Customers with @(
    UI.SelectionFields: [CustomerID, Name, Status],
    UI.LineItem: [
        { Value: CustomerID },
        { Value: Name },
        { Value: City },
        { Value: Country },
        { Value: Status },
        { Value: Revenue }
    ]
);

RULES:
✅ curly-brace using: "using { namespace as app } from"
✅ separate annotate block
✅ annotation records: { Value: FieldName } only — NO $Type, NO Label
✅ @path on its own line before "service"
❌ NO trailing commas, NO $Type, NO Label inside annotation records

── srv/data ──────────────────────────────────────────────────────────────────────
Filename MUST be: com.ui5builder.app-<EntityName>.json (e.g. com.ui5builder.app-Customers.json)
Provide 8–10 realistic records. Property names MUST match entity field names exactly.

── package.json ─────────────────────────────────────────────────────────────────
OUTPUT ONLY VALID JSON — no comments, no trailing text after the final }:
{
  "name": "ui5builder-cap-app",
  "version": "1.0.0",
  "cds": {
    "requires": {
      "db": { "kind": "sqlite", "credentials": { "database": ":memory:" } }
    }
  }
}

ABSOLUTE RULES:
- Namespace always: com.ui5builder.app
- NEVER use SmartTable, SmartFilterBar, or sap.ui.comp controls — use sap.m.Table + sap.f.DynamicPage
- NEVER use JSONModel or VizFrame
- manifest.json serviceUrl: "/odata/{@path}/" (no /v4/ prefix)
- package.json: pure valid JSON only`;

// ── CDS post-processor ────────────────────────────────────────────────────────
// Fixes common AI mistakes in generated CDS files so the CDS compiler
// (v6.8+) can parse them without syntax errors.
function sanitizeCDS(cds) {
  if (!cds || !cds.trim()) return cds;
  let out = cds;

  // 1. Remove trailing commas before ] or } (invalid in CDS annotations)
  out = out.replace(/,(\s*[\]}])/g, "$1");

  // 2. Strip $Type: 'UI.DataField', lines — CDS infers this automatically
  //    and including it in shorthand { } records causes parse errors in v6
  out = out.replace(/\$Type\s*:\s*['"][^'"]*['"]\s*,?\s*/g, "");

  // 3. Strip Label lines from annotation records — not needed for SmartTable
  //    to render and can cause type-mismatch errors
  out = out.replace(/,?\s*Label\s*:\s*['"][^'"]*['"]/g, "");
  out = out.replace(/Label\s*:\s*['"][^'"]*['"]\s*,?\s*/g, "");

  // 4. Ensure empty annotation objects { } are cleaned up after $Type removal
  out = out.replace(/\{\s*,/g, "{");
  out = out.replace(/,\s*\}/g, "\n        }");

  // 5. Fix "using X as Y from" → "using { X as Y } from" (required in CDS v6)
  out = out.replace(
    /\busing\s+([\w.]+)\s+as\s+(\w+)\s+from\b/g,
    "using { $1 as $2 } from",
  );

  return out;
}

// ── CAP package.json sanitizer ────────────────────────────────────────────────
// Extracts valid JSON from AI output that sometimes appends explanation text
// after the closing brace.
function sanitizeCAPPackageJson(content) {
  const firstBrace = content.indexOf("{");
  const lastBrace  = content.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return getDefaultCAPPackageJson();
  }
  const jsonStr = content.slice(firstBrace, lastBrace + 1);
  try {
    JSON.parse(jsonStr);
    return jsonStr;
  } catch (_) {
    return getDefaultCAPPackageJson();
  }
}

function getDefaultCAPPackageJson() {
  return JSON.stringify(
    {
      name: "ui5builder-cap-app",
      version: "1.0.0",
      cds: {
        requires: {
          db: { kind: "sqlite", credentials: { database: ":memory:" } },
        },
      },
    },
    null,
    2,
  );
}

// ─── CAP helpers ─────────────────────────────────────────────────────────────

/**
 * Returns true when a file list contains CDS files → it is a CAP project.
 * Used by Home.jsx to decide whether to trigger CAP deployment after generation.
 */
export function isCAPProject(files) {
  return Array.isArray(files) && files.some((f) => f.path.endsWith(".cds"));
}

/**
 * Separates a mixed file list into CAP backend files and UI5 frontend files.
 * CAP files: .cds, srv/data/*.json, root package.json
 * UI5 files: everything under webapp/
 */
/**
 * Safety-net post-processor: if the AI still generated SmartTable/SmartFilterBar in the
 * CAP view, replace the <f:content> with a proper sap.m.Table driven by the seed data.
 * This runs AFTER the AI response — fields are inferred from the seed JSON.
 */
function fixCAPSmartTable(files) {
  const viewFile = files.find((f) => f.path === "webapp/view/Main.view.xml");
  if (!viewFile) return files;
  if (!/SmartTable|SmartFilterBar|smarttable|smartfilterbar/i.test(viewFile.content)) return files;

  console.warn("fixCAPSmartTable: detected SmartTable — replacing with sap.m.Table");

  // Derive fields + page title from seed data
  const seedFile = files.find(
    (f) => f.path.startsWith("srv/data/") && f.path.endsWith(".json"),
  );
  let seedFields = [];
  try {
    const rows = JSON.parse(seedFile?.content ?? "[]");
    if (Array.isArray(rows) && rows.length > 0) seedFields = Object.keys(rows[0]);
  } catch (_) {}

  if (seedFields.length === 0) return files; // can't infer fields — leave as-is

  const titleM   = viewFile.content.match(/Title\s+text="([^"]+)"/);
  const pageTitle = titleM?.[1] || "Application";

  const columns = seedFields
    .map((f) => `<Column><Text text="${f}"/></Column>`)
    .join("\n                    ");

  const cells = seedFields
    .map((f) => {
      if (/status|state/i.test(f))
        return `<ObjectStatus text="{${f}}" state="{= \${${f}} === 'Active' ? 'Success' : \${${f}} === 'Inactive' ? 'Error' : 'Warning'}"/>`;
      if (/revenue|amount|price|total/i.test(f))
        return `<ObjectNumber number="{${f}}" unit="USD"/>`;
      if (/(^id$|id$)/i.test(f))
        return `<ObjectIdentifier title="{${f}}"/>`;
      return `<Text text="{${f}}"/>`;
    })
    .join("\n                        ");

  // Build the filter names for the search binding (use first 3 text fields)
  const textFields = seedFields.filter(
    (f) => !/(^id$|id$|revenue|amount|price|total)/i.test(f),
  );
  const filterArr = (textFields.length > 0 ? textFields.slice(0, 3) : seedFields.slice(0, 3))
    .map((f) => `new Filter("${f}", FilterOperator.Contains, sQuery)`)
    .join(",\n                        ");

  const newView = `<mvc:View controllerName="com.ui5builder.app.controller.Main"
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
                   items="{path: '/${pageTitle.replace(/\s+/g, "")}', parameters: {\\$count: true}}"
                   growing="true" growingThreshold="20"
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

  // Also fix the controller — replace ODataModel filter with simple client search
  const ctrlFile = files.find((f) => f.path === "webapp/controller/Main.controller.js");
  let newCtrl = ctrlFile?.content ?? "";
  if (ctrlFile && /SmartFilterBar|smartFilter/i.test(newCtrl)) {
    newCtrl = `sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, Filter, FilterOperator) {
    "use strict";
    return Controller.extend("com.ui5builder.app.controller.Main", {
        onInit: function () {},
        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue");
            var oBinding = this.byId("mainTable").getBinding("items");
            if (sQuery) {
                oBinding.filter([new Filter({
                    filters: [${filterArr}],
                    and: false
                })]);
            } else {
                oBinding.filter([]);
            }
        },
        onAdd: function () {
            sap.m.MessageToast.show("Add record — implement as needed");
        }
    });
});`;
  }

  return files.map((f) => {
    if (f.path === "webapp/view/Main.view.xml")       return { ...f, content: newView };
    if (f.path === "webapp/controller/Main.controller.js") return { ...f, content: newCtrl };
    return f;
  });
}

export function splitCAPFiles(files) {
  const cap  = files.filter(
    (f) =>
      f.path.endsWith(".cds") ||
      f.path.startsWith("srv/") ||
      f.path.startsWith("db/") ||
      f.path === "package.json",
  );
  const ui5 = files.filter((f) => f.path.startsWith("webapp/"));
  return { cap, ui5, all: files };
}

// ─── CAP generation ──────────────────────────────────────────────────────────
/**
 * Generates a complete SAP CAP full-stack application (Floor Plan 7).
 * Returns all 7 files: UI5 view + controller + manifest, CDS schema + service,
 * seed data JSON, and CAP package.json.
 */
export async function generateCAPApp(prompt) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  const userMsg = `Generate a complete SAP CAP full-stack application for: ${prompt}

Requirements:
- Use the com.ui5builder.app namespace
- UI5 view MUST use sap.m.Table + sap.f.DynamicPage ONLY — NEVER SmartTable or SmartFilterBar
- Add @UI.LineItem and @UI.SelectionFields annotations in service.cds
- Provide at least 10 realistic seed records matching the domain
- manifest.json OData uri must match the @path in service.cds
- package.json must configure SQLite in-memory DB

Output exactly 7 ---FILE--- blocks. Start immediately with:
---FILE:webapp/view/Main.view.xml:xml---`;

  try {
    const res = await fetch(`${API_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: "deepseek/deepseek-chat",
        max_tokens: 10000,
        temperature: 0.15,
        messages: [
          { role: "system", content: CAP_SYSTEM_PROMPT },
          { role: "user",   content: userMsg },
        ],
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Proxy error ${res.status}`);
    }

    const data    = await res.json();
    const rawText = data.choices?.[0]?.message?.content ?? "";
    const files   = parseFileBlocks(rawText);

    if (files.length === 0) {
      console.warn("generateCAPApp: no file blocks — using fallback message");
      throw new Error("AI did not return file blocks. Try a more specific prompt.");
    }

    // Validate required CAP files
    const hasCds = files.some((f) => f.path.endsWith(".cds"));
    const hasView = files.some((f) => f.path.endsWith(".view.xml"));
    if (!hasCds || !hasView) {
      throw new Error("AI returned incomplete CAP project. Try again.");
    }

    console.log(`generateCAPApp: got ${files.length} files`);
    // Safety net: replace SmartTable/SmartFilterBar if the AI still generated them
    return fixCAPSmartTable(files);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("CAP generation timed out. Try a shorter description.");
    }
    throw err;
  }
}

/**
 * Generates a SmartTable + SmartFilterBar app backed by a full CDS OData V4 service.
 * Unlike generateCAPApp, the SmartTable XML is preserved in the view (not replaced).
 * The preview uses buildCAPPreviewHTML which auto-detects SmartTable and renders a
 * sap.m.Table with seed data instead — so the user gets a working preview immediately
 * while the downloadable code has the real SmartTable/SmartFilterBar XML.
 */
export async function generateSmartCAPApp(prompt) {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  const userMsg = `Generate a SmartTable + SmartFilterBar SAP UI5 app with a CDS OData V4 backend for: ${prompt}

Requirements:
- Use the com.ui5builder.app namespace
- View MUST use SmartTable + SmartFilterBar (user explicitly requested Smart Controls)
- Add @UI.LineItem and @UI.SelectionFields annotations in service.cds
- Provide at least 10 realistic seed records matching the domain
- manifest.json OData uri must match the @path in service.cds
- package.json must configure SQLite in-memory DB

Output exactly 7 ---FILE--- blocks. Start immediately with:
---FILE:webapp/view/Main.view.xml:xml---`;

  try {
    const res = await fetch(`${API_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: "deepseek/deepseek-chat",
        max_tokens: 10000,
        temperature: 0.15,
        messages: [
          { role: "system", content: SMART_CAP_SYSTEM_PROMPT },
          { role: "user",   content: userMsg },
        ],
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Proxy error ${res.status}`);
    }

    const data    = await res.json();
    const rawText = data.choices?.[0]?.message?.content ?? "";
    const files   = parseFileBlocks(rawText);

    if (files.length === 0) throw new Error("AI did not return file blocks. Try a more specific prompt.");

    const hasCds  = files.some((f) => f.path.endsWith(".cds"));
    const hasView = files.some((f) => f.path.endsWith(".view.xml"));
    if (!hasCds || !hasView) throw new Error("AI returned incomplete project. Try again.");

    console.log(`generateSmartCAPApp: got ${files.length} files`);
    // Do NOT run fixCAPSmartTable — we want to preserve the SmartTable XML
    return files;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") throw new Error("Generation timed out. Try a shorter description.");
    throw err;
  }
}
