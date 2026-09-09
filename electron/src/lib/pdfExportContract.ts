/**
 * Keep PDF rendering limited to self-contained SVG markup. The input is loaded
 * into a hidden BrowserWindow, so external resources and executable content
 * must be rejected before Electron parses it.
 */
export function isSafeSvgForPdf(svgText: string): boolean {
  return /^\s*(?:<\?xml\b[^>]*>\s*)?<svg\b/i.test(svgText)
    && !/<\s*(?:script|iframe|object|embed|foreignObject)\b|<!DOCTYPE\b/i.test(svgText)
    && !/\bon[a-z][\w:-]*\s*=|\b(?:href|src)\s*=\s*["']\s*(?:https?:|data:|\/\/|javascript:)/i.test(svgText)
    && !/@import\b|url\(\s*(?:["']\s*)?(?:https?:|data:|\/\/|javascript:)/i.test(svgText);
}
