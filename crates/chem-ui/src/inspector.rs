use egui::Ui;

use crate::bridge::canvas_to_chem;
use crate::canvas::{BondOrder, BondStereo, CanvasMolecule};
use crate::export::canvas_to_canonical_smiles;
use crate::export::canvas_to_smiles;
use crate::i18n::I18n;
use crate::iupac::IupacState;
use crate::theme::{Tokens, SPACING_SM};

pub struct Inspector;

impl Inspector {
    /// Returns `Some(new_molecule)` when the user commits an edited SMILES.
    pub fn show(
        ui: &mut Ui,
        mol: &mut CanvasMolecule,
        iupac: &mut IupacState,
        tokens: &Tokens,
        i18n: &I18n,
        smarts_buf: &mut String,
        smiles_edit: &mut Option<String>,
        smiles_edit_error: &mut bool,
    ) -> Option<CanvasMolecule> {
        let mut result: Option<CanvasMolecule> = None;
        let selected_atoms: Vec<usize> =
            mol.atoms.iter().filter(|a| a.selected).map(|a| a.id).collect();
        let selected_bonds: Vec<usize> =
            mol.bonds.iter().filter(|b| b.selected).map(|b| b.id).collect();

        // Inspector header — compact macOS style
        ui.add_space(8.0);
        ui.horizontal(|ui| {
            ui.label(
                egui::RichText::new(i18n.t("inspector.title").to_uppercase())
                    .size(13.0)
                    .strong()
                    .color(tokens.sidebar_title)
            );
        });
        ui.add_space(6.0);
        ui.separator();
        ui.add_space(6.0);

        // ── Molecule summary ──
        if selected_atoms.is_empty() && selected_bonds.is_empty() {
            ui.add_space(4.0);
            // Section label — small caps style
            ui.label(
                egui::RichText::new(i18n.t("inspector.molecule").to_uppercase())
                    .size(10.0)
                    .strong()
                    .color(tokens.sidebar_title.gamma_multiply(0.62))
            );
            ui.add_space(4.0);

            let chem_mol_opt = canvas_to_chem(mol);

            let formula = chem_mol_opt.as_ref()
                .map(|m| {
                    let f = m.total_formula();
                    if f.is_empty() { "—".to_string() } else { f }
                })
                .unwrap_or_else(|| molecule_formula(mol));

            // Property rows — compact 2-column layout
            Self::prop_row(ui, tokens, i18n.t("inspector.formula"), &formula);
            Self::prop_row(ui, tokens, i18n.t("inspector.atoms"), &mol.atoms.len().to_string());
            Self::prop_row(ui, tokens, i18n.t("inspector.bonds"), &mol.bonds.len().to_string());

            if let Some(ref chem_mol) = chem_mol_opt {
                // Valence validation
                let valence_errors = chematic::perception::validate_valence(chem_mol);
                for e in &valence_errors {
                    ui.colored_label(
                        tokens.error,
                        format!("⚠ Valence error: atom #{} has {} bonds (allowed: {:?})",
                            e.atom.0, e.actual, e.allowed),
                    );
                }

                let mw = chematic::chem::molecular_weight(chem_mol);
                Self::prop_row(ui, tokens, i18n.t("inspector.mw"), &format!("{:.3} g/mol", mw));

                // Physicochemical properties (collapsed by default)
                ui.add_space(SPACING_SM);
                egui::CollapsingHeader::new(
                    egui::RichText::new(i18n.t("inspector.properties"))
                        .small()
                        .color(tokens.sidebar_title.gamma_multiply(0.66))
                )
                .default_open(false)
                .show(ui, |ui| {
                    let logp = chematic::chem::logp_crippen(chem_mol);
                    ui.label(format!("LogP: {:.2}", logp));
                    let tpsa = chematic::chem::tpsa(chem_mol);
                    ui.label(format!("TPSA: {:.1} Å²", tpsa));
                    let rot = chematic::chem::rotatable_bond_count(chem_mol);
                    ui.label(format!("{}: {}", i18n.t("inspector.rot_bonds"), rot));
                    let hba = chematic::chem::hba_count(chem_mol);
                    let hbd = chematic::chem::hbd_count(chem_mol);
                    ui.label(format!("HBA: {}  HBD: {}", hba, hbd));
                    let lipinski = chematic::chem::lipinski_passes(chem_mol);
                    ui.label(format!("Lipinski: {}", if lipinski { "✓" } else { "✗" }));
                });
            }

            ui.add_space(SPACING_SM);

            // SMILES — editable on click (§5)
            let current_smiles = canvas_to_canonical_smiles(mol);
            ui.label(egui::RichText::new("SMILES").small().color(tokens.sidebar_title.gamma_multiply(0.66)));
            if let Some(buf) = smiles_edit {
                // Editing mode
                let border_color = if *smiles_edit_error { tokens.error } else { tokens.accent };
                let resp = ui.add(
                    egui::TextEdit::singleline(buf)
                        .desired_width(f32::INFINITY)
                        .text_color(if *smiles_edit_error { tokens.error } else { tokens.sidebar_title })
                );
                if *smiles_edit_error {
                    ui.colored_label(tokens.error, "Invalid SMILES");
                }
                // Frame highlight
                ui.painter().rect_stroke(
                    resp.rect,
                    2.0,
                    egui::Stroke::new(1.5, border_color),
                    egui::StrokeKind::Outside,
                );
                // Commit on Enter
                if resp.lost_focus() && ui.input(|i| i.key_pressed(egui::Key::Enter)) {
                    let smiles_str = buf.trim().to_string();
                    let center = egui::Pos2::new(200.0, 200.0); // approximate
                    match crate::paste::parse_any(&smiles_str, center) {
                        Ok(new_mol) => {
                            result = Some(new_mol);
                            *smiles_edit = None;
                            *smiles_edit_error = false;
                        }
                        Err(_) => {
                            *smiles_edit_error = true;
                        }
                    }
                }
                // Cancel on Escape
                if ui.input(|i| i.key_pressed(egui::Key::Escape)) {
                    *smiles_edit = None;
                    *smiles_edit_error = false;
                }
            } else {
                // Read-only display (clickable to enter edit mode)
                let display = current_smiles.clone().unwrap_or_else(|| "—".to_string());
                let resp = ui.add(
                    egui::TextEdit::singleline(&mut display.clone())
                        .desired_width(f32::INFINITY)
                        .interactive(false)
                );
                if resp.clicked() {
                    *smiles_edit = Some(current_smiles.clone().unwrap_or_default());
                    *smiles_edit_error = false;
                }
                resp.on_hover_text("Click to edit SMILES");
                if let Some(ref smiles) = current_smiles {
                    if ui.small_button(i18n.t("inspector.copy_smiles")).clicked() {
                        let _ = crate::paste::copy_smiles(smiles);
                        ui.ctx().copy_text(smiles.clone());
                    }
                }
            }

            ui.add_space(SPACING_SM);

            // IUPAC name (offline, via chematic::iupac)
            ui.label(egui::RichText::new("IUPAC").small().color(tokens.sidebar_title.gamma_multiply(0.66)));
            match &iupac.status {
                crate::iupac::IupacStatus::Idle => {
                    if ui.button(i18n.t("inspector.fetch_iupac")).clicked() {
                        if let (Some(chem_mol), Some(smiles)) =
                            (&chem_mol_opt, canvas_to_smiles(mol))
                        {
                            iupac.compute(chem_mol, &smiles);
                        }
                    }
                }
                crate::iupac::IupacStatus::Done(name) => {
                    let name = name.clone();
                    ui.label(&name);
                    if ui.small_button("↺").on_hover_text("Recompute").clicked() {
                        iupac.reset();
                    }
                }
                crate::iupac::IupacStatus::NotSupported => {
                    ui.colored_label(tokens.sidebar_title.gamma_multiply(0.60), "— (structure not supported)");
                    if ui.small_button("↺").clicked() { iupac.reset(); }
                }
                crate::iupac::IupacStatus::Error(e) => {
                    let e = e.clone();
                    ui.colored_label(tokens.error, format!("⚠ {e}"));
                    if ui.small_button("↺").clicked() { iupac.reset(); }
                }
            }

            // ── SMARTS search ──
            ui.add_space(8.0);
            ui.separator();
            ui.add_space(6.0);
            ui.label(egui::RichText::new(i18n.t("inspector.smarts_search")).small().color(tokens.sidebar_title.gamma_multiply(0.66)));
            ui.horizontal(|ui| {
                ui.add(egui::TextEdit::singleline(smarts_buf)
                    .hint_text("e.g. c1ccccc1")
                    .desired_width(f32::INFINITY));
            });
            if ui.button(i18n.t("inspector.smarts_find")).clicked() && !smarts_buf.is_empty() {
                run_smarts_search(mol, smarts_buf, tokens);
            }
        }

        // ── Atom editor ──
        if selected_atoms.len() == 1 {
            let atom_id = selected_atoms[0];
            ui.add_space(8.0);
            ui.separator();
            ui.add_space(6.0);
            ui.label(
                egui::RichText::new(i18n.t("inspector.atom").to_uppercase())
                    .size(10.0)
                    .strong()
                    .color(tokens.sidebar_title.gamma_multiply(0.62))
            );
            ui.add_space(4.0);

            if let Some(atom) = mol.atoms.iter_mut().find(|a| a.id == atom_id) {
                ui.horizontal(|ui| {
                    ui.label(i18n.t("inspector.element"));
                    ui.text_edit_singleline(&mut atom.element);
                });
                ui.horizontal(|ui| {
                    ui.label(i18n.t("inspector.charge"));
                    let mut charge = atom.charge as i32;
                    ui.add(egui::DragValue::new(&mut charge).range(-8..=8));
                    atom.charge = charge as i8;
                });
                ui.horizontal(|ui| {
                    ui.label(i18n.t("inspector.atom_map"));
                    let mut map = atom.atom_map as i32;
                    ui.add(egui::DragValue::new(&mut map).range(0..=999));
                    atom.atom_map = map as u16;
                });
                ui.label(format!(
                    "{}: ({:.1}, {:.1})",
                    i18n.t("inspector.position"), atom.pos.x, atom.pos.y
                ));
            }
        }

        // ── Multiple selection info ──
        if selected_atoms.len() >= 2 {
            ui.add_space(SPACING_SM);
            ui.label(egui::RichText::new(
                format!("{} atoms selected", selected_atoms.len())
            ).small().color(tokens.accent));
            ui.horizontal(|ui| {
                if ui.small_button("⫤L").on_hover_text("Align Left").clicked() {
                    let min_x = mol.atoms.iter().filter(|a| a.selected).map(|a| a.pos.x).fold(f32::MAX, f32::min);
                    for a in mol.atoms.iter_mut().filter(|a| a.selected) { a.pos.x = min_x; }
                }
                if ui.small_button("⫡C").on_hover_text("Center Horizontal").clicked() {
                    let xs: Vec<f32> = mol.atoms.iter().filter(|a| a.selected).map(|a| a.pos.x).collect();
                    let cx = xs.iter().sum::<f32>() / xs.len() as f32;
                    for a in mol.atoms.iter_mut().filter(|a| a.selected) { a.pos.x = cx; }
                }
                if ui.small_button("⊣R").on_hover_text("Align Right").clicked() {
                    let max_x = mol.atoms.iter().filter(|a| a.selected).map(|a| a.pos.x).fold(f32::MIN, f32::max);
                    for a in mol.atoms.iter_mut().filter(|a| a.selected) { a.pos.x = max_x; }
                }
                ui.add_space(2.0);
                ui.separator();
                ui.add_space(2.0);
                if ui.small_button("⊤T").on_hover_text("Align Top").clicked() {
                    let min_y = mol.atoms.iter().filter(|a| a.selected).map(|a| a.pos.y).fold(f32::MAX, f32::min);
                    for a in mol.atoms.iter_mut().filter(|a| a.selected) { a.pos.y = min_y; }
                }
                if ui.small_button("⊥M").on_hover_text("Center Vertical").clicked() {
                    let ys: Vec<f32> = mol.atoms.iter().filter(|a| a.selected).map(|a| a.pos.y).collect();
                    let cy = ys.iter().sum::<f32>() / ys.len() as f32;
                    for a in mol.atoms.iter_mut().filter(|a| a.selected) { a.pos.y = cy; }
                }
                if ui.small_button("⊥B").on_hover_text("Align Bottom").clicked() {
                    let max_y = mol.atoms.iter().filter(|a| a.selected).map(|a| a.pos.y).fold(f32::MIN, f32::max);
                    for a in mol.atoms.iter_mut().filter(|a| a.selected) { a.pos.y = max_y; }
                }
            });
        }

        // ── Bond editor ──
        if selected_bonds.len() == 1 {
            let bond_id = selected_bonds[0];
            ui.add_space(SPACING_SM);
            ui.label(egui::RichText::new(i18n.t("inspector.bond")).strong().color(tokens.sidebar_title));
            ui.add_space(SPACING_SM);

            if let Some(bond) = mol.bonds.iter_mut().find(|b| b.id == bond_id) {
                ui.horizontal(|ui| {
                    ui.label(i18n.t("inspector.bond_order"));
                    egui::ComboBox::from_id_salt("bond_order")
                        .selected_text(bond_order_label(bond.order))
                        .show_ui(ui, |ui| {
                            ui.selectable_value(&mut bond.order, BondOrder::Single,   "Single");
                            ui.selectable_value(&mut bond.order, BondOrder::Double,   "Double");
                            ui.selectable_value(&mut bond.order, BondOrder::Triple,   "Triple");
                            ui.selectable_value(&mut bond.order, BondOrder::Aromatic, "Aromatic");
                        });
                });
                ui.horizontal(|ui| {
                    ui.label(i18n.t("inspector.stereo"));
                    egui::ComboBox::from_id_salt("bond_stereo")
                        .selected_text(bond_stereo_label(bond.stereo))
                        .show_ui(ui, |ui| {
                            ui.selectable_value(&mut bond.stereo, BondStereo::None,      "None");
                            ui.selectable_value(&mut bond.stereo, BondStereo::WedgeUp,   "Wedge Up (▲)");
                            ui.selectable_value(&mut bond.stereo, BondStereo::WedgeDown, "Wedge Down (▽)");
                        });
                });
            }
        }

        result
    }

    /// Compact 2-column property row: label (dim) + value.
    fn prop_row(ui: &mut Ui, tokens: &Tokens, label: &str, value: &str) {
        ui.horizontal(|ui| {
            ui.label(
                egui::RichText::new(label)
                    .size(12.0)
                    .color(tokens.sidebar_title.gamma_multiply(0.62))
            );
            ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                ui.add_space(4.0);  // Right padding before value
                ui.label(
                    egui::RichText::new(value)
                        .size(12.0)
                        .color(tokens.sidebar_title)
                );
            });
        });
        ui.add_space(2.0);  // Vertical padding between rows
    }
}

/// Run a SMARTS search and select matching atoms in the canvas molecule.
fn run_smarts_search(mol: &mut CanvasMolecule, pattern: &str, _tokens: &Tokens) {
    let Ok(query) = chematic::smarts::parse_smarts(pattern) else { return };
    let Some(chem_mol) = canvas_to_chem(mol) else { return };
    let matches = chematic::smarts::find_matches(&query, &chem_mol);
    mol.deselect_all();
    for hit in &matches {
        for (_, atom_idx) in hit {
            if let Some(a) = mol.atoms.get_mut(atom_idx.0 as usize) {
                a.selected = true;
            }
        }
    }
}

fn molecule_formula(mol: &CanvasMolecule) -> String {
    let mut counts: std::collections::BTreeMap<&str, usize> = Default::default();
    for atom in &mol.atoms {
        *counts.entry(atom.element.as_str()).or_default() += 1;
    }
    let mut formula = String::new();
    for elem in ["C", "H"] {
        if let Some(&n) = counts.get(elem) {
            formula.push_str(elem);
            if n > 1 { formula.push_str(&n.to_string()); }
            counts.remove(elem);
        }
    }
    for (elem, &n) in &counts {
        formula.push_str(elem);
        if n > 1 { formula.push_str(&n.to_string()); }
    }
    if formula.is_empty() { "—".to_string() } else { formula }
}

fn bond_order_label(order: BondOrder) -> &'static str {
    match order {
        BondOrder::Single   => "Single",
        BondOrder::Double   => "Double",
        BondOrder::Triple   => "Triple",
        BondOrder::Aromatic => "Aromatic",
    }
}

fn bond_stereo_label(stereo: BondStereo) -> &'static str {
    match stereo {
        BondStereo::None      => "None",
        BondStereo::WedgeUp   => "Wedge Up",
        BondStereo::WedgeDown => "Wedge Down",
    }
}
