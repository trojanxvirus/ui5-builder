/**
 * xmlSanitizer.js — v4.3
 *
 * v4.3 additions:
 *   9. Fix cardinality 0..1 violations — "multiple aggregates defined for aggregation"
 *      The most common cases:
 *      a) <GenericTile> with BOTH a header="" attribute AND a <header> child aggregation
 *      b) <DynamicPageTitle> with both <f:heading> and a stray <heading> child
 *      c) <TileContent> with multiple <content> children
 *      d) <Table> with both noDataText="" AND a <noData> child (our migrator can cause this)
 *      e) <f:DynamicPage> with duplicate <f:title> blocks
 *
 * v4.2: hallucinated control fixes (GenericCard → GenericTile, FlexBox → HBox etc.)
 * v4.1: noDataText → IllustratedMessage migration
 * v4.0: namespace fixes, core:Item, indicator="None", headerToolbar in Page
 */
export function sanitizeXML(xml) {
  if (!xml) return "";

  let out = xml.trim();

  // 1. Strip markdown fences
  out = out
    .replace(/^```(?:xml)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  // 2. Fix wrong f: prefix for sap.ui.layout.form
  out = fixFormNamespacePrefix(out);

  // 3. Strip <headerToolbar> that is a DIRECT child of <Page>
  out = out.replace(
    /(<Page\b[^>]*>)\s*<headerToolbar>[\s\S]*?<\/headerToolbar>/g,
    (_, pageTag) => pageTag,
  );

  // 4. Replace bare <Item> with <core:Item>
  out = out.replace(
    /<Item(\s[^>]*)?(\/?>)/g,
    (_, attrs, close) => `<core:Item${attrs || ""}${close}`,
  );
  out = out.replace(/<\/Item>/g, "</core:Item>");

  // 5. Fix invalid DeviationIndicator "Neutral" → "None"
  out = out.replace(/\bindicator="Neutral"/g, 'indicator="None"');

  // 7. Migrate noDataText on Table/List to IllustratedMessage
  out = migrateNoDataText(out);

  // 8. Fix hallucinated / non-existent SAP controls
  out = fixHallucinatedControls(out);

  // 9. Fix cardinality 0..1 violations
  out = fixCardinalityViolations(out);

  // 6. Namespace injection
  if (!out.includes("xmlns:mvc")) {
    out = out.replace(/(<mvc:View\b)/, '$1 xmlns:mvc="sap.ui.core.mvc"');
  }
  if (!out.includes('xmlns="sap.m"')) {
    out = out.replace(/(<mvc:View\b)/, '$1 xmlns="sap.m"');
  }
  if (out.includes("core:") && !out.includes('xmlns:core="sap.ui.core"')) {
    out = out.replace(/(<mvc:View\b)/, '$1 xmlns:core="sap.ui.core"');
  }
  if (out.includes("f:") && !out.includes("xmlns:f=")) {
    out = out.replace(/(<mvc:View\b)/, '$1 xmlns:f="sap.f"');
  }
  if (out.includes("form:") && !out.includes("xmlns:form=")) {
    out = out.replace(/(<mvc:View\b)/, '$1 xmlns:form="sap.ui.layout.form"');
  }
  if (out.includes("l:") && !out.includes("xmlns:l=")) {
    out = out.replace(/(<mvc:View\b)/, '$1 xmlns:l="sap.ui.layout"');
  }

  return out;
}

/**
 * Fixes cardinality 0..1 violations — "multiple aggregates defined for aggregation with cardinality 0..1"
 *
 * SAP UI5 throws this assertion when an aggregation that allows only one child receives more than one.
 * The AI most often violates this in three ways:
 *
 * 1. <GenericTile header="Title"> ALSO has a child <header><Title text="Title"/></header>
 *    Fix: remove the child <header> aggregation since the attribute already sets it.
 *
 * 2. <TileContent> contains multiple <content> children
 *    Fix: keep only the first <content> child.
 *
 * 3. <Table> has BOTH noDataText="..." attribute AND a <noData> child aggregation
 *    (our own migrateNoDataText() can cause this if the attribute wasn't removed)
 *    Fix: remove the noDataText attribute when a <noData> child is present.
 */
function fixCardinalityViolations(xml) {
  let out = xml;

  // Fix 1: GenericTile with both header="" attribute AND <header> child aggregation.
  // The attribute wins — strip the child <header>...</header> inside each GenericTile.
  out = out.replace(
    /(<GenericTile\b[^>]*\bheader="[^"]*"[^>]*>)([\s\S]*?)(<\/GenericTile>)/g,
    (match, openTag, body, closeTag) => {
      // Remove any <header>...</header> child aggregation inside this tile
      const cleanBody = body.replace(/<header>[\s\S]*?<\/header>/g, "");
      return openTag + cleanBody + closeTag;
    },
  );

  // Fix 6: <f:content> inside DynamicPage with multiple direct children.
  // f:content is cardinality 0..1 — it accepts exactly ONE child control.
  // When the AI places both KPI tiles (HBox) AND a Table directly inside <f:content>,
  // SAP UI5 throws "multiple aggregates defined for aggregation with cardinality 0..1".
  // Fix: wrap all siblings in a VBox using a character-depth counter.
  out = out.replace(
    /(<f:content>)([\s\S]*?)(<\/f:content>)/g,
    (match, open, body, close) => {
      // Walk the body character-by-character counting element depth.
      // Every time we return to depth 0 after opening a tag, we've completed a root child.
      let depth = 0;
      let inTag = false;
      let rootChildCount = 0;
      for (let i = 0; i < body.length; i++) {
        const ch = body[i];
        if (ch === "<") {
          inTag = true;
          // Check if it is a closing tag
          if (body[i + 1] === "/") {
            depth--;
            if (depth === 0) rootChildCount++;
          } else if (body[i + 1] !== "!") {
            // Opening tag (not a comment)
            depth++;
          }
        } else if (ch === ">" && inTag) {
          // Self-closing tag: <Foo/> — depth was incremented on < then never decremented
          if (body[i - 1] === "/") {
            depth--;
            if (depth === 0) rootChildCount++;
          }
          inTag = false;
        }
      }
      if (rootChildCount <= 1) return match;
      // More than one root child — wrap in VBox
      return open + "\n      <VBox>" + body + "</VBox>\n    " + close;
    },
  );

  // Fix 2: Table with BOTH noDataText attribute AND <noData> child.
  // When <noData> is present, remove the noDataText attribute to avoid the duplicate.
  out = out.replace(
    /(<(?:Table|List)\b)([^>]*?)\s+noDataText="[^"]*"([^>]*?>)([\s\S]*?<noData>)/g,
    (match, tag, attrsBefore, attrsAfter, bodyStart) => {
      return tag + attrsBefore + attrsAfter + bodyStart;
    },
  );

  // Fix 3: TileContent with multiple <content> children — keep only the first.
  out = out.replace(
    /(<TileContent\b[^>]*>)([\s\S]*?)(<\/TileContent>)/g,
    (match, openTag, body, closeTag) => {
      const contentMatches = [
        ...body.matchAll(/<content>[\s\S]*?<\/content>/g),
      ];
      if (contentMatches.length <= 1) return match;
      // Keep only the first <content> block
      const firstContent = contentMatches[0][0];
      const cleanBody = body
        .replace(/<content>[\s\S]*?<\/content>/g, "")
        .trim();
      return openTag + "\n  " + firstContent + "\n" + closeTag;
    },
  );

  // Fix 4: DynamicPageTitle with duplicate <f:heading> blocks — keep only the first.
  out = out.replace(
    /(<f:DynamicPageTitle\b[^>]*>)([\s\S]*?)(<\/f:DynamicPageTitle>)/g,
    (match, openTag, body, closeTag) => {
      const headingMatches = [
        ...body.matchAll(/<f:heading>[\s\S]*?<\/f:heading>/g),
      ];
      if (headingMatches.length <= 1) return match;
      let cleaned = body;
      headingMatches.slice(1).forEach((m) => {
        cleaned = cleaned.replace(m[0], "");
      });
      return openTag + cleaned + closeTag;
    },
  );

  // Fix 5: <f:heading> / <f:snappedHeading> / <noData> with multiple direct children.
  // These aggregations are cardinality 0..1 — wrap multiple children in a VBox.
  const singleChildAggs = [
    "f:heading",
    "f:snappedHeading",
    "f:subheading",
    "noData",
  ];
  singleChildAggs.forEach((agg) => {
    const openRe = new RegExp(`<${agg}>`, "g");
    const closeRe = new RegExp(`</${agg}>`, "g");
    // Find each aggregation block and check if it has multiple element children
    out = out.replace(
      new RegExp(`(<${agg}>)([\s\S]*?)(<\/${agg}>)`, "g"),
      (match, open, body, close) => {
        // Count top-level element children (lines starting with <, ignoring whitespace)
        const topLevelElements = body
          .split("\n")
          .filter(
            (l) => l.trim().startsWith("<") && !l.trim().startsWith("</"),
          ).length;
        if (topLevelElements <= 1) return match;
        // Wrap in VBox to make it a single child
        return open + "\n      <VBox>" + body + "</VBox>\n    " + close;
      },
    );
  });

  return out;
}

/**
 * Replaces hallucinated / non-existent SAP control names with their real equivalents.
 */
function fixHallucinatedControls(xml) {
  let out = xml;

  // GenericCard → GenericTile
  out = out.replace(/<GenericCard(\s|>|\/)/g, "<GenericTile$1");
  out = out.replace(/<\/GenericCard>/g, "</GenericTile>");

  // KPITile → GenericTile
  out = out.replace(/<KPITile(\s|>|\/)/g, "<GenericTile$1");
  out = out.replace(/<\/KPITile>/g, "</GenericTile>");

  // FlexBox → HBox
  out = out.replace(/<FlexBox(\s|>|\/)/g, "<HBox$1");
  out = out.replace(/<\/FlexBox>/g, "</HBox>");

  // cardContent aggregation → tileContent
  out = out.replace(/<cardContent>/g, "<tileContent>");
  out = out.replace(/<\/cardContent>/g, "</tileContent>");

  // CardHeader → strip (GenericTile uses header="" attribute)
  out = out.replace(/<CardHeader[^>]*\/>/g, "");
  out = out.replace(/<CardHeader[^>]*>[\s\S]*?<\/CardHeader>/g, "");

  return out;
}

/**
 * Migrates noDataText="Some string" on Table and List to IllustratedMessage.
 * Binding expressions like noDataText="{i18n>noData}" are left untouched.
 */
function migrateNoDataText(xml) {
  return xml.replace(
    /(<(?:Table|List)\b[^>]*?)\s+noDataText="([^"{][^"]*)"([^>]*?>)/g,
    (match, openTag, text, rest) => {
      const afterTag = xml.indexOf(match) + match.length;
      const nextChunk = xml.slice(afterTag, afterTag + 200);
      if (nextChunk.trimStart().startsWith("<noData>")) {
        return match;
      }
      // Strip the noDataText attribute from the tag before adding the child
      const cleanedOpenTag = openTag.replace(/\s+noDataText="[^"]*"/g, "");
      const noDataBlock = `
      <noData>
        <IllustratedMessage
          illustrationType="sapIllus-EmptyList"
          title="${text}"
          description="Try adjusting your filters or create a new record"/>
      </noData>`;
      return cleanedOpenTag + rest + noDataBlock;
    },
  );
}

/**
 * Detects xmlns:f="sap.ui.layout.form" (wrong) and renames all f: form tags to form:.
 */
function fixFormNamespacePrefix(xml) {
  const wrongFormNs = /xmlns:f="sap\.ui\.layout\.form"/.test(xml);
  if (!wrongFormNs) return xml;

  let out = xml;
  out = out.replace(/\s+xmlns:f="sap\.ui\.layout\.form"/g, "");
  if (!out.includes('xmlns:form="sap.ui.layout.form"')) {
    out = out.replace(/(<mvc:View\b)/, '$1 xmlns:form="sap.ui.layout.form"');
  }

  const formControls = [
    "SimpleForm",
    "FormContainer",
    "FormElement",
    "Form",
    "FormTitle",
    "GridLayout",
    "ResponsiveGridLayout",
    "ColumnLayout",
  ];
  formControls.forEach((ctrl) => {
    out = out.replace(
      new RegExp(`<f:${ctrl}(\\s|>|\\/)`, "g"),
      `<form:${ctrl}$1`,
    );
    out = out.replace(new RegExp(`</f:${ctrl}>`, "g"), `</form:${ctrl}>`);
  });

  return out;
}
