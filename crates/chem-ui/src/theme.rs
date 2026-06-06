use egui::Color32;

#[derive(Clone, Copy, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
pub enum Theme {
    Dark,
    Light,
}

impl Default for Theme {
    fn default() -> Self {
        Self::Dark
    }
}

/// Design tokens — all colours are defined here; never hard-code elsewhere.
pub struct Tokens {
    // UI semantic
    pub accent: Color32,
    pub success: Color32,
    pub warning: Color32,
    pub error: Color32,
    pub canvas_bg: Color32,
    pub panel_bg: Color32,
    pub separator: Color32,
    // Bond / atom rendering
    pub bond: Color32,
    pub atom_selected: Color32,
    // Canvas feedback
    pub snap_indicator: Color32,   // #20C0A0 — teal, both themes
    pub ring_fuse_hover: Color32,  // red highlight for ring fusion preview
    // CPK element colours (subset; extend as needed)
    pub elem_c: Color32,
    pub elem_n: Color32,
    pub elem_o: Color32,
    pub elem_s: Color32,
    pub elem_p: Color32,
    pub elem_f: Color32,
    pub elem_cl: Color32,
    pub elem_br: Color32,
    pub elem_i: Color32,
    pub elem_h: Color32,
    pub elem_other: Color32,
}

impl Tokens {
    pub fn for_theme(theme: Theme) -> Self {
        match theme {
            Theme::Dark => Self::dark(),
            Theme::Light => Self::light(),
        }
    }

    fn dark() -> Self {
        Self {
            accent: Color32::from_rgb(0x60, 0xCD, 0xFF),
            success: Color32::from_rgb(0x6C, 0xCB, 0x5F),
            warning: Color32::from_rgb(0xFC, 0xE1, 0x00),
            error: Color32::from_rgb(0xFF, 0x99, 0xA4),
            canvas_bg: Color32::from_rgb(0x1E, 0x1E, 0x1E),
            panel_bg: Color32::from_rgb(0x28, 0x28, 0x28),
            separator: Color32::from_rgb(0x44, 0x44, 0x44),
            bond: Color32::from_rgb(0xE0, 0xE0, 0xE0),
            atom_selected: Color32::from_rgb(0x00, 0xBF, 0xFF),
            snap_indicator: Color32::from_rgb(0x20, 0xC0, 0xA0),
            ring_fuse_hover: Color32::from_rgb(0xFF, 0x99, 0xA4),
            // CPK colours are identical in both themes
            elem_c: Color32::from_rgb(0xE0, 0xE0, 0xE0),
            elem_n: Color32::from_rgb(0x30, 0x50, 0xF8),
            elem_o: Color32::from_rgb(0xFF, 0x0D, 0x0D),
            elem_s: Color32::from_rgb(0xFF, 0xFF, 0x30),
            elem_p: Color32::from_rgb(0xFF, 0x80, 0x00),
            elem_f: Color32::from_rgb(0x90, 0xE0, 0x50),
            elem_cl: Color32::from_rgb(0x1F, 0xF0, 0x1F),
            elem_br: Color32::from_rgb(0xA6, 0x24, 0x28),
            elem_i: Color32::from_rgb(0x94, 0x00, 0x95),
            elem_h: Color32::from_rgb(0xFF, 0xFF, 0xFF),
            elem_other: Color32::from_rgb(0xFF, 0xC0, 0xCB),
        }
    }

    fn light() -> Self {
        Self {
            accent: Color32::from_rgb(0x00, 0x78, 0xD4),
            success: Color32::from_rgb(0x10, 0x7C, 0x10),
            warning: Color32::from_rgb(0xC1, 0x9C, 0x00),
            error: Color32::from_rgb(0xC4, 0x2B, 0x1C),
            canvas_bg: Color32::from_rgb(0xFF, 0xFF, 0xFF),
            panel_bg: Color32::from_rgb(0xF3, 0xF3, 0xF3),
            separator: Color32::from_rgb(0xD0, 0xD0, 0xD0),
            bond: Color32::from_rgb(0x1A, 0x1A, 0x1A),
            atom_selected: Color32::from_rgb(0x00, 0x78, 0xD4),
            snap_indicator: Color32::from_rgb(0x20, 0xC0, 0xA0),
            ring_fuse_hover: Color32::from_rgb(0xC4, 0x2B, 0x1C),
            elem_c: Color32::from_rgb(0x20, 0x20, 0x20),
            elem_n: Color32::from_rgb(0x30, 0x50, 0xF8),
            elem_o: Color32::from_rgb(0xFF, 0x0D, 0x0D),
            elem_s: Color32::from_rgb(0xC8, 0xC8, 0x00),
            elem_p: Color32::from_rgb(0xFF, 0x80, 0x00),
            elem_f: Color32::from_rgb(0x40, 0xB0, 0x20),
            elem_cl: Color32::from_rgb(0x1F, 0xC0, 0x1F),
            elem_br: Color32::from_rgb(0xA6, 0x24, 0x28),
            elem_i: Color32::from_rgb(0x94, 0x00, 0x95),
            elem_h: Color32::from_rgb(0x80, 0x80, 0x80),
            elem_other: Color32::from_rgb(0xE0, 0x80, 0xA0),
        }
    }
}

pub fn apply(ctx: &egui::Context, theme: Theme) {
    match theme {
        Theme::Dark => ctx.set_visuals(egui::Visuals::dark()),
        Theme::Light => ctx.set_visuals(egui::Visuals::light()),
    }
}

// Spacing constants (4-px grid)
pub const SPACING_XS: f32 = 4.0;
pub const SPACING_SM: f32 = 8.0;
pub const SPACING_MD: f32 = 16.0;
pub const SPACING_LG: f32 = 24.0;
pub const SPACING_XL: f32 = 32.0;

pub const TOOLBAR_WIDTH: f32 = 56.0;
pub const INSPECTOR_WIDTH: f32 = 240.0;
pub const INSPECTOR_WIDTH_MIN: f32 = 180.0;
pub const INSPECTOR_WIDTH_MAX: f32 = 400.0;
pub const MENU_HEIGHT: f32 = 24.0;
pub const TOOL_CONTROLS_HEIGHT: f32 = 24.0;
pub const ATOM_RADIUS: f32 = 8.0;
pub const BOND_WIDTH: f32 = 2.0;
pub const DOUBLE_BOND_OFFSET: f32 = 4.0;

// Interaction constants
pub const DRAG_THRESHOLD_PX: f32 = 4.0;
pub const SNAP_THRESHOLD_PX: f32 = 10.0;
pub const SNAP_FLASH_SECS: f64 = 0.4;
pub const BOND_ANGLE_SNAP_DEG: f32 = 15.0;
pub const RING_FUSE_THRESHOLD: f32 = 30.0;
pub const GHOST_BOND_ALPHA: f32 = 0.60;
pub const UNDO_HISTORY_STEPS: usize = 64;
