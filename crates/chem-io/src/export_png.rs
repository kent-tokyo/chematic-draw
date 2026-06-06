//! Convert an SVG string to PNG/JPEG bytes using `resvg` + `image`.

use resvg::{tiny_skia, usvg};

#[derive(Debug)]
pub enum PngError {
    SvgParse(String),
    Render(String),
    Encode(String),
}

impl std::fmt::Display for PngError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::SvgParse(e) => write!(f, "SVG parse error: {e}"),
            Self::Render(e) => write!(f, "Render error: {e}"),
            Self::Encode(e) => write!(f, "PNG encode error: {e}"),
        }
    }
}

/// Render `svg_str` to PNG at the given pixel size.
/// Returns raw PNG bytes suitable for writing to a file.
pub fn svg_to_png(svg_str: &str, width: u32, height: u32) -> Result<Vec<u8>, PngError> {
    let opt = usvg::Options::default();
    let tree = usvg::Tree::from_str(svg_str, &opt)
        .map_err(|e| PngError::SvgParse(e.to_string()))?;

    let mut pixmap = tiny_skia::Pixmap::new(width, height)
        .ok_or_else(|| PngError::Render("Could not create pixmap".into()))?;

    resvg::render(
        &tree,
        tiny_skia::Transform::default(),
        &mut pixmap.as_mut(),
    );

    pixmap.encode_png().map_err(|e| PngError::Encode(e.to_string()))
}

/// Maximum allowed dimension (pixels) for auto-sized PNG export.
const MAX_PNG_DIMENSION: u32 = 8192;

/// Maximum allowed pixel budget for auto-sized PNG export (32 megapixels).
const MAX_PNG_PIXELS: u64 = 32_000_000;

/// Render `svg_str` to PNG, auto-sizing to the SVG's declared width/height.
pub fn svg_to_png_auto(svg_str: &str) -> Result<Vec<u8>, PngError> {
    svg_to_png_scaled(svg_str, 1.0)
}

/// Render `svg_str` to PNG at `scale` × the SVG's declared dimensions.
/// `scale = 2.0` produces a 2× hi-res PNG.
pub fn svg_to_png_scaled(svg_str: &str, scale: f32) -> Result<Vec<u8>, PngError> {
    let opt = usvg::Options::default();
    let tree = usvg::Tree::from_str(svg_str, &opt)
        .map_err(|e| PngError::SvgParse(e.to_string()))?;
    let sz = tree.size();
    let w = ((sz.width() as f32 * scale).ceil() as u32).max(1);
    let h = ((sz.height() as f32 * scale).ceil() as u32).max(1);
    if w > MAX_PNG_DIMENSION || h > MAX_PNG_DIMENSION || (w as u64) * (h as u64) > MAX_PNG_PIXELS {
        return Err(PngError::Render(format!(
            "Output size {w}×{h} too large (max {MAX_PNG_DIMENSION}×{MAX_PNG_DIMENSION})"
        )));
    }

    let mut pixmap = tiny_skia::Pixmap::new(w, h)
        .ok_or_else(|| PngError::Render("Could not create pixmap".into()))?;

    let tf = tiny_skia::Transform::from_scale(scale, scale);
    resvg::render(&tree, tf, &mut pixmap.as_mut());

    pixmap.encode_png().map_err(|e| PngError::Encode(e.to_string()))
}

/// Render `svg_str` to JPEG bytes at `scale` × the SVG's declared dimensions.
/// `quality` is 1–100 (JPEG quality factor).
pub fn svg_to_jpeg(svg_str: &str, scale: f32, quality: u8) -> Result<Vec<u8>, PngError> {
    let opt = usvg::Options::default();
    let tree = usvg::Tree::from_str(svg_str, &opt)
        .map_err(|e| PngError::SvgParse(e.to_string()))?;
    let sz = tree.size();
    let w = ((sz.width() as f32 * scale).ceil() as u32).max(1);
    let h = ((sz.height() as f32 * scale).ceil() as u32).max(1);

    let mut pixmap = tiny_skia::Pixmap::new(w, h)
        .ok_or_else(|| PngError::Render("Could not create pixmap".into()))?;
    let tf = tiny_skia::Transform::from_scale(scale, scale);
    resvg::render(&tree, tf, &mut pixmap.as_mut());

    // tiny_skia pixmap is RGBA; convert to RGB for JPEG
    let rgba = pixmap.data();
    let mut rgb = Vec::with_capacity(w as usize * h as usize * 3);
    for chunk in rgba.chunks(4) {
        // Composite over white background (alpha pre-multiply)
        let a = chunk[3] as f32 / 255.0;
        let blend = |c: u8| -> u8 { ((c as f32 * a + 255.0 * (1.0 - a)) as u8) };
        rgb.push(blend(chunk[0]));
        rgb.push(blend(chunk[1]));
        rgb.push(blend(chunk[2]));
    }

    let mut out = Vec::new();
    let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut out, quality);
    encoder.encode(&rgb, w, h, image::ExtendedColorType::Rgb8)
        .map_err(|e| PngError::Encode(e.to_string()))?;
    Ok(out)
}
