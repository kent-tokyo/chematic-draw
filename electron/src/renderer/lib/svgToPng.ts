/**
 * Rasterizes an SVG string to a PNG, returned as base64 (no `data:` prefix)
 * so it can go straight to `fileWriteBinary`. Renders the clean WASM `to_svg`
 * output, not a screenshot of the live interactive canvas — the same source
 * the SVG export already uses, so SVG/PNG exports stay visually identical.
 *
 * Uses a `data:` URI rather than `URL.createObjectURL` for the source image:
 * this app's CSP is `img-src 'self' data:`, which does not allow `blob:` —
 * a blob URL here fails silently (image never loads) under that policy.
 */
export function svgToPngBase64(svgText: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const svgBytes = new TextEncoder().encode(svgText);
    let binary = '';
    svgBytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    const dataUri = `data:image/svg+xml;base64,${btoa(binary)}`;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }
      // PNG needs an opaque background — the SVG itself has none.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const pngDataUrl = canvas.toDataURL('image/png');
      resolve(pngDataUrl.slice(pngDataUrl.indexOf(',') + 1));
    };
    img.onerror = () => reject(new Error('Failed to rasterize SVG'));
    img.src = dataUri;
  });
}
