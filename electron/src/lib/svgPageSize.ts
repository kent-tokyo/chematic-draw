// PDF export needs a page size matching the molecule's own SVG dimensions
// (not a fixed Letter/A4 page with the drawing floating in a corner).
// Electron's printToPDF pageSize takes width/height in inches; chematic's
// SVG output declares width/height in unitless px (96px = 1in, per the SVG
// spec's default).
const CSS_PX_PER_INCH = 96;
const DEFAULT_WIDTH_PX = 600;
const DEFAULT_HEIGHT_PX = 400;
const MIN_PAGE_INCHES = 0.1;
const MAX_PAGE_INCHES = 100;

function boundedPageInches(valuePx: number | undefined, fallbackPx: number): number {
  const inches = (valuePx ?? fallbackPx) / CSS_PX_PER_INCH;
  return Number.isFinite(inches) && inches >= MIN_PAGE_INCHES && inches <= MAX_PAGE_INCHES
    ? inches
    : fallbackPx / CSS_PX_PER_INCH;
}

export function svgPageSizeInches(svgText: string): { width: number; height: number } {
  const widthMatch = svgText.match(/width="([\d.]+)"/);
  const heightMatch = svgText.match(/height="([\d.]+)"/);
  const widthPx = widthMatch ? parseFloat(widthMatch[1]) : undefined;
  const heightPx = heightMatch ? parseFloat(heightMatch[1]) : undefined;
  return {
    width: boundedPageInches(widthPx, DEFAULT_WIDTH_PX),
    height: boundedPageInches(heightPx, DEFAULT_HEIGHT_PX),
  };
}
