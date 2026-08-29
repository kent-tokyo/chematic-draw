import { svgPageSizeInches } from '../lib/svgPageSize';

describe('svgPageSizeInches', () => {
  it('converts the SVG root width/height (px) to inches at 96px/in', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">...</svg>';
    expect(svgPageSizeInches(svg)).toEqual({ width: 300 / 96, height: 200 / 96 });
  });

  it('falls back to a default size when width/height are missing', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg">...</svg>';
    expect(svgPageSizeInches(svg)).toEqual({ width: 600 / 96, height: 400 / 96 });
  });
});
