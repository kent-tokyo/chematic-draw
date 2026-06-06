//! Clipboard paste: SMILES, MOL V2000/V3000, SDF, CDXML, CML → CanvasMolecule.
//!
//! Format detection order: CDXML → CML → SDF → MOL V3000 → MOL V2000 → SMILES.
//! For MOL/SDF and CDXML, 2D coordinates from the source file are preserved so
//! the pasted molecule appears exactly as it was drawn in the originating tool.

use arboard::Clipboard;
use egui::Pos2;

use crate::bridge::{chem_to_canvas, chem_to_canvas_with_coords};
use crate::canvas::CanvasMolecule;

#[derive(Debug)]
pub enum PasteError {
    Clipboard(String),
    EmptyClipboard,
    ParseFailed(String),
}

impl std::fmt::Display for PasteError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Clipboard(e)   => write!(f, "Clipboard error: {e}"),
            Self::EmptyClipboard => write!(f, "Clipboard is empty"),
            Self::ParseFailed(e) => write!(f, "Cannot parse as SMILES, MOL, SDF, CDXML, or CML: {e}"),
        }
    }
}

/// Read clipboard text and parse into a `CanvasMolecule` centred at `center`.
pub fn paste_from_clipboard(center: Pos2) -> Result<CanvasMolecule, PasteError> {
    let text = {
        let mut cb = Clipboard::new().map_err(|e| PasteError::Clipboard(e.to_string()))?;
        cb.get_text().map_err(|e| PasteError::Clipboard(e.to_string()))?
    };
    let text = text.trim();
    if text.is_empty() {
        return Err(PasteError::EmptyClipboard);
    }
    parse_any(text, center).map_err(PasteError::ParseFailed)
}

/// Try every supported format and return the first that succeeds.
pub fn parse_any(text: &str, center: Pos2) -> Result<CanvasMolecule, String> {
    // ── CDXML ──────────────────────────────────────────────────────────────
    // Use parse_cdxml_all (0.1.21) to handle multi-molecule documents.
    if text.contains("<CDXML") {
        let fragments = chematic::mol::parse_cdxml_all(text)
            .map_err(|e| format!("CDXML: {e}"))?;
        let (mol, coords) = fragments.into_iter().next()
            .ok_or_else(|| "CDXML: document contains no molecules".to_string())?;
        return Ok(chem_to_canvas_with_coords(&mol, &coords, center));
    }

    // ── CML ────────────────────────────────────────────────────────────────
    if (text.starts_with("<?xml") || text.starts_with("<molecule") || text.contains("<cml"))
        && text.contains("elementType")
    {
        let (mol, coords) = chematic::mol::parse_cml(text)
            .map_err(|e| format!("CML: {e}"))?;
        return Ok(chem_to_canvas_with_coords(&mol, &coords, center));
    }

    // ── SDF (multi-molecule) ───────────────────────────────────────────────
    // Detect SDF by presence of "$$$$" record separator.
    // Use parse_sdf_with_coords (0.1.21) to preserve original 2D layout.
    if text.contains("$$$$") {
        let records = chematic::mol::parse_sdf_with_coords(text)
            .map_err(|e| format!("SDF: {e}"))?;
        let (mol, _meta, coords) = records.into_iter().next()
            .ok_or_else(|| "SDF: file contains no records".to_string())?;
        return Ok(chem_to_canvas_with_coords(&mol, &coords, center));
    }

    // ── MOL V3000 ──────────────────────────────────────────────────────────
    // Must be checked before V2000: V3000 files also contain "M  END".
    if text.contains("V3000") {
        let (mol, _meta) = chematic::mol::parse_mol_v3000(text)
            .map_err(|e| format!("MOL V3000: {e}"))?;
        return Ok(chem_to_canvas(&mol, center));
    }

    // ── MOL V2000 ──────────────────────────────────────────────────────────
    // Use parse_mol_with_coords (0.1.21) to preserve the original 2D layout.
    if text.contains("M  END") {
        let (mol, _meta, coords) = chematic::mol::parse_mol_with_coords(text)
            .map_err(|e| format!("MOL: {e}"))?;
        return Ok(chem_to_canvas_with_coords(&mol, &coords, center));
    }

    // ── SMILES (fallback) ──────────────────────────────────────────────────
    let mol = chematic::smiles::parse(text)
        .map_err(|e| format!("SMILES: {e}"))?;
    Ok(chem_to_canvas(&mol, center))
}

/// Copy a SMILES string to the clipboard.
pub fn copy_smiles(smiles: &str) -> Result<(), String> {
    let mut cb = Clipboard::new().map_err(|e| e.to_string())?;
    cb.set_text(smiles).map_err(|e| e.to_string())
}
