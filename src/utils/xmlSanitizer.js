/**
 * xmlSanitizer.js
 *
 * Fixes common AI generation mistakes in SAP UI5 XML Views.
 * Every rule here is sourced from verified SAP UI5 API documentation.
 *
 * RULES APPLIED:
 *
 * 1. NAMESPACE INJECTION
 *    - Ensure xmlns:mvc, xmlns="sap.m", xmlns:core on root element
 *
 * 2. PAGE headerToolbar REMOVAL
 *    sap.m.Page has NO headerToolbar aggregation.
 *    <headerToolbar> inside <Page> causes: "failed to load sap/m/headerToolbar.js"
 *    Fix: strip <headerToolbar>...</headerToolbar> that are direct children of <Page>.
 *    NOTE: <headerToolbar> inside Table / Panel / List is VALID — leave untouched.
 *
 * 3. ITEM NAMESPACE FIX
 *    sap.m.Item does NOT exist.
 *    <Item> inside Select/ComboBox must be <core:Item> (sap.ui.core.Item).
 *    Fix: replace bare <Item ...> with <core:Item ...> and auto-add xmlns:core.
 *
 * 4. DeviationIndicator ENUM FIX
 *    Valid values: "Up" | "Down" | "None"
 *    "Neutral" is NOT valid → replace with "None"
 *
 * 5. EVENT HANDLER & BINDING REMOVAL
 *    Remove press=, change=, liveChange= etc and binding expressions {..}
 *
 * 6. controllerName REMOVAL
 */
export function sanitizeXML(xml) {
  if (!xml) return "";

  let out = xml.trim();

  // ── Strip markdown fences ──────────────────────────────────────────────────
  out = out
    .replace(/^```(?:xml)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  // ── Remove controllerName ──────────────────────────────────────────────────
  out = out.replace(/\s+controllerName="[^"]*"/g, "");

  // ── Remove event handler attributes ───────────────────────────────────────
  out = out.replace(
    /\s+(press|change|liveChange|submit|tap|select|selectionChange|search|suggest|valueHelpRequest|itemPress|beforeOpen|afterOpen|beforeClose|afterClose|attachPress)="[^"]*"/g,
    "",
  );

  // ── Remove data binding expressions in attribute values ───────────────────
  out = out.replace(/="(\{[^"]*\})"/g, '=""');

  // ── Fix 2: Remove <headerToolbar> that is a direct child of <Page> ────────
  // sap.m.Page has no headerToolbar aggregation.
  // Only strip when headerToolbar immediately follows the <Page ...> opening tag
  // (nothing between them except whitespace), to avoid touching Table/Panel/List.
  out = out.replace(
    /(<Page\b[^>]*>)\s*<headerToolbar>[\s\S]*?<\/headerToolbar>/g,
    (match, pageTag) => pageTag,
  );

  // ── Fix 3: Replace bare <Item> with <core:Item> ───────────────────────────
  // sap.m.Item does not exist; sap.ui.core.Item must use the core: prefix.
  // Only replace unqualified <Item> (not already <core:Item> or <ui:Item> etc.)
  out = out.replace(/<Item(\s[^>]*)?(\/?>)/g, (match, attrs, close) => {
    // Skip if already has a namespace prefix (shouldn't happen but be safe)
    return `<core:Item${attrs || ""}${close}`;
  });
  out = out.replace(/<\/Item>/g, "</core:Item>");

  // ── Fix 4: Replace invalid DeviationIndicator "Neutral" with "None" ───────
  // Valid: "Up" | "Down" | "None". "Neutral" is not a valid enum value.
  out = out.replace(/\bindicator="Neutral"/g, 'indicator="None"');

  // ── Namespace injection ────────────────────────────────────────────────────

  // Ensure xmlns:mvc
  if (!out.includes("xmlns:mvc")) {
    out = out.replace(/(<mvc:View\b)/, '$1 xmlns:mvc="sap.ui.core.mvc"');
  }

  // Ensure default sap.m namespace
  if (!out.includes('xmlns="sap.m"')) {
    out = out.replace(/(<mvc:View\b)/, '$1 xmlns="sap.m"');
  }

  // Ensure xmlns:core if core: prefix appears anywhere
  if (out.includes("core:") && !out.includes('xmlns:core="sap.ui.core"')) {
    out = out.replace(/(<mvc:View\b)/, '$1 xmlns:core="sap.ui.core"');
  }

  // Add xmlns:l if l: prefix is used
  if (out.includes("l:") && !out.includes("xmlns:l")) {
    out = out.replace(/(<mvc:View\b)/, '$1 xmlns:l="sap.ui.layout"');
  }

  // ── Remove sap.f references (not available in CDN preview) ────────────────
  out = out.replace(/\s+xmlns:f="sap\.f"/g, "");
  out = out.replace(/<f:[A-Za-z]+[^>]*\/>/g, "");
  out = out.replace(/<f:[A-Za-z]+[^>]*>[\s\S]*?<\/f:[A-Za-z]+>/g, "");

  return out;
}
