use egui::{Painter, Pos2, Rect, Sense, Stroke, Vec2};

use crate::theme::{
    Tokens, ATOM_RADIUS, BOND_ANGLE_SNAP_DEG, BOND_WIDTH, DOUBLE_BOND_OFFSET,
    DRAG_THRESHOLD_PX, GHOST_BOND_ALPHA, RING_FUSE_THRESHOLD, SNAP_FLASH_SECS,
    UNDO_HISTORY_STEPS,
};
use crate::toolbar::Tool;

/// Lightweight in-memory molecule for the canvas (wraps chematic types).
/// This layer isolates egui canvas code from the chematic API.
#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct CanvasMolecule {
    pub atoms: Vec<CanvasAtom>,
    pub bonds: Vec<CanvasBond>,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct CanvasAtom {
    pub id: usize,
    pub element: String,
    pub pos: Pos2,
    pub charge: i8,
    pub selected: bool,
    /// Atom map number for reaction SMILES (0 = none).
    #[serde(default)]
    pub atom_map: u16,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct CanvasBond {
    pub id: usize,
    pub from: usize,
    pub to: usize,
    pub order: BondOrder,
    pub stereo: BondStereo,
    pub selected: bool,
}

#[derive(Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub enum BondOrder {
    Single,
    Double,
    Triple,
    Aromatic,
}

#[derive(Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub enum BondStereo {
    None,
    WedgeUp,
    WedgeDown,
}

impl CanvasMolecule {
    pub fn atom_at(&self, pos: Pos2, radius: f32) -> Option<usize> {
        self.atoms
            .iter()
            .find(|a| a.pos.distance(pos) < radius)
            .map(|a| a.id)
    }

    pub fn next_id(&self) -> usize {
        self.atoms
            .iter()
            .map(|a| a.id)
            .chain(self.bonds.iter().map(|b| b.id))
            .max()
            .map(|m| m + 1)
            .unwrap_or(0)
    }

    pub fn add_atom(&mut self, element: &str, pos: Pos2) -> usize {
        let id = self.next_id();
        self.atoms.push(CanvasAtom {
            id,
            element: element.to_string(),
            pos,
            charge: 0,
            selected: false,
            atom_map: 0,
        });
        id
    }

    pub fn add_bond(&mut self, from: usize, to: usize, order: BondOrder, stereo: BondStereo) {
        let id = self.next_id();
        self.bonds.push(CanvasBond {
            id,
            from,
            to,
            order,
            stereo,
            selected: false,
        });
    }

    pub fn remove_atom(&mut self, id: usize) {
        self.atoms.retain(|a| a.id != id);
        self.bonds.retain(|b| b.from != id && b.to != id);
    }

    pub fn remove_bond(&mut self, id: usize) {
        self.bonds.retain(|b| b.id != id);
    }

    pub fn deselect_all(&mut self) {
        for a in &mut self.atoms {
            a.selected = false;
        }
        for b in &mut self.bonds {
            b.selected = false;
        }
    }
}

/// State that persists per canvas (zoom, pan, transient interaction).
#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct CanvasState {
    pub offset: Vec2,
    pub zoom: f32,
    /// Atom ID that was clicked to start a bond drag (not persisted).
    #[serde(skip)]
    pub bond_drag_from: Option<usize>,
    /// Screen position of the current drag pointer (not persisted).
    #[serde(skip)]
    pub bond_drag_pos: Option<Pos2>,
    /// Live bond drag info for status bar: (length_px, angle_deg).
    #[serde(skip)]
    pub bond_drag_info: Option<(f32, f32)>,
    /// Atom ID being moved with the Select tool (not persisted).
    #[serde(skip)]
    pub dragging_atom: Option<usize>,
    /// Lasso selection start (screen coords, not persisted).
    #[serde(skip)]
    pub lasso_start: Option<Pos2>,
    /// Lasso selection current end (screen coords, not persisted).
    #[serde(skip)]
    pub lasso_end: Option<Pos2>,
    /// Right-click context menu target (not persisted).
    #[serde(skip)]
    pub context_target: Option<ContextTarget>,
    /// Screen position of context menu (not persisted).
    #[serde(skip)]
    pub context_pos: Option<Pos2>,
    /// Bond ID under ring-tool hover (for red fusion highlight).
    #[serde(skip)]
    pub ring_fuse_bond: Option<usize>,
    /// Bond ID currently hovered (exposed for keyboard shortcuts in app.rs).
    #[serde(skip)]
    pub hover_bond_id: Option<usize>,
    /// Snap flash indicator: world position + expiry time.
    #[serde(skip)]
    pub snap_flash: Option<(Pos2, f64)>,
    /// Snap type label for status bar (e.g. "Atom center", "Bond angle: 120°").
    #[serde(skip)]
    pub snap_status: Option<String>,
    /// Last bond clicked with FragmentSelect (for toggle).
    #[serde(skip)]
    pub fragment_bond: Option<usize>,
    /// Drag start screen position (for 4px threshold).
    #[serde(skip)]
    pub drag_start_screen: Option<Pos2>,
    /// Whether the current drag has crossed the 4px threshold.
    #[serde(skip)]
    pub drag_confirmed: bool,
}

/// What the right-click context menu is operating on.
#[derive(Clone, Debug)]
pub enum ContextTarget {
    Atom(usize),
    Bond(usize),
    Canvas,
}

impl Default for CanvasState {
    fn default() -> Self {
        Self {
            offset: Vec2::ZERO,
            zoom: 1.0,
            bond_drag_from: None,
            bond_drag_pos: None,
            bond_drag_info: None,
            dragging_atom: None,
            lasso_start: None,
            lasso_end: None,
            context_target: None,
            context_pos: None,
            ring_fuse_bond: None,
            hover_bond_id: None,
            snap_flash: None,
            snap_status: None,
            fragment_bond: None,
            drag_start_screen: None,
            drag_confirmed: false,
        }
    }
}

impl CanvasState {
    pub fn world_to_screen(&self, p: Pos2) -> Pos2 {
        Pos2::new(p.x * self.zoom + self.offset.x, p.y * self.zoom + self.offset.y)
    }

    pub fn screen_to_world(&self, p: Pos2) -> Pos2 {
        Pos2::new(
            (p.x - self.offset.x) / self.zoom,
            (p.y - self.offset.y) / self.zoom,
        )
    }
}

/// Push a structural snapshot for undo. Clears the redo stack.
pub fn push_undo(
    undo: &mut Vec<CanvasMolecule>,
    redo: &mut Vec<CanvasMolecule>,
    mol: &CanvasMolecule,
) {
    redo.clear();
    if undo.len() >= UNDO_HISTORY_STEPS {
        undo.remove(0);
    }
    undo.push(mol.clone());
}

/// Draws and handles interaction for the molecule canvas.
pub struct MoleculeCanvas;

impl MoleculeCanvas {
    pub fn show(
        ui: &mut egui::Ui,
        mol: &mut CanvasMolecule,
        state: &mut CanvasState,
        active_tool: Tool,
        tokens: &Tokens,
        undo: &mut Vec<CanvasMolecule>,
        redo: &mut Vec<CanvasMolecule>,
    ) {
        let (resp, painter) = ui.allocate_painter(ui.available_size(), Sense::click_and_drag());
        let rect = resp.rect;

        // ── pan with middle-mouse or right-drag ──
        if resp.dragged_by(egui::PointerButton::Middle)
            || resp.dragged_by(egui::PointerButton::Secondary)
        {
            state.offset += resp.drag_delta();
        }

        // ── zoom with scroll + pinch (§24 trackpad) ──
        let scroll = ui.input(|i| i.smooth_scroll_delta.y);
        if scroll != 0.0 {
            let factor = 1.0 + scroll * 0.001;
            state.zoom = (state.zoom * factor).clamp(0.2, 10.0);
        }
        let pinch = ui.input(|i| i.zoom_delta());
        if (pinch - 1.0).abs() > 0.001 {
            state.zoom = (state.zoom * pinch).clamp(0.2, 10.0);
        }
        // Horizontal trackpad scroll → pan
        let scroll_x = ui.input(|i| i.smooth_scroll_delta.x);
        if scroll_x != 0.0 {
            state.offset.x += scroll_x;
        }
        // Shift+Ctrl+Primary drag → pan fallback for trackpad users
        let shift_ctrl = ui.input(|i| {
            (i.modifiers.shift) && (i.modifiers.ctrl || i.modifiers.mac_cmd)
        });
        if shift_ctrl && resp.dragged_by(egui::PointerButton::Primary) {
            state.offset += resp.drag_delta();
        }

        // ── background ──
        painter.rect_filled(rect, 0.0, tokens.canvas_bg);
        Self::draw_grid(&painter, rect, state, tokens);

        // ── hover detection (non-blocking; uses pointer hover, not click) ──
        let hover_pos = ui.input(|i| i.pointer.hover_pos());
        let hover_atom = hover_pos.and_then(|hp| {
            mol.atom_at(state.screen_to_world(hp), ATOM_RADIUS * 2.0)
        });
        let hover_bond = if hover_atom.is_none() {
            hover_pos.and_then(|hp| bond_at(mol, state.screen_to_world(hp), state, 6.0))
        } else {
            None
        };

        // Update public hover_bond_id for keyboard shortcuts in app.rs
        state.hover_bond_id = hover_bond;

        // Update ring_fuse_bond when ring tools are active
        if active_tool.is_ring_tool() {
            state.ring_fuse_bond = hover_bond;
        } else {
            state.ring_fuse_bond = None;
        }

        // Expire snap flash
        let now = ui.input(|i| i.time);
        if let Some((_, until)) = state.snap_flash {
            if now > until {
                state.snap_flash = None;
                state.snap_status = None;
            }
        }

        // ── bonds ──
        for bond in &mol.bonds {
            let Some(from_atom) = mol.atoms.iter().find(|a| a.id == bond.from) else {
                continue;
            };
            let Some(to_atom) = mol.atoms.iter().find(|a| a.id == bond.to) else {
                continue;
            };
            let p1 = state.world_to_screen(from_atom.pos);
            let p2 = state.world_to_screen(to_atom.pos);
            let is_hovered = hover_bond == Some(bond.id);
            let is_ring_fuse = state.ring_fuse_bond == Some(bond.id);
            let color = if is_ring_fuse {
                tokens.ring_fuse_hover
            } else if bond.selected {
                tokens.atom_selected
            } else if is_hovered {
                tokens.accent.gamma_multiply(0.8)
            } else {
                tokens.bond
            };
            let stroke_w = if is_hovered || is_ring_fuse { BOND_WIDTH * 1.8 } else { BOND_WIDTH };
            Self::draw_bond_w(&painter, p1, p2, bond.order, bond.stereo, color, stroke_w);
        }

        // ── atoms ──
        for atom in &mol.atoms {
            let pos = state.world_to_screen(atom.pos);
            let color = Self::element_color(&atom.element, tokens);
            let is_hovered = hover_atom == Some(atom.id);
            let border = if atom.selected {
                tokens.atom_selected
            } else {
                color
            };
            let base_r = ATOM_RADIUS * state.zoom;
            let r = if is_hovered || atom.selected { base_r * 1.25 } else { base_r };

            // Hover glow ring
            if is_hovered && !atom.selected {
                painter.circle_stroke(
                    pos, r + 3.0,
                    Stroke::new(1.5, tokens.accent.gamma_multiply(0.5)),
                );
            }
            // Selection ring
            if atom.selected {
                painter.circle_stroke(
                    pos, r + 3.0,
                    Stroke::new(2.0, tokens.atom_selected),
                );
            }

            if atom.element != "C" {
                painter.circle_filled(pos, r, color);
                painter.text(
                    pos,
                    egui::Align2::CENTER_CENTER,
                    &atom.element,
                    egui::FontId::proportional(12.0 * state.zoom),
                    egui::Color32::BLACK,
                );
            } else {
                // Carbon nodes: show only as a small dot unless selected/hovered
                let dot_r = if atom.selected || is_hovered { base_r * 0.5 } else { 2.0 };
                painter.circle_filled(pos, dot_r, border);
            }
            // Atom map number (reaction SMILES :N)
            if atom.atom_map != 0 {
                let r = ATOM_RADIUS * state.zoom;
                painter.text(
                    pos + Vec2::new(r + 1.0, r + 1.0),
                    egui::Align2::LEFT_TOP,
                    format!(":{}", atom.atom_map),
                    egui::FontId::proportional(9.0 * state.zoom),
                    tokens.accent.gamma_multiply(0.8),
                );
            }
            // Charge superscript
            if atom.charge != 0 {
                let charge_str = match atom.charge {
                    1 => "⁺".to_string(),
                    -1 => "⁻".to_string(),
                    n if n > 0 => format!("{}⁺", n),
                    n => format!("{}⁻", -n),
                };
                let r = ATOM_RADIUS * state.zoom;
                painter.text(
                    pos + Vec2::new(r + 1.0, -(r + 1.0)),
                    egui::Align2::LEFT_BOTTOM,
                    &charge_str,
                    egui::FontId::proportional(10.0 * state.zoom),
                    tokens.bond,
                );
            }
        }

        // ── snap flash indicator ──
        if let Some((snap_world, _)) = state.snap_flash {
            let snap_screen = state.world_to_screen(snap_world);
            painter.circle_stroke(
                snap_screen,
                4.0,
                Stroke::new(2.0, tokens.snap_indicator),
            );
        }

        // ── Ring tool ghost silhouette (§4.2) ──
        if active_tool.is_ring_tool() {
            if let Some(hp) = hover_pos {
                let (n, radius) = match active_tool {
                    Tool::Benzene => (6usize, 52.0f32),
                    Tool::Cyclohexane => (6, 52.0),
                    _ => (5, 45.0),
                };
                let ghost_color = tokens.accent.gamma_multiply(0.30);
                let ghost_stroke = Stroke::new(BOND_WIDTH * 0.8, ghost_color);
                // If hovering a fuse bond, draw ghost at fuse position; else at cursor
                let ghost_center = if let Some(bid) = state.ring_fuse_bond {
                    // Compute ring center as place_ring_on_bond would
                    ring_ghost_center_for_bond(mol, bid, n)
                        .map(|c| state.world_to_screen(c))
                        .unwrap_or(hp)
                } else {
                    hp
                };
                let ring_radius_screen = radius * state.zoom;
                for i in 0..n {
                    let a1 = std::f32::consts::TAU / n as f32 * i as f32
                        - std::f32::consts::FRAC_PI_2;
                    let a2 = std::f32::consts::TAU / n as f32 * (i + 1) as f32
                        - std::f32::consts::FRAC_PI_2;
                    let p1 = ghost_center + Vec2::new(a1.cos(), a1.sin()) * ring_radius_screen;
                    let p2 = ghost_center + Vec2::new(a2.cos(), a2.sin()) * ring_radius_screen;
                    painter.line_segment([p1, p2], ghost_stroke);
                }
            }
        }

        // ── lasso overlay (drawn after atoms, before tool logic) ──
        if let (Some(s), Some(e)) = (state.lasso_start, state.lasso_end) {
            let lasso_rect = egui::Rect::from_two_pos(s, e);
            painter.rect(
                lasso_rect,
                0.0,
                tokens.accent.gamma_multiply(0.08),
                Stroke::new(1.0, tokens.accent.gamma_multiply(0.6)),
                egui::StrokeKind::Middle,
            );
        }

        // ── cursor icon ──
        {
            let is_dragging = resp.dragged_by(egui::PointerButton::Primary);
            let cursor = match active_tool {
                Tool::Pan => egui::CursorIcon::Grab,
                Tool::Select if is_dragging && state.dragging_atom.is_some() => egui::CursorIcon::Grabbing,
                Tool::Select if hover_atom.is_some() => egui::CursorIcon::Grab,
                Tool::Select => egui::CursorIcon::Default,
                Tool::Eraser if hover_atom.is_some() || hover_bond.is_some() => egui::CursorIcon::NotAllowed,
                t if t.is_atom_tool() || t.is_bond_tool() => egui::CursorIcon::Crosshair,
                t if t.is_ring_tool() => egui::CursorIcon::Crosshair,
                _ => egui::CursorIcon::Default,
            };
            ui.ctx().set_cursor_icon(cursor);
        }

        // ── Atom tool element overlay near cursor ──
        if active_tool.is_atom_tool() {
            if let Some(hp) = hover_pos {
                if let Some(elem) = tool_element(active_tool) {
                    painter.text(
                        hp + Vec2::new(10.0, -10.0),
                        egui::Align2::LEFT_BOTTOM,
                        elem,
                        egui::FontId::proportional(12.0),
                        tokens.accent,
                    );
                }
            }
        }

        // ── tool interaction ──
        let pointer_opt = resp.interact_pointer_pos();

        // Pan tool (Space hold) — all primary clicks become pan
        if active_tool == Tool::Pan {
            if resp.dragged_by(egui::PointerButton::Primary) {
                state.offset += resp.drag_delta();
            }
        }

        match active_tool {
            Tool::Select => {
                if let Some(pointer) = pointer_opt {
                    let world = state.screen_to_world(pointer);
                    if resp.drag_started_by(egui::PointerButton::Primary) {
                        if let Some(id) = mol.atom_at(world, ATOM_RADIUS * 2.0) {
                            // Start atom drag: preserve selection if atom is already selected
                            if !mol.atoms.iter().any(|a| a.id == id && a.selected) {
                                mol.deselect_all();
                                if let Some(a) = mol.atoms.iter_mut().find(|a| a.id == id) {
                                    a.selected = true;
                                }
                            }
                            push_undo(undo, redo, mol);
                            state.dragging_atom = Some(id);
                        } else {
                            // Start lasso
                            mol.deselect_all();
                            state.lasso_start = Some(pointer);
                            state.lasso_end = Some(pointer);
                        }
                    }
                    if resp.dragged_by(egui::PointerButton::Primary) {
                        if state.dragging_atom.is_some() {
                            let delta = resp.drag_delta() / state.zoom;
                            for a in mol.atoms.iter_mut().filter(|a| a.selected) {
                                a.pos += delta;
                            }
                        } else if state.lasso_start.is_some() {
                            state.lasso_end = Some(pointer);
                        }
                    }
                    if resp.drag_stopped_by(egui::PointerButton::Primary) {
                        state.dragging_atom = None;
                        if state.lasso_start.is_some() {
                            if let (Some(s), Some(e)) = (state.lasso_start, state.lasso_end) {
                                let lasso_rect = egui::Rect::from_two_pos(s, e);
                                for a in mol.atoms.iter_mut() {
                                    a.selected = lasso_rect.contains(state.world_to_screen(a.pos));
                                }
                            }
                            state.lasso_start = None;
                            state.lasso_end = None;
                        }
                    }
                    let ctrl = ui.input(|i| i.modifiers.ctrl || i.modifiers.mac_cmd);
                    let shift = ui.input(|i| i.modifiers.shift);

                    // Shift+DblClick: select entire connected fragment (§4.2)
                    if resp.double_clicked_by(egui::PointerButton::Primary) {
                        if let Some(id) = mol.atom_at(world, ATOM_RADIUS * 2.0) {
                            if shift {
                                // Select the whole connected component containing this atom
                                let component: Vec<usize> = {
                                    let mut visited = std::collections::HashSet::new();
                                    let mut queue = std::collections::VecDeque::new();
                                    queue.push_back(id);
                                    visited.insert(id);
                                    while let Some(cur) = queue.pop_front() {
                                        for b in &mol.bonds {
                                            let nb = if b.from == cur { Some(b.to) }
                                                     else if b.to == cur { Some(b.from) }
                                                     else { None };
                                            if let Some(n) = nb {
                                                if visited.insert(n) { queue.push_back(n); }
                                            }
                                        }
                                    }
                                    visited.into_iter().collect()
                                };
                                for a in mol.atoms.iter_mut() {
                                    if component.contains(&a.id) { a.selected = true; }
                                }
                                for b in mol.bonds.iter_mut() {
                                    if component.contains(&b.from) && component.contains(&b.to) {
                                        b.selected = true;
                                    }
                                }
                            }
                        }
                    }

                    // Ctrl+Click: select all atoms of same element (§4.2)
                    if resp.clicked_by(egui::PointerButton::Primary) && ctrl {
                        if let Some(id) = mol.atom_at(world, ATOM_RADIUS * 2.0) {
                            let elem = mol.atoms.iter().find(|a| a.id == id)
                                .map(|a| a.element.clone())
                                .unwrap_or_default();
                            for a in mol.atoms.iter_mut() {
                                if a.element == elem { a.selected = true; }
                            }
                        }
                    } else if resp.clicked_by(egui::PointerButton::Primary) && !shift {
                        mol.deselect_all();
                        if let Some(id) = mol.atom_at(world, ATOM_RADIUS * 2.0) {
                            if let Some(a) = mol.atoms.iter_mut().find(|a| a.id == id) {
                                a.selected = true;
                            }
                        } else if let Some(bond_id) = bond_at(mol, world, state, 6.0) {
                            if let Some(b) = mol.bonds.iter_mut().find(|b| b.id == bond_id) {
                                b.selected = true;
                            }
                        }
                    } else if resp.clicked_by(egui::PointerButton::Primary) && shift {
                        // Shift+Click: toggle single item
                        if let Some(id) = mol.atom_at(world, ATOM_RADIUS * 2.0) {
                            if let Some(a) = mol.atoms.iter_mut().find(|a| a.id == id) {
                                a.selected = !a.selected;
                            }
                        } else if let Some(bond_id) = bond_at(mol, world, state, 6.0) {
                            if let Some(b) = mol.bonds.iter_mut().find(|b| b.id == bond_id) {
                                b.selected = !b.selected;
                            }
                        }
                    }
                } else {
                    state.dragging_atom = None;
                    state.lasso_start = None;
                    state.lasso_end = None;
                }
            }

            Tool::Eraser => {
                if let Some(pointer) = pointer_opt {
                    let world = state.screen_to_world(pointer);
                    if resp.clicked() {
                        if let Some(id) = mol.atom_at(world, ATOM_RADIUS * 2.0) {
                            push_undo(undo, redo, mol);
                            mol.remove_atom(id);
                        } else if let Some(bond_id) = bond_at(mol, world, state, 6.0) {
                            push_undo(undo, redo, mol);
                            mol.remove_bond(bond_id);
                        }
                    }
                }
            }

            Tool::Single
            | Tool::Double
            | Tool::Triple
            | Tool::Aromatic
            | Tool::WedgeUp
            | Tool::WedgeDown => {
                let (order, stereo) = bond_order_from_tool(active_tool);
                let alt_held  = ui.input(|i| i.modifiers.alt);
                let ctrl_held = ui.input(|i| i.modifiers.ctrl);

                if let Some(pointer) = pointer_opt {
                    let world = state.screen_to_world(pointer);

                    if resp.drag_started_by(egui::PointerButton::Primary) {
                        state.drag_start_screen = Some(pointer);
                        state.drag_confirmed = false;
                        push_undo(undo, redo, mol);
                        let from_id = mol
                            .atom_at(world, ATOM_RADIUS * 2.0)
                            .unwrap_or_else(|| mol.add_atom("C", world));
                        state.bond_drag_from = Some(from_id);
                    }
                    if resp.dragged_by(egui::PointerButton::Primary) {
                        // 4px drag threshold
                        if !state.drag_confirmed {
                            if let Some(start) = state.drag_start_screen {
                                if (pointer - start).length() > DRAG_THRESHOLD_PX {
                                    state.drag_confirmed = true;
                                }
                            }
                        }
                    }

                    // Compute snapped world position for preview
                    let snapped_world = if let Some(from_id) = state.bond_drag_from {
                        if let Some(from_atom) = mol.atoms.iter().find(|a| a.id == from_id) {
                            snap_bond_angle(from_atom.pos, world, mol, from_id, alt_held, ctrl_held)
                        } else {
                            world
                        }
                    } else {
                        world
                    };
                    let snapped_screen = state.world_to_screen(snapped_world);
                    state.bond_drag_pos = Some(snapped_screen);

                    // Update drag info for status bar
                    if let Some(from_id) = state.bond_drag_from {
                        if let Some(from_atom) = mol.atoms.iter().find(|a| a.id == from_id) {
                            let from_screen = state.world_to_screen(from_atom.pos);
                            let len_px = from_screen.distance(snapped_screen);
                            let delta = snapped_world - from_atom.pos;
                            let angle_deg = delta.y.atan2(delta.x).to_degrees();
                            let angle_display = ((angle_deg % 360.0) + 360.0) % 360.0;
                            state.bond_drag_info = Some((len_px, angle_display));
                        }
                    }

                    if resp.drag_stopped_by(egui::PointerButton::Primary) {
                        if let Some(from_id) = state.bond_drag_from.take() {
                            if state.drag_confirmed {
                                // Snap to existing atom within threshold
                                let to_id = mol
                                    .atom_at(snapped_world, ATOM_RADIUS * 2.0)
                                    .filter(|&id| id != from_id)
                                    .unwrap_or_else(|| mol.add_atom("C", snapped_world));
                                let exists = mol.bonds.iter().any(|b| {
                                    (b.from == from_id && b.to == to_id)
                                        || (b.from == to_id && b.to == from_id)
                                });
                                if !exists {
                                    mol.add_bond(from_id, to_id, order, stereo);
                                    // Flash snap indicator at the endpoint
                                    let snap_time = ui.input(|i| i.time);
                                    state.snap_flash = Some((snapped_world, snap_time + SNAP_FLASH_SECS));
                                    state.snap_status = Some(format!("Bond angle: {:.0}°",
                                        state.bond_drag_info.map(|(_, a)| a).unwrap_or(0.0)));
                                }
                            }
                        }
                        state.bond_drag_pos = None;
                        state.bond_drag_info = None;
                        state.drag_start_screen = None;
                        state.drag_confirmed = false;
                    }
                    // Single click (no drag): bond cycling > extend from atom > create new pair
                    if resp.clicked_by(egui::PointerButton::Primary) {
                        state.bond_drag_from = None;
                        if let Some(from_id) = mol.atom_at(world, ATOM_RADIUS * 2.0) {
                            push_undo(undo, redo, mol);
                            // WedgeUp/WedgeDown: flip existing stereo, else change order
                            if let Some(bond_id) = mol.bonds.iter().find(|b|
                                (b.from == from_id || b.to == from_id)
                                && b.stereo != BondStereo::None
                            ).map(|b| b.id) {
                                if active_tool == Tool::WedgeUp || active_tool == Tool::WedgeDown {
                                    if let Some(b) = mol.bonds.iter_mut().find(|b| b.id == bond_id) {
                                        b.stereo = if b.stereo == BondStereo::WedgeUp {
                                            BondStereo::WedgeDown
                                        } else {
                                            BondStereo::WedgeUp
                                        };
                                    }
                                    // skipped adding new bond
                                } else {
                                    let new_pos = default_bond_endpoint(mol, from_id);
                                    let to_id = mol.add_atom("C", new_pos);
                                    mol.add_bond(from_id, to_id, order, stereo);
                                }
                            } else {
                                let new_pos = default_bond_endpoint(mol, from_id);
                                let to_id = mol.add_atom("C", new_pos);
                                mol.add_bond(from_id, to_id, order, stereo);
                            }
                        } else if let Some(bond_id) = bond_at(mol, world, state, 8.0) {
                            push_undo(undo, redo, mol);
                            if let Some(b) = mol.bonds.iter_mut().find(|b| b.id == bond_id) {
                                // WedgeUp/Down on stereo bond: flip direction
                                if (active_tool == Tool::WedgeUp || active_tool == Tool::WedgeDown)
                                    && b.stereo != BondStereo::None
                                {
                                    b.stereo = if b.stereo == BondStereo::WedgeUp {
                                        BondStereo::WedgeDown
                                    } else {
                                        BondStereo::WedgeUp
                                    };
                                } else {
                                    b.order = order;
                                    b.stereo = stereo;
                                }
                            }
                        } else {
                            push_undo(undo, redo, mol);
                            let a = mol.add_atom("C", world);
                            let b_pos = world + egui::Vec2::new(60.0, 0.0);
                            let b = mol.add_atom("C", b_pos);
                            mol.add_bond(a, b, order, stereo);
                        }
                    }
                } else {
                    state.bond_drag_from = None;
                    state.bond_drag_pos = None;
                    state.bond_drag_info = None;
                    state.drag_confirmed = false;
                }

                // Preview line (ghost bond, accent-colored at GHOST_BOND_ALPHA opacity)
                if let (Some(from_id), Some(drag_pos)) =
                    (state.bond_drag_from, state.bond_drag_pos)
                {
                    if state.drag_confirmed {
                        if let Some(from_atom) = mol.atoms.iter().find(|a| a.id == from_id) {
                            let p1 = state.world_to_screen(from_atom.pos);
                            let preview_stroke =
                                Stroke::new(BOND_WIDTH, tokens.accent.gamma_multiply(GHOST_BOND_ALPHA));
                            painter.line_segment([p1, drag_pos], preview_stroke);
                        }
                    }
                }
            }

            Tool::Benzene | Tool::Cyclohexane | Tool::Cyclopentane => {
                let (n, radius, ring_order) = match active_tool {
                    Tool::Benzene => (6, 52.0, BondOrder::Aromatic),
                    Tool::Cyclohexane => (6, 52.0, BondOrder::Single),
                    _ => (5, 45.0, BondOrder::Single),
                };
                if let Some(pointer) = pointer_opt {
                    let fired = resp.clicked_by(egui::PointerButton::Primary)
                        || resp.drag_stopped_by(egui::PointerButton::Primary);
                    if fired {
                        let world = state.screen_to_world(pointer);
                        push_undo(undo, redo, mol);
                        if let Some(bond_id) = state.ring_fuse_bond {
                            // Fuse ring onto the hovered bond
                            place_ring_on_bond(mol, bond_id, n, ring_order);
                        } else if let Some(atom_id) = mol.atom_at(world, RING_FUSE_THRESHOLD) {
                            // Near existing atom: check drag distance
                            if let Some(drag_start) = state.drag_start_screen {
                                let dist = pointer.distance(drag_start);
                                if dist > RING_FUSE_THRESHOLD {
                                    // Attach via single bond
                                    let center_offset = Vec2::new(radius, 0.0);
                                    let atom_pos = mol.atoms.iter().find(|a| a.id == atom_id).map(|a| a.pos).unwrap_or(world);
                                    let bond_end = atom_pos + center_offset;
                                    let new_center = bond_end;
                                    let connector_id = mol.add_atom("C", bond_end);
                                    mol.add_bond(atom_id, connector_id, BondOrder::Single, BondStereo::None);
                                    place_ring(mol, new_center, n, radius, ring_order);
                                } else {
                                    // Fuse directly at atom
                                    place_ring(mol, world, n, radius, ring_order);
                                }
                            } else {
                                place_ring(mol, world, n, radius, ring_order);
                            }
                        } else {
                            place_ring(mol, world, n, radius, ring_order);
                        }
                        state.drag_start_screen = None;
                        state.drag_confirmed = false;
                    }
                    if resp.drag_started_by(egui::PointerButton::Primary) {
                        state.drag_start_screen = Some(pointer);
                    }
                }
            }

            Tool::FragmentSelect => {
                if let Some(pointer) = pointer_opt {
                    if resp.clicked_by(egui::PointerButton::Primary) {
                        let world = state.screen_to_world(pointer);
                        if let Some(bond_id) = bond_at(mol, world, state, 8.0) {
                            let bond = mol.bonds.iter().find(|b| b.id == bond_id);
                            if let Some(b) = bond {
                                let (from_id, to_id) = (b.from, b.to);
                                // Toggle: if same bond as last time, select the other side
                                let select_from_side = if state.fragment_bond == Some(bond_id) {
                                    // check which side is currently selected
                                    let from_side_selected = mol.atoms.iter()
                                        .filter(|a| a.selected)
                                        .any(|a| a.id == from_id);
                                    !from_side_selected  // flip
                                } else {
                                    true  // default: from-side
                                };
                                state.fragment_bond = Some(bond_id);
                                let start_atom = if select_from_side { from_id } else { to_id };
                                let component = connected_component_excluding_bond(mol, bond_id, start_atom);
                                mol.deselect_all();
                                for a in mol.atoms.iter_mut() {
                                    if component.contains(&a.id) {
                                        a.selected = true;
                                    }
                                }
                                // Select bonds fully inside the component
                                for b in mol.bonds.iter_mut() {
                                    if component.contains(&b.from) && component.contains(&b.to) {
                                        b.selected = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Tool::Pan => { /* handled above */ }

            _ => {
                // Atom tools:
                //   - drag on existing atom  → move (like Select)
                //   - click on existing atom → change element
                //   - click on empty space   → place atom
                if let Some(pointer) = pointer_opt {
                    let world = state.screen_to_world(pointer);

                    // ── Drag-to-move: grab existing atom ──
                    if resp.drag_started_by(egui::PointerButton::Primary) {
                        if let Some(id) = mol.atom_at(world, ATOM_RADIUS * 2.0) {
                            push_undo(undo, redo, mol);
                            if !mol.atoms.iter().any(|a| a.id == id && a.selected) {
                                mol.deselect_all();
                                if let Some(a) = mol.atoms.iter_mut().find(|a| a.id == id) {
                                    a.selected = true;
                                }
                            }
                            state.dragging_atom = Some(id);
                            state.drag_start_screen = Some(pointer);
                            state.drag_confirmed = false;
                        }
                    }

                    if resp.dragged_by(egui::PointerButton::Primary) {
                        if state.dragging_atom.is_some() {
                            // 4px threshold before confirming move
                            if !state.drag_confirmed {
                                if let Some(start) = state.drag_start_screen {
                                    if (pointer - start).length() > DRAG_THRESHOLD_PX {
                                        state.drag_confirmed = true;
                                    }
                                }
                            }
                            if state.drag_confirmed {
                                let delta = resp.drag_delta() / state.zoom;
                                for a in mol.atoms.iter_mut().filter(|a| a.selected) {
                                    a.pos += delta;
                                }
                            }
                        }
                    }

                    if resp.drag_stopped_by(egui::PointerButton::Primary) {
                        state.dragging_atom = None;
                        state.drag_start_screen = None;
                        state.drag_confirmed = false;
                    }

                    // ── Click only: place or change element ──
                    if resp.clicked_by(egui::PointerButton::Primary) {
                        if let Some(element) = tool_element(active_tool) {
                            push_undo(undo, redo, mol);
                            if let Some(id) = mol.atom_at(world, ATOM_RADIUS * 2.0) {
                                if let Some(a) = mol.atoms.iter_mut().find(|a| a.id == id) {
                                    a.element = element.to_string();
                                }
                            } else {
                                mol.add_atom(element, world);
                            }
                        }
                    }
                } else {
                    state.dragging_atom = None;
                }
            }
        }

        // ── Right-click context menu ──────────────────────────────────────────
        if let Some(pointer) = resp.interact_pointer_pos() {
            if resp.secondary_clicked() {
                let world = state.screen_to_world(pointer);
                let target = if let Some(id) = mol.atom_at(world, ATOM_RADIUS * 2.0) {
                    ContextTarget::Atom(id)
                } else if let Some(bid) = bond_at(mol, world, state, 8.0) {
                    ContextTarget::Bond(bid)
                } else {
                    ContextTarget::Canvas
                };
                state.context_target = Some(target);
                state.context_pos = Some(pointer);
            }
        }
        // Close context menu when clicking elsewhere
        if resp.clicked_by(egui::PointerButton::Primary) {
            state.context_target = None;
        }
        if let (Some(target), Some(pos)) = (state.context_target.clone(), state.context_pos) {
            let mut close = false;
            egui::Area::new(egui::Id::new("ctx_menu"))
                .fixed_pos(pos)
                .order(egui::Order::Foreground)
                .show(ui.ctx(), |ui| {
                    egui::Frame::popup(ui.style()).show(ui, |ui| {
                        ui.set_min_width(140.0);
                        match &target {
                            ContextTarget::Atom(id) => {
                                let id = *id;
                                ui.label(egui::RichText::new("Atom").small().color(tokens.separator));
                                if ui.button("Delete atom").clicked() {
                                    push_undo(undo, redo, mol);
                                    mol.remove_atom(id);
                                    close = true;
                                }
                                if ui.button("Select").clicked() {
                                    mol.deselect_all();
                                    if let Some(a) = mol.atoms.iter_mut().find(|a| a.id == id) { a.selected = true; }
                                    close = true;
                                }
                                ui.separator();
                                ui.horizontal(|ui| {
                                    if ui.small_button("C").clicked() { if let Some(a) = mol.atoms.iter_mut().find(|a| a.id == id) { a.element = "C".into(); } close = true; }
                                    if ui.small_button("N").clicked() { if let Some(a) = mol.atoms.iter_mut().find(|a| a.id == id) { a.element = "N".into(); } close = true; }
                                    if ui.small_button("O").clicked() { if let Some(a) = mol.atoms.iter_mut().find(|a| a.id == id) { a.element = "O".into(); } close = true; }
                                    if ui.small_button("S").clicked() { if let Some(a) = mol.atoms.iter_mut().find(|a| a.id == id) { a.element = "S".into(); } close = true; }
                                });
                            }
                            ContextTarget::Bond(bid) => {
                                let bid = *bid;
                                ui.label(egui::RichText::new("Bond").small().color(tokens.separator));
                                if ui.button("Delete bond").clicked() {
                                    push_undo(undo, redo, mol);
                                    mol.remove_bond(bid);
                                    close = true;
                                }
                                if ui.button("Single  —").clicked() {
                                    push_undo(undo, redo, mol);
                                    if let Some(b) = mol.bonds.iter_mut().find(|b| b.id == bid) { b.order = BondOrder::Single; b.stereo = BondStereo::None; }
                                    close = true;
                                }
                                if ui.button("Double  =").clicked() {
                                    push_undo(undo, redo, mol);
                                    if let Some(b) = mol.bonds.iter_mut().find(|b| b.id == bid) { b.order = BondOrder::Double; b.stereo = BondStereo::None; }
                                    close = true;
                                }
                                if ui.button("Triple  ≡").clicked() {
                                    push_undo(undo, redo, mol);
                                    if let Some(b) = mol.bonds.iter_mut().find(|b| b.id == bid) { b.order = BondOrder::Triple; b.stereo = BondStereo::None; }
                                    close = true;
                                }
                                if ui.button("Aromatic ⊙").clicked() {
                                    push_undo(undo, redo, mol);
                                    if let Some(b) = mol.bonds.iter_mut().find(|b| b.id == bid) { b.order = BondOrder::Aromatic; b.stereo = BondStereo::None; }
                                    close = true;
                                }
                            }
                            ContextTarget::Canvas => {
                                if ui.button("Select All").clicked() {
                                    for a in &mut mol.atoms { a.selected = true; }
                                    close = true;
                                }
                                if ui.button("Clear All").clicked() {
                                    push_undo(undo, redo, mol);
                                    *mol = CanvasMolecule::default();
                                    close = true;
                                }
                            }
                        }
                    });
                });
            if close { state.context_target = None; }
        }
    }

    fn draw_grid(painter: &Painter, rect: Rect, state: &CanvasState, tokens: &Tokens) {
        let grid_spacing = 40.0 * state.zoom;
        if grid_spacing < 8.0 {
            return;
        }
        let stroke = Stroke::new(0.5, tokens.separator.gamma_multiply(0.5));
        let x0 = (rect.min.x - state.offset.x).rem_euclid(grid_spacing);
        let y0 = (rect.min.y - state.offset.y).rem_euclid(grid_spacing);

        let mut x = rect.min.x + x0 - grid_spacing;
        while x < rect.max.x {
            painter.line_segment([Pos2::new(x, rect.min.y), Pos2::new(x, rect.max.y)], stroke);
            x += grid_spacing;
        }
        let mut y = rect.min.y + y0 - grid_spacing;
        while y < rect.max.y {
            painter.line_segment([Pos2::new(rect.min.x, y), Pos2::new(rect.max.x, y)], stroke);
            y += grid_spacing;
        }
    }

    fn draw_bond_w(
        painter: &Painter,
        p1: Pos2,
        p2: Pos2,
        order: BondOrder,
        stereo: BondStereo,
        color: egui::Color32,
        stroke_width: f32,
    ) {
        let stroke = Stroke::new(stroke_width, color);
        match (order, stereo) {
            (_, BondStereo::WedgeUp) => {
                let dir = (p2 - p1).normalized();
                let perp = Vec2::new(-dir.y, dir.x);
                let w = DOUBLE_BOND_OFFSET * 2.0;
                painter.add(egui::Shape::convex_polygon(
                    vec![p1, p2 + perp * w, p2 - perp * w],
                    color,
                    Stroke::NONE,
                ));
            }
            (_, BondStereo::WedgeDown) => {
                // Dashed wedge — draw several short lines
                let steps = 8;
                let dir = (p2 - p1).normalized();
                let perp = Vec2::new(-dir.y, dir.x);
                let len = p1.distance(p2);
                for i in 0..=steps {
                    let t = i as f32 / steps as f32;
                    let mid = p1 + dir * (len * t);
                    let half = DOUBLE_BOND_OFFSET * t;
                    painter.line_segment([mid - perp * half, mid + perp * half], stroke);
                }
            }
            (BondOrder::Single, BondStereo::None) => {
                painter.line_segment([p1, p2], stroke);
            }
            (BondOrder::Double, BondStereo::None) => {
                let perp = {
                    let d = (p2 - p1).normalized();
                    Vec2::new(-d.y, d.x) * DOUBLE_BOND_OFFSET
                };
                painter.line_segment([p1 + perp, p2 + perp], stroke);
                painter.line_segment([p1 - perp, p2 - perp], stroke);
            }
            (BondOrder::Triple, BondStereo::None) => {
                let perp = {
                    let d = (p2 - p1).normalized();
                    Vec2::new(-d.y, d.x) * DOUBLE_BOND_OFFSET * 1.5
                };
                painter.line_segment([p1, p2], stroke);
                painter.line_segment([p1 + perp, p2 + perp], stroke);
                painter.line_segment([p1 - perp, p2 - perp], stroke);
            }
            (BondOrder::Aromatic, BondStereo::None) => {
                painter.line_segment([p1, p2], stroke);
                // Dotted second line
                let perp = {
                    let d = (p2 - p1).normalized();
                    Vec2::new(-d.y, d.x) * DOUBLE_BOND_OFFSET
                };
                let dashed = Stroke::new(BOND_WIDTH, color.gamma_multiply(0.55));
                let steps = 8;
                let len = p1.distance(p2);
                let dir = (p2 - p1).normalized();
                for i in 0..steps {
                    if i % 2 == 0 {
                        let a = p1 + perp + dir * (len * i as f32 / steps as f32);
                        let b = p1 + perp + dir * (len * (i + 1) as f32 / steps as f32);
                        painter.line_segment([a, b], dashed);
                    }
                }
            }
        }
    }

    fn element_color(elem: &str, tokens: &Tokens) -> egui::Color32 {
        use chematic::core::Element;
        use chematic::depict::atom_color_rgb;
        match elem {
            "C" => tokens.elem_c,
            "H" => tokens.elem_h,
            // R-groups: teal/cyan to distinguish from regular atoms
            e if e == "R" || e.starts_with("R*")
                || (e.starts_with('R') && e[1..].parse::<u8>().is_ok()) =>
            {
                egui::Color32::from_rgb(0x20, 0xC0, 0xA0)
            }
            _ => {
                if let Some(el) = Element::from_symbol(elem) {
                    let [r, g, b] = atom_color_rgb(el.atomic_number());
                    egui::Color32::from_rgb(r, g, b)
                } else {
                    tokens.elem_other
                }
            }
        }
    }
}


fn tool_element(tool: Tool) -> Option<&'static str> {
    match tool {
        Tool::Carbon => Some("C"),
        Tool::Nitrogen => Some("N"),
        Tool::Oxygen => Some("O"),
        Tool::Sulfur => Some("S"),
        Tool::Phosphorus => Some("P"),
        Tool::Fluorine => Some("F"),
        Tool::Chlorine => Some("Cl"),
        Tool::Bromine => Some("Br"),
        Tool::Iodine => Some("I"),
        Tool::Hydrogen => Some("H"),
        Tool::Rgroup => Some("R"),
        _ => None,
    }
}

/// Map a bond Tool variant to (BondOrder, BondStereo).
fn bond_order_from_tool(tool: Tool) -> (BondOrder, BondStereo) {
    match tool {
        Tool::Double   => (BondOrder::Double,   BondStereo::None),
        Tool::Triple   => (BondOrder::Triple,   BondStereo::None),
        Tool::Aromatic => (BondOrder::Aromatic, BondStereo::None),
        Tool::WedgeUp  => (BondOrder::Single,   BondStereo::WedgeUp),
        Tool::WedgeDown => (BondOrder::Single,  BondStereo::WedgeDown),
        _              => (BondOrder::Single,   BondStereo::None),
    }
}

/// Find the bond closest to a world-space point, within `tolerance` screen pixels.
fn bond_at(mol: &CanvasMolecule, world: Pos2, state: &CanvasState, tol_screen: f32) -> Option<usize> {
    let tol = tol_screen / state.zoom;
    mol.bonds.iter().find(|b| {
        let Some(a1) = mol.atoms.iter().find(|a| a.id == b.from) else { return false };
        let Some(a2) = mol.atoms.iter().find(|a| a.id == b.to)   else { return false };
        point_segment_dist(world, a1.pos, a2.pos) < tol
    }).map(|b| b.id)
}

fn point_segment_dist(p: Pos2, a: Pos2, b: Pos2) -> f32 {
    let ab = b - a;
    let len2 = ab.length_sq();
    if len2 < 1e-6 {
        return p.distance(a);
    }
    let t = ((p - a).dot(ab) / len2).clamp(0.0, 1.0);
    p.distance(a + ab * t)
}

/// Calculate a sensible endpoint for a new bond from `from_id`.
/// Uses the average angle of existing bonds to pick an uncrowded direction.
fn default_bond_endpoint(mol: &CanvasMolecule, from_id: usize) -> Pos2 {
    let Some(from) = mol.atoms.iter().find(|a| a.id == from_id) else {
        return Pos2::new(0.0, 0.0);
    };
    let existing_angles: Vec<f32> = mol
        .bonds
        .iter()
        .filter(|b| b.from == from_id || b.to == from_id)
        .filter_map(|b| {
            let other_id = if b.from == from_id { b.to } else { b.from };
            mol.atoms.iter().find(|a| a.id == other_id).map(|a| {
                let d = a.pos - from.pos;
                d.y.atan2(d.x)
            })
        })
        .collect();

    // Try 30°-increment angles; pick the one farthest from all existing bonds.
    let bond_len = 60.0f32;
    let candidate = (0..12)
        .map(|i| i as f32 * std::f32::consts::TAU / 12.0)
        .max_by(|&a, &b| {
            let min_a = existing_angles.iter().map(|&e| (a - e).abs().min(std::f32::consts::TAU - (a - e).abs())).fold(f32::MAX, f32::min);
            let min_b = existing_angles.iter().map(|&e| (b - e).abs().min(std::f32::consts::TAU - (b - e).abs())).fold(f32::MAX, f32::min);
            min_a.partial_cmp(&min_b).unwrap_or(std::cmp::Ordering::Equal)
        })
        .unwrap_or(0.0);

    from.pos + egui::Vec2::new(candidate.cos(), candidate.sin()) * bond_len
}

/// Snap `cursor_world` to the nearest 15° bond angle from `anchor_pos`.
/// Uses existing bond directions at anchor as reference angles.
/// Returns `cursor_world` unchanged when `alt_held` or `ctrl_held`.
fn snap_bond_angle(
    anchor_pos: Pos2,
    cursor_world: Pos2,
    mol: &CanvasMolecule,
    anchor_id: usize,
    alt_held: bool,
    ctrl_held: bool,
) -> Pos2 {
    if alt_held || ctrl_held {
        return cursor_world;
    }
    let dir = cursor_world - anchor_pos;
    let len = dir.length();
    if len < 1.0 {
        return cursor_world;
    }
    let input_angle = dir.y.atan2(dir.x);
    let snap_rad = BOND_ANGLE_SNAP_DEG.to_radians();

    // Collect existing bond directions from anchor
    let base_angles: Vec<f32> = mol
        .bonds
        .iter()
        .filter(|b| b.from == anchor_id || b.to == anchor_id)
        .filter_map(|b| {
            let other_id = if b.from == anchor_id { b.to } else { b.from };
            mol.atoms.iter().find(|a| a.id == other_id).map(|a| {
                let d = a.pos - anchor_pos;
                d.y.atan2(d.x)
            })
        })
        .collect();

    // If no existing bonds, use 0° as reference
    let bases = if base_angles.is_empty() {
        vec![0.0f32]
    } else {
        base_angles
    };

    // Pick the snapped angle closest to input_angle across all bases
    let mut best_angle = input_angle;
    let mut best_diff = f32::MAX;
    for base in &bases {
        let k = ((input_angle - base) / snap_rad).round();
        let snapped = base + k * snap_rad;
        let diff = (input_angle - snapped).abs();
        if diff < best_diff {
            best_diff = diff;
            best_angle = snapped;
        }
    }

    anchor_pos + egui::Vec2::new(best_angle.cos(), best_angle.sin()) * len
}

/// Public wrapper for keyboard-triggered ring annelation from app.rs.
pub fn place_ring_on_bond_pub(mol: &mut CanvasMolecule, bond_id: usize, n: usize, order: BondOrder) {
    place_ring_on_bond(mol, bond_id, n, order);
}

/// Fuse a regular n-gon ring onto an existing bond.
/// The existing bond becomes one edge of the new ring; vertices are placed on the
/// left-perpendicular side of the bond (from → to direction).
fn place_ring_on_bond(mol: &mut CanvasMolecule, bond_id: usize, n: usize, order: BondOrder) {
    let (bond_from, bond_to, from_pos, to_pos) = {
        let Some(bond) = mol.bonds.iter().find(|b| b.id == bond_id) else { return };
        let Some(fa) = mol.atoms.iter().find(|a| a.id == bond.from) else { return };
        let Some(ta) = mol.atoms.iter().find(|a| a.id == bond.to) else { return };
        (bond.from, bond.to, fa.pos, ta.pos)
    };

    let bond_vec = to_pos - from_pos;
    let l = bond_vec.length();
    if l < 1.0 { return; }

    // Circumradius and apothem of a regular n-gon with edge length l
    let circumradius = l / (2.0 * (std::f32::consts::PI / n as f32).sin());
    let apothem = l / (2.0 * (std::f32::consts::PI / n as f32).tan());

    let mid = Pos2::new((from_pos.x + to_pos.x) / 2.0, (from_pos.y + to_pos.y) / 2.0);
    // Left-perpendicular of bond A→B: rotate 90° CCW → (-y, x)/l
    let norm = Vec2::new(-bond_vec.y / l, bond_vec.x / l);
    let center = mid + norm * apothem;

    // Angle from center to bond_to (starting vertex)
    let angle_to = (to_pos - center).y.atan2((to_pos - center).x);
    let angle_step = std::f32::consts::TAU / n as f32;

    // Vertices: [bond_to, v1, v2, ..., v_{n-2}, bond_from]
    // Going counterclockwise (increasing angle) from bond_to
    let mut ids: Vec<usize> = vec![bond_to];
    for i in 1..(n - 1) {
        let theta = angle_to + angle_step * i as f32;
        let pos = center + Vec2::new(theta.cos(), theta.sin()) * circumradius;
        let id = mol
            .atom_at(pos, ATOM_RADIUS * 2.0)
            .unwrap_or_else(|| mol.add_atom("C", pos));
        ids.push(id);
    }
    ids.push(bond_from);

    // Add bonds for all edges except the shared from↔to bond
    for i in 0..n {
        let a = ids[i];
        let b = ids[(i + 1) % n];
        let is_shared = (a == bond_from && b == bond_to) || (a == bond_to && b == bond_from);
        if is_shared { continue; }
        let exists = mol.bonds.iter().any(|bnd| {
            (bnd.from == a && bnd.to == b) || (bnd.from == b && bnd.to == a)
        });
        if !exists {
            mol.add_bond(a, b, order, BondStereo::None);
        }
    }
}

/// BFS to find all atoms reachable from `start_atom` without crossing `bond_id`.
fn connected_component_excluding_bond(
    mol: &CanvasMolecule,
    bond_id: usize,
    start_atom: usize,
) -> Vec<usize> {
    let mut visited = std::collections::HashSet::new();
    let mut queue = std::collections::VecDeque::new();
    queue.push_back(start_atom);
    visited.insert(start_atom);
    while let Some(current) = queue.pop_front() {
        for bond in &mol.bonds {
            if bond.id == bond_id { continue; }
            let neighbor = if bond.from == current {
                Some(bond.to)
            } else if bond.to == current {
                Some(bond.from)
            } else {
                None
            };
            if let Some(n) = neighbor {
                if visited.insert(n) {
                    queue.push_back(n);
                }
            }
        }
    }
    visited.into_iter().collect()
}

/// Compute the world-space center for the ring ghost when hovering over `bond_id`.
/// Mirrors the geometry of `place_ring_on_bond`.
fn ring_ghost_center_for_bond(mol: &CanvasMolecule, bond_id: usize, n: usize) -> Option<Pos2> {
    let bond = mol.bonds.iter().find(|b| b.id == bond_id)?;
    let fa = mol.atoms.iter().find(|a| a.id == bond.from)?;
    let ta = mol.atoms.iter().find(|a| a.id == bond.to)?;
    let bond_vec = ta.pos - fa.pos;
    let l = bond_vec.length();
    if l < 1.0 { return None; }
    let apothem = l / (2.0 * (std::f32::consts::PI / n as f32).tan());
    let mid = Pos2::new((fa.pos.x + ta.pos.x) / 2.0, (fa.pos.y + ta.pos.y) / 2.0);
    let norm = Vec2::new(-bond_vec.y / l, bond_vec.x / l);
    Some(mid + norm * apothem)
}

/// Place a regular n-sided ring centred at `center`.
/// If an existing atom is within ATOM_RADIUS*2 of a vertex position, that atom is reused (ring fusion).
fn place_ring(mol: &mut CanvasMolecule, center: Pos2, n: usize, radius: f32, order: BondOrder) {
    let mut ids: Vec<usize> = Vec::with_capacity(n);
    for i in 0..n {
        let theta = std::f32::consts::TAU / n as f32 * i as f32 - std::f32::consts::FRAC_PI_2;
        let pos = Pos2::new(
            center.x + radius * theta.cos(),
            center.y + radius * theta.sin(),
        );
        let id = mol
            .atom_at(pos, ATOM_RADIUS * 2.0)
            .unwrap_or_else(|| mol.add_atom("C", pos));
        ids.push(id);
    }
    for i in 0..n {
        let a = ids[i];
        let b = ids[(i + 1) % n];
        let exists = mol.bonds.iter().any(|b_| {
            (b_.from == a && b_.to == b) || (b_.from == b && b_.to == a)
        });
        if !exists {
            mol.add_bond(a, b, order, BondStereo::None);
        }
    }
}
