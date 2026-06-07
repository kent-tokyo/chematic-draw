use egui::{Color32, Pos2, Rect, Response, Sense, Stroke, Ui, Vec2};

use crate::i18n::I18n;
use crate::theme::{alpha, Tokens, SPACING_SM, SPACING_XS, TOOLBAR_WIDTH};

/// Activity bar panel selection (VS Code pattern).
#[derive(Clone, Copy, Debug, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ActivityPanel {
    Tools,
    Inspector,
    Templates,
    Chat,
    Settings,
}

impl Default for ActivityPanel {
    fn default() -> Self {
        Self::Tools
    }
}

/// Active drawing tool.
#[derive(Clone, Copy, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
pub enum Tool {
    Select,
    // Atoms
    Carbon,
    Nitrogen,
    Oxygen,
    Sulfur,
    Phosphorus,
    Fluorine,
    Chlorine,
    Bromine,
    Iodine,
    Hydrogen,
    Rgroup,
    // Bonds
    Single,
    Double,
    Triple,
    Aromatic,
    WedgeUp,
    WedgeDown,
    // Rings
    Benzene,
    Cyclohexane,
    Cyclopentane,
    // Reaction mechanism
    ReactionArrow,
    CurlyArrow,
    // Erase
    Eraser,
    // Selection extras
    FragmentSelect,
    // Temporary pan (activated by Space hold, not shown in toolbar)
    Pan,
}

impl Default for Tool {
    fn default() -> Self {
        Self::Select
    }
}

impl Tool {
    pub fn label(self) -> &'static str {
        match self {
            Self::Select => "↖",
            Self::Carbon => "C",
            Self::Nitrogen => "N",
            Self::Oxygen => "O",
            Self::Sulfur => "S",
            Self::Phosphorus => "P",
            Self::Fluorine => "F",
            Self::Chlorine => "Cl",
            Self::Bromine => "Br",
            Self::Iodine => "I",
            Self::Hydrogen => "H",
            Self::Rgroup => "R",
            Self::Single => "─",
            Self::Double => "═",
            Self::Triple => "≡",
            Self::Aromatic => "⊙",
            Self::WedgeUp => "▲",
            Self::WedgeDown => "▽",
            Self::Benzene => "⬡",
            Self::Cyclohexane => "○",
            Self::Cyclopentane => "⬠",
            Self::ReactionArrow => "→",
            Self::CurlyArrow => "↷",
            Self::Eraser => "X",
            Self::FragmentSelect => "✂",
            Self::Pan => "✋",
        }
    }

    pub fn name_label(self) -> &'static str {
        match self {
            Self::Select => "Select",
            Self::Carbon => "Carbon",
            Self::Nitrogen => "Nitrogen",
            Self::Oxygen => "Oxygen",
            Self::Sulfur => "Sulfur",
            Self::Phosphorus => "Phosphorus",
            Self::Fluorine => "Fluorine",
            Self::Chlorine => "Chlorine",
            Self::Bromine => "Bromine",
            Self::Iodine => "Iodine",
            Self::Hydrogen => "Hydrogen",
            Self::Rgroup => "R-group",
            Self::Single => "Single bond",
            Self::Double => "Double bond",
            Self::Triple => "Triple bond",
            Self::Aromatic => "Aromatic bond",
            Self::WedgeUp => "Wedge up",
            Self::WedgeDown => "Wedge down",
            Self::Benzene => "Benzene",
            Self::Cyclohexane => "Cyclohexane",
            Self::Cyclopentane => "Cyclopentane",
            Self::ReactionArrow => "Reaction arrow",
            Self::CurlyArrow => "Curly arrow",
            Self::Eraser => "Eraser",
            Self::FragmentSelect => "Fragment select",
            Self::Pan => "Pan",
        }
    }

    pub fn shortcut(self) -> Option<&'static str> {
        match self {
            Self::Select     => Some("Esc"),
            Self::Carbon     => Some("C"),
            Self::Nitrogen   => Some("N"),
            Self::Oxygen     => Some("O"),
            Self::Sulfur     => Some("S"),
            Self::Phosphorus => Some("P"),
            Self::Fluorine   => Some("F"),
            Self::Hydrogen   => Some("H"),
            Self::Single     => Some("1"),
            Self::Double     => Some("2"),
            Self::Triple     => Some("3"),
            Self::Aromatic   => Some("4"),
            Self::WedgeUp    => Some("W"),
            Self::WedgeDown  => Some("D"),
            Self::Benzene    => Some("B"),
            Self::Rgroup     => Some("R"),
            Self::Eraser     => Some("Del"),
            Self::FragmentSelect => None,
            Self::Pan        => None,
            _ => None,
        }
    }

    /// Proactive status-bar tip for this tool (§3.2 / Appendix C).
    pub fn tip(self) -> Option<&'static str> {
        match self {
            Self::Select        => Some("Shift+click: add  Alt+drag: lasso"),
            Self::FragmentSelect => Some("Click bond → select one side"),
            Self::Single | Self::Double | Self::Triple | Self::Aromatic
                                => Some("Alt: free angle  Ctrl: snap off"),
            Self::WedgeUp | Self::WedgeDown
                                => Some("Click stereo bond to flip direction"),
            t if t.is_atom_tool() => Some("Click existing atom to change element"),
            Self::Benzene | Self::Cyclohexane | Self::Cyclopentane
                                => Some("Hover bond for red fusion preview"),
            Self::Eraser        => Some("Click atom removes all its bonds"),
            Self::Pan           => Some("Release Space to return to prior tool"),
            Self::ReactionArrow => Some("Drag to place arrow between molecules"),
            Self::CurlyArrow    => Some("Drag to place electron-push arrow"),
            _ => None,
        }
    }

    /// Returns true if this tool places/modifies atoms.
    pub fn is_atom_tool(self) -> bool {
        matches!(self,
            Self::Carbon | Self::Nitrogen | Self::Oxygen | Self::Sulfur
            | Self::Phosphorus | Self::Fluorine | Self::Chlorine
            | Self::Bromine | Self::Iodine | Self::Hydrogen | Self::Rgroup
        )
    }

    /// Returns true if this tool draws bonds.
    pub fn is_bond_tool(self) -> bool {
        matches!(self,
            Self::Single | Self::Double | Self::Triple | Self::Aromatic
            | Self::WedgeUp | Self::WedgeDown
        )
    }

    /// Returns true if this tool places rings.
    pub fn is_ring_tool(self) -> bool {
        matches!(self, Self::Benzene | Self::Cyclohexane | Self::Cyclopentane)
    }

    /// CPK-inspired label color for atom tools; None for non-atom tools.
    fn atom_color(self, tokens: &Tokens) -> Option<Color32> {
        match self {
            Self::Carbon     => Some(tokens.sidebar_title),
            Self::Nitrogen   => Some(tokens.elem_n),
            Self::Oxygen     => Some(tokens.elem_o),
            Self::Sulfur     => Some(tokens.elem_s),
            Self::Phosphorus => Some(tokens.elem_p),
            Self::Fluorine   => Some(tokens.elem_f),
            Self::Chlorine   => Some(tokens.elem_cl),
            Self::Bromine    => Some(tokens.elem_br),
            Self::Iodine     => Some(tokens.elem_i),
            Self::Hydrogen   => Some(tokens.sidebar_title.gamma_multiply(0.65)),
            Self::Rgroup     => Some(tokens.snap_indicator),  // teal
            _ => None,
        }
    }
}

struct Group {
    label: &'static str,
    tools: &'static [Tool],
}

const GROUPS: &[Group] = &[
    Group {
        label: "Selection",
        tools: &[Tool::Select, Tool::FragmentSelect, Tool::Eraser],
    },
    Group {
        label: "Atoms",
        tools: &[
            Tool::Carbon,
            Tool::Nitrogen,
            Tool::Oxygen,
            Tool::Sulfur,
            Tool::Phosphorus,
            Tool::Fluorine,
            Tool::Chlorine,
            Tool::Bromine,
            Tool::Iodine,
            Tool::Hydrogen,
            Tool::Rgroup,
        ],
    },
    Group {
        label: "Bonds",
        tools: &[
            Tool::Single,
            Tool::Double,
            Tool::Triple,
            Tool::Aromatic,
            Tool::WedgeUp,
            Tool::WedgeDown,
        ],
    },
    Group {
        label: "Rings",
        tools: &[Tool::Benzene, Tool::Cyclohexane, Tool::Cyclopentane],
    },
    Group {
        label: "Reaction",
        tools: &[Tool::ReactionArrow, Tool::CurlyArrow],
    },
];

// macOS HIG: 44pt minimum touch target
const BTN_HEIGHT: f32 = 44.0;
const BTN_FONT: f32   = 15.0;
const ACCENT_BAR: f32 = 3.0;   // left accent indicator width
const CORNER:     f32 = 6.0;   // button corner radius

pub struct ActivityBar;

impl ActivityBar {
    pub fn show(ui: &mut Ui, active: &mut ActivityPanel, sidebar_open: &mut bool, tokens: &Tokens) -> bool {
        let toggle_settings = false;
        let activity_fg = Color32::from_rgb(0xF6, 0xF8, 0xFA);
        let buttons = [
            ("✏", ActivityPanel::Tools, "Tools"),
            ("≡", ActivityPanel::Inspector, "Inspector"),
            ("⬡", ActivityPanel::Templates, "Templates"),
            ("★", ActivityPanel::Chat, "Chat"),
        ];

        ui.vertical(|ui| {
            // Top section: panel buttons
            for (icon, panel, _label) in &buttons {
                let is_active = *active == *panel;

                let (rect, resp) = ui.allocate_exact_size(Vec2::new(48.0, 48.0), Sense::click());

                // Background based on state
                if is_active {
                    ui.painter().rect_filled(rect.shrink(4.0), 6.0, tokens.sidebar_hover);
                    ui.painter().line_segment(
                        [rect.left_center() + Vec2::new(0.0, -12.0), rect.left_center() + Vec2::new(0.0, 12.0)],
                        Stroke::new(2.5, tokens.accent),
                    );
                } else if resp.hovered() {
                    ui.painter().rect_filled(rect.shrink(4.0), 6.0, alpha(tokens.sidebar_hover, 170));
                }

                // Icon color based on state
                let icon_color = if is_active {
                    activity_fg
                } else if resp.hovered() {
                    activity_fg.gamma_multiply(0.85)
                } else {
                    activity_fg.gamma_multiply(0.58)
                };

                // Icon text (centered)
                ui.painter().text(
                    rect.center(),
                    egui::Align2::CENTER_CENTER,
                    *icon,
                    egui::FontId::new(24.0, egui::FontFamily::Monospace),
                    icon_color,
                );

                if resp.clicked() {
                    *active = *panel;
                    *sidebar_open = true;
                }
            }

            // Spacer (push settings to bottom)
            ui.add_space((ui.available_height() - 60.0).max(0.0));

            // Bottom section: Settings button
            let settings_active = *active == ActivityPanel::Settings;
            let (rect, resp) = ui.allocate_exact_size(Vec2::new(48.0, 48.0), Sense::click());

            // Background
            if settings_active {
                ui.painter().rect_filled(rect.shrink(4.0), 6.0, tokens.sidebar_hover);
                ui.painter().line_segment(
                    [rect.left_center() + Vec2::new(0.0, -12.0), rect.left_center() + Vec2::new(0.0, 12.0)],
                    Stroke::new(2.5, tokens.accent),
                );
            } else if resp.hovered() {
                ui.painter().rect_filled(rect.shrink(4.0), 6.0, alpha(tokens.sidebar_hover, 170));
            }

            let settings_color = if settings_active {
                activity_fg
            } else if resp.hovered() {
                activity_fg.gamma_multiply(0.85)
            } else {
                activity_fg.gamma_multiply(0.58)
            };

            ui.painter().text(
                rect.center(),
                egui::Align2::CENTER_CENTER,
                "⚙",
                egui::FontId::new(24.0, egui::FontFamily::Monospace),
                settings_color,
            );

            if resp.clicked() {
                *active = ActivityPanel::Settings;
                *sidebar_open = true;
            }
        });

        toggle_settings
    }
}

pub struct ToolsSidebar;

impl ToolsSidebar {
    pub fn show(ui: &mut Ui, active: &mut Tool, tokens: &Tokens, _i18n: &I18n) {
        ui.add_space(10.0);
        ui.horizontal(|ui| {
            ui.add_space(12.0);
            ui.vertical(|ui| {
                ui.label(
                    egui::RichText::new("CHEMATIC-DRAW")
                        .size(13.0)
                        .strong()
                        .color(tokens.sidebar_title),
                );
                ui.label(
                    egui::RichText::new(active.name_label())
                        .size(12.0)
                        .color(tokens.sidebar_title.gamma_multiply(0.68)),
                );
            });
        });
        ui.add_space(14.0);

        egui::ScrollArea::vertical()
            .auto_shrink([false; 2])
            .show(ui, |ui| {
                for group in GROUPS {
                    ui.horizontal(|ui| {
                        ui.add_space(12.0);
                        ui.label(
                            egui::RichText::new(group.label.to_uppercase())
                                .size(10.0)
                                .strong()
                                .color(tokens.sidebar_title.gamma_multiply(0.62)),
                        );
                    });
                    ui.add_space(6.0);

                    let tile = Vec2::new(44.0, 38.0);
                    let gap = 6.0;
                    ui.horizontal_wrapped(|ui| {
                        ui.spacing_mut().item_spacing = Vec2::new(gap, gap);
                        ui.add_space(12.0);
                        for tool in group.tools {
                            let resp = Self::tool_tile(ui, *tool, *active == *tool, tile, tokens);
                            if resp.clicked() {
                                *active = *tool;
                            }
                            let hover = if let Some(sc) = tool.shortcut() {
                                format!("{} ({})", tool.name_label(), sc)
                            } else {
                                tool.name_label().to_string()
                            };
                            resp.on_hover_text(hover);
                        }
                    });

                    ui.add_space(14.0);
                }
            });
    }

    fn tool_tile(ui: &mut Ui, tool: Tool, active: bool, size: Vec2, tokens: &Tokens) -> Response {
        let (rect, resp) = ui.allocate_exact_size(size, Sense::click());
        let bg = if active {
            alpha(tokens.accent, 56)
        } else if resp.hovered() {
            tokens.sidebar_hover
        } else {
            alpha(tokens.sidebar_hover, 110)
        };
        ui.painter().rect_filled(rect, 7.0, bg);
        if active {
            ui.painter().rect_stroke(
                rect.shrink(0.5),
                7.0,
                Stroke::new(1.4, tokens.accent),
                egui::StrokeKind::Outside,
            );
        }
        let label_color = if active {
            tokens.accent
        } else if let Some(color) = tool.atom_color(tokens) {
            color
        } else {
            tokens.sidebar_title.gamma_multiply(0.86)
        };
        let font_size = match tool {
            Tool::Chlorine | Tool::Bromine => 14.0,
            _ => 16.0,
        };
        ui.painter().text(
            rect.center(),
            egui::Align2::CENTER_CENTER,
            tool.label(),
            egui::FontId::proportional(font_size),
            label_color,
        );
        resp
    }
}

pub struct Toolbar;

impl Toolbar {
    pub fn show(ui: &mut Ui, active: &mut Tool, tokens: &Tokens, i18n: &I18n) {
        let btn_w = TOOLBAR_WIDTH - SPACING_SM * 2.0;
        let btn_size = Vec2::new(btn_w, BTN_HEIGHT);

        // Toolbar background — slightly different from panel_bg for depth
        let toolbar_bg = tokens.panel_bg.gamma_multiply(0.95);

        ui.vertical(|ui| {
            ui.add_space(SPACING_XS);

            for (g_idx, group) in GROUPS.iter().enumerate() {
                // Separator line between groups (not before the first)
                if g_idx > 0 {
                    let sep_color = tokens.separator.gamma_multiply(0.6);
                    let (rect, _) = ui.allocate_exact_size(
                        Vec2::new(btn_w, 1.0), Sense::hover()
                    );
                    ui.painter().rect_filled(rect, 0.0, sep_color);
                    ui.add_space(SPACING_XS);
                }

                // Group label — ALL CAPS, 10px, dimmed
                ui.add_space(SPACING_XS);
                let label_text = i18n.t(group.label).to_uppercase();
                ui.label(
                    egui::RichText::new(label_text)
                        .size(10.0)
                        .color(tokens.sidebar_title.gamma_multiply(0.62)),
                );
                ui.add_space(2.0);

                for &tool in group.tools {
                    let is_active = *active == tool;
                    let (rect, resp) = ui.allocate_exact_size(btn_size, Sense::click());

                    Self::draw_button(ui, rect, &resp, tool, is_active, tokens, toolbar_bg);

                    if resp.clicked() {
                        *active = tool;
                    }

                    // Tooltip: "Label (shortcut)"
                    let hover = if let Some(sc) = tool.shortcut() {
                        format!("{} ({})", tool.label(), sc)
                    } else {
                        tool.label().to_string()
                    };
                    resp.on_hover_text(hover);
                }
            }
        });
    }

    fn draw_button(
        ui: &Ui,
        rect: Rect,
        resp: &Response,
        tool: Tool,
        active: bool,
        tokens: &Tokens,
        _toolbar_bg: Color32,
    ) {
        let painter = ui.painter();

        // Background — darker in light mode so hover is visible
        let bg = if active {
            alpha(tokens.accent, 48)
        } else if resp.hovered() {
            alpha(tokens.sidebar_hover, 170)
        } else {
            Color32::TRANSPARENT
        };
        painter.rect_filled(rect, CORNER, bg);

        // Left accent bar for active tool (VSCode / macOS sidebar style)
        if active {
            let bar = Rect::from_min_size(
                rect.min,
                Vec2::new(ACCENT_BAR, rect.height()),
            );
            painter.rect_filled(bar, 0.0, tokens.accent);
        }

        // Label color: atom tools use CPK color, others use bond color / accent
        let label_color = if active {
            tokens.accent
        } else if let Some(c) = tool.atom_color(tokens) {
            c
        } else {
            tokens.sidebar_title.gamma_multiply(0.85)
        };

        // Font size: Cl/Br get slightly smaller to fit
        let font_size = match tool {
            Tool::Chlorine | Tool::Bromine => BTN_FONT - 2.0,
            _ => BTN_FONT,
        };

        // Center the label, shifted right of the accent bar
        let label_origin = Pos2::new(
            rect.min.x + ACCENT_BAR + (rect.width() - ACCENT_BAR) / 2.0,
            rect.center().y,
        );
        painter.text(
            label_origin,
            egui::Align2::CENTER_CENTER,
            tool.label(),
            egui::FontId::proportional(font_size),
            label_color,
        );

        // Subtle border on hover
        if resp.hovered() && !active {
            painter.rect_stroke(
                rect,
                CORNER,
                Stroke::new(0.5, tokens.separator.gamma_multiply(0.5)),
                egui::StrokeKind::Outside,
            );
        }
    }
}
