import { isSafeSvgForPdf } from '../lib/pdfExportContract';

describe('PDF SVG export contract', () => {
  it('accepts self-contained SVG output', () => {
    expect(isSafeSvgForPdf('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" /></svg>')).toBe(true);
  });

  it.each([
    '<svg><script>alert(1)</script></svg>',
    '<svg><foreignObject><div>text</div></foreignObject></svg>',
    '<svg><image href="https://example.com/a.png" /></svg>',
    '<svg><a href="javascript:alert(1)">x</a></svg>',
  ])('rejects unsafe SVG content: %s', (svg) => {
    expect(isSafeSvgForPdf(svg)).toBe(false);
  });

  it('rejects non-SVG input', () => {
    expect(isSafeSvgForPdf('<html><body>not svg</body></html>')).toBe(false);
  });
});
