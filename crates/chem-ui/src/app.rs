use eframe::CreationContext;
use egui::CentralPanel;

use crate::ai_chat::{AiChatPanel, AiChatState, ApplyMode, ChatStatus, extract_smiles};
use crate::bridge::clean_layout;
use crate::canvas::{push_undo, CanvasMolecule, CanvasState};
use crate::export::canvas_to_canonical_smiles;
use crate::i18n::{I18n, Language};
use crate::inspector::Inspector;
use crate::iupac::IupacState;
use crate::menu::{open_file_dialog, MenuActions, MenuBar};
use crate::paste::parse_any;
use crate::reaction::{ReactionScheme, ReactionCanvas};
use crate::settings::SettingsPanel;
use crate::templates::TemplatePanel;
use crate::theme::{alpha, apply as apply_theme, Tokens, Theme, INSPECTOR_WIDTH, TOOL_CONTROLS_HEIGHT};
use crate::toolbar::{ActivityPanel, Tool};
use crate::viewer3d::{Viewer3d, Viewer3dState};

/// Which editing mode is active.
#[derive(Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub enum EditorMode {
    Structure,
    Reaction,
}

impl Default for EditorMode {
    fn default() -> Self {
        Self::Structure
    }
}

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(default)]
pub struct ChemDrawApp {
    pub molecule:      CanvasMolecule,
    pub canvas_state:  CanvasState,
    pub active_tool:   Tool,
    pub theme:         Theme,
    pub lang:          Language,
    pub mode:          EditorMode,
    pub reaction:      ReactionScheme,
    /// 3D viewer — not persisted: always starts closed
    #[serde(skip)]
    pub show_3d:       bool,
    pub viewer3d_state: Viewer3dState,
    #[serde(skip)]
    pub iupac:         IupacState,
    #[serde(skip)]
    pub undo_stack:    Vec<CanvasMolecule>,
    #[serde(skip)]
    pub redo_stack:    Vec<CanvasMolecule>,
    /// Cached canvas rect for zoom-fit (updated each frame).
    #[serde(skip)]
    pub canvas_rect:   egui::Rect,
    /// Show template library panel.
    pub show_templates: bool,
    /// SMARTS search buffer (not persisted).
    #[serde(skip)]
    pub smarts_buf: String,
    // ── AI chat ──────────────────────────────────────────────────────────────
    /// Anthropic API key (persisted).
    pub api_key: String,
    /// Anthropic model ID (persisted).
    pub ai_model: String,
    pub show_chat: bool,
    pub show_settings: bool,
    /// AI chat state (not persisted — ephemeral per session).
    #[serde(skip)]
    pub ai_chat: AiChatState,
    /// Whether the settings API key field is shown in plain text.
    #[serde(skip)]
    pub settings_show_key: bool,
    pub show_about: bool,
    /// Status bar one-shot message (not persisted).
    #[serde(skip)]
    pub status_msg: Option<(String, egui::Color32, f64)>, // text, color, expiry_time
    /// menu_bar_active: any menu is currently open (for hover-to-switch).
    #[serde(skip)]
    pub menu_bar_active: bool,
    /// Top menu currently opened by hover.
    #[serde(skip)]
    pub active_top_menu: Option<crate::menu::TopMenu>,
    /// Saved tool before Space-hold pan (restored on Space release).
    #[serde(skip)]
    pub pan_tool_saved: Option<Tool>,
    /// Inspector panel visibility (persisted).
    pub show_inspector: bool,
    /// Inspector panel width (persisted).
    pub inspector_width: f32,
    /// Activity bar panel selection (Tools/Inspector/Templates/Chat).
    pub activity_panel: ActivityPanel,
    /// Whether sidebar is open (persisted).
    pub sidebar_open: bool,
    /// Sidebar width in pixels (persisted, default 260.0).
    pub sidebar_width: f32,
    /// Zoom percentage edit buffer (ephemeral).
    #[serde(skip)]
    pub zoom_edit: Option<String>,
    /// Editable SMILES buffer in inspector (None = read-only, Some = editing).
    #[serde(skip)]
    pub smiles_edit: Option<String>,
    /// Error message for invalid SMILES edit.
    #[serde(skip)]
    pub smiles_edit_error: bool,
    /// Command palette visibility (ephemeral).
    #[serde(skip)]
    pub show_palette: bool,
    /// Command palette query string (ephemeral).
    #[serde(skip)]
    pub palette_query: String,
    /// Undo history popup visibility (ephemeral).
    #[serde(skip)]
    pub show_undo_history: bool,
    /// Focus Mode: hides toolbar/inspector/menu (§20).
    pub focus_mode: bool,
    /// Keyboard Reference dialog visibility (§22).
    #[serde(skip)]
    pub show_key_ref: bool,
    /// PubChem import dialog visibility + query buffer (§23).
    #[serde(skip)]
    pub show_pubchem: bool,
    #[serde(skip)]
    pub pubchem_query: String,
    /// PubChem background result channel.
    #[serde(skip)]
    pub pubchem_result: Option<std::sync::Arc<std::sync::Mutex<Option<Result<String, String>>>>>,
}

impl Default for ChemDrawApp {
    fn default() -> Self {
        Self {
            molecule:       CanvasMolecule::default(),
            canvas_state:   CanvasState::default(),
            active_tool:    Tool::Select,
            theme:          Theme::Dark,
            lang:           Language::En,
            mode:           EditorMode::Structure,
            reaction:       ReactionScheme::default(),
            show_3d:        false,
            viewer3d_state: Viewer3dState::default(),
            iupac:          IupacState::default(),
            undo_stack:      Vec::new(),
            redo_stack:      Vec::new(),
            canvas_rect:     egui::Rect::NOTHING,
            show_templates:      false,
            smarts_buf:          String::new(),
            show_about:          false,
            status_msg:          None,
            menu_bar_active:     false,
            active_top_menu:     None,
            api_key:             String::new(),
            ai_model:            "claude-haiku-4-5-20251001".to_string(),
            show_chat:           false,
            show_settings:       false,
            ai_chat:             AiChatState::default(),
            settings_show_key:   false,
            pan_tool_saved:      None,
            show_inspector:      true,
            inspector_width:     INSPECTOR_WIDTH,
            activity_panel:      ActivityPanel::Tools,
            sidebar_open:        true,
            sidebar_width:       260.0,
            zoom_edit:           None,
            smiles_edit:         None,
            smiles_edit_error:   false,
            focus_mode:          false,
            show_key_ref:        false,
            show_pubchem:        false,
            pubchem_query:       String::new(),
            pubchem_result:      None,
            show_palette:        false,
            palette_query:       String::new(),
            show_undo_history:   false,
        }
    }
}

impl ChemDrawApp {
    pub fn new(cc: &CreationContext) -> Self {
        crate::fonts::setup(&cc.egui_ctx);
        let theme_stored = cc.storage
            .and_then(|s| eframe::get_value::<Self>(s, eframe::APP_KEY))
            .is_some();
        let mut app: Self = if let Some(storage) = cc.storage {
            eframe::get_value(storage, eframe::APP_KEY).unwrap_or_default()
        } else {
            Self::default()
        };
        // §6: OS dark/light auto-detect (only when no stored preference)
        if !theme_stored {
            if let Some(sys) = cc.egui_ctx.system_theme() {
                app.theme = match sys {
                    egui::Theme::Light => crate::theme::Theme::Light,
                    egui::Theme::Dark  => crate::theme::Theme::Dark,
                };
            }
        }
        apply_theme(&cc.egui_ctx, app.theme);
        app
    }

    fn undo(&mut self) {
        if let Some(prev) = self.undo_stack.pop() {
            self.redo_stack.push(self.molecule.clone());
            self.molecule = prev;
        }
    }

    fn redo(&mut self) {
        if let Some(next) = self.redo_stack.pop() {
            self.undo_stack.push(self.molecule.clone());
            self.molecule = next;
        }
    }

    fn flip_horizontal(&mut self) {
        let targets: Vec<usize> = {
            let selected: Vec<_> = self.molecule.atoms.iter()
                .filter(|a| a.selected).map(|a| a.id).collect();
            if selected.is_empty() {
                self.molecule.atoms.iter().map(|a| a.id).collect()
            } else {
                selected
            }
        };
        if targets.is_empty() { return; }
        let cx = targets.iter()
            .filter_map(|&id| self.molecule.atoms.iter().find(|a| a.id == id))
            .map(|a| a.pos.x)
            .sum::<f32>() / targets.len() as f32;
        for a in self.molecule.atoms.iter_mut().filter(|a| targets.contains(&a.id)) {
            a.pos.x = 2.0 * cx - a.pos.x;
        }
    }

    fn flip_vertical(&mut self) {
        let targets: Vec<usize> = {
            let selected: Vec<_> = self.molecule.atoms.iter()
                .filter(|a| a.selected).map(|a| a.id).collect();
            if selected.is_empty() {
                self.molecule.atoms.iter().map(|a| a.id).collect()
            } else {
                selected
            }
        };
        if targets.is_empty() { return; }
        let cy = targets.iter()
            .filter_map(|&id| self.molecule.atoms.iter().find(|a| a.id == id))
            .map(|a| a.pos.y)
            .sum::<f32>() / targets.len() as f32;
        for a in self.molecule.atoms.iter_mut().filter(|a| targets.contains(&a.id)) {
            a.pos.y = 2.0 * cy - a.pos.y;
        }
    }

    fn rotate_90(&mut self) {
        let targets: Vec<usize> = {
            let selected: Vec<_> = self.molecule.atoms.iter()
                .filter(|a| a.selected).map(|a| a.id).collect();
            if selected.is_empty() {
                self.molecule.atoms.iter().map(|a| a.id).collect()
            } else {
                selected
            }
        };
        if targets.is_empty() { return; }
        let cx = targets.iter()
            .filter_map(|&id| self.molecule.atoms.iter().find(|a| a.id == id))
            .map(|a| a.pos.x).sum::<f32>() / targets.len() as f32;
        let cy = targets.iter()
            .filter_map(|&id| self.molecule.atoms.iter().find(|a| a.id == id))
            .map(|a| a.pos.y).sum::<f32>() / targets.len() as f32;
        for a in self.molecule.atoms.iter_mut().filter(|a| targets.contains(&a.id)) {
            let dx = a.pos.x - cx;
            let dy = a.pos.y - cy;
            // clockwise 90°: (dx, dy) → (dy, -dx) in screen coords (Y-down)
            a.pos.x = cx + dy;
            a.pos.y = cy - dx;
        }
    }

    fn fit_zoom(&mut self) {
        if self.molecule.atoms.is_empty() || self.canvas_rect == egui::Rect::NOTHING { return; }
        let min_x = self.molecule.atoms.iter().map(|a| a.pos.x).fold(f32::MAX, f32::min);
        let max_x = self.molecule.atoms.iter().map(|a| a.pos.x).fold(f32::MIN, f32::max);
        let min_y = self.molecule.atoms.iter().map(|a| a.pos.y).fold(f32::MAX, f32::min);
        let max_y = self.molecule.atoms.iter().map(|a| a.pos.y).fold(f32::MIN, f32::max);
        let mol_w = (max_x - min_x).max(60.0);
        let mol_h = (max_y - min_y).max(60.0);
        let zoom = ((self.canvas_rect.width() / mol_w) * 0.80)
            .min((self.canvas_rect.height() / mol_h) * 0.80)
            .clamp(0.2, 5.0);
        let mol_cx = (min_x + max_x) / 2.0;
        let mol_cy = (min_y + max_y) / 2.0;
        self.canvas_state.zoom = zoom;
        self.canvas_state.offset = egui::Vec2::new(
            self.canvas_rect.center().x - mol_cx * zoom,
            self.canvas_rect.center().y - mol_cy * zoom,
        );
    }

    fn align_atoms_left(mol: &mut CanvasMolecule) {
        let min_x = mol.atoms.iter().filter(|a| a.selected).map(|a| a.pos.x).fold(f32::MAX, f32::min);
        for a in mol.atoms.iter_mut().filter(|a| a.selected) { a.pos.x = min_x; }
    }
    fn align_atoms_right(mol: &mut CanvasMolecule) {
        let max_x = mol.atoms.iter().filter(|a| a.selected).map(|a| a.pos.x).fold(f32::MIN, f32::max);
        for a in mol.atoms.iter_mut().filter(|a| a.selected) { a.pos.x = max_x; }
    }
    fn align_atoms_center_h(mol: &mut CanvasMolecule) {
        let xs: Vec<f32> = mol.atoms.iter().filter(|a| a.selected).map(|a| a.pos.x).collect();
        if xs.is_empty() { return; }
        let cx = xs.iter().sum::<f32>() / xs.len() as f32;
        for a in mol.atoms.iter_mut().filter(|a| a.selected) { a.pos.x = cx; }
    }
    fn align_atoms_top(mol: &mut CanvasMolecule) {
        let min_y = mol.atoms.iter().filter(|a| a.selected).map(|a| a.pos.y).fold(f32::MAX, f32::min);
        for a in mol.atoms.iter_mut().filter(|a| a.selected) { a.pos.y = min_y; }
    }
    fn align_atoms_bottom(mol: &mut CanvasMolecule) {
        let max_y = mol.atoms.iter().filter(|a| a.selected).map(|a| a.pos.y).fold(f32::MIN, f32::max);
        for a in mol.atoms.iter_mut().filter(|a| a.selected) { a.pos.y = max_y; }
    }
    fn align_atoms_center_v(mol: &mut CanvasMolecule) {
        let ys: Vec<f32> = mol.atoms.iter().filter(|a| a.selected).map(|a| a.pos.y).collect();
        if ys.is_empty() { return; }
        let cy = ys.iter().sum::<f32>() / ys.len() as f32;
        for a in mol.atoms.iter_mut().filter(|a| a.selected) { a.pos.y = cy; }
    }

    /// Apply bare-key tool shortcuts (called from keyboard handler).
    fn apply_tool_shortcuts(i: &egui::InputState, active_tool: &mut Tool) {
        if i.key_pressed(egui::Key::C) { *active_tool = Tool::Carbon; }
        if i.key_pressed(egui::Key::N) { *active_tool = Tool::Nitrogen; }
        if i.key_pressed(egui::Key::O) { *active_tool = Tool::Oxygen; }
        if i.key_pressed(egui::Key::S) { *active_tool = Tool::Sulfur; }
        if i.key_pressed(egui::Key::P) { *active_tool = Tool::Phosphorus; }
        if i.key_pressed(egui::Key::F) { *active_tool = Tool::Fluorine; }
        if i.key_pressed(egui::Key::H) { *active_tool = Tool::Hydrogen; }
        if i.key_pressed(egui::Key::Num1) { *active_tool = Tool::Single; }
        if i.key_pressed(egui::Key::Num2) { *active_tool = Tool::Double; }
        if i.key_pressed(egui::Key::Num3) { *active_tool = Tool::Triple; }
        if i.key_pressed(egui::Key::Num4) { *active_tool = Tool::Aromatic; }
        if i.key_pressed(egui::Key::W) { *active_tool = Tool::WedgeUp; }
        if i.key_pressed(egui::Key::D) { *active_tool = Tool::WedgeDown; }
        if i.key_pressed(egui::Key::B) { *active_tool = Tool::Benzene; }
        if i.key_pressed(egui::Key::R) { *active_tool = Tool::Rgroup; }
    }

    /// Set a temporary status bar message with explicit expiry time.
    pub fn set_status_timed(&mut self, text: String, color: egui::Color32, expiry: f64) {
        self.status_msg = Some((text, color, expiry));
    }
}

impl eframe::App for ChemDrawApp {
    fn save(&mut self, storage: &mut dyn eframe::Storage) {
        eframe::set_value(storage, eframe::APP_KEY, self);
    }

    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        let ctx = ui.ctx().clone();
        let tokens = Tokens::for_theme(self.theme);
        let mut i18n = I18n::new(self.lang);
        let mut actions = MenuActions::default();

        // ── Expire status message ──
        if let Some((_, _, exp)) = self.status_msg {
            if ctx.input(|i| i.time) > exp {
                self.status_msg = None;
            }
        }

        // ── Space key: temporary pan tool ──
        {
            let space_down = ctx.input(|i| i.key_down(egui::Key::Space));
            let space_released = ctx.input(|i| i.key_released(egui::Key::Space));
            if space_down && self.pan_tool_saved.is_none() && self.active_tool != Tool::Pan {
                self.pan_tool_saved = Some(self.active_tool);
                self.active_tool = Tool::Pan;
            }
            if space_released {
                if let Some(prev) = self.pan_tool_saved.take() {
                    self.active_tool = prev;
                }
            }
        }

        // ── Global keyboard shortcuts ──
        let wants_kb = ctx.egui_wants_keyboard_input();
        ctx.input(|i| {
            if i.key_pressed(egui::Key::Escape) {
                self.active_tool = Tool::Select;
                self.canvas_state.context_target = None;
                self.show_palette = false;
                self.show_undo_history = false;
            }

            // Delete / Backspace: remove selected atoms AND bonds
            if !wants_kb
                && (i.key_pressed(egui::Key::Delete) || i.key_pressed(egui::Key::Backspace))
                && !i.modifiers.ctrl
            {
                let selected_atoms: Vec<usize> = self.molecule.atoms.iter()
                    .filter(|a| a.selected).map(|a| a.id).collect();
                let selected_bonds: Vec<usize> = self.molecule.bonds.iter()
                    .filter(|b| b.selected).map(|b| b.id).collect();
                if !selected_atoms.is_empty() || !selected_bonds.is_empty() {
                    push_undo(&mut self.undo_stack, &mut self.redo_stack, &self.molecule);
                    for id in selected_atoms { self.molecule.remove_atom(id); }
                    for id in selected_bonds { self.molecule.remove_bond(id); }
                }
            }

            // Undo / Redo — support both Ctrl (Win/Linux) and Cmd (macOS)
            let pm = i.modifiers.ctrl || i.modifiers.mac_cmd;
            if i.key_pressed(egui::Key::Z) && pm && !i.modifiers.shift { actions.request_undo = true; }
            if (i.key_pressed(egui::Key::Z) && pm && i.modifiers.shift)
                || (i.key_pressed(egui::Key::Y) && pm)
            {
                actions.request_redo = true;
            }
            // Ctrl+Alt+Z: Undo history popup
            if i.key_pressed(egui::Key::Z) && pm && i.modifiers.alt {
                actions.request_undo_history = true;
            }

            // File
            if i.key_pressed(egui::Key::N) && pm { actions.request_new = true; }
            if i.key_pressed(egui::Key::O) && pm { actions.request_open = true; }
            if i.key_pressed(egui::Key::S) && pm { actions.request_save = true; }

            // Ctrl+Shift+P: command palette
            if i.key_pressed(egui::Key::P) && pm && i.modifiers.shift {
                actions.request_palette = true;
            }
            // Ctrl+Shift+F: Focus Mode toggle (§20)
            if i.key_pressed(egui::Key::F) && pm && i.modifiers.shift {
                actions.request_focus_mode = true;
            }
            // Ctrl+Shift+?: Keyboard Reference dialog (§22)
            if i.key_pressed(egui::Key::Questionmark) && pm && i.modifiers.shift {
                actions.request_key_ref = true;
            }

            // Edit
            if i.key_pressed(egui::Key::A) && pm {
                for a in &mut self.molecule.atoms { a.selected = true; }
            }
            if i.key_pressed(egui::Key::L) && pm { actions.request_clean = true; }

            // Arrow keys: move selected atoms by one grid step (skip in text fields)
            if !wants_kb {
                let step = 40.0 / self.canvas_state.zoom;
                let any_sel = self.molecule.atoms.iter().any(|a| a.selected);
                if any_sel {
                    if i.key_pressed(egui::Key::ArrowUp)    { push_undo(&mut self.undo_stack, &mut self.redo_stack, &self.molecule); for a in self.molecule.atoms.iter_mut().filter(|a| a.selected) { a.pos.y -= step; } }
                    if i.key_pressed(egui::Key::ArrowDown)  { push_undo(&mut self.undo_stack, &mut self.redo_stack, &self.molecule); for a in self.molecule.atoms.iter_mut().filter(|a| a.selected) { a.pos.y += step; } }
                    if i.key_pressed(egui::Key::ArrowLeft)  { push_undo(&mut self.undo_stack, &mut self.redo_stack, &self.molecule); for a in self.molecule.atoms.iter_mut().filter(|a| a.selected) { a.pos.x -= step; } }
                    if i.key_pressed(egui::Key::ArrowRight) { push_undo(&mut self.undo_stack, &mut self.redo_stack, &self.molecule); for a in self.molecule.atoms.iter_mut().filter(|a| a.selected) { a.pos.x += step; } }
                }
            }

            // View
            if !wants_kb && i.key_pressed(egui::Key::Num0) && !i.modifiers.ctrl {
                actions.request_fit = true;
            }

            // Inspector toggle: I key only (N is Nitrogen tool)
            if !wants_kb && !i.modifiers.ctrl && i.key_pressed(egui::Key::I) {
                self.show_inspector = !self.show_inspector;
            }

            // Tool shortcuts (no modifier, skip in text fields)
            if !wants_kb && !i.modifiers.ctrl {
                // Context-dependent stereo shortcuts: Select + bond hover
                if self.active_tool == Tool::Select {
                    if let Some(bid) = self.canvas_state.hover_bond_id {
                        if i.key_pressed(egui::Key::W) {
                            push_undo(&mut self.undo_stack, &mut self.redo_stack, &self.molecule);
                            if let Some(b) = self.molecule.bonds.iter_mut().find(|b| b.id == bid) {
                                b.stereo = crate::canvas::BondStereo::WedgeUp;
                            }
                        }
                        if i.key_pressed(egui::Key::D) {
                            push_undo(&mut self.undo_stack, &mut self.redo_stack, &self.molecule);
                            if let Some(b) = self.molecule.bonds.iter_mut().find(|b| b.id == bid) {
                                b.stereo = crate::canvas::BondStereo::WedgeDown;
                            }
                        }
                    }
                }

                // Keyboard ring annelation when hovering a bond
                if let Some(bond_id) = self.canvas_state.hover_bond_id {
                    if i.key_pressed(egui::Key::B) {
                        push_undo(&mut self.undo_stack, &mut self.redo_stack, &self.molecule);
                        crate::canvas::place_ring_on_bond_pub(&mut self.molecule, bond_id, 6, crate::canvas::BondOrder::Aromatic);
                    } else if i.key_pressed(egui::Key::Num5) {
                        push_undo(&mut self.undo_stack, &mut self.redo_stack, &self.molecule);
                        crate::canvas::place_ring_on_bond_pub(&mut self.molecule, bond_id, 5, crate::canvas::BondOrder::Single);
                    } else if i.key_pressed(egui::Key::Num6) {
                        push_undo(&mut self.undo_stack, &mut self.redo_stack, &self.molecule);
                        crate::canvas::place_ring_on_bond_pub(&mut self.molecule, bond_id, 6, crate::canvas::BondOrder::Single);
                    } else {
                        // No ring key: fall through to regular tool shortcuts
                        Self::apply_tool_shortcuts(i, &mut self.active_tool);
                    }
                } else {
                    Self::apply_tool_shortcuts(i, &mut self.active_tool);
                }

                // Charge adjustment
                let plus  = i.key_pressed(egui::Key::Plus) || i.key_pressed(egui::Key::Equals);
                let minus = i.key_pressed(egui::Key::Minus);
                if plus || minus {
                    let delta: i8 = if plus { 1 } else { -1 };
                    let any = self.molecule.atoms.iter().any(|a| a.selected);
                    if any {
                        push_undo(&mut self.undo_stack, &mut self.redo_stack, &self.molecule);
                        for a in self.molecule.atoms.iter_mut().filter(|a| a.selected) {
                            a.charge = a.charge.saturating_add(delta);
                        }
                    }
                }
            }
        });

        // ── Menu bar ──
        MenuBar::show(
            ui,
            &mut self.molecule,
            &self.reaction,
            &mut self.theme,
            &mut i18n,
            &mut actions,
            &mut self.active_top_menu,
        );

        // ── Dispatch menu actions ──
        if actions.request_undo  {
            self.undo();
            let exp = ctx.input(|i| i.time) + 3.0;
            self.set_status_timed("Undo".to_string(), tokens.separator, exp);
        }
        if actions.request_redo  {
            self.redo();
            let exp = ctx.input(|i| i.time) + 3.0;
            self.set_status_timed("Redo".to_string(), tokens.separator, exp);
        }

        if actions.request_new {
            push_undo(&mut self.undo_stack, &mut self.redo_stack, &self.molecule);
            self.molecule = CanvasMolecule::default();
            self.canvas_state = CanvasState::default();
            self.iupac = IupacState::default();
        }
        if actions.request_quit {
            ctx.send_viewport_cmd(egui::ViewportCommand::Close);
        }
        if actions.request_3d            { self.show_3d            = !self.show_3d; }
        if actions.request_templates     { self.show_templates     = !self.show_templates; }
        if actions.request_palette       { self.show_palette       = !self.show_palette; }
        if actions.request_undo_history  { self.show_undo_history  = !self.show_undo_history; }
        if actions.request_focus_mode    { self.focus_mode         = !self.focus_mode; }
        if actions.request_key_ref       { self.show_key_ref       = !self.show_key_ref; }
        if actions.request_pubchem       { self.show_pubchem       = true; }
        if actions.request_chat      { self.show_chat      = !self.show_chat; }
        if actions.request_settings  { self.show_settings  = !self.show_settings; }
        if actions.request_about     { self.show_about     = !self.show_about; }

        // ── Poll AI chat background thread ──
        match self.ai_chat.poll() {
            ChatStatus::Done(response) => {
                let smiles = extract_smiles(&response);
                self.ai_chat.pending_smiles = smiles.clone();
                self.ai_chat.history.push(crate::ai_chat::ChatMessage {
                    role: crate::ai_chat::Role::Assistant,
                    content: response,
                    smiles,
                });
            }
            ChatStatus::Error(e) => {
                self.ai_chat.last_error = Some(e.clone());
                self.ai_chat.history.push(crate::ai_chat::ChatMessage {
                    role: crate::ai_chat::Role::Assistant,
                    content: format!("⚠ Error: {e}"),
                    smiles: None,
                });
            }
            _ => {}
        }

        // File open
        if actions.request_open {
            if let Some((name, content)) = open_file_dialog() {
                let is_rxn = name.ends_with(".rxn") || content.trim_start().starts_with("$RXN");
                if is_rxn {
                    match chematic::mol::parse_rxn_file(&content) {
                        Ok(rxn) => {
                            let center = ctx.input(|i| i.viewport_rect()).center();
                            let spacing = 200.0f32;
                            let n = rxn.reactants.len() + rxn.products.len();
                            let start_x = center.x - spacing * (n as f32 - 1.0) / 2.0;
                            let mut new_scheme = crate::reaction::ReactionScheme::default();
                            for (i, m) in rxn.reactants.iter().enumerate() {
                                let pos = egui::Pos2::new(start_x + spacing * i as f32, center.y);
                                new_scheme.molecules.push(crate::bridge::chem_to_canvas(m, pos));
                                new_scheme.mol_roles.push(false);
                            }
                            for (i, m) in rxn.products.iter().enumerate() {
                                let pos = egui::Pos2::new(start_x + spacing * (rxn.reactants.len() + i) as f32, center.y);
                                new_scheme.molecules.push(crate::bridge::chem_to_canvas(m, pos));
                                new_scheme.mol_roles.push(true);
                            }
                            self.reaction = new_scheme;
                            self.mode = EditorMode::Reaction;
                        }
                        Err(e) => actions.paste_error = Some(format!("RXN parse error: {e}")),
                    }
                } else {
                    let center = ctx.input(|i| i.viewport_rect()).center();
                    match parse_any(&content, center) {
                        Ok(new_mol) => {
                            push_undo(&mut self.undo_stack, &mut self.redo_stack, &self.molecule);
                            self.molecule = new_mol;
                        }
                        Err(e) => actions.paste_error = Some(e.to_string()),
                    }
                }
            }
        }

        // File save — delegate to rfd via menu save_text_file
        if actions.request_save {
            // Trigger MOL export as default "save"
            if let Some(s) = crate::export::canvas_to_mol(&self.molecule) {
                if let Some(path) = rfd::FileDialog::new()
                    .set_file_name("molecule.mol")
                    .add_filter("MDL MOL", &["mol"])
                    .add_filter("SDF", &["sdf"])
                    .add_filter("CML", &["cml"])
                    .add_filter("SVG", &["svg"])
                    .save_file()
                {
                    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("mol");
                    let result = match ext {
                        "sdf" => crate::export::canvas_to_sdf(&self.molecule)
                            .map(|c| std::fs::write(&path, c)),
                        "cml" => crate::export::canvas_to_cml(&self.molecule)
                            .map(|c| std::fs::write(&path, c)),
                        "svg" => crate::export::canvas_to_svg(&self.molecule)
                            .map(|c| std::fs::write(&path, c)),
                        _ => Some(std::fs::write(&path, s)),
                    };
                    if let Some(Err(e)) = result {
                        actions.paste_error = Some(format!("Save failed: {e}"));
                    }
                }
            }
        }

        // Geometry transforms
        if actions.request_clean {
            let center = self.canvas_rect.center();
            push_undo(&mut self.undo_stack, &mut self.redo_stack, &self.molecule);
            clean_layout(&mut self.molecule, center);
        }
        if actions.request_flip_h {
            push_undo(&mut self.undo_stack, &mut self.redo_stack, &self.molecule);
            self.flip_horizontal();
        }
        if actions.request_flip_v {
            push_undo(&mut self.undo_stack, &mut self.redo_stack, &self.molecule);
            self.flip_vertical();
        }
        if actions.request_rotate90 {
            push_undo(&mut self.undo_stack, &mut self.redo_stack, &self.molecule);
            self.rotate_90();
        }
        if actions.request_fit {
            self.fit_zoom();
        }

        self.lang = i18n.lang();
        // Propagate paste error from open action
        if let Some(err) = actions.paste_error {
            // Re-expose via next frame toast (store temporarily)
            // The menu shows it via actions.paste_error; this path is a fallback.
            eprintln!("Error: {err}");
        }

        // ── Mode tab bar (hidden in Focus Mode §20) ──
        if !self.focus_mode {
        #[allow(deprecated)]
        egui::Panel::top("mode_tabs")
            .exact_size(38.0)
            .frame(egui::Frame::NONE
                .fill(tokens.panel_bg)
                .inner_margin(egui::Margin::symmetric(10, 6)))
            .show(ui, |ui| {
                ui.horizontal(|ui| {
                    ui.add_space(2.0);
                    for (label, mode) in [
                        ("Structure", EditorMode::Structure),
                        ("Reaction",  EditorMode::Reaction),
                    ] {
                        let active = self.mode == mode;
                        let text = egui::RichText::new(label).size(13.0).strong();
                        let resp = ui.add(
                            egui::Button::new(text)
                                .selected(active)
                                .fill(if active {
                                    alpha(tokens.accent, 48)
                                } else {
                                    alpha(tokens.sidebar_hover, 110)
                                })
                        );
                        if resp.clicked() { self.mode = mode; }
                        ui.add_space(4.0);
                    }
                    // 3D toggle
                    let text_3d = egui::RichText::new("3D").size(13.0).strong();
                    if ui.add(
                        egui::Button::new(text_3d)
                            .selected(self.show_3d)
                            .fill(if self.show_3d {
                                alpha(tokens.accent, 48)
                            } else {
                                alpha(tokens.sidebar_hover, 110)
                            })
                    ).clicked() {
                        self.show_3d = !self.show_3d;
                    }
                });
            });
        } // end !focus_mode

        // ── Tool Controls Bar (hidden in Focus Mode) ──
        if !self.focus_mode {
        #[allow(deprecated)]
        egui::Panel::top("tool_controls")
            .exact_size(TOOL_CONTROLS_HEIGHT + 6.0)
            .frame(egui::Frame::NONE.fill(tokens.panel_bg).inner_margin(egui::Margin::symmetric(10, 4)))
            .show(ui, |ui| {
                ui.horizontal(|ui| {
                    match self.active_tool {
                        Tool::Single | Tool::Double | Tool::Triple | Tool::Aromatic
                        | Tool::WedgeUp | Tool::WedgeDown => {
                            ui.label(egui::RichText::new("Order").small().color(tokens.sidebar_title.gamma_multiply(0.66)));
                            let orders = [("1", Tool::Single), ("2", Tool::Double), ("3", Tool::Triple), ("A", Tool::Aromatic)];
                            for (label, t) in orders {
                                if ui.selectable_label(self.active_tool == t, label).clicked() {
                                    self.active_tool = t;
                                }
                            }
                            ui.separator();
                            ui.label(egui::RichText::new("Stereo").small().color(tokens.sidebar_title.gamma_multiply(0.66)));
                            if ui.selectable_label(self.active_tool == Tool::WedgeUp, "▲Up").clicked() { self.active_tool = Tool::WedgeUp; }
                            if ui.selectable_label(self.active_tool == Tool::WedgeDown, "▽Dn").clicked() { self.active_tool = Tool::WedgeDown; }
                        }
                        Tool::Carbon | Tool::Nitrogen | Tool::Oxygen | Tool::Sulfur
                        | Tool::Phosphorus | Tool::Fluorine | Tool::Chlorine
                        | Tool::Bromine | Tool::Iodine | Tool::Hydrogen | Tool::Rgroup => {
                            ui.label(egui::RichText::new("Element").small().color(tokens.sidebar_title.gamma_multiply(0.66)));
                            ui.label(egui::RichText::new(self.active_tool.label()).small());
                        }
                        Tool::Select => {
                            let sel_count = self.molecule.atoms.iter().filter(|a| a.selected).count();
                            let enabled = sel_count >= 2;
                            ui.add_enabled_ui(enabled, |ui| {
                                if ui.small_button("⫤L").clicked() { Self::align_atoms_left(&mut self.molecule); }
                                if ui.small_button("⫡C").clicked() { Self::align_atoms_center_h(&mut self.molecule); }
                                if ui.small_button("⊣R").clicked() { Self::align_atoms_right(&mut self.molecule); }
                                ui.separator();
                                if ui.small_button("⊤T").clicked() { Self::align_atoms_top(&mut self.molecule); }
                                if ui.small_button("⊥M").clicked() { Self::align_atoms_center_v(&mut self.molecule); }
                                if ui.small_button("⊥B").clicked() { Self::align_atoms_bottom(&mut self.molecule); }
                            });
                        }
                        _ => {}
                    }
                });
            });
        } // end !focus_mode (tool controls)

        // ── Activity Bar (left, 48px) ──
        if !self.focus_mode {
        #[allow(deprecated)]
        egui::Panel::left("activity_bar")
            .exact_size(48.0)
            .resizable(false)
            .frame(egui::Frame::NONE.fill(tokens.activity_bar_bg))
            .show(ui, |ui| {
                if crate::toolbar::ActivityBar::show(
                    ui, &mut self.activity_panel, &mut self.sidebar_open, &tokens
                ) {
                    self.show_settings = true;
                }
            });
        } // end !focus_mode (activity bar)

        // ── Sidebar (left, 260px, conditional) ──
        if self.sidebar_open && !self.focus_mode {
            #[allow(deprecated)]
            let panel_resp = egui::Panel::left("sidebar")
                .min_size(180.0)
                .max_size(480.0)
                .default_size(self.sidebar_width)
                .resizable(true)
                .frame(egui::Frame::NONE.fill(tokens.sidebar_bg))
                .show(ui, |ui| {
                    self.sidebar_width = ui.available_width();
                    match self.activity_panel {
                        ActivityPanel::Tools => {
                            crate::toolbar::ToolsSidebar::show(ui, &mut self.active_tool, &tokens, &i18n);
                        }
                        ActivityPanel::Inspector => {
                            let parse_result = Inspector::show(
                                ui, &mut self.molecule, &mut self.iupac, &tokens, &i18n,
                                &mut self.smarts_buf,
                                &mut self.smiles_edit, &mut self.smiles_edit_error,
                            );
                            if let Some(new_mol) = parse_result {
                                push_undo(&mut self.undo_stack, &mut self.redo_stack, &self.molecule);
                                self.molecule = new_mol;
                            }
                        }
                        ActivityPanel::Templates => {
                            let mut insert: Option<crate::canvas::CanvasMolecule> = None;
                            TemplatePanel::show(ui, &tokens, &mut insert);
                            if let Some(mut new_mol) = insert {
                                let cx = self.canvas_rect.center();
                                for a in &mut new_mol.atoms { a.pos += cx.to_vec2(); }
                                push_undo(&mut self.undo_stack, &mut self.redo_stack, &self.molecule);
                                for a in new_mol.atoms { self.molecule.atoms.push(a); }
                                for b in new_mol.bonds { self.molecule.bonds.push(b); }
                            }
                        }
                        ActivityPanel::Chat => {
                            let current_smiles = canvas_to_canonical_smiles(&self.molecule);
                            if let Some(apply_result) = AiChatPanel::show(
                                ui,
                                &mut self.ai_chat,
                                &self.api_key,
                                &self.ai_model,
                                current_smiles.as_deref(),
                                &tokens,
                            ) {
                                // Handle AI result (draw, replace, etc.)
                                let center = self.canvas_rect.center();
                                let smiles = match &apply_result {
                                    ApplyMode::Replace(s) | ApplyMode::Append(s) => s.clone(),
                                };
                                if let Ok(new_mol) = parse_any(&smiles, center) {
                                    push_undo(&mut self.undo_stack, &mut self.redo_stack, &self.molecule);
                                    match apply_result {
                                        ApplyMode::Replace(_) => {
                                            self.molecule = new_mol;
                                        }
                                        ApplyMode::Append(_) => {
                                            let offset = self.molecule.next_id();
                                            for mut a in new_mol.atoms {
                                                a.id += offset;
                                                self.molecule.atoms.push(a);
                                            }
                                            for mut b in new_mol.bonds {
                                                b.id   += offset;
                                                b.from += offset;
                                                b.to   += offset;
                                                self.molecule.bonds.push(b);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        ActivityPanel::Settings => {
                            // Settings panel in sidebar
                            ui.label(
                                egui::RichText::new("SETTINGS")
                                    .size(11.0)
                                    .strong()
                                    .color(tokens.sidebar_title),
                            );
                            ui.add_space(8.0);
                            SettingsPanel::show(ui, &mut self.api_key, &mut self.ai_model,
                                               &mut self.settings_show_key, &tokens);
                        }
                    }
                });
            // Save resized width
            self.sidebar_width = panel_resp.response.rect.width().clamp(
                180.0, 480.0
            );
        }

        // ── Template library window ──
        if self.show_templates {
            egui::Window::new("Templates")
                .default_size([180.0, 500.0])
                .resizable(true)
                .open(&mut self.show_templates)
                .show(&ctx, |ui| {
                    let mut insert: Option<crate::canvas::CanvasMolecule> = None;
                    TemplatePanel::show(ui, &tokens, &mut insert);
                    if let Some(mut new_mol) = insert {
                        // Centre at current canvas centre
                        let cx = self.canvas_rect.center();
                        for a in &mut new_mol.atoms { a.pos += cx.to_vec2(); }
                        push_undo(&mut self.undo_stack, &mut self.redo_stack, &self.molecule);
                        for a in new_mol.atoms { self.molecule.atoms.push(a); }
                        for b in new_mol.bonds { self.molecule.bonds.push(b); }
                    }
                });
        }

        // ── AI Chat window ──
        if self.show_chat {
            let current_smiles = canvas_to_canonical_smiles(&self.molecule);
            let api_key   = self.api_key.clone();
            let ai_model  = self.ai_model.clone();
            let mut apply_result: Option<ApplyMode> = None;

            egui::Window::new("AI Chat")
                .default_size([480.0, 340.0])
                .min_size([320.0, 200.0])
                .resizable(true)
                .open(&mut self.show_chat)
                .show(&ctx, |ui| {
                    apply_result = AiChatPanel::show(
                        ui,
                        &mut self.ai_chat,
                        &api_key,
                        &ai_model,
                        current_smiles.as_deref(),
                        &tokens,
                    );
                });

            // Apply SMILES to canvas (outside the window closure to borrow self freely)
            if let Some(mode) = apply_result {
                let center = self.canvas_rect.center();
                let smiles = match &mode {
                    ApplyMode::Replace(s) | ApplyMode::Append(s) => s.clone(),
                };
                if let Ok(new_mol) = parse_any(&smiles, center) {
                    push_undo(&mut self.undo_stack, &mut self.redo_stack, &self.molecule);
                    match mode {
                        ApplyMode::Replace(_) => {
                            self.molecule = new_mol;
                        }
                        ApplyMode::Append(_) => {
                            // Offset incoming IDs above the highest existing ID
                            let offset = self.molecule.next_id();
                            for mut a in new_mol.atoms {
                                a.id += offset;
                                self.molecule.atoms.push(a);
                            }
                            for mut b in new_mol.bonds {
                                b.id   += offset;
                                b.from += offset;
                                b.to   += offset;
                                self.molecule.bonds.push(b);
                            }
                        }
                    }
                }
            }
        }

        // ── About window ──
        if self.show_about {
            egui::Window::new("About chematic-draw")
                .collapsible(false)
                .resizable(false)
                .open(&mut self.show_about)
                .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
                .show(&ctx, |ui| {
                    ui.add_space(8.0);
                    ui.label(egui::RichText::new("chematic-draw").heading().strong());
                    ui.label(format!("Version {}", env!("CARGO_PKG_VERSION")));
                    ui.add_space(4.0);
                    ui.label("Pure Rust chemical structure editor");
                    ui.label("ChemDraw / Ketcher / ChemSketch compatible");
                    ui.add_space(4.0);
                    ui.label(egui::RichText::new("MIT OR Apache-2.0").small().color(tokens.separator));
                    ui.add_space(4.0);
                    ui.hyperlink_to("github.com/kent-tokyo/chematic", "https://github.com/kent-tokyo/chematic");
                    ui.add_space(8.0);
                });
        }

        // ── Undo History popup ──
        if self.show_undo_history {
            let mut open = self.show_undo_history;
            egui::Window::new("Undo History")
                .open(&mut open)
                .fixed_size([220.0, 300.0])
                .show(&ctx, |ui| {
                    let current = self.undo_stack.len();
                    if current == 0 {
                        ui.label(egui::RichText::new("(empty)").small().color(tokens.separator));
                        return;
                    }
                    let mut jump_to: Option<usize> = None;
                    egui::ScrollArea::vertical().show(ui, |ui| {
                        for (i, _mol) in self.undo_stack.iter().enumerate().rev() {
                            let is_current = i == current - 1;
                            let label = format!("{} Step {}", if is_current { "●" } else { " " }, i + 1);
                            if ui.selectable_label(is_current, label).clicked() && !is_current {
                                jump_to = Some(i);
                            }
                        }
                    });
                    if let Some(target) = jump_to {
                        let steps_to_undo = (current - 1).saturating_sub(target);
                        for _ in 0..steps_to_undo {
                            if let Some(prev) = self.undo_stack.pop() {
                                self.redo_stack.push(self.molecule.clone());
                                self.molecule = prev;
                            }
                        }
                    }
                });
            self.show_undo_history = open;
        }

        // ── Command Palette ──
        if self.show_palette {
            let mut close_palette = false;
            egui::Area::new(egui::Id::new("cmd_palette"))
                .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
                .order(egui::Order::Foreground)
                .show(&ctx, |ui| {
                    egui::Frame::popup(ui.style())
                        .fill(tokens.panel_bg)
                        .show(ui, |ui| {
                            ui.set_min_width(480.0);
                            ui.set_max_height(360.0);
                            let resp = ui.add(
                                egui::TextEdit::singleline(&mut self.palette_query)
                                    .hint_text("Search commands…")
                                    .desired_width(460.0)
                            );
                            if resp.lost_focus() && ctx.input(|i| i.key_pressed(egui::Key::Escape)) {
                                close_palette = true;
                            }
                            resp.request_focus();
                            ui.separator();

                            // Command list
                            let q = self.palette_query.to_lowercase();
                            let commands: &[(&str, &str)] = &[
                                ("New file", "Ctrl+N"),
                                ("Open file", "Ctrl+O"),
                                ("Import by Name (PubChem)", ""),
                                ("Save", "Ctrl+S"),
                                ("Undo", "Ctrl+Z"),
                                ("Redo", "Ctrl+Shift+Z"),
                                ("Undo History", "Ctrl+Alt+Z"),
                                ("Select All", "Ctrl+A"),
                                ("Clean Structure", "Ctrl+L"),
                                ("Zoom to Fit", "0"),
                                ("Toggle Inspector", "I"),
                                ("Focus Mode", "Ctrl+Shift+F"),
                                ("Keyboard Reference", "Ctrl+Shift+?"),
                                ("Command Palette", "Ctrl+Shift+P"),
                                ("Toggle Dark/Light", ""),
                                ("Single Bond", "1"),
                                ("Double Bond", "2"),
                                ("Triple Bond", "3"),
                                ("Aromatic Bond", "4"),
                                ("Benzene Ring", "B"),
                                ("Carbon", "C"),
                                ("Nitrogen", "N"),
                                ("Oxygen", "O"),
                                ("Sulfur", "S"),
                                ("Wedge Up", "W"),
                                ("Wedge Down", "D"),
                            ];
                            egui::ScrollArea::vertical().max_height(280.0).show(ui, |ui| {
                                for (name, shortcut) in commands {
                                    if !q.is_empty() && !name.to_lowercase().contains(&q) {
                                        continue;
                                    }
                                    ui.horizontal(|ui| {
                                        if ui.selectable_label(false, *name).clicked() {
                                            close_palette = true;
                                        }
                                        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                                            if !shortcut.is_empty() {
                                                ui.label(egui::RichText::new(*shortcut).small().color(tokens.separator));
                                            }
                                        });
                                    });
                                }
                            });
                        });
                });
            if ctx.input(|i| i.key_pressed(egui::Key::Escape)) {
                close_palette = true;
            }
            if close_palette {
                self.show_palette = false;
                self.palette_query.clear();
            }
        }

        // ── Focus Mode exit affordance (§20) ──
        if self.focus_mode {
            let vp = ctx.input(|i| i.viewport_rect());
            let hover_near_corner = ctx.input(|i| {
                i.pointer.hover_pos()
                    .map(|p| p.x > vp.max.x - 60.0 && p.y < vp.min.y + 40.0)
                    .unwrap_or(false)
            });
            if hover_near_corner {
                egui::Area::new(egui::Id::new("exit_focus"))
                    .fixed_pos(egui::Pos2::new(vp.max.x - 90.0, vp.min.y + 4.0))
                    .order(egui::Order::Foreground)
                    .show(&ctx, |ui| {
                        if ui.button("Exit Focus").clicked() {
                            self.focus_mode = false;
                        }
                    });
            }
        }

        // ── Keyboard Reference Dialog (§22) ──
        if self.show_key_ref {
            let mut open = self.show_key_ref;
            egui::Window::new("Keyboard Reference")
                .open(&mut open)
                .default_size([560.0, 400.0])
                .resizable(true)
                .show(&ctx, |ui| {
                    static SECTIONS: &[(&str, &[(&str, &str)])] = &[
                        ("Global", &[
                            ("Ctrl+N", "New file"),
                            ("Ctrl+O", "Open file"),
                            ("Ctrl+S", "Save"),
                            ("Ctrl+Z", "Undo"),
                            ("Ctrl+Shift+Z", "Redo"),
                            ("Ctrl+A", "Select all"),
                            ("Ctrl+L", "Clean structure"),
                            ("Ctrl+Shift+P", "Command Palette"),
                            ("Ctrl+Alt+Z", "Undo History popup"),
                            ("Ctrl+Shift+F", "Focus Mode toggle"),
                            ("Ctrl+Shift+?", "This dialog"),
                            ("Delete/Backspace", "Delete selected"),
                            ("Esc", "Select tool / cancel"),
                        ]),
                        ("Canvas", &[
                            ("0", "Zoom to fit"),
                            ("+/-", "Zoom in/out"),
                            ("Space (hold)", "Temporary pan"),
                            ("Ctrl (drag)", "Disable snap"),
                            ("Alt (drag)", "Free-angle bond"),
                            ("I", "Toggle inspector"),
                            ("Tab", "Cycle selection"),
                            ("Arrows", "Move selected atoms"),
                            ("+/- (atom selected)", "Adjust charge"),
                        ]),
                        ("Tools", &[
                            ("Esc", "Select"),
                            ("C/N/O/S/P", "Atom tools"),
                            ("F/H/R", "Fluorine/Hydrogen/R-group"),
                            ("1/2/3/4", "Single/Double/Triple/Aromatic"),
                            ("W/D", "Wedge Up/Down"),
                            ("B", "Benzene / fuse benzene"),
                            ("5/6 (hover bond)", "Fuse 5/6-ring"),
                            ("W/D (hover bond)", "Apply stereo without tool switch"),
                            ("Del", "Eraser"),
                        ]),
                    ];
                    let mut search_buf = String::new();
                    ui.add(egui::TextEdit::singleline(&mut search_buf)
                        .hint_text("Search shortcuts…")
                        .desired_width(f32::INFINITY));
                    ui.separator();
                    egui::ScrollArea::vertical().show(ui, |ui| {
                        for (section, entries) in SECTIONS {
                            ui.strong(*section);
                            for (key, desc) in *entries {
                                ui.horizontal(|ui| {
                                    ui.monospace(*key);
                                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                                        ui.label(egui::RichText::new(*desc).small().color(tokens.separator));
                                    });
                                });
                            }
                            ui.add_space(4.0);
                        }
                    });
                });
            self.show_key_ref = open;
        }

        // ── PubChem Name Import (§23) ──
        if self.show_pubchem {
            // Poll result from background thread
            let mut found_mol: Option<String> = None;
            let mut found_err: Option<String> = None;
            let mut clear_result = false;
            if let Some(ref arc) = self.pubchem_result {
                if let Ok(mut guard) = arc.try_lock() {
                    if let Some(ref res) = *guard {
                        match res {
                            Ok(smiles) => found_mol = Some(smiles.clone()),
                            Err(e) => found_err = Some(e.clone()),
                        }
                        *guard = None;
                        clear_result = true;
                    }
                }
            }
            if clear_result { self.pubchem_result = None; }
            if let Some(smiles) = found_mol {
                let center = self.canvas_rect.center();
                if let Ok(new_mol) = parse_any(&smiles, center) {
                    push_undo(&mut self.undo_stack, &mut self.redo_stack, &self.molecule);
                    self.molecule = new_mol;
                    let exp = ctx.input(|i| i.time) + 4.0;
                    self.set_status_timed(
                        format!("Loaded from PubChem: {smiles}"),
                        tokens.success, exp
                    );
                }
                self.show_pubchem = false;
            }
            if let Some(err) = found_err {
                let exp = ctx.input(|i| i.time) + 3.0;
                self.set_status_timed(err, tokens.error, exp);
            }

            let mut open = self.show_pubchem;
            let fetching = self.pubchem_result.is_some();
            egui::Window::new("Import by Name")
                .open(&mut open)
                .fixed_size([360.0, 80.0])
                .show(&ctx, |ui| {
                    ui.horizontal(|ui| {
                        ui.label("Name / CAS:");
                        let resp = ui.add(
                            egui::TextEdit::singleline(&mut self.pubchem_query)
                                .desired_width(200.0)
                                .hint_text("e.g. aspirin")
                        );
                        let enter = resp.lost_focus()
                            && ui.input(|i| i.key_pressed(egui::Key::Enter));
                        let clicked = ui.add_enabled(
                            !fetching,
                            egui::Button::new(if fetching { "Fetching…" } else { "Import" })
                        ).clicked();
                        if (enter || clicked) && !fetching && !self.pubchem_query.is_empty() {
                            let query = self.pubchem_query.clone();
                            let result_arc: std::sync::Arc<std::sync::Mutex<Option<Result<String, String>>>>
                                = std::sync::Arc::new(std::sync::Mutex::new(None));
                            let arc_clone = result_arc.clone();
                            std::thread::spawn(move || {
                                let encoded: String = query.chars().map(|c| {
                                    if c.is_alphanumeric() || c == '-' || c == '_' || c == '.' {
                                        c.to_string()
                                    } else {
                                        format!("%{:02X}", c as u32)
                                    }
                                }).collect();
                                let url = format!(
                                    "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{encoded}/property/IsomericSMILES/JSON"
                                );
                                let result = reqwest::blocking::get(&url)
                                    .and_then(|r| r.json::<serde_json::Value>())
                                    .map_err(|e| e.to_string())
                                    .and_then(|v| {
                                        v["PropertyTable"]["Properties"][0]["IsomericSMILES"]
                                            .as_str()
                                            .map(|s| s.to_string())
                                            .ok_or_else(|| "PubChem: not found — try a different name".to_string())
                                    });
                                if let Ok(mut g) = arc_clone.lock() { *g = Some(result); }
                            });
                            self.pubchem_result = Some(result_arc);
                            ctx.request_repaint();
                        }
                    });
                });
            if !open { self.show_pubchem = false; }
        }

        // ── Settings window ──
        if self.show_settings {
            egui::Window::new("Settings")
                .default_size([380.0, 220.0])
                .resizable(false)
                .open(&mut self.show_settings)
                .show(&ctx, |ui| {
                    SettingsPanel::show(
                        ui,
                        &mut self.api_key,
                        &mut self.ai_model,
                        &mut self.settings_show_key,
                        &tokens,
                    );
                });
        }

        // ── 3D viewer window ──
        if self.show_3d {
            egui::Window::new("3D Viewer")
                .default_size([400.0, 400.0])
                .resizable(true)
                .show(&ctx, |ui| {
                    Viewer3d::show(ui, &self.molecule, &mut self.viewer3d_state, &tokens);
                });
        }

        // ── Status bar — VS Code style (#007ACC blue background) ──
        #[allow(deprecated)]
        egui::Panel::bottom("statusbar")
            .exact_size(22.0)
            .frame(egui::Frame::NONE.fill(tokens.status_bar_bg).inner_margin(egui::Margin::symmetric(8, 3)))
            .show(ui, |ui| {
                ui.visuals_mut().override_text_color = Some(tokens.status_bar_fg);
                let now = ctx.input(|i| i.time);
                ui.horizontal(|ui| {
                    // Current tool
                    let tool_display = if self.active_tool == Tool::Pan {
                        if let Some(prev) = self.pan_tool_saved {
                            format!("Pan ({})", prev.label())
                        } else {
                            "Pan".to_string()
                        }
                    } else {
                        let sc = self.active_tool.shortcut()
                            .map(|s| format!("[{s}]")).unwrap_or_default();
                        let tip = self.active_tool.tip()
                            .map(|t| format!("  {t}")).unwrap_or_default();
                        format!("Tool: {} {}{}",
                            self.active_tool.label(), sc, tip)
                    };
                    ui.label(egui::RichText::new(tool_display).small().color(tokens.status_bar_fg));
                    ui.separator();

                    // Center: bond drag info OR snap status OR selection info OR molecule info
                    if let Some((len_px, angle_deg)) = self.canvas_state.bond_drag_info {
                        ui.label(egui::RichText::new(
                            format!("Bond: {len_px:.0} px / {angle_deg:.0}°")
                        ).small().color(tokens.accent));
                    } else if let Some(ref snap_txt) = self.canvas_state.snap_status.clone() {
                        ui.label(egui::RichText::new(snap_txt).small().color(tokens.snap_indicator));
                    } else {
                        let sel_a = self.molecule.atoms.iter().filter(|a| a.selected).count();
                        let sel_b = self.molecule.bonds.iter().filter(|b| b.selected).count();
                        let info = if sel_a + sel_b > 0 {
                            format!("{sel_a} atoms + {sel_b} bonds selected")
                        } else {
                            format!("{} atoms  {} bonds", self.molecule.atoms.len(), self.molecule.bonds.len())
                        };
                        ui.label(egui::RichText::new(info).small());
                    }

                    // Temporary status message
                    if let Some((ref text, color, exp)) = self.status_msg.clone() {
                        if now < exp {
                            ui.separator();
                            ui.label(egui::RichText::new(text).small().color(color));
                        }
                    }

                    // Zoom on far right (clickable to edit)
                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                        if let Some(ref mut edit_buf) = self.zoom_edit {
                            let resp = ui.add(
                                egui::TextEdit::singleline(edit_buf)
                                    .desired_width(48.0)
                                    .font(egui::TextStyle::Small)
                            );
                            if resp.lost_focus() || ctx.input(|i| i.key_pressed(egui::Key::Enter)) {
                                if let Ok(pct) = edit_buf.trim_end_matches('%').trim().parse::<f32>() {
                                    self.canvas_state.zoom = (pct / 100.0).clamp(0.2, 10.0);
                                }
                                self.zoom_edit = None;
                            }
                            if ctx.input(|i| i.key_pressed(egui::Key::Escape)) {
                                self.zoom_edit = None;
                            }
                        } else {
                            let zoom_label = egui::RichText::new(
                                format!("{:.0}%", self.canvas_state.zoom * 100.0)
                            ).small().color(tokens.separator);
                            if ui.label(zoom_label).clicked() {
                                self.zoom_edit = Some(format!("{:.0}", self.canvas_state.zoom * 100.0));
                            }
                        }
                    });
                });
            });

        // ── Central panel (Structure or Reaction) ──
        #[allow(deprecated)]
        CentralPanel::default()
            .frame(egui::Frame::NONE.fill(tokens.canvas_bg).inner_margin(egui::Margin::symmetric(8, 0)))
            .show(ui, |ui| {
                self.canvas_rect = ui.available_rect_before_wrap();
                match self.mode {
                    EditorMode::Structure => {
                        crate::canvas::MoleculeCanvas::show(
                            ui,
                            &mut self.molecule,
                            &mut self.canvas_state,
                            self.active_tool,
                            &tokens,
                            &mut self.undo_stack,
                            &mut self.redo_stack,
                        );
                    }
                    EditorMode::Reaction => {
                        ReactionCanvas::show(
                            ui,
                            &mut self.reaction,
                            self.active_tool,
                            &tokens,
                        );
                    }
                }
            });
    }
}
