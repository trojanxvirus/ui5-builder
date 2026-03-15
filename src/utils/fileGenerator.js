/**
 * fileGenerator.js — v4.1
 *
 * Generates a complete, interactive, 100% SAP-standard fallback app.
 * Uses: sap.f.DynamicPage, sap.ui.layout.form.SimpleForm, real MVC, bindings.
 *
 * Fix v4.1: word-boundary regex in generateFallbackApp title extraction
 */

const APP_ID = "com.ui5builder.app";
const CTRL_FQN = `${APP_ID}.controller.Main`;

// ─── View XML — DynamicPage + SimpleForm + IconTabBar ─────────────────────────
const FALLBACK_VIEW = `<mvc:View
  xmlns:mvc="sap.ui.core.mvc"
  xmlns="sap.m"
  xmlns:f="sap.f"
  xmlns:form="sap.ui.layout.form"
  xmlns:core="sap.ui.core"
  controllerName="${CTRL_FQN}"
  displayBlock="true">

  <f:DynamicPage id="dynamicPage" headerExpanded="true">

    <f:title>
      <f:DynamicPageTitle>
        <f:heading>
          <Title text="Customer Management" level="H2"/>
        </f:heading>
        <f:actions>
          <Button text="Create" type="Emphasized" press=".onCreate" icon="sap-icon://add"/>
          <Button icon="sap-icon://excel-attachment" type="Transparent" tooltip="Export" press=".onExport"/>
        </f:actions>
      </f:DynamicPageTitle>
    </f:title>

    <f:header>
      <f:DynamicPageHeader pinnable="true">
        <HBox wrap="Wrap" class="sapUiSmallMargin">
          <VBox class="sapUiSmallMarginEnd">
            <Label text="Total Customers"/>
            <ObjectNumber number="{/stats/total}" emphasized="true"/>
          </VBox>
          <VBox class="sapUiSmallMarginEnd">
            <Label text="Active"/>
            <ObjectNumber number="{/stats/active}" state="Success"/>
          </VBox>
          <VBox>
            <Label text="Inactive"/>
            <ObjectNumber number="{/stats/inactive}" state="Error"/>
          </VBox>
        </HBox>
      </f:DynamicPageHeader>
    </f:header>

    <f:content>
      <IconTabBar id="tabBar" class="sapFDynamicPageAlignContent" expanded="true">
        <items>

          <IconTabFilter text="Customer List" icon="sap-icon://people-connected" count="{/stats/total}">
            <Table id="mainTable" items="{/customers}" growing="true" growingThreshold="8">
              <noData>
                <IllustratedMessage
                  illustrationType="sapIllus-EmptyList"
                  title="No customers found"
                  description="Try adjusting your search or add a new customer"/>
              </noData>
              <headerToolbar>
                <OverflowToolbar>
                  <Title text="All Customers" level="H3"/>
                  <ToolbarSpacer/>
                  <SearchField width="220px" liveChange=".onSearch" placeholder="Search by name..."/>
                  <OverflowToolbarButton icon="sap-icon://filter" type="Transparent" tooltip="Filter" press=".onFilter"/>
                </OverflowToolbar>
              </headerToolbar>
              <columns>
                <Column width="3rem"/>
                <Column><Text text="Name"/></Column>
                <Column><Text text="Company"/></Column>
                <Column><Text text="Email"/></Column>
                <Column><Text text="Status"/></Column>
              </columns>
              <items>
                <ColumnListItem type="Active">
                  <cells>
                    <Avatar initials="{initials}" displaySize="XS" backgroundColor="{avatarColor}"/>
                    <ObjectIdentifier title="{name}" text="{id}"/>
                    <Text text="{company}"/>
                    <Text text="{email}"/>
                    <ObjectStatus text="{status}" state="{statusState}" inverted="false"/>
                  </cells>
                </ColumnListItem>
              </items>
            </Table>
          </IconTabFilter>

          <IconTabFilter text="Add Customer" icon="sap-icon://add">
            <form:SimpleForm
              id="createForm"
              editable="true"
              layout="ResponsiveGridLayout"
              labelSpanXL="4" labelSpanL="3" labelSpanM="4" labelSpanS="12"
              emptySpanXL="0" emptySpanL="0" emptySpanM="0" emptySpanS="0"
              columnsXL="2" columnsL="2" columnsM="1"
              class="sapFDynamicPageAlignContent sapUiSmallMarginTopBottom">
              <form:content>
                <core:Title text="Personal Information"/>
                <Label text="First Name" required="true"/>
                <Input value="{/form/firstName}"
                       valueState="{/form/firstNameState}"
                       valueStateText="First name is required"
                       placeholder="Enter first name"/>
                <Label text="Last Name" required="true"/>
                <Input value="{/form/lastName}"
                       valueState="{/form/lastNameState}"
                       valueStateText="Last name is required"
                       placeholder="Enter last name"/>
                <Label text="Email Address"/>
                <Input value="{/form/email}" placeholder="name@example.com"/>
                <Label text="Phone"/>
                <Input value="{/form/phone}" placeholder="+1 234 567 890"/>
                <core:Title text="Company Details"/>
                <Label text="Company"/>
                <Select selectedKey="{/form/company}">
                  <core:Item key="acme"   text="Acme Corporation"/>
                  <core:Item key="tech"   text="TechCo Ltd"/>
                  <core:Item key="global" text="Global Inc"/>
                  <core:Item key="sap"    text="SAP SE"/>
                  <core:Item key="new"    text="New Company"/>
                </Select>
                <Label text="Department"/>
                <Select selectedKey="{/form/department}">
                  <core:Item key="hr"  text="Human Resources"/>
                  <core:Item key="it"  text="Information Technology"/>
                  <core:Item key="fin" text="Finance"/>
                  <core:Item key="ops" text="Operations"/>
                  <core:Item key="mkt" text="Marketing"/>
                </Select>
                <Label text="Status"/>
                <Select selectedKey="{/form/status}">
                  <core:Item key="Active"   text="Active"/>
                  <core:Item key="Inactive" text="Inactive"/>
                </Select>
              </form:content>
            </form:SimpleForm>
          </IconTabFilter>

        </items>
      </IconTabBar>
    </f:content>

    <f:footer>
      <OverflowToolbar>
        <ToolbarSpacer/>
        <Button text="Save Customer" type="Emphasized" press=".onSave"/>
        <Button text="Reset Form" type="Transparent" press=".onReset"/>
      </OverflowToolbar>
    </f:footer>

  </f:DynamicPage>
</mvc:View>`;

// ─── Controller JS ────────────────────────────────────────────────────────────
const FALLBACK_CONTROLLER = `sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/Device"
], function (Controller, JSONModel, MessageToast, MessageBox, Filter, FilterOperator, Device) {
    "use strict";

    var AVATAR_COLORS = ["Accent1","Accent2","Accent3","Accent4","Accent5","Accent6"];

    function makeInitials(name) {
        var parts = (name || "").split(" ");
        return parts.map(function(p){ return p.charAt(0).toUpperCase(); }).slice(0,2).join("");
    }

    return Controller.extend("${CTRL_FQN}", {

        onInit: function () {
            // Content density — cozy on touch, compact on desktop
            var sClass = Device.support.touch ? "sapUiSizeCozy" : "sapUiSizeCompact";
            this.getView().addStyleClass(sClass);

            var aCustomers = [
                { id:"C001", name:"John Smith",    company:"Acme Corporation",  email:"john@acme.com",    status:"Active",   statusState:"Success", initials:"JS", avatarColor:"Accent1" },
                { id:"C002", name:"Jane Doe",      company:"TechCo Ltd",        email:"jane@techco.com",  status:"Active",   statusState:"Success", initials:"JD", avatarColor:"Accent2" },
                { id:"C003", name:"Robert Brown",  company:"Global Inc",        email:"rob@global.com",   status:"Inactive", statusState:"Error",   initials:"RB", avatarColor:"Accent3" },
                { id:"C004", name:"Sarah Wilson",  company:"Innovate GmbH",     email:"sarah@inn.com",    status:"Active",   statusState:"Success", initials:"SW", avatarColor:"Accent4" },
                { id:"C005", name:"Michael Lee",   company:"SAP SE",            email:"m.lee@sap.com",    status:"Active",   statusState:"Success", initials:"ML", avatarColor:"Accent5" },
                { id:"C006", name:"Emily Zhang",   company:"Acme Corporation",  email:"emily@acme.com",   status:"Inactive", statusState:"Error",   initials:"EZ", avatarColor:"Accent6" }
            ];

            var oModel = new JSONModel({
                customers: aCustomers,
                stats: {
                    total:    aCustomers.length,
                    active:   aCustomers.filter(function(c){ return c.status === "Active"; }).length,
                    inactive: aCustomers.filter(function(c){ return c.status === "Inactive"; }).length
                },
                form: {
                    firstName:      "",
                    lastName:       "",
                    email:          "",
                    phone:          "",
                    company:        "acme",
                    department:     "it",
                    status:         "Active",
                    firstNameState: "None",
                    lastNameState:  "None"
                }
            });
            this.getView().setModel(oModel);
        },

        _refreshStats: function () {
            var oModel     = this.getView().getModel();
            var aCustomers = oModel.getProperty("/customers");
            oModel.setProperty("/stats/total",    aCustomers.length);
            oModel.setProperty("/stats/active",   aCustomers.filter(function(c){ return c.status==="Active"; }).length);
            oModel.setProperty("/stats/inactive", aCustomers.filter(function(c){ return c.status==="Inactive"; }).length);
        },

        _validateForm: function () {
            var oModel = this.getView().getModel();
            var oForm  = oModel.getProperty("/form");
            var bValid = true;

            if (!oForm.firstName) {
                oModel.setProperty("/form/firstNameState", "Error");
                bValid = false;
            } else {
                oModel.setProperty("/form/firstNameState", "None");
            }

            if (!oForm.lastName) {
                oModel.setProperty("/form/lastNameState", "Error");
                bValid = false;
            } else {
                oModel.setProperty("/form/lastNameState", "None");
            }

            return bValid;
        },

        onCreate: function () {
            var oModel     = this.getView().getModel();
            var aCustomers = oModel.getProperty("/customers");
            var iNext      = aCustomers.length + 1;
            var sName      = "New Customer " + iNext;
            aCustomers.unshift({
                id:          "C" + String(100 + iNext).padStart(3, "0"),
                name:        sName,
                company:     "New Company",
                email:       "new@company.com",
                status:      "Active",
                statusState: "Success",
                initials:    makeInitials(sName),
                avatarColor: AVATAR_COLORS[iNext % AVATAR_COLORS.length]
            });
            oModel.setProperty("/customers", aCustomers);
            this._refreshStats();
            MessageToast.show("Customer created! Total: " + aCustomers.length);
        },

        onSearch: function (oEvent) {
            var sQuery   = oEvent.getParameter("newValue") || "";
            var oTable   = this.byId("mainTable");
            if (!oTable) return;
            var oBinding = oTable.getBinding("items");
            if (!oBinding) return;
            oBinding.filter(sQuery.trim()
                ? [new Filter([
                    new Filter("name",    FilterOperator.Contains, sQuery),
                    new Filter("company", FilterOperator.Contains, sQuery),
                    new Filter("email",   FilterOperator.Contains, sQuery)
                  ], false)]
                : []);
        },

        onFilter: function () {
            MessageToast.show("Filter panel — connect to sap.m.p13n.Engine in production.");
        },

        onExport: function () {
            MessageToast.show("Export — connect to sap.ui.export.Spreadsheet in production.");
        },

        onSave: function () {
            if (!this._validateForm()) {
                MessageBox.error("Please fill in all required fields.");
                return;
            }

            var oModel  = this.getView().getModel();
            var oForm   = oModel.getProperty("/form");

            var COMPANY_MAP = { acme:"Acme Corporation", tech:"TechCo Ltd", global:"Global Inc", sap:"SAP SE", new:"New Company" };
            var aCustomers  = oModel.getProperty("/customers");
            var sName       = oForm.firstName + " " + oForm.lastName;

            aCustomers.unshift({
                id:          "C" + String(100 + aCustomers.length + 1).padStart(3,"0"),
                name:        sName,
                company:     COMPANY_MAP[oForm.company] || oForm.company,
                email:       oForm.email || "no-email@provided.com",
                status:      oForm.status,
                statusState: oForm.status === "Active" ? "Success" : "Error",
                initials:    makeInitials(sName),
                avatarColor: AVATAR_COLORS[aCustomers.length % AVATAR_COLORS.length]
            });

            oModel.setProperty("/customers", aCustomers);
            this._refreshStats();

            // Reset form
            oModel.setProperty("/form", {
                firstName:"", lastName:"", email:"", phone:"",
                company:"acme", department:"it", status:"Active",
                firstNameState:"None", lastNameState:"None"
            });

            MessageToast.show("Customer '" + sName + "' saved successfully!");
        },

        onReset: function () {
            var oModel = this.getView().getModel();
            oModel.setProperty("/form", {
                firstName:"", lastName:"", email:"", phone:"",
                company:"acme", department:"it", status:"Active",
                firstNameState:"None", lastNameState:"None"
            });
            MessageToast.show("Form reset.");
        },

        onNavBack: function () {
            window.history.go(-1);
        }
    });
});`;

// ─── Component.js ─────────────────────────────────────────────────────────────
const COMPONENT_JS = `sap.ui.define([
    "sap/ui/core/UIComponent",
    "./model/models"
], function (UIComponent, models) {
    "use strict";
    return UIComponent.extend("${APP_ID}.Component", {
        metadata: {
            interfaces: ["sap.ui.core.IAsyncContentCreation"],
            manifest: "json"
        },
        init: function () {
            UIComponent.prototype.init.apply(this, arguments);
            this.setModel(models.createDeviceModel(), "device");
            this.getRouter().initialize();
        }
    });
});`;

// ─── manifest.json ────────────────────────────────────────────────────────────
const makeManifest = (title = "Customer Management") =>
  JSON.stringify(
    {
      _version: "1.65.0",
      "sap.app": {
        id: APP_ID,
        type: "application",
        i18n: "i18n/i18n.properties",
        title: "{{appTitle}}",
        description: "{{appDescription}}",
        applicationVersion: { version: "1.0.0" },
      },
      "sap.ui": {
        technology: "UI5",
        fullWidth: true,
        deviceTypes: { desktop: true, tablet: true, phone: true },
      },
      "sap.ui5": {
        rootView: {
          viewName: `${APP_ID}.view.Main`,
          type: "XML",
          async: true,
          id: "app",
        },
        dependencies: {
          minUI5Version: "1.120.0",
          libs: {
            "sap.m": {},
            "sap.f": {},
            "sap.ui.core": {},
            "sap.ui.layout": {},
            "sap.ui.unified": {},
          },
        },
        contentDensities: { compact: true, cozy: true },
        models: {
          i18n: {
            type: "sap.ui.model.resource.ResourceModel",
            settings: {
              bundleName: `${APP_ID}.i18n.i18n`,
              supportedLocales: [""],
              fallbackLocale: "",
            },
          },
        },
        routing: {
          config: {
            routerClass: "sap.m.routing.Router",
            viewType: "XML",
            viewPath: `${APP_ID}.view`,
            controlId: "app",
            controlAggregation: "pages",
            async: true,
          },
          routes: [{ pattern: "", name: "Main", target: ["Main"] }],
          targets: { Main: { viewId: "Main", viewName: "Main" } },
        },
      },
    },
    null,
    2,
  );

// ─── models.js ────────────────────────────────────────────────────────────────
const MODELS_JS = `sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], function (JSONModel, Device) {
    "use strict";
    return {
        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        }
    };
});`;

// ─── i18n ─────────────────────────────────────────────────────────────────────
const makeI18n = (title = "Customer Management") =>
  `# SAP UI5 Builder v4.1 — i18n
appTitle=${title}
appDescription=Generated by SAP UI5 Builder — SAP Fiori Standard

# Actions
action.create=Create
action.save=Save
action.cancel=Cancel
action.delete=Delete
action.edit=Edit
action.search=Search
action.filter=Filter
action.export=Export
action.reset=Reset

# Messages
msg.saved=Changes saved successfully
msg.deleted=Record deleted
msg.created=Record created successfully
msg.noData=No data available
msg.required=Please fill in all required fields
msg.confirmDelete=Are you sure you want to delete this record?

# Empty states
emptyList.title=No items found
emptyList.description=Try adjusting your search filters`;

// ─── Main export ──────────────────────────────────────────────────────────────
export function generateFallbackApp(prompt = "") {
  // FIX: word-boundary regex so "a", "an", "the" don't corrupt mid-word characters
  const raw = prompt
    .replace(
      /\b(create|generate|build|make|a|an|the|sap|ui5|fiori|app|application)\b/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
  const title = raw ? raw.charAt(0).toUpperCase() + raw.slice(1, 40) : "My App";

  return [
    {
      path: "webapp/view/Main.view.xml",
      language: "xml",
      content: FALLBACK_VIEW,
    },
    {
      path: "webapp/controller/Main.controller.js",
      language: "javascript",
      content: FALLBACK_CONTROLLER,
    },
    {
      path: "webapp/Component.js",
      language: "javascript",
      content: COMPONENT_JS,
    },
    {
      path: "webapp/manifest.json",
      language: "json",
      content: makeManifest(title),
    },
    {
      path: "webapp/model/models.js",
      language: "javascript",
      content: MODELS_JS,
    },
    {
      path: "webapp/i18n/i18n.properties",
      language: "properties",
      content: makeI18n(title),
    },
  ];
}
