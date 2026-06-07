use egui::Context;

use crate::canvas::CanvasMolecule;
use crate::export::{canvas_to_cml, canvas_to_mol, canvas_to_mol_v3000, canvas_to_sdf, canvas_to_canonical_smiles, canvas_to_svg};
use crate::reaction::ReactionScheme;
use crate::i18n::{I18n, Language};
use crate::paste::paste_from_clipboard;
use crate::theme::{apply as apply_theme, Theme};

pub struct MenuActions {
    pub request_open:     bool,
    pub request_save:     bool,
    pub request_new:      bool,
    pub request_quit:     bool,
    pub request_3d:       bool,
    pub request_undo:     bool,
    pub request_redo:     bool,
    pub request_clean:    bool,
    pub request_flip_h:   bool,
    pub request_flip_v:   bool,
    pub request_rotate90: bool,
    pub request_fit:      bool,
    pub request_templates: bool,
    pub request_chat:      bool,
    pub request_settings:  bool,
    pub request_about:     bool,
    pub request_palette:   bool,
    pub request_undo_history: bool,
    pub request_focus_mode: bool,
    pub request_key_ref:   bool,
    pub request_pubchem:   bool,
    pub paste_error:      Option<String>,
}

impl Default for MenuActions {
    fn default() -> Self {
        Self {
            request_open:     false,
            request_save:     false,
            request_new:      false,
            request_quit:     false,
            request_3d:       false,
            request_undo:     false,
            request_redo:     false,
            request_clean:    false,
            request_flip_h:   false,
            request_flip_v:   false,
            request_rotate90: false,
            request_fit:      false,
            request_templates: false,
            request_chat:      false,
            request_settings:  false,
            request_about:     false,
            request_palette:   false,
            request_undo_history: false,
            request_focus_mode: false,
            request_key_ref:   false,
            request_pubchem:   false,
            paste_error:      None,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TopMenu {
    File,
    Edit,
    View,
    Language,
    Help,
}

pub struct MenuBar;

#[allow(deprecated)]
impl MenuBar {
    pub fn show(
        ctx: &Context,
        mol: &mut CanvasMolecule,
        reaction: &ReactionScheme,
        theme: &mut Theme,
        i18n: &mut I18n,
        actions: &mut MenuActions,
        active_menu: &mut Option<TopMenu>,
    ) {
        // Global Ctrl+V paste
        let paste_triggered = ctx.input(|i| {
            i.key_pressed(egui::Key::V) && i.modifiers.ctrl
        });
        if paste_triggered {
            let center = ctx.input(|i| i.screen_rect()).center();
            match paste_from_clipboard(center) {
                Ok(new_mol) => *mol = new_mol,
                Err(e) => actions.paste_error = Some(e.to_string()),
            }
        }

        egui::Panel::top("menu_bar").show(ctx, |ui| {
            egui::MenuBar::new().ui(ui, |ui| {
                // ── File ──
                let file_label = i18n.t("menu.file").to_owned();
                Self::hover_menu(ui, active_menu, TopMenu::File, file_label, |ui| {
                    if ui.button(format!("{} (Ctrl+N)", i18n.t("menu.file.new"))).clicked() {
                        actions.request_new = true;
                        ui.close();
                    }
                    if ui.button(format!("{} (Ctrl+O)", i18n.t("menu.file.open"))).clicked() {
                        actions.request_open = true;
                        ui.close();
                    }
                    if ui.button("Import by Name… (PubChem)").clicked() {
                        actions.request_pubchem = true;
                        ui.close();
                    }
                    ui.separator();
                    if ui.button(format!("{} (Ctrl+S)", i18n.t("menu.file.save"))).clicked() {
                        actions.request_save = true;
                        ui.close();
                    }
                    // Export submenu
                    let export_label = i18n.t("menu.file.export").to_owned();
                    ui.menu_button(export_label, |ui| {
                        if ui.button("As SMILES (copy)").clicked() {
                            if let Some(smiles) = canvas_to_canonical_smiles(mol) {
                                ui.ctx().copy_text(smiles.clone());
                                let _ = crate::paste::copy_smiles(&smiles);
                            }
                            ui.close();
                        }
                        if ui.button("As MOL V2000…").clicked() {
                            if let Some(s) = canvas_to_mol(mol) {
                                if let Err(e) = save_text_file("molecule.mol", &s) { actions.paste_error = Some(e); }
                            }
                            ui.close();
                        }
                        if ui.button("As MOL V3000…").clicked() {
                            if let Some(s) = canvas_to_mol_v3000(mol) {
                                if let Err(e) = save_text_file("molecule_v3000.mol", &s) { actions.paste_error = Some(e); }
                            }
                            ui.close();
                        }
                        if ui.button("As SDF…").clicked() {
                            if let Some(s) = canvas_to_sdf(mol) {
                                if let Err(e) = save_text_file("molecules.sdf", &s) { actions.paste_error = Some(e); }
                            }
                            ui.close();
                        }
                        if ui.button("As CML…").clicked() {
                            if let Some(s) = canvas_to_cml(mol) {
                                if let Err(e) = save_text_file("molecule.cml", &s) { actions.paste_error = Some(e); }
                            }
                            ui.close();
                        }
                        if ui.button("As SVG…").clicked() {
                            if let Some(svg) = canvas_to_svg(mol) {
                                if let Err(e) = save_text_file("molecule.svg", &svg) { actions.paste_error = Some(e); }
                            } else {
                                actions.paste_error = Some("Export failed: unknown element symbol.".to_string());
                            }
                            ui.close();
                        }
                        // PNG submenu with resolution options
                        ui.menu_button("As PNG…", |ui| {
                            for (label, scale) in [("1× (72 dpi)", 1.0f32), ("2× (144 dpi)", 2.0), ("4× (288 dpi)", 4.0)] {
                                if ui.button(label).clicked() {
                                    match canvas_to_svg(mol) {
                                        Some(svg) => match chem_io::export_png::svg_to_png_scaled(&svg, scale) {
                                            Ok(png) => { if let Err(e) = save_binary_file("molecule.png", &png) { actions.paste_error = Some(e); } }
                                            Err(e)  => { actions.paste_error = Some(e.to_string()); }
                                        },
                                        None => { actions.paste_error = Some("Export failed: unknown element.".to_string()); }
                                    }
                                    ui.close();
                                }
                            }
                        });
                        // Reaction exports
                        ui.separator();
                        if ui.button("Reaction SVG…").clicked() {
                            if let Some(svg) = crate::reaction::reaction_to_svg(reaction) {
                                if let Err(e) = save_text_file("reaction.svg", &svg) { actions.paste_error = Some(e); }
                            }
                            ui.close();
                        }
                        if ui.button("As RXN file…").clicked() {
                            if let Some(rxn) = crate::reaction::reaction_to_rxn_file(reaction) {
                                if let Err(e) = save_text_file("reaction.rxn", &rxn) { actions.paste_error = Some(e); }
                            }
                            ui.close();
                        }
                        // JPEG submenu
                        ui.menu_button("As JPEG…", |ui| {
                            for (label, scale, quality) in [("Low quality", 1.0f32, 60u8), ("Medium quality", 1.0, 85), ("High quality (2×)", 2.0, 95)] {
                                if ui.button(label).clicked() {
                                    match canvas_to_svg(mol) {
                                        Some(svg) => match chem_io::export_png::svg_to_jpeg(&svg, scale, quality) {
                                            Ok(jpg) => { if let Err(e) = save_binary_file("molecule.jpg", &jpg) { actions.paste_error = Some(e); } }
                                            Err(e)  => { actions.paste_error = Some(e.to_string()); }
                                        },
                                        None => { actions.paste_error = Some("Export failed: unknown element.".to_string()); }
                                    }
                                    ui.close();
                                }
                            }
                        });
                    });
                    ui.separator();
                    if ui.button(i18n.t("menu.file.quit")).clicked() {
                        actions.request_quit = true;
                        ui.close();
                    }
                });

                // ── Edit ──
                let edit_label = i18n.t("menu.edit").to_owned();
                Self::hover_menu(ui, active_menu, TopMenu::Edit, edit_label, |ui| {
                    if ui.button(format!("{} (Ctrl+Z)", i18n.t("menu.edit.undo"))).clicked() {
                        actions.request_undo = true;
                        ui.close();
                    }
                    if ui.button(format!("{} (Ctrl+Shift+Z)", i18n.t("menu.edit.redo"))).clicked() {
                        actions.request_redo = true;
                        ui.close();
                    }
                    ui.separator();
                    if ui.button(format!("{} (Ctrl+V)", i18n.t("menu.edit.paste_smiles"))).clicked() {
                        let center = ui.ctx().input(|i| i.screen_rect()).center();
                        match paste_from_clipboard(center) {
                            Ok(new_mol) => *mol = new_mol,
                            Err(e) => actions.paste_error = Some(e.to_string()),
                        }
                        ui.close();
                    }
                    ui.separator();
                    if ui.button(format!("{} (Ctrl+A)", i18n.t("menu.edit.select_all"))).clicked() {
                        for a in &mut mol.atoms { a.selected = true; }
                        ui.close();
                    }
                    if ui.button(format!("{} (Ctrl+L)", i18n.t("menu.edit.clean"))).clicked() {
                        actions.request_clean = true;
                        ui.close();
                    }
                    ui.separator();
                    if ui.button(i18n.t("menu.edit.flip_h")).clicked() {
                        actions.request_flip_h = true;
                        ui.close();
                    }
                    if ui.button(i18n.t("menu.edit.flip_v")).clicked() {
                        actions.request_flip_v = true;
                        ui.close();
                    }
                    if ui.button(i18n.t("menu.edit.rotate_90")).clicked() {
                        actions.request_rotate90 = true;
                        ui.close();
                    }
                    ui.separator();
                    if ui.button(i18n.t("menu.edit.clear")).clicked() {
                        *mol = CanvasMolecule::default();
                        ui.close();
                    }
                });

                // ── View ──
                let view_label = i18n.t("menu.view").to_owned();
                Self::hover_menu(ui, active_menu, TopMenu::View, view_label, |ui| {
                    if ui.button(i18n.t("menu.view.dark")).clicked() {
                        *theme = Theme::Dark;
                        apply_theme(ctx, *theme);
                        ui.close();
                    }
                    if ui.button(i18n.t("menu.view.light")).clicked() {
                        *theme = Theme::Light;
                        apply_theme(ctx, *theme);
                        ui.close();
                    }
                    ui.separator();
                    if ui.button("Fit to Screen (0)").clicked() {
                        actions.request_fit = true;
                        ui.close();
                    }
                    if ui.button("Templates").clicked() {
                        actions.request_templates = true;
                        ui.close();
                    }
                    if ui.button("AI Chat").clicked() {
                        actions.request_chat = true;
                        ui.close();
                    }
                    ui.separator();
                    if ui.button("Settings…").clicked() {
                        actions.request_settings = true;
                        ui.close();
                    }
                    ui.separator();
                    if ui.button(i18n.t("menu.view.3d")).clicked() {
                        actions.request_3d = true;
                        ui.close();
                    }
                    ui.separator();
                    if ui.button("Focus Mode  (Ctrl+Shift+F)").clicked() {
                        actions.request_focus_mode = true;
                        ui.close();
                    }
                    if ui.button("Keyboard Reference  (Ctrl+Shift+?)").clicked() {
                        actions.request_key_ref = true;
                        ui.close();
                    }
                });

                // ── Language ──
                let lang_label = i18n.t("menu.language").to_owned();
                Self::hover_menu(ui, active_menu, TopMenu::Language, lang_label, |ui| {
                    if ui.button("English").clicked() {
                        i18n.set_language(Language::En);
                        ui.close();
                    }
                    if ui.button("日本語").clicked() {
                        i18n.set_language(Language::Ja);
                        ui.close();
                    }
                });

                // ── Help ──
                let help_label = i18n.t("menu.help").to_owned();
                Self::hover_menu(ui, active_menu, TopMenu::Help, help_label, |ui| {
                    if ui.button(i18n.t("menu.help.about")).clicked() {
                        actions.request_about = true;
                        ui.close();
                    }
                });
            });
        });

        // Paste error toast
        if let Some(err) = &actions.paste_error.clone() {
            egui::Window::new("Error")
                .collapsible(false)
                .resizable(false)
                .show(ctx, |ui| {
                    ui.colored_label(egui::Color32::RED, err);
                    if ui.button("OK").clicked() {
                        actions.paste_error = None;
                    }
                });
        }
    }

    fn hover_menu<R>(
        ui: &mut egui::Ui,
        active_menu: &mut Option<TopMenu>,
        menu: TopMenu,
        label: String,
        add_contents: impl FnOnce(&mut egui::Ui) -> R,
    ) -> Option<egui::InnerResponse<R>> {
        let response = ui.add(egui::Button::new(label).frame(false));
        if response.hovered() || response.clicked() {
            *active_menu = Some(menu);
            ui.ctx().request_repaint();
        }

        let is_open = *active_menu == Some(menu);
        let popup = egui::Popup::from_response(&response)
            .id(response.id.with("hover_menu"))
            .open(is_open)
            .kind(egui::PopupKind::Menu)
            .layout(egui::Layout::top_down_justified(egui::Align::Min))
            .show(add_contents);

        let popup_hovered = popup
            .as_ref()
            .is_some_and(|inner| inner.response.hovered());
        let popup_requested_close = popup
            .as_ref()
            .is_some_and(|inner| inner.response.should_close());
        let close_on_escape = ui.input(|i| i.key_pressed(egui::Key::Escape));
        let clicked_outside = response.clicked_elsewhere() && !popup_hovered;
        if is_open && (popup_requested_close || close_on_escape || clicked_outside) {
            *active_menu = None;
        }

        popup
    }
}

/// Save text to a file using a native save dialog. Returns Err if write fails (not if cancelled).
fn save_text_file(suggested: &str, content: &str) -> Result<bool, String> {
    let Some(path) = rfd::FileDialog::new().set_file_name(suggested).save_file() else {
        return Ok(false); // cancelled
    };
    std::fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(true)
}

fn save_binary_file(suggested: &str, data: &[u8]) -> Result<bool, String> {
    let Some(path) = rfd::FileDialog::new().set_file_name(suggested).save_file() else {
        return Ok(false);
    };
    std::fs::write(&path, data).map_err(|e| e.to_string())?;
    Ok(true)
}

/// Open a chemical file using a native file dialog. Returns the file contents or None.
pub fn open_file_dialog() -> Option<(String, String)> {
    let path = rfd::FileDialog::new()
        .add_filter("Chemical files", &["mol", "sdf", "cml", "cdxml", "smiles", "rxn", "txt"])
        .pick_file()?;
    let content = std::fs::read_to_string(&path).ok()?;
    let filename = path.file_name()?.to_string_lossy().into_owned();
    Some((filename, content))
}
