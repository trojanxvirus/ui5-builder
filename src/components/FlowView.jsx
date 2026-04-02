/**
 * FlowView.jsx
 *
 * Renders the Mermaid architecture diagram generated alongside the app code.
 * Uses mermaid.js to parse and render the flowchart into an SVG.
 */
import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { FaSitemap } from "react-icons/fa";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    background:       "#1a1f2e",
    primaryColor:     "#1e2a3a",
    primaryBorderColor: "#2d3f55",
    primaryTextColor: "#c8d8ea",
    lineColor:        "#5a96e3",
    secondaryColor:   "#162030",
    tertiaryColor:    "#0f1825",
    edgeLabelBackground: "#1a1f2e",
    fontFamily:       "'Noto Sans', Arial, sans-serif",
    fontSize:         "13px",
  },
  flowchart: { curve: "basis", padding: 20, nodeSpacing: 50, rankSpacing: 60 },
});

let _diagramId = 0;

function FlowView({ diagram }) {
  const containerRef = useRef(null);
  const [error, setError]     = useState(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!diagram || !containerRef.current) {
      setRendered(false);
      return;
    }

    setError(null);
    setRendered(false);

    const id = `flow-diagram-${++_diagramId}`;

    mermaid.render(id, diagram)
      .then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          // Make the SVG responsive
          const svgEl = containerRef.current.querySelector("svg");
          if (svgEl) {
            svgEl.removeAttribute("height");
            svgEl.style.width  = "100%";
            svgEl.style.height = "auto";
            svgEl.style.maxWidth = "100%";
          }
          setRendered(true);
        }
      })
      .catch((err) => {
        console.error("Mermaid render error:", err);
        setError("Could not render the diagram. The AI may have returned malformed Mermaid syntax.");
      });
  }, [diagram]);

  if (!diagram) {
    return (
      <div className="flow-empty">
        <FaSitemap size={36} className="flow-empty-icon" />
        <div className="flow-empty-title">No diagram yet</div>
        <div className="flow-empty-subtitle">
          Generate an app to see its architecture flow diagram here.
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flow-empty">
        <div className="flow-empty-title" style={{ color: "#e06c75" }}>Render error</div>
        <div className="flow-empty-subtitle">{error}</div>
      </div>
    );
  }

  return (
    <div className="flow-canvas">
      <div className="flow-diagram-wrapper" ref={containerRef} />
      {!rendered && (
        <div className="flow-empty">
          <div className="flow-empty-subtitle">Rendering diagram…</div>
        </div>
      )}
    </div>
  );
}

export default FlowView;
