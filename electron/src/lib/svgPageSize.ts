// PDF export needs a page size matching the molecule's own SVG dimensions
// (not a fixed Letter/A4 page with the drawing floating in a corner).
// Electron's printToPDF pageSize takes width/height in inches; chematic's
// SVG output declares width/height in unitless px (96px = 1in, per the SVG
// spec's default).
const CSS_PX_PER_INCH = 96;

export function svgPageSizeInches(svgText: string): { width: number; height: number } {
  const widthMatch = svgText.match(/width="([\d.]+)"/);
  const heightMatch = svgText.match(/height="([\d.]+)"/);
  const widthPx = widthMatch ? parseFloat(widthMatch[1]) : 600;
  const heightPx = heightMatch ? parseFloat(heightMatch[1]) : 400;
  return { width: widthPx / CSS_PX_PER_INCH, height: heightPx / CSS_PX_PER_INCH };
}
