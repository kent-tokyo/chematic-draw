//! Export helpers: SVG generation, MOL/SMILES string generation, file dialogs.

use crate::bridge::canvas_to_chem;
use crate::canvas::CanvasMolecule;

// ---------------------------------------------------------------------------
// SVG
// ---------------------------------------------------------------------------

/// Render the canvas state as an SVG string using chematic's depiction engine.
/// Returns `None` if the molecule contains unknown element symbols so the caller
/// can surface an error to the user instead of silently saving a blank file.
pub fn canvas_to_svg(mol: &CanvasMolecule) -> Option<String> {
    use chematic::depict::{Layout, Point, RenderOptions, render_svg_opts};

    let chem_mol = canvas_to_chem(mol)?;

    // Build a Layout from canvas atom positions (Y is negated: screen→chemistry coords).
    let coords = crate::bridge::canvas_coords(mol);
    let layout = Layout {
        coords: coords.into_iter().map(|(x, y)| Point { x, y }).collect(),
    };

    let opts = RenderOptions::with_cpk_colors_for(&chem_mol);
    Some(render_svg_opts(&chem_mol, &layout, &opts))
}

/// Generate a SMILES string for the canvas molecule.
/// Returns `None` if the molecule contains unrecognised element symbols.
pub fn canvas_to_smiles(mol: &CanvasMolecule) -> Option<String> {
    let chem_mol = canvas_to_chem(mol)?;
    Some(chematic::smiles::write(&chem_mol))
}

/// Generate a canonical SMILES string.
pub fn canvas_to_canonical_smiles(mol: &CanvasMolecule) -> Option<String> {
    let chem_mol = canvas_to_chem(mol)?;
    Some(chematic::smiles::canonical_smiles(&chem_mol))
}

/// Generate a MOL V2000 string with the user's canvas layout coordinates.
pub fn canvas_to_mol(mol: &CanvasMolecule) -> Option<String> {
    let chem_mol = canvas_to_chem(mol)?;
    let meta = chematic::mol::MolMetadata::default();
    let coords = crate::bridge::canvas_coords(mol);
    Some(chematic::mol::write_mol_with_coords(
        &chem_mol, &meta, &coords,
    ))
}

/// Generate a MOL V3000 string (supports >999 atoms).
pub fn canvas_to_mol_v3000(mol: &CanvasMolecule) -> Option<String> {
    let chem_mol = canvas_to_chem(mol)?;
    let meta = chematic::mol::MolMetadata::default();
    let coords = crate::bridge::canvas_coords(mol);
    Some(chematic::mol::write_mol_v3000(&chem_mol, &meta, &coords))
}

/// Generate a CML string with 2D coordinates.
pub fn canvas_to_cml(mol: &CanvasMolecule) -> Option<String> {
    let chem_mol = canvas_to_chem(mol)?;
    let coords = crate::bridge::canvas_coords(mol);
    Some(chematic::mol::write_cml(&chem_mol, Some(&coords)))
}

/// Generate an SDF string (single-record).
pub fn canvas_to_sdf(mol: &CanvasMolecule) -> Option<String> {
    let chem_mol = canvas_to_chem(mol)?;
    let meta = chematic::mol::MolMetadata::default();
    let coords = crate::bridge::canvas_coords(mol);
    Some(chematic::mol::write_sdf(&[(&chem_mol, &meta, &coords)]))
}
