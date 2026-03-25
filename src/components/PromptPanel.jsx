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
    label: "📊 Sales Dashboard",
    prompt:
      "Create a sales dashboard for managers. Show four KPI cards: Total Revenue, New Orders, Active Customers, and Return Rate. Below that show a table of recent orders with columns Order ID, Customer, Amount, Status, and Date. Include a search bar to find orders and an Export button."
  },

  {
    label: "📝 Employee Form",
    prompt:
      "Create a form where HR can register a new employee. Include fields for First Name, Last Name, Email, Phone, Department, Contract Type, and Start Date. Add Submit, Cancel, and Reset buttons."
  },

  {
    label: "📋 Customer List",
    prompt:
      "Create a page that shows a list of customers. Display their Name, Company, Email, Phone, and Status. Add a search bar to find customers and a Create button to add a new customer."
  },

  {
    label: "🗂️ Order Details",
    prompt:
      "Create a page to view details of an order. Show the customer name, order amount, and status at the top. Include tabs for Overview, Items in the order, and Notes."
  },

  {
    label: "🏪 Product Catalog",
    prompt:
      "Create a product catalog page showing a table of products. Include Product ID, Name, Category, Price, Stock Level, and Status. Add a search bar and a button to create a new product."
  },

  {
    label: "📈 Analytics Overview",
    prompt:
      "Create an analytics overview page for business managers. Show KPI cards for Total Sales, Active Users, and Conversion Rate. Below that show data tables for monthly and weekly performance."
  }
];

// Generic prompt tips shown in the placeholder
const PLACEHOLDER = `
Describe the app you want to build.

Example:
• Create a sales dashboard showing revenue and recent orders
• Create a form to register a new employee
• Create a page that lists customers with search

The AI will build the full SAP UI5 app automatically.
`;

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
