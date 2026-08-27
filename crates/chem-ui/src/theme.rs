use egui::Color32;

#[derive(Clone, Copy, Debug, PartialEq, serde::Serialize, serde::Deserialize, Default)]
pub enum Theme {
    #[default]
    Dark,
    Light,
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
    pub snap_indicator: Color32,
    pub ring_fuse_hover: Color32,
    // VS Code-style chrome
    pub activity_bar_bg: Color32, // far-left icon strip
    pub sidebar_bg: Color32,      // tool list / inspector panel
    pub sidebar_title: Color32,   // section header text
    pub sidebar_hover: Color32,   // hovered row background
    pub status_bar_bg: Color32,   // bottom status strip
    pub status_bar_fg: Color32,   // status strip text
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
            accent: Color32::from_rgb(0x4D, 0x8D, 0xFF),
            success: Color32::from_rgb(0x58, 0xC9, 0x7A),
            warning: Color32::from_rgb(0xE9, 0xB9, 0x49),
            error: Color32::from_rgb(0xF2, 0x6D, 0x6D),
            canvas_bg: Color32::from_rgb(0xF8, 0xF9, 0xFB),
            panel_bg: Color32::from_rgb(0x24, 0x28, 0x30),
            separator: Color32::from_rgb(0x8F, 0x98, 0xA8),
            bond: Color32::from_rgb(0x16, 0x1B, 0x22),
            atom_selected: Color32::from_rgb(0x2F, 0x6F, 0xE8),
            snap_indicator: Color32::from_rgb(0x21, 0xB8, 0xA5),
            ring_fuse_hover: Color32::from_rgb(0xE8, 0x56, 0x62),
            activity_bar_bg: Color32::from_rgb(0x18, 0x1B, 0x20),
            sidebar_bg: Color32::from_rgb(0x21, 0x25, 0x2C),
            sidebar_title: Color32::from_rgb(0xD8, 0xDE, 0xEA),
            sidebar_hover: Color32::from_rgb(0x31, 0x37, 0x42),
            status_bar_bg: Color32::from_rgb(0x21, 0x25, 0x2C),
            status_bar_fg: Color32::from_rgb(0xFF, 0xFF, 0xFF),
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
            accent: Color32::from_rgb(0x2F, 0x6F, 0xE8),
            success: Color32::from_rgb(0x1F, 0x8F, 0x5F),
            warning: Color32::from_rgb(0xB7, 0x78, 0x10),
            error: Color32::from_rgb(0xC7, 0x3A, 0x3A),
            canvas_bg: Color32::from_rgb(0xFB, 0xFC, 0xFE),
            panel_bg: Color32::from_rgb(0xF3, 0xF5, 0xF8),
            separator: Color32::from_rgb(0x79, 0x83, 0x93),
            bond: Color32::from_rgb(0x16, 0x1B, 0x22),
            atom_selected: Color32::from_rgb(0x2F, 0x6F, 0xE8),
            snap_indicator: Color32::from_rgb(0x19, 0x9B, 0x8C),
            ring_fuse_hover: Color32::from_rgb(0xC7, 0x3A, 0x3A),
            activity_bar_bg: Color32::from_rgb(0x23, 0x27, 0x2E),
            sidebar_bg: Color32::from_rgb(0xF3, 0xF5, 0xF8),
            sidebar_title: Color32::from_rgb(0x1D, 0x24, 0x30),
            sidebar_hover: Color32::from_rgb(0xE4, 0xE9, 0xF1),
            status_bar_bg: Color32::from_rgb(0x23, 0x27, 0x2E),
            status_bar_fg: Color32::from_rgb(0xF6, 0xF8, 0xFA),
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
    let tokens = Tokens::for_theme(theme);
    let mut visuals = match theme {
        Theme::Dark => egui::Visuals::dark(),
        Theme::Light => egui::Visuals::light(),
    };
    visuals.panel_fill = tokens.panel_bg;
    visuals.window_fill = tokens.panel_bg;
    visuals.faint_bg_color = alpha(tokens.sidebar_hover, 128);
    visuals.extreme_bg_color = tokens.canvas_bg;
    visuals.hyperlink_color = tokens.accent;
    visuals.selection.bg_fill = alpha(tokens.accent, 56);
    visuals.selection.stroke = egui::Stroke::new(1.0, tokens.accent);
    visuals.window_corner_radius = egui::CornerRadius::same(8);
    let ui_fg = match theme {
        Theme::Dark => tokens.sidebar_title,
        Theme::Light => tokens.bond,
    };
    visuals.widgets.noninteractive.bg_fill = tokens.panel_bg;
    visuals.widgets.noninteractive.fg_stroke = egui::Stroke::new(1.0, ui_fg);
    visuals.widgets.inactive.bg_fill = alpha(tokens.sidebar_hover, 180);
    visuals.widgets.inactive.weak_bg_fill = alpha(tokens.sidebar_hover, 120);
    visuals.widgets.inactive.fg_stroke = egui::Stroke::new(1.0, ui_fg);
    visuals.widgets.hovered.bg_fill = tokens.sidebar_hover;
    visuals.widgets.hovered.fg_stroke = egui::Stroke::new(1.0, ui_fg);
    visuals.widgets.active.bg_fill = alpha(tokens.accent, 48);
    visuals.widgets.active.fg_stroke = egui::Stroke::new(1.0, tokens.accent);
    ctx.set_visuals(visuals);
}

pub fn alpha(color: Color32, alpha: u8) -> Color32 {
    Color32::from_rgba_unmultiplied(color.r(), color.g(), color.b(), alpha)
}

// Spacing constants (4-px grid)
pub const SPACING_XS: f32 = 4.0;
pub const SPACING_SM: f32 = 8.0;
pub const SPACING_MD: f32 = 16.0;
pub const SPACING_LG: f32 = 24.0;
pub const SPACING_XL: f32 = 32.0;

pub const TOOLBAR_WIDTH: f32 = 64.0; // macOS: wider for 44px touch targets
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
