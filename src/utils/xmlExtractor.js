/**
 * xmlExtractor.js
 * Extracts the SAP UI5 XML View content from AI response text.
 * Handles: ```xml fences, ``` fences, raw XML output, leading prose.
 */
export function extractXML(text) {
  if (!text) return "";

  const trimmed = text.trim();

  // 1. Try ```xml ... ``` fence (most common AI format)
  const xmlFence = trimmed.match(/```xml\s*([\s\S]*?)```/i);
  if (xmlFence) return xmlFence[1].trim();

  // 2. Try generic ``` ... ``` fence
  const genericFence = trimmed.match(/```\s*([\s\S]*?)```/);
  if (genericFence) {
    const inner = genericFence[1].trim();
    if (inner.startsWith("<")) return inner;
  }

  // 3. Find <mvc:View ... </mvc:View> anywhere in the text
  const start = trimmed.indexOf("<mvc:View");
  const end = trimmed.lastIndexOf("</mvc:View>");
  if (start !== -1 && end !== -1) {
    return trimmed.slice(start, end + "</mvc:View>".length);
  }

  // 4. Partial: found opening but no closing (truncated response)
  if (start !== -1) {
    return trimmed.slice(start);
  }

  // 5. Fallback: return from first < tag
  const firstTag = trimmed.indexOf("<");
  if (firstTag !== -1) return trimmed.slice(firstTag);

  return trimmed;
}
