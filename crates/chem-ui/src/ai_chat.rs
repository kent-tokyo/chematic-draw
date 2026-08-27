//! AI chat assistant — Anthropic Messages API integration.
//! Threading pattern mirrors iupac.rs: blocking HTTP on a spawned thread,
//! result polled each frame via `Arc<Mutex>`.

use std::sync::{Arc, Mutex};

use egui::Ui;

use crate::theme::{SPACING_SM, Tokens};

// ── Types ────────────────────────────────────────────────────────────────────

type SharedResult = Arc<Mutex<Option<Result<String, String>>>>;

#[derive(Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub enum Role {
    User,
    Assistant,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct ChatMessage {
    pub role: Role,
    pub content: String,
    /// SMILES string extracted from the AI response (if any).
    pub smiles: Option<String>,
}

/// What to do with an extracted SMILES (chosen by the user in the confirm bar).
pub enum ApplyMode {
    Replace(String),
    Append(String),
}

pub enum ChatStatus {
    Idle,
    Waiting,
    Done(String),
    Error(String),
}

// ── State ────────────────────────────────────────────────────────────────────

#[derive(Default)]
pub struct AiChatState {
    pub history: Vec<ChatMessage>,
    pub input_buf: String,
    /// SMILES waiting for user confirmation (Replace / Append).
    pub pending_smiles: Option<String>,
    pending: Option<SharedResult>,
    // show_key is managed by SettingsPanel via settings_show_key in ChemDrawApp
    /// Cached error to display below the input bar.
    pub last_error: Option<String>,
}

impl AiChatState {
    /// Poll the background thread for a result.
    pub fn poll(&mut self) -> ChatStatus {
        let finished = if let Some(shared) = &self.pending {
            if let Ok(mut g) = shared.try_lock() {
                g.take()
            } else {
                None
            }
        } else {
            None
        };

        if let Some(result) = finished {
            self.pending = None;
            return match result {
                Ok(text) => ChatStatus::Done(text),
                Err(msg) => ChatStatus::Error(msg),
            };
        }

        if self.pending.is_some() {
            return ChatStatus::Waiting;
        }
        ChatStatus::Idle
    }

    /// Send a message to the Anthropic Messages API on a background thread.
    pub fn send(
        &mut self,
        user_msg: &str,
        current_smiles: Option<&str>,
        api_key: &str,
        model: &str,
    ) {
        if self.pending.is_some() {
            return;
        } // already in flight

        self.history.push(ChatMessage {
            role: Role::User,
            content: user_msg.to_string(),
            smiles: None,
        });
        self.last_error = None;

        let shared: SharedResult = Arc::new(Mutex::new(None));
        let shared_clone = Arc::clone(&shared);

        let user_msg = user_msg.to_string();
        let api_key = api_key.to_string();
        let model = model.to_string();
        let canvas_ctx = current_smiles.map(|s| s.to_string());
        // Build history for the API call (last 20 messages to stay within context)
        let history_snapshot: Vec<(String, String)> = self
            .history
            .iter()
            .rev()
            .take(20)
            .rev()
            .map(|m| {
                (
                    if m.role == Role::User {
                        "user".into()
                    } else {
                        "assistant".into()
                    },
                    m.content.clone(),
                )
            })
            .collect();

        std::thread::spawn(move || {
            let result = call_anthropic(
                &user_msg,
                canvas_ctx.as_deref(),
                &api_key,
                &model,
                &history_snapshot,
            );
            if let Ok(mut g) = shared_clone.lock() {
                *g = Some(result);
            }
        });

        self.pending = Some(shared);
    }

    pub fn clear(&mut self) {
        self.history.clear();
        self.pending_smiles = None;
        self.last_error = None;
        self.pending = None;
    }

    pub fn is_waiting(&self) -> bool {
        self.pending.is_some()
    }
}

// ── UI ───────────────────────────────────────────────────────────────────────

pub struct AiChatPanel;

impl AiChatPanel {
    /// Draw the chat panel. Returns `Some(ApplyMode)` when the user confirms a SMILES.
    pub fn show(
        ui: &mut Ui,
        state: &mut AiChatState,
        api_key: &str,
        model: &str,
        current_smiles: Option<&str>,
        tokens: &Tokens,
    ) -> Option<ApplyMode> {
        let mut apply_result: Option<ApplyMode> = None;

        // API key warning
        if api_key.is_empty() {
            ui.colored_label(tokens.warning, "⚠ API key not set — open View > Settings");
            ui.separator();
        }

        // Message history
        let history_height = ui.available_height() - 64.0;
        egui::ScrollArea::vertical()
            .id_salt("chat_scroll")
            .max_height(history_height.max(60.0))
            .stick_to_bottom(true)
            .show(ui, |ui| {
                for msg in &state.history {
                    let (prefix, color) = match msg.role {
                        Role::User => ("You", tokens.accent),
                        Role::Assistant => ("AI", tokens.success),
                    };
                    ui.horizontal_wrapped(|ui| {
                        ui.label(egui::RichText::new(prefix).strong().color(color));
                        ui.label(": ");
                        ui.label(&msg.content);
                    });
                    ui.add_space(SPACING_SM);
                }
                if state.is_waiting() {
                    ui.horizontal(|ui| {
                        ui.spinner();
                        ui.label(
                            egui::RichText::new("Thinking…")
                                .italics()
                                .color(tokens.separator),
                        );
                    });
                }
            });

        // SMILES confirm bar
        if let Some(smiles) = state.pending_smiles.clone() {
            ui.separator();
            let preview = if smiles.len() > 44 {
                format!("{}…", &smiles[..44])
            } else {
                smiles.clone()
            };
            ui.horizontal_wrapped(|ui| {
                ui.label(
                    egui::RichText::new(format!("SMILES: {preview}"))
                        .monospace()
                        .small(),
                );
            });
            ui.horizontal(|ui| {
                if ui
                    .button("↺ 置き換え")
                    .on_hover_text("現在の構造を置き換えます")
                    .clicked()
                {
                    apply_result = Some(ApplyMode::Replace(smiles.clone()));
                    state.pending_smiles = None;
                }
                if ui
                    .button("＋ 追加")
                    .on_hover_text("現在の構造に追加します")
                    .clicked()
                {
                    apply_result = Some(ApplyMode::Append(smiles.clone()));
                    state.pending_smiles = None;
                }
                if ui.small_button("X").clicked() {
                    state.pending_smiles = None;
                }
            });
        }

        // Error display
        if let Some(err) = &state.last_error.clone() {
            ui.colored_label(tokens.error, format!("⚠ {err}"));
        }

        // Input row
        ui.separator();
        ui.horizontal(|ui| {
            let send_clicked = ui
                .add_enabled(
                    !state.is_waiting() && !api_key.is_empty(),
                    egui::Button::new("Send"),
                )
                .clicked();

            let input = ui.add(
                egui::TextEdit::singleline(&mut state.input_buf)
                    .hint_text("Ask AI to draw a molecule…")
                    .desired_width(f32::INFINITY),
            );
            let enter_pressed = input.lost_focus() && ui.input(|i| i.key_pressed(egui::Key::Enter));

            if (send_clicked || enter_pressed) && !state.input_buf.trim().is_empty() {
                let msg = state.input_buf.trim().to_string();
                state.input_buf.clear();
                state.send(&msg, current_smiles, api_key, model);
                input.request_focus();
            }

            if ui
                .small_button("Clear")
                .on_hover_text("Clear chat history")
                .clicked()
            {
                state.clear();
            }
        });

        apply_result
    }
}

// ── API call ─────────────────────────────────────────────────────────────────

fn call_anthropic(
    _user_msg: &str,
    current_smiles: Option<&str>,
    api_key: &str,
    model: &str,
    history: &[(String, String)],
) -> Result<String, String> {
    let canvas_info = match current_smiles {
        Some(s) if !s.is_empty() => format!("Current molecule on canvas (SMILES): {s}"),
        _ => "No molecule on canvas currently.".to_string(),
    };

    let system_prompt = format!(
        "You are a chemistry assistant integrated into a molecular structure drawing tool \
         called chematic-draw.\n\
         {canvas_info}\n\n\
         Rules:\n\
         1. When asked to DRAW a molecule, output 'SMILES: <smiles_string>' on its own line \
            (using canonical SMILES), followed by a brief explanation.\n\
         2. When asked about the current molecule, use the SMILES above as context.\n\
         3. Reply in the SAME LANGUAGE as the user (Japanese if they write in Japanese).\n\
         4. Keep replies concise."
    );

    // Build messages array from history (the last entry is already the current user message)
    let messages: Vec<serde_json::Value> = history
        .iter()
        .map(|(role, content)| serde_json::json!({"role": role, "content": content}))
        .collect();

    // Deduplicate: if the last message is already the user_msg, skip adding it again.
    // (history already includes the pushed user message from send())
    let body = serde_json::json!({
        "model": model,
        "max_tokens": 1024,
        "system": system_prompt,
        "messages": messages,
    });

    let client = reqwest::blocking::Client::new();
    let resp = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .map_err(|e| format!("Network error: {e}"))?;

    let status = resp.status();
    let json: serde_json::Value = resp.json().map_err(|e| e.to_string())?;

    if !status.is_success() {
        let err_msg = json
            .pointer("/error/message")
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown API error");
        return Err(format!("API error {status}: {err_msg}"));
    }

    let text = json
        .pointer("/content/0/text")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Unexpected API response format".to_string())?
        .to_string();

    Ok(text)
}

/// Extract `SMILES: <value>` from the first matching line in an AI response.
pub fn extract_smiles(text: &str) -> Option<String> {
    text.lines()
        .find(|l| l.to_lowercase().starts_with("smiles:"))
        .map(|l| l["smiles:".len()..].trim().to_string())
        .filter(|s| !s.is_empty())
}
