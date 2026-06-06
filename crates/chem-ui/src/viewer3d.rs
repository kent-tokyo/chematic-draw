//! Simple 3D molecular viewer using egui Painter with orthographic projection.
//! Drag to rotate, scroll to zoom.

use egui::{Color32, Pos2, Sense, Stroke, Ui, Vec2};

use crate::bridge::canvas_to_chem;
use crate::canvas::CanvasMolecule;
use crate::theme::Tokens;

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct Viewer3dState {
    pub angle_x: f32,
    pub angle_y: f32,
    pub zoom: f32,
}

impl Default for Viewer3dState {
    fn default() -> Self {
        Self { angle_x: 0.3, angle_y: 0.5, zoom: 1.0 }
    }
}

pub struct Viewer3d;

impl Viewer3d {
    pub fn show(ui: &mut Ui, mol: &CanvasMolecule, state: &mut Viewer3dState, tokens: &Tokens) {
        let (resp, painter) =
            ui.allocate_painter(ui.available_size(), Sense::click_and_drag());
        let rect = resp.rect;

        painter.rect_filled(rect, 0.0, tokens.canvas_bg);

        if resp.dragged() {
            let delta = resp.drag_delta();
            state.angle_y += delta.x * 0.01;
            state.angle_x += delta.y * 0.01;
        }
        let scroll = ui.input(|i| i.smooth_scroll_delta.y);
        if scroll != 0.0 {
            state.zoom = (state.zoom * (1.0 + scroll * 0.001)).clamp(0.1, 8.0);
        }

        let Some(chem_mol) = canvas_to_chem(mol) else {
            painter.text(
                rect.center(),
                egui::Align2::CENTER_CENTER,
                "Cannot render — unrecognised element",
                egui::FontId::proportional(13.0),
                tokens.error,
            );
            return;
        };

        let raw3d = chematic::threed::generate_coords(&chem_mol);
        let coords3d = chematic::threed::minimize_uff(&chem_mol, raw3d);
        let (sin_x, cos_x) = state.angle_x.sin_cos();
        let (sin_y, cos_y) = state.angle_y.sin_cos();
        let center = rect.center();
        let scale = state.zoom * 60.0;

        // Project atoms to screen with depth info.
        struct Proj { screen: Pos2, z: f32, elem: String }
        let mut projs: Vec<Proj> = chem_mol
            .atoms()
            .map(|(idx, atom)| {
                let p = coords3d.get(idx);
                let (x, y, z) = rotate(p.x as f32, p.y as f32, p.z as f32, sin_x, cos_x, sin_y, cos_y);
                Proj {
                    screen: Pos2::new(center.x + x * scale, center.y - y * scale),
                    z,
                    elem: atom.element.symbol().to_string(),
                }
            })
            .collect();

        // Draw bonds.
        for (_, bond) in chem_mol.bonds() {
            let a = bond.atom1.0 as usize;
            let b = bond.atom2.0 as usize;
            if a < projs.len() && b < projs.len() {
                painter.line_segment(
                    [projs[a].screen, projs[b].screen],
                    Stroke::new(2.0, tokens.bond),
                );
            }
        }

        // Sort by Z (back to front).
        projs.sort_by(|a, b| a.z.partial_cmp(&b.z).unwrap_or(std::cmp::Ordering::Equal));

        // Draw atoms.
        for proj in &projs {
            let r = (vdw_radius(&proj.elem) * state.zoom * 16.0).clamp(4.0, 30.0);
            let depth = (proj.z + 5.0) / 10.0;
            let color = element_color_3d(&proj.elem, depth, tokens);

            painter.circle_filled(proj.screen + Vec2::new(2.0, 2.0), r, Color32::from_black_alpha(60));
            painter.circle_filled(proj.screen, r, color);
            if proj.elem != "C" && r > 8.0 {
                painter.text(
                    proj.screen,
                    egui::Align2::CENTER_CENTER,
                    &proj.elem,
                    egui::FontId::proportional(r * 0.7),
                    Color32::WHITE,
                );
            }
        }

        painter.text(
            rect.min + Vec2::new(8.0, 8.0),
            egui::Align2::LEFT_TOP,
            "Drag to rotate  |  Scroll to zoom",
            egui::FontId::proportional(11.0),
            tokens.separator,
        );
    }
}

fn rotate(x: f32, y: f32, z: f32, sin_x: f32, cos_x: f32, sin_y: f32, cos_y: f32) -> (f32, f32, f32) {
    let x1 = x * cos_y + z * sin_y;
    let z1 = -x * sin_y + z * cos_y;
    let y2 = y * cos_x - z1 * sin_x;
    let z2 = y * sin_x + z1 * cos_x;
    (x1, y2, z2)
}

/// Van der Waals radius from chematic's Bondi table.
fn vdw_radius(elem: &str) -> f32 {
    use chematic::core::Element;
    Element::from_symbol(elem)
        .map(|e| e.vdw_radius())
        .unwrap_or(1.0)
}

fn element_color_3d(elem: &str, depth: f32, tokens: &Tokens) -> Color32 {
    let base = match elem {
        "C" => tokens.elem_c, "N" => tokens.elem_n, "O" => tokens.elem_o,
        "S" => tokens.elem_s, "P" => tokens.elem_p, "F" => tokens.elem_f,
        "Cl" => tokens.elem_cl, "Br" => tokens.elem_br, "I" => tokens.elem_i,
        "H" => tokens.elem_h, _ => tokens.elem_other,
    };
    base.gamma_multiply((depth * 0.6 + 0.4).clamp(0.3, 1.0))
}
