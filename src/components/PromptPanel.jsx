/**
 * PromptPanel.jsx — v3.0
 *
 * v3.0: All 6 quick templates audited and rewritten to be bulletproof:
 *   - Every template explicitly wraps f:content children in a VBox (cardinality fix)
 *   - No GenericCard — all KPI tiles use GenericTile + TileContent + NumericContent
 *   - Date fields use "Start Date as DatePicker" without ISO string values (controller handles Date objects)
 *   - All templates specify the correct floor plan and VBox wrapping instruction
 *   - Generic prompt guidance added so free-text prompts also follow the rules
 */
import { useState } from "react";
import { IoSparkles } from "react-icons/io5";

const TEMPLATES = [
  {
    label: "📊 Dashboard",
    prompt:
      "Create a SAP UI5 sales dashboard using DynamicPage List Report floor plan. Inside f:content place a single VBox. First child of VBox is an HBox with 4 GenericTiles: Total Revenue 284000 USD indicator Up valueColor Good, New Orders 47 indicator Up valueColor Good, Active Customers 312 indicator Up valueColor Good, Return Rate 3.2 percent indicator Down valueColor Error. Each GenericTile uses tileContent with TileContent and NumericContent. Second child of VBox is a Table id recentOrders items bound to /orders with columns Order ID Customer Amount Status Date. Table uses noData IllustratedMessage illustrationType sapIllus-EmptyList. Add SearchField in OverflowToolbar. Footer OverflowToolbar has Export button.",
  },
  {
    label: "📝 Form",
    prompt:
      "Create a SAP UI5 employee registration Form Page using DynamicPage and SimpleForm with ResponsiveGridLayout columnsXL 2 columnsL 2. Place the SimpleForm as the single child of f:content wrapped in a VBox. DynamicPageTitle has nav-back and title New Employee Registration. SimpleForm has two core Title sections. Personal Information section: required First Name with valueState bound to form/firstNameState initialized None, required Last Name with valueState bound to form/lastNameState initialized None, Email Input, Phone Input. Employment Details section: Department Select with core Items HR Finance IT Operations Sales, Contract Type Select with core Items Full-time Part-time Contract Intern, Start Date as DatePicker with valueState bound to form/startDateState initialized None. onSave calls validateForm which validates all 3 required fields. Footer OverflowToolbar has Submit Cancel Reset buttons.",
  },
  {
    label: "📋 List",
    prompt:
      "Create a SAP UI5 customer list page using DynamicPage List Report floor plan. Wrap all f:content children in a single VBox. Table shows 6 customers with columns Name using ObjectIdentifier title and text, Company, Email, Phone, Status as ObjectStatus with Active Success and Inactive Error states. Table uses noData aggregation with IllustratedMessage illustrationType sapIllus-EmptyList title No customers found. Add SearchField liveChange onSearch in OverflowToolbar. onSearch filters binding by name using Filter FilterOperator Contains. DynamicPageTitle has Create button that calls onCreate which unshifts a new customer into the array. Footer OverflowToolbar has Delete button.",
  },
  {
    label: "🗂️ Detail",
    prompt:
      "Create a SAP UI5 order detail Object Page for Order ORD-2045 using DynamicPage Object Page floor plan. DynamicPageTitle has nav-back button, f:heading Title Order ORD-2045, f:snappedHeading Title ORD-2045, Edit Emphasized and Delete Reject actions. DynamicPageHeader pinnable true shows Customer Acme Corporation, Total Amount 4850 USD ObjectNumber emphasized, Status In Progress ObjectStatus Warning. IconTabBar has 3 tabs: Overview with ObjectHeader showing order title number and 3 ObjectAttributes, Items with Table of 4 line items columns Material Quantity Price using ObjectNumber the Table uses noData IllustratedMessage illustrationType sapIllus-EmptyList, Notes with TextArea value bound to /notes. Wrap the IconTabBar in a VBox inside f:content. Footer OverflowToolbar has Save and Cancel.",
  },
  {
    label: "🏪 Catalog",
    prompt:
      "Create a SAP UI5 product catalog page using DynamicPage List Report floor plan. Wrap all f:content children in a single VBox. Table id productTable shows 7 products with columns Product ID, Name, Category, Unit Price as ObjectNumber USD, Stock as ProgressIndicator percentValue bound to stockPercent, Status as ObjectStatus. Table uses noData aggregation with IllustratedMessage illustrationType sapIllus-EmptyList title No products found. OverflowToolbar has SearchField liveChange onSearch that filters by name, and Create button. onSearch uses Filter FilterOperator Contains. DynamicPageHeader shows 3 summary ObjectNumbers Total Products, In Stock, Low Stock. Footer has Export and Delete buttons in OverflowToolbar.",
  },
  {
    label: "📈 Analytics",
    prompt:
      "Create a SAP UI5 analytics overview page using DynamicPage List Report floor plan. Wrap all f:content children in a single VBox. First child of VBox is an HBox with 3 GenericTiles using tileContent TileContent NumericContent: Total Sales 128400 USD indicator Up valueColor Good, Active Users 2847 indicator Up valueColor Good, Conversion Rate 4.2 percent indicator Down valueColor Critical. Second child of VBox is an IconTabBar with 3 tabs: Monthly showing a Table of 6 months with columns Month Revenue Orders Growth percent as ObjectNumber each Table uses noData IllustratedMessage illustrationType sapIllus-EmptyList, Weekly showing a Table of 5 weeks with columns Week Revenue Orders, Daily showing a VBox with 3 ProgressIndicators for Mon Tue Wed each with percentValue and state Success. Footer has Export button.",
  },
];

// Generic prompt tips shown in the placeholder
const PLACEHOLDER = `Describe your SAP UI5 app...

Tips for best results:
• Say which floor plan: list, form, or detail page
• Name your columns and data fields
• Mention status colors: Success Warning Error
• The AI will wrap f:content in VBox automatically`;

function PromptPanel({ onGenerate, loading }) {
  const [prompt, setPrompt] = useState("");

  function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    onGenerate(trimmed);
  }

  function handleKeyDown(e) {
    // Ctrl+Enter or Cmd+Enter to generate
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      handleGenerate();
    }
  }

  return (
    <div className="prompt-panel">
      <h3>Describe Your App</h3>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={PLACEHOLDER}
        disabled={loading}
      />

      <button
        className="generate-btn"
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
      >
        <IoSparkles size={16} />
        {loading ? "Generating App..." : "Generate Full App"}
      </button>

      <div className="templates">
        <p>Quick Templates</p>
        <div className="template-buttons">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              onClick={() => setPrompt(t.prompt)}
              disabled={loading}
              title={t.prompt}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PromptPanel;
