import { test, expect, _electron as electron } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

// Drives the real export:pdf IPC handler in the packaged main process — the
// part a unit test can't reach (BrowserWindow, data: URL navigation,
// webContents.printToPDF are all Electron-runtime-only). svgPageSizeInches's
// own px->inch conversion is covered separately in svgPageSize.test.ts; this
// checks that main.js actually uses it to size the PDF page to the drawing,
// not a fixed Letter page with the molecule floating in a corner.
test.describe('PDF export', () => {
  test('renders SVG to a PDF page sized to match', async () => {
    const electronApp = await electron.launch({
      args: [path.resolve(__dirname, '..', '..')],
    });
    const window = await electronApp.firstWindow();
    await expect(window.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    const outPath = path.join(os.tmpdir(), `chematic-pdf-export-test-${Date.now()}.pdf`);
    const svgWidth = 300;
    const svgHeight = 200;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}"><rect width="${svgWidth}" height="${svgHeight}" fill="white"/><circle cx="150" cy="100" r="40" fill="black"/></svg>`;

    const result = await window.evaluate(
      ({ outPath, svg }) =>
        (window as unknown as { electronAPI: { exportPdf: (p: string, s: string) => Promise<{ success: boolean; error?: string }> } }).electronAPI.exportPdf(outPath, svg),
      { outPath, svg }
    );

    expect(result.success).toBe(true);
    expect(fs.existsSync(outPath)).toBe(true);

    const pdfBytes = fs.readFileSync(outPath);
    expect(pdfBytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');

    const mediaBoxMatch = pdfBytes.toString('latin1').match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
    expect(mediaBoxMatch).not.toBeNull();
    const [, wPts, hPts] = mediaBoxMatch!;
    const PDF_POINTS_PER_INCH = 72;
    const CSS_PX_PER_INCH = 96;
    expect(Number(wPts)).toBeCloseTo((svgWidth / CSS_PX_PER_INCH) * PDF_POINTS_PER_INCH, 0);
    expect(Number(hPts)).toBeCloseTo((svgHeight / CSS_PX_PER_INCH) * PDF_POINTS_PER_INCH, 0);

    fs.unlinkSync(outPath);
    await electronApp.close();
  });

  test('rejects SVG with executable or external content before creating a PDF window', async () => {
    const electronApp = await electron.launch({
      args: [path.resolve(__dirname, '..', '..')],
    });
    const window = await electronApp.firstWindow();
    await expect(window.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    const outPath = path.join(os.tmpdir(), `chematic-unsafe-pdf-${Date.now()}.pdf`);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200">'
      + '<script>fetch("https://example.com")</script>'
      + '<image href="https://example.com/pixel.png" />'
      + '</svg>';
    const result = await window.evaluate(
      ({ outPath, svg }) =>
        (window as unknown as { electronAPI: { exportPdf: (p: string, s: string) => Promise<{ success: boolean; error?: string }> } }).electronAPI.exportPdf(outPath, svg),
      { outPath, svg }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('unsafe SVG');
    expect(fs.existsSync(outPath)).toBe(false);
    await electronApp.close();
  });
});
