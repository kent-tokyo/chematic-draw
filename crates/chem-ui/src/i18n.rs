use std::collections::HashMap;

#[derive(Clone, Copy, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
pub enum Language {
    En,
    Ja,
}

impl Default for Language {
    fn default() -> Self {
        Self::En
    }
}

impl Language {
    pub fn label(self) -> &'static str {
        match self {
            Self::En => "English",
            Self::Ja => "日本語",
        }
    }
}

pub struct I18n {
    lang: Language,
    strings: HashMap<String, String>,
}

impl I18n {
    pub fn new(lang: Language) -> Self {
        let mut s = Self {
            lang,
            strings: HashMap::new(),
        };
        s.load(lang);
        s
    }

    pub fn set_language(&mut self, lang: Language) {
        if self.lang != lang {
            self.lang = lang;
            self.load(lang);
        }
    }

    pub fn lang(&self) -> Language {
        self.lang
    }

    /// Get a localised string by dot-separated key, falling back to the key itself.
    pub fn t<'a>(&'a self, key: &'a str) -> &'a str {
        self.strings.get(key).map(|s| s.as_str()).unwrap_or(key)
    }

    fn load(&mut self, lang: Language) {
        let src = match lang {
            Language::En => include_str!("../../../i18n/en.toml"),
            Language::Ja => include_str!("../../../i18n/ja.toml"),
        };
        self.strings = parse_toml_flat(src);
    }
}

/// Parse a flat (non-nested) TOML file into a key→value map.
/// For nested tables we join keys with "." e.g. [menu.file] key = "val" → "menu.file.key".
fn parse_toml_flat(src: &str) -> HashMap<String, String> {
    let mut map = HashMap::new();
    let mut prefix = String::new();

    for line in src.lines() {
        // Strip leading/trailing whitespace and drop inline comments.
        let line = line.trim();
        let line = match line.find('#') {
            Some(pos) => line[..pos].trim(),
            None => line,
        };
        if line.is_empty() {
            continue;
        }
        if line.starts_with('[') && line.ends_with(']') {
            prefix = line[1..line.len() - 1].to_string();
        } else if let Some((k, v)) = line.split_once('=') {
            let k = k.trim().trim_matches('"');
            let key = if prefix.is_empty() {
                k.to_string()
            } else {
                format!("{}.{}", prefix, k)
            };
            let val = v.trim().trim_matches('"').to_string();
            map.insert(key, val);
        }
    }
    map
}
