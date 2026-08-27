//! Font configuration for chematic-draw.
//!
//! Priority order for `FontFamily::Proportional` (after this setup):
//!   1. CJK font (platform-specific, see below)
//!   2. Ubuntu-Light  ← egui built-in, ASCII/Latin
//!   3. NotoEmoji-Regular
//!   4. emoji-icon-font
//!
//! # Platform-specific CJK font
//! | Platform | Font | Path |
//! |----------|------|------|
//! | macOS    | ヒラギノ角ゴシック W3 | `/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc` |
//! | Linux    | Noto Sans CJK JP    | `/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc` (など) |
//! | Windows  | Yu Gothic UI        | `%WINDIR%\Fonts\YuGothR.ttc` |
//!
//! If the platform font is not found the build-time fallback (`assets/fonts/NotoSansJP-Regular.ttf`)
//! is used. If that is also absent (e.g. CI build without assets), egui falls back to Ubuntu-Light
//! and CJK characters are rendered as tofu — not a crash.

use std::sync::Arc;

use egui::{FontData, FontDefinitions, FontFamily, FontTweak};

/// Name used to register the CJK font in `FontDefinitions`.
const CJK_FONT_KEY: &str = "CJK-Primary";

/// Apply the chematic-draw font configuration to an egui context.
pub fn setup(ctx: &egui::Context) {
    let mut fonts = FontDefinitions::default();
    if let Some(data) = load_cjk_font() {
        fonts
            .font_data
            .insert(CJK_FONT_KEY.to_owned(), Arc::new(data));

        // Insert CJK font at position 0 (before Ubuntu-Light) in Proportional.
        fonts
            .families
            .entry(FontFamily::Proportional)
            .or_default()
            .insert(0, CJK_FONT_KEY.to_owned());

        // Also add to Monospace as fallback so SMILES/MOL code blocks can render CJK comments.
        fonts
            .families
            .entry(FontFamily::Monospace)
            .or_default()
            .push(CJK_FONT_KEY.to_owned());
    }
    ctx.set_fonts(fonts);
}

// ---------------------------------------------------------------------------
// Platform-specific font loading
// ---------------------------------------------------------------------------

fn load_cjk_font() -> Option<FontData> {
    platform_font().or_else(bundled_fallback)
}

#[cfg(target_os = "macos")]
fn platform_font() -> Option<FontData> {
    // ヒラギノ角ゴシック W3 — ships with every macOS since 10.12 Sierra.
    // The file is a TTC; index 0 is the W3 face.
    const CANDIDATES: &[&str] = &[
        "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",
        // Older macOS / localised filename variant
        "/Library/Fonts/ヒラギノ角ゴ Pro W3.otf",
    ];
    load_first_of(CANDIDATES, 0)
}

#[cfg(target_os = "linux")]
fn platform_font() -> Option<FontData> {
    const CANDIDATES: &[&str] = &[
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/noto-cjk/NotoSansCJKjp-Regular.otf",
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/google-noto-cjk/NotoSansCJKjp-Regular.otf",
    ];
    load_first_of(CANDIDATES, 0)
}

#[cfg(target_os = "windows")]
fn platform_font() -> Option<FontData> {
    // Yu Gothic UI Regular — ships with Windows 10/11
    let windir = std::env::var("WINDIR").unwrap_or_else(|_| "C:\\Windows".into());
    let candidates: Vec<String> = vec![
        format!("{}\\Fonts\\YuGothR.ttc", windir),
        format!("{}\\Fonts\\meiryo.ttc", windir),
    ];
    let refs: Vec<&str> = candidates.iter().map(|s| s.as_str()).collect();
    load_first_of(&refs, 0)
}

#[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
fn platform_font() -> Option<FontData> {
    None
}

/// Try loading a bundled fallback from `assets/fonts/`.
fn bundled_fallback() -> Option<FontData> {
    // The file is optional — not committed to avoid bloating the repo.
    // Run `make fonts` or the download script to populate assets/fonts/.
    const PATHS: &[&str] = &[
        "assets/fonts/NotoSansJP-Regular.ttf",
        "assets/fonts/NotoSans-Regular.ttf",
    ];
    load_first_of(PATHS, 0)
}

fn load_first_of(candidates: &[&str], index: u32) -> Option<FontData> {
    for path in candidates {
        match std::fs::read(path) {
            Ok(bytes) => {
                return Some(FontData {
                    font: std::borrow::Cow::Owned(bytes),
                    index,
                    tweak: FontTweak::default(),
                });
            }
            Err(e) => {
                // Log at debug level and try next candidate.
                eprintln!("[fonts] skipping {path}: {e}");
            }
        }
    }
    None
}
