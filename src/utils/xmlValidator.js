/**
 * xmlValidator.js
 * Validates that the XML is a renderable SAP UI5 view.
 * Returns { valid: boolean, message: string }
 */
export function validateXML(xml) {
  if (!xml || xml.trim().length === 0) {
    return { valid: false, message: "Empty XML" };
  }

  if (!xml.includes("<mvc:View")) {
    return { valid: false, message: "Missing root <mvc:View> element" };
  }

  if (!xml.includes("</mvc:View>")) {
    return {
      valid: false,
      message: "<mvc:View> is not closed — response may be truncated",
    };
  }

  if (!xml.includes('xmlns:mvc="sap.ui.core.mvc"')) {
    return { valid: false, message: "Missing xmlns:mvc namespace declaration" };
  }

  // Warn on remaining bindings (won't crash but won't show data)
  if (/="(\{[^}]+\})"/.test(xml)) {
    return {
      valid: true,
      message:
        "Warning: data binding expressions found — controls will render but show no data without a model",
    };
  }

  // Warn on headerToolbar inside Page (sanitizer should have caught this)
  if (/<Page[^>]*>[\s\S]*?<headerToolbar>/.test(xml)) {
    return {
      valid: false,
      message:
        "Invalid: <headerToolbar> found inside <Page> — use title= attribute or <customHeader><Bar>",
    };
  }

  return { valid: true, message: "Valid SAP UI5 XML View" };
}
