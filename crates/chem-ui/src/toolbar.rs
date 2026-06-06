use egui::{Color32, Rect, Response, Sense, Stroke, Ui, Vec2};

use crate::i18n::I18n;
use crate::theme::{Tokens, SPACING_SM, TOOLBAR_WIDTH};

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
            Self::Select => "Select",
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
            Self::Single => "—",
            Self::Double => "=",
            Self::Triple => "≡",
            Self::Aromatic => "⊙",
            Self::WedgeUp => "▲",
            Self::WedgeDown => "▽",
            Self::Benzene => "⬡b",
            Self::Cyclohexane => "⬡",
            Self::Cyclopentane => "⬠",
            Self::ReactionArrow => "→",
            Self::CurlyArrow => "↷",
            Self::Eraser => "✕",
            Self::FragmentSelect => "⌁",
            Self::Pan => "✋",
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

pub struct Toolbar;

impl Toolbar {
    pub fn show(ui: &mut Ui, active: &mut Tool, tokens: &Tokens, i18n: &I18n) {
        let btn_size = Vec2::new(TOOLBAR_WIDTH - SPACING_SM * 2.0, 36.0);
        ui.vertical(|ui| {
            for group in GROUPS {
                ui.add_space(SPACING_SM);
                ui.label(
                    egui::RichText::new(i18n.t(group.label))
                        .small()
                        .color(tokens.separator),
                );
                for &tool in group.tools {
                    let is_active = *active == tool;
                    let (rect, resp) = ui.allocate_exact_size(btn_size, Sense::click());
                    Self::draw_tool_button(ui, rect, &resp, tool, is_active, tokens);
                    if resp.clicked() {
                        *active = tool;
                    }
                    if let Some(sc) = tool.shortcut() {
                        resp.on_hover_text(format!("{} ({})", tool.label(), sc));
                    } else {
                        resp.on_hover_text(tool.label());
                    }
                }
            }
        });
    }

    fn draw_tool_button(
        ui: &Ui,
        rect: Rect,
        resp: &Response,
        tool: Tool,
        active: bool,
        tokens: &Tokens,
    ) {
        let painter = ui.painter();
        let bg = if active {
            tokens.accent.gamma_multiply(0.25)
        } else if resp.hovered() {
            tokens.panel_bg.gamma_multiply(1.2)
        } else {
            Color32::TRANSPARENT
        };
        painter.rect_filled(rect, 4.0, bg);
        if active {
            painter.rect_stroke(
                rect,
                4.0,
                Stroke::new(1.5, tokens.accent),
                egui::StrokeKind::Middle,
            );
        }
        let center = rect.center();
        painter.text(
            center,
            egui::Align2::CENTER_CENTER,
            tool.label(),
            egui::FontId::proportional(14.0),
            if active { tokens.accent } else { tokens.bond },
        );
    }
}
