import { useState } from "react";
import { IoSparkles } from "react-icons/io5";

function PromptPanel({ onGenerate }) {
  const [prompt, setPrompt] = useState("");

  function applyTemplate(text) {
    setPrompt(text);
  }

  return (
    <div className="prompt-panel">
      <h3>Describe your SAP UI</h3>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Example: Create a SAP UI5 sales dashboard with KPI cards and an orders table..."
      />

      <button className="generate-btn" onClick={() => onGenerate(prompt)}>
        <IoSparkles size={16} />
        Generate UI
      </button>

      <div className="templates">
        <p>Quick Templates</p>

        <div className="template-buttons">
          <button
            onClick={() =>
              applyTemplate(
                "Create a SAP UI5 sales dashboard with KPI blocks and an orders table",
              )
            }
          >
            Dashboard
          </button>

          <button
            onClick={() =>
              applyTemplate(
                "Create a SAP UI5 customer registration form with name email phone and submit button",
              )
            }
          >
            Form
          </button>

          <button
            onClick={() =>
              applyTemplate(
                "Create a SAP UI5 customer management page with search and table",
              )
            }
          >
            Table
          </button>

          <button
            onClick={() =>
              applyTemplate(
                "Create a SAP UI5 order list page with recent orders",
              )
            }
          >
            List
          </button>
        </div>
      </div>
    </div>
  );
}

export default PromptPanel;
