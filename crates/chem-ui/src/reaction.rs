//! Reaction mechanism canvas: reaction arrows, curly arrows, reagent labels.

use egui::{Color32, Pos2, Sense, Stroke, Ui, Vec2};

use crate::bridge::{canvas_to_chem, chem_to_canvas};
use crate::canvas::{CanvasMolecule, CanvasState};
use crate::theme::Tokens;
use crate::toolbar::Tool;

/// A reaction arrow between two points.
#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct ReactionArrow {
    pub id: usize,
    pub from: Pos2,
    pub to: Pos2,
    pub kind: ArrowKind,
    pub label_above: String,
    pub label_below: String,
}

#[derive(Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub enum ArrowKind {
    /// Forward reaction (→)
    Forward,
    /// Equilibrium (⇌)
    Equilibrium,
    /// Retrosynthetic (⟹)
    Retro,
    /// Electron curly arrow (full-headed, electron pair)
    CurlyFull,
    /// Electron curly arrow (half-headed, single electron)
    CurlyHalf,
}

/// A labelled text block (reagent, condition, temperature).
#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct ReagentLabel {
    pub id: usize,
    pub pos: Pos2,
    pub text: String,
}

/// The full reaction scheme: molecules + arrows + labels.
#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct ReactionScheme {
    pub molecules: Vec<CanvasMolecule>,
    /// Parallel to `molecules`: true = product, false = reactant/agent.
    #[serde(default)]
    pub mol_roles: Vec<bool>,
    pub arrows: Vec<ReactionArrow>,
    pub labels: Vec<ReagentLabel>,
    pub canvas_state: CanvasState,
    /// Transient SMILES input buffer (not persisted).
    #[serde(skip)]
    pub rxn_smiles_buf: String,
}

impl ReactionScheme {
    pub fn next_id(&self) -> usize {
        let mol_ids = self.molecules.iter().flat_map(|m| {
            m.atoms
                .iter()
                .map(|a| a.id)
                .chain(m.bonds.iter().map(|b| b.id))
        });
        let arrow_ids = self.arrows.iter().map(|a| a.id);
        let label_ids = self.labels.iter().map(|l| l.id);
        mol_ids
            .chain(arrow_ids)
            .chain(label_ids)
            .max()
            .map(|m| m + 1)
            .unwrap_or(0)
    }
}

pub struct ReactionCanvas;

impl ReactionCanvas {
    pub fn show(ui: &mut Ui, scheme: &mut ReactionScheme, active_tool: Tool, tokens: &Tokens) {
        // ── Reaction SMILES toolbar ──
        ui.horizontal(|ui| {
            ui.label("Reaction SMILES:");
            ui.add(
                egui::TextEdit::singleline(&mut scheme.rxn_smiles_buf)
                    .hint_text("CC>>C.C")
                    .desired_width(300.0),
            );
            if ui.button("Import").clicked() {
                import_reaction_smiles(scheme, ui.ctx().input(|i| i.viewport_rect()).center());
            }
            if ui.button("Export").clicked() {
                let smiles = export_reaction_smiles(scheme);
                scheme.rxn_smiles_buf = smiles.clone();
                ui.ctx().copy_text(smiles);
            }
        });
        ui.separator();

        let (resp, painter) = ui.allocate_painter(ui.available_size(), Sense::click_and_drag());
        let rect = resp.rect;

        // Background
        painter.rect_filled(rect, 0.0, tokens.canvas_bg);

        // Pan
        if resp.dragged_by(egui::PointerButton::Middle)
            || resp.dragged_by(egui::PointerButton::Secondary)
        {
            scheme.canvas_state.offset += resp.drag_delta();
        }

        // Draw arrows
        for arrow in &scheme.arrows {
            let p1 = scheme.canvas_state.world_to_screen(arrow.from);
            let p2 = scheme.canvas_state.world_to_screen(arrow.to);
            draw_arrow(&painter, p1, p2, arrow.kind, tokens);

            // Labels
            if !arrow.label_above.is_empty() {
                let mid = Pos2::new((p1.x + p2.x) / 2.0, (p1.y + p2.y) / 2.0 - 14.0);
                painter.text(
                    mid,
                    egui::Align2::CENTER_CENTER,
                    &arrow.label_above,
                    egui::FontId::proportional(12.0),
                    tokens.bond,
                );
            }
            if !arrow.label_below.is_empty() {
                let mid = Pos2::new((p1.x + p2.x) / 2.0, (p1.y + p2.y) / 2.0 + 14.0);
                painter.text(
                    mid,
                    egui::Align2::CENTER_CENTER,
                    &arrow.label_below,
                    egui::FontId::proportional(12.0),
                    tokens.bond,
                );
            }
        }

        // Draw reagent labels
        for label in &scheme.labels {
            let pos = scheme.canvas_state.world_to_screen(label.pos);
            painter.text(
                pos,
                egui::Align2::CENTER_CENTER,
                &label.text,
                egui::FontId::proportional(13.0),
                tokens.bond,
            );
        }

        // Tool interaction: place reaction arrow
        if let Some(pointer) = resp.interact_pointer_pos()
            && resp.drag_stopped()
            && active_tool == Tool::ReactionArrow
        {
            let start = scheme
                .canvas_state
                .screen_to_world(pointer - resp.drag_delta());
            let end = scheme.canvas_state.screen_to_world(pointer);
            if start.distance(end) > 10.0 {
                let id = scheme.next_id();
                scheme.arrows.push(ReactionArrow {
                    id,
                    from: start,
                    to: end,
                    kind: ArrowKind::Forward,
                    label_above: String::new(),
                    label_below: String::new(),
                });
            }
        }
    }
}

fn draw_arrow(painter: &egui::Painter, p1: Pos2, p2: Pos2, kind: ArrowKind, tokens: &Tokens) {
    let stroke = Stroke::new(2.0, tokens.bond);
    let dir = (p2 - p1).normalized();
    let perp = Vec2::new(-dir.y, dir.x);

    match kind {
        ArrowKind::Forward => {
            painter.line_segment([p1, p2], stroke);
            arrowhead(painter, p2, dir, tokens.bond);
        }
        ArrowKind::Equilibrium => {
            let off = perp * 4.0;
            painter.line_segment([p1 + off, p2 + off], stroke);
            painter.line_segment([p2 - off, p1 - off], stroke);
            arrowhead(painter, p2 + off, dir, tokens.bond);
            arrowhead(painter, p1 - off, -dir, tokens.bond);
        }
        ArrowKind::Retro => {
            let thick = Stroke::new(3.0, tokens.bond);
            painter.line_segment([p1, p2], thick);
            // Double arrowhead
            arrowhead(painter, p2, dir, tokens.bond);
            arrowhead(painter, p2 - dir * 8.0, dir, tokens.bond);
        }
        ArrowKind::CurlyFull => {
            draw_bent_line(painter, p1, p2, stroke, 20.0);
            arrowhead(painter, p2, dir, tokens.bond);
        }
        ArrowKind::CurlyHalf => {
            draw_bent_line(painter, p1, p2, stroke, 20.0);
            let head = dir * 10.0 + perp * 5.0;
            painter.line_segment([p2, p2 - head], stroke);
        }
    }
}

/// Draw a two-segment bent line via a perpendicular midpoint. Does not draw the arrowhead.
fn draw_bent_line(painter: &egui::Painter, p1: Pos2, p2: Pos2, stroke: Stroke, perp_offset: f32) {
    let dir = (p2 - p1).normalized();
    let perp = Vec2::new(-dir.y, dir.x);
    let mid = p1 + (p2 - p1) / 2.0 + perp * perp_offset;
    painter.line_segment([p1, mid], stroke);
    painter.line_segment([mid, p2], stroke);
}

fn arrowhead(painter: &egui::Painter, tip: Pos2, dir: Vec2, color: Color32) {
    let perp = Vec2::new(-dir.y, dir.x);
    let base = tip - dir * 10.0;
    painter.add(egui::Shape::convex_polygon(
        vec![tip, base + perp * 4.0, base - perp * 4.0],
        color,
        Stroke::NONE,
    ));
}

/// Parse a reaction SMILES and populate the scheme with reactants/products.
fn import_reaction_smiles(scheme: &mut ReactionScheme, center: Pos2) {
    let s = scheme.rxn_smiles_buf.trim().to_string();
    if s.is_empty() {
        return;
    }
    let Ok(rxn) = chematic::rxn::parse_reaction(&s) else {
        return;
    };

    scheme.molecules.clear();
    scheme.mol_roles.clear();
    scheme.arrows.clear();

    let n_r = rxn.reactants.len();
    let n_p = rxn.products.len();
    let total = n_r + n_p;
    if total == 0 {
        return;
    }

    let spacing = 160.0f32;
    let start_x = center.x - spacing * (total as f32 - 1.0) / 2.0;

    // Place reactants
    for (i, mol) in rxn.reactants.iter().enumerate() {
        let pos = Pos2::new(start_x + spacing * i as f32, center.y);
        scheme.molecules.push(chem_to_canvas(mol, pos));
        scheme.mol_roles.push(false); // reactant
    }

    // Place products
    for (i, mol) in rxn.products.iter().enumerate() {
        let pos = Pos2::new(start_x + spacing * (n_r + i) as f32, center.y);
        scheme.molecules.push(chem_to_canvas(mol, pos));
        scheme.mol_roles.push(true); // product
    }

    // Add a forward reaction arrow between last reactant and first product
    if n_r > 0 && n_p > 0 {
        let arrow_from = Pos2::new(start_x + spacing * (n_r as f32 - 1.0) + 60.0, center.y);
        let arrow_to = Pos2::new(start_x + spacing * n_r as f32 - 60.0, center.y);
        let id = scheme.next_id();
        scheme.arrows.push(ReactionArrow {
            id,
            from: arrow_from,
            to: arrow_to,
            kind: ArrowKind::Forward,
            label_above: String::new(),
            label_below: String::new(),
        });
    }
}

/// Export the current scheme as a reaction SVG string using chematic's depiction engine.
pub fn reaction_to_svg(scheme: &ReactionScheme) -> Option<String> {
    let rxn_smiles = export_reaction_smiles(scheme);
    if rxn_smiles == ">>" {
        return None;
    }
    // Parse back to Reaction for the depict engine
    let rxn = chematic::rxn::parse_reaction(&rxn_smiles).ok()?;
    Some(chematic::depict::depict_reaction_svg(&rxn))
}

/// Export the current scheme as an MDL RXN file string.
pub fn reaction_to_rxn_file(scheme: &ReactionScheme) -> Option<String> {
    let rxn_smiles = export_reaction_smiles(scheme);
    if rxn_smiles == ">>" {
        return None;
    }
    let rxn = chematic::rxn::parse_reaction(&rxn_smiles).ok()?;
    Some(chematic::mol::write_rxn_file(&rxn))
}

/// Export the current scheme as a reaction SMILES string.
/// Molecules with role=false are reactants; role=true are products.
fn export_reaction_smiles(scheme: &ReactionScheme) -> String {
    let to_smiles = |mol: &CanvasMolecule| -> Option<String> {
        canvas_to_chem(mol).map(|m| chematic::smiles::write(&m))
    };

    let reactant_smiles: Vec<String> = scheme
        .molecules
        .iter()
        .zip(scheme.mol_roles.iter().chain(std::iter::repeat(&false)))
        .filter(|&(_, &is_product)| !is_product)
        .filter_map(|(mol, _)| to_smiles(mol))
        .collect();

    let product_smiles: Vec<String> = scheme
        .molecules
        .iter()
        .zip(scheme.mol_roles.iter().chain(std::iter::repeat(&false)))
        .filter(|&(_, &is_product)| is_product)
        .filter_map(|(mol, _)| to_smiles(mol))
        .collect();

    format!(
        "{}>>{}",
        reactant_smiles.join("."),
        product_smiles.join(".")
    )
}
