//! Application settings panel (API key, model selection, etc.)

use egui::Ui;

use crate::theme::{Tokens, SPACING_SM, SPACING_MD};

const MODELS: &[(&str, &str)] = &[
    ("claude-haiku-4-5-20251001", "Claude Haiku 4.5 (fast, economical)"),
    ("claude-sonnet-4-6",         "Claude Sonnet 4.6 (balanced)"),
];

pub struct SettingsPanel;

impl SettingsPanel {
    pub fn show(
        ui: &mut Ui,
        api_key: &mut String,
        model: &mut String,
        show_key: &mut bool,
        tokens: &Tokens,
    ) {
        ui.add_space(SPACING_SM);
        ui.label(egui::RichText::new("Anthropic API Key").strong().color(tokens.accent));
        ui.add_space(4.0);

        ui.horizontal(|ui| {
            let edit = egui::TextEdit::singleline(api_key)
                .password(!*show_key)
                .hint_text("sk-ant-…")
                .desired_width(f32::INFINITY);
            ui.add(edit);
            let eye = if *show_key { "🙈" } else { "👁" };
            if ui.small_button(eye).on_hover_text("Show/hide key").clicked() {
                *show_key = !*show_key;
            }
        });

        if api_key.is_empty() {
            ui.colored_label(tokens.warning, "Key is empty. Get one at console.anthropic.com");
        } else {
            ui.colored_label(tokens.success, "✓ Key is set");
        }

        ui.add_space(SPACING_MD);
        ui.label(egui::RichText::new("Model").strong().color(tokens.accent));
        ui.add_space(4.0);

        let current_label = MODELS.iter()
            .find(|(id, _)| id == &model.as_str())
            .map(|(_, label)| *label)
            .unwrap_or(model.as_str());

        egui::ComboBox::from_id_salt("ai_model_select")
            .selected_text(current_label)
            .width(f32::INFINITY)
            .show_ui(ui, |ui| {
                for (id, label) in MODELS {
                    ui.selectable_value(model, id.to_string(), *label);
                }
            });

        ui.add_space(SPACING_MD);
        ui.separator();
        ui.add_space(SPACING_SM);
        ui.label(
            egui::RichText::new(
                "Settings are saved automatically when you close this window.",
            )
            .small()
            .color(tokens.separator),
        );
    }
}
