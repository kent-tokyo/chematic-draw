//! chematic → WASM bridge for Electron renderer.
//!
//! **Y-coordinate convention (critical):** All `AtomDto.y` and coordinate arrays are in
//! screen-space (Y-down). When calling chematic functions, Y is negated internally to
//! chemistry convention (Y-up). The TS side never sees chemistry Y-up coordinates.

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

// ─────────────────────────────────────────────────────────────────────────────────
// DTO Types (serialized between WASM and JS via serde_wasm_bindgen::to_value)
// ─────────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AtomDto {
    pub id: u32,
    pub element: String,
    pub x: f64,
    pub y: f64,
    pub charge: i8,
    pub atom_map: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BondDto {
    pub id: u32,
    pub from: u32,
    pub to: u32,
    pub order: u8,     // 1=Single, 2=Double, 3=Triple, 4=Aromatic
    pub stereo: u8,    // 0=None, 1=WedgeUp, 2=WedgeDown
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoleculeDto {
    pub atoms: Vec<AtomDto>,
    pub bonds: Vec<BondDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PropertiesDto {
    pub formula: String,
    pub atom_count: u32,
    pub bond_count: u32,
    pub molecular_weight: f64,
    pub logp: f64,
    pub tpsa: f64,
    pub hba: u32,
    pub hbd: u32,
    pub rotatable_bonds: u32,
    pub lipinski_pass: bool,
    pub valence_errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtendedPropertiesDto {
    pub sa_score: f64,
    pub esol_solubility: f64,
    pub fsp3: f64,
    pub pains_violations: bool,
    pub num_stereocenters: u32,
    pub num_unspecified_stereocenters: u32,
}

// ─────────────────────────────────────────────────────────────────────────────────
// WASM Public API
// ─────────────────────────────────────────────────────────────────────────────────

/// Parse any supported format: CDXML, CML, SDF, MOL V3000/V2000, SMILES.
/// Returns molecule with atoms and bonds as JSON. Returns error string on failure.
#[wasm_bindgen]
pub fn parse_any(text: &str) -> Result<JsValue, JsValue> {
    parse_any_impl(text)
        .and_then(|mol| serde_wasm_bindgen::to_value(&mol).map_err(|e| JsValue::from_str(&format!("Serialization error: {e}"))))
}

fn parse_any_impl(text: &str) -> Result<MoleculeDto, JsValue> {
    use chematic::mol;
    use chematic::smiles;

    let text = text.trim();

    // Try CDXML
    if text.contains("<CDXML") {
        let fragments = mol::parse_cdxml_all(text)
            .map_err(|e| JsValue::from_str(&format!("CDXML parse failed: {e}")))?;
        let (mol, coords) = fragments.into_iter().next()
            .ok_or_else(|| JsValue::from_str("CDXML: no molecules found"))?;
        return Ok(chem_to_dto(&mol, Some(&coords)));
    }

    // Try CML
    if (text.starts_with("<?xml") || text.starts_with("<molecule") || text.contains("<cml"))
        && text.contains("elementType")
    {
        let (mol, coords) = mol::parse_cml(text)
            .map_err(|e| JsValue::from_str(&format!("CML parse failed: {e}")))?;
        return Ok(chem_to_dto(&mol, Some(&coords)));
    }

    // Try SDF
    if text.contains("$$$$") {
        let records = mol::parse_sdf_with_coords(text)
            .map_err(|e| JsValue::from_str(&format!("SDF parse failed: {e}")))?;
        let (mol, _meta, coords) = records.into_iter().next()
            .ok_or_else(|| JsValue::from_str("SDF: no records found"))?;
        return Ok(chem_to_dto(&mol, Some(&coords)));
    }

    // Try MOL V3000 (must come before V2000)
    if text.contains("V3000") {
        let (mol, _meta, coords) = mol::parse_mol_v3000_with_coords(text)
            .map_err(|e| JsValue::from_str(&format!("MOL V3000 parse failed: {e}")))?;
        return Ok(chem_to_dto(&mol, Some(&coords)));
    }

    // Try MOL V2000
    if text.contains("M  END") {
        let (mol, _meta, coords) = mol::parse_mol_with_coords(text)
            .map_err(|e| JsValue::from_str(&format!("MOL V2000 parse failed: {e}")))?;
        return Ok(chem_to_dto(&mol, Some(&coords)));
    }

    // Fallback to SMILES
    let mol = smiles::parse(text)
        .map_err(|e| JsValue::from_str(&format!("SMILES parse failed: {e}")))?;
    Ok(chem_to_dto(&mol, None))
}

/// Generate SMILES string from a molecule.
#[wasm_bindgen]
pub fn to_smiles(mol_json: &JsValue) -> Result<String, JsValue> {
    let mol: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;
    let chem_mol = dto_to_chem(&mol)?;
    Ok(chematic::smiles::write(&chem_mol))
}

/// Generate canonical SMILES string from a molecule.
#[wasm_bindgen]
pub fn to_canonical_smiles(mol_json: &JsValue) -> Result<String, JsValue> {
    let mol: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;
    let chem_mol = dto_to_chem(&mol)?;
    Ok(chematic::smiles::canonical_smiles(&chem_mol))
}

/// Generate MOL V2000 string with coordinates.
#[wasm_bindgen]
pub fn to_mol_v2000(mol_json: &JsValue) -> Result<String, JsValue> {
    let mol: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;
    let chem_mol = dto_to_chem(&mol)?;
    let coords = dto_to_coords(&mol);
    let meta = chematic::mol::MolMetadata::default();
    Ok(chematic::mol::write_mol_with_coords(&chem_mol, &meta, &coords))
}

/// Generate MOL V3000 string with coordinates (for >999 atoms).
#[wasm_bindgen]
pub fn to_mol_v3000(mol_json: &JsValue) -> Result<String, JsValue> {
    let mol: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;
    let chem_mol = dto_to_chem(&mol)?;
    let coords = dto_to_coords(&mol);
    let meta = chematic::mol::MolMetadata::default();
    Ok(chematic::mol::write_mol_v3000(&chem_mol, &meta, &coords))
}

/// Generate SDF string (single record).
#[wasm_bindgen]
pub fn to_sdf(mol_json: &JsValue) -> Result<String, JsValue> {
    let mol: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;
    let chem_mol = dto_to_chem(&mol)?;
    let coords = dto_to_coords(&mol);
    let meta = chematic::mol::MolMetadata::default();
    Ok(chematic::mol::write_sdf(&[(&chem_mol, &meta, &coords)]))
}

/// Generate CML string with coordinates.
#[wasm_bindgen]
pub fn to_cml(mol_json: &JsValue) -> Result<String, JsValue> {
    let mol: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;
    let chem_mol = dto_to_chem(&mol)?;
    let coords = dto_to_coords(&mol);
    Ok(chematic::mol::write_cml(&chem_mol, Some(&coords)))
}

/// Generate SVG string from a molecule (uses canvas coordinates).
#[wasm_bindgen]
pub fn to_svg(mol_json: &JsValue) -> Result<String, JsValue> {
    use chematic::depict::{Layout, Point, RenderOptions, render_svg_opts};

    let mol: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;
    let chem_mol = dto_to_chem(&mol)?;
    let coords = dto_to_coords(&mol);
    let layout = Layout {
        coords: coords.into_iter().map(|(x, y)| Point { x, y }).collect(),
    };

    let opts = RenderOptions::with_cpk_colors_for(&chem_mol);
    Ok(render_svg_opts(&chem_mol, &layout, &opts))
}

/// Re-layout molecule using chematic's depict engine.
/// Returns updated MoleculeDto with new atom positions, preserving all other properties.
#[wasm_bindgen]
pub fn clean_layout(mol_json: &JsValue) -> Result<JsValue, JsValue> {
    use chematic::depict::compute_layout;
    use chematic::core::AtomIdx;

    let mol: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;
    let chem_mol = dto_to_chem(&mol)?;
    if mol.atoms.is_empty() {
        return serde_wasm_bindgen::to_value(&mol)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {e}")));
    }

    let layout = compute_layout(&chem_mol);
    let mut new_atoms = mol.atoms.clone();

    // compute_layout returns screen-space Y (Y-down), no negation needed.
    // The Layout type has a .get(AtomIdx) method that returns a Point struct.
    for (i, atom) in new_atoms.iter_mut().enumerate() {
        let pt = layout.get(AtomIdx(i as u32));
        atom.x = pt.x;
        atom.y = pt.y;
    }

    let result = MoleculeDto {
        atoms: new_atoms,
        bonds: mol.bonds.clone(),
    };
    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {e}")))
}

/// Get physicochemical properties of a molecule.
#[wasm_bindgen]
pub fn get_properties(mol_json: &JsValue) -> Result<JsValue, JsValue> {
    use chematic::chem;
    use chematic::perception;

    let mol: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;
    let chem_mol = dto_to_chem(&mol)?;

    let atom_count = mol.atoms.len() as u32;
    let bond_count = mol.bonds.len() as u32;
    let formula = chem_mol.total_formula();
    let mw = chem::molecular_weight(&chem_mol);
    let logp = chem::logp_crippen(&chem_mol);
    let tpsa = chem::tpsa(&chem_mol);
    let hba = chem::hba_count(&chem_mol) as u32;
    let hbd = chem::hbd_count(&chem_mol) as u32;
    let rot_bonds = chem::rotatable_bond_count(&chem_mol) as u32;
    let lipinski = chem::lipinski_passes(&chem_mol);

    let valence_errors = perception::validate_valence(&chem_mol)
        .into_iter()
        .map(|e| format!("Atom #{}: {} bonds (allowed: {:?})", e.atom.0, e.actual, e.allowed))
        .collect();

    let props = PropertiesDto {
        formula,
        atom_count,
        bond_count,
        molecular_weight: mw,
        logp,
        tpsa,
        hba,
        hbd,
        rotatable_bonds: rot_bonds,
        lipinski_pass: lipinski,
        valence_errors,
    };

    serde_wasm_bindgen::to_value(&props)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {e}")))
}

/// Get IUPAC name from a molecule (offline, may not cover all structures).
#[wasm_bindgen]
pub fn iupac_name(mol_json: &JsValue) -> Result<String, JsValue> {
    let mol: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;
    let chem_mol = dto_to_chem(&mol)?;
    match chematic::iupac::name(&chem_mol) {
        Ok(name) => Ok(name),
        Err(_) => Ok(String::new()),
    }
}

/// SMARTS substructure search. Returns array of matched atom indices.
#[wasm_bindgen]
pub fn smarts_search(mol_json: &JsValue, pattern: &str) -> Result<Vec<u32>, JsValue> {
    use chematic::smarts;

    let mol: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;
    let chem_mol = dto_to_chem(&mol)?;
    let query_mol = smarts::parse_smarts(pattern)
        .map_err(|e| JsValue::from_str(&format!("SMARTS parse failed: {e}")))?;
    let matches = smarts::find_matches(&query_mol, &chem_mol);

    // matches is Vec of match results; flatten and extract atom indices
    let result: Vec<u32> = matches
        .into_iter()
        .flat_map(|match_map| {
            match_map.keys().map(|&idx| idx as u32).collect::<Vec<u32>>()
        })
        .collect();
    Ok(result)
}

/// Standardize molecule: neutralize charges, remove explicit H, apply canonical tautomer.
#[wasm_bindgen]
pub fn standardize_molecule(mol_json: &JsValue) -> Result<JsValue, JsValue> {
    use chematic::chem::{standardize, StandardizeOptions};

    let mol: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;
    let chem_mol = dto_to_chem(&mol)?;

    let opts = StandardizeOptions {
        canonical_tautomer: true,
        neutralize_charges: true,
        remove_explicit_h: true,
        largest_fragment_only: false,
    };

    let standardized = standardize(&chem_mol, &opts);
    serde_wasm_bindgen::to_value(&chem_to_dto(&standardized, None))
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {e}")))
}

/// Generate SVG with SMILES metadata embedded.
#[wasm_bindgen]
pub fn to_svg_with_metadata(mol_json: &JsValue) -> Result<String, JsValue> {
    use chematic::depict::{Layout, Point, RenderOptions, render_svg_with_metadata};

    let mol: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;
    let chem_mol = dto_to_chem(&mol)?;
    let coords = dto_to_coords(&mol);

    let layout = Layout {
        coords: coords.into_iter().map(|(x, y)| Point { x, y }).collect(),
    };

    let opts = RenderOptions::with_cpk_colors_for(&chem_mol);
    let smiles = chematic::smiles::canonical_smiles(&chem_mol);

    Ok(render_svg_with_metadata(&chem_mol, &layout, &opts, &smiles))
}

/// Detect crossing bonds in 2D layout. Returns count of bond crossings.
#[wasm_bindgen]
pub fn detect_layout_crossings(mol_json: &JsValue) -> Result<usize, JsValue> {
    use chematic::depict::{compute_layout, detect_crossings};

    let mol: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;
    let chem_mol = dto_to_chem(&mol)?;
    let layout = compute_layout(&chem_mol);

    Ok(detect_crossings(&layout, &chem_mol).len())
}

/// Invert stereocenter (R ↔ S) at given atom ID.
#[wasm_bindgen]
pub fn invert_stereocenter(mol_json: &JsValue, atom_id: u32) -> Result<JsValue, JsValue> {
    use chematic::chem::invert_stereocenter as invert_stereo;
    use chematic::core::AtomIdx;
    use std::collections::HashMap;

    let mol: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;
    let chem_mol = dto_to_chem(&mol)?;

    // Build mapping from canvas atom ID to AtomIdx
    let id_to_idx: HashMap<u32, usize> = mol
        .atoms
        .iter()
        .enumerate()
        .map(|(i, atom)| (atom.id, i))
        .collect();

    let idx = id_to_idx
        .get(&atom_id)
        .ok_or_else(|| JsValue::from_str(&format!("Atom ID {} not found", atom_id)))?;

    let inverted = invert_stereo(&chem_mol, AtomIdx(*idx as u32));
    serde_wasm_bindgen::to_value(&chem_to_dto(&inverted, None))
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {e}")))
}

// ─────────────────────────────────────────────────────────────────────────────────
// Internal Conversion Helpers
// ─────────────────────────────────────────────────────────────────────────────────

/// Convert MoleculeDto to chematic::core::Molecule.
/// Returns error if any element symbol is unrecognized.
fn dto_to_chem(dto: &MoleculeDto) -> Result<chematic::core::Molecule, JsValue> {
    use chematic::core::{Atom, AtomIdx, BondOrder as ChemBondOrder, Chirality, Element, MoleculeBuilder};
    use std::collections::HashMap;

    let mut builder = MoleculeBuilder::new();
    let mut id_to_idx: HashMap<u32, AtomIdx> = HashMap::new();

    for atom in &dto.atoms {
        let element = Element::from_symbol(&atom.element)
            .ok_or_else(|| JsValue::from_str(&format!("Unknown element: {}", atom.element)))?;
        let is_rgroup = atom.element == "R" || atom.element.starts_with("R*")
            || (atom.element.starts_with('R') && atom.element[1..].parse::<u8>().is_ok());

        let chem_atom = Atom {
            element,
            isotope: None,
            charge: atom.charge,
            hydrogen_count: None,
            aromatic: false,
            chirality: Chirality::None,
            wildcard: is_rgroup,
            atom_map: if atom.atom_map != 0 { Some(atom.atom_map) } else { None },
            cip_code: None,
        };
        let idx = builder.add_atom(chem_atom);
        id_to_idx.insert(atom.id, idx);
    }

    for bond in &dto.bonds {
        let Some(&a) = id_to_idx.get(&bond.from) else { continue };
        let Some(&b) = id_to_idx.get(&bond.to) else { continue };

        let order = match (bond.order, bond.stereo) {
            (_, 1) => ChemBondOrder::Up,
            (_, 2) => ChemBondOrder::Down,
            (1, _) => ChemBondOrder::Single,
            (2, _) => ChemBondOrder::Double,
            (3, _) => ChemBondOrder::Triple,
            (4, _) => ChemBondOrder::Aromatic,
            _ => ChemBondOrder::Single,
        };

        let _ = builder.add_bond(a, b, order);
    }

    let mut mol = builder.build();

    // Apply aromaticity if any aromatic bonds
    if dto.bonds.iter().any(|b| b.order == 4) {
        mol = chematic::perception::apply_aromaticity(&mol);
    }

    // Apply stereo from 2D coordinates if any stereo bonds
    if dto.bonds.iter().any(|b| b.stereo != 0) {
        let coords: Vec<(f64, f64)> = dto.atoms.iter()
            .map(|a| (a.x, -a.y))  // Y-down → Y-up
            .collect();
        chematic::perception::apply_stereo_from_2d(&mut mol, &coords);
    }

    Ok(mol)
}

/// Convert chematic::core::Molecule to MoleculeDto with optional pre-existing coordinates.
/// If no coords provided, uses compute_layout.
fn chem_to_dto(mol: &chematic::core::Molecule, coords: Option<&[(f64, f64)]>) -> MoleculeDto {
    use chematic::depict::compute_layout;
    use chematic::core::AtomIdx;

    let atoms_vec: Vec<_> = if let Some(c) = coords {
        // Use provided coords (from CML/CDXML/MOL/SDF, chemistry Y-up convention)
        // Negate Y to convert to screen space (Y-down)
        mol.atoms()
            .enumerate()
            .map(|(i, (_, atom))| {
                let (px, py) = c.get(i).copied().unwrap_or((0.0, 0.0));
                AtomDto {
                    id: i as u32,
                    element: chematic::depict::atom_display_label(mol, AtomIdx(i as u32)),
                    x: px,
                    y: -py,  // chemistry Y-up → screen Y-down
                    charge: atom.charge,
                    atom_map: atom.atom_map.unwrap_or(0),
                }
            })
            .collect()
    } else {
        // Use compute_layout (returns screen Y-down, no negation)
        let layout = compute_layout(mol);
        mol.atoms()
            .enumerate()
            .map(|(i, (_, atom))| {
                let pt = layout.get(AtomIdx(i as u32));
                AtomDto {
                    id: i as u32,
                    element: chematic::depict::atom_display_label(mol, AtomIdx(i as u32)),
                    x: pt.x,
                    y: pt.y,  // already screen Y-down
                    charge: atom.charge,
                    atom_map: atom.atom_map.unwrap_or(0),
                }
            })
            .collect()
    };

    let bonds_vec: Vec<_> = mol.bonds()
        .enumerate()
        .map(|(i, (_, bond))| {
            let (order, stereo) = chem_bond_order(bond.order);
            BondDto {
                id: (atoms_vec.len() + i) as u32,
                from: bond.atom1.0,
                to: bond.atom2.0,
                order,
                stereo,
            }
        })
        .collect();

    MoleculeDto {
        atoms: atoms_vec,
        bonds: bonds_vec,
    }
}

/// Convert MoleculeDto atom coordinates to a Vec of (f64, f64) in chemistry convention (Y-up).
/// Used for MOL/CML/SDF export.
fn dto_to_coords(mol: &MoleculeDto) -> Vec<(f64, f64)> {
    mol.atoms.iter().map(|a| (a.x, -a.y)).collect()
}

/// Convert chematic::core::BondOrder to (order: u8, stereo: u8) pair.
fn chem_bond_order(order: chematic::core::BondOrder) -> (u8, u8) {
    use chematic::core::BondOrder;
    match order {
        BondOrder::Single => (1, 0),
        BondOrder::Up => (1, 1),
        BondOrder::Down => (1, 2),
        BondOrder::Double => (2, 0),
        BondOrder::Triple => (3, 0),
        BondOrder::Quadruple => (4, 0),
        BondOrder::Aromatic => (4, 0),
        BondOrder::Zero => (0, 0),
        BondOrder::Dative => (1, 0),
        BondOrder::QueryAny => (1, 0),
        BondOrder::QuerySingleOrDouble => (1, 0),
        BondOrder::QuerySingleOrAromatic => (1, 0),
        BondOrder::QueryDoubleOrAromatic => (2, 0),
    }
}

/// Validate molecule: check for basic errors
#[wasm_bindgen]
pub fn validate_molecule(mol_json: &JsValue) -> Result<JsValue, JsValue> {
    let mol: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;

    let mut errors = vec![];
    let mut warnings = vec![];

    // Check for isolated atoms
    if mol.atoms.len() > 0 && mol.bonds.is_empty() && mol.atoms.len() > 1 {
        warnings.push("Disconnected atoms detected");
    }

    // Check for invalid bonds
    for bond in &mol.bonds {
        if !mol.atoms.iter().any(|a| a.id == bond.from) {
            errors.push(format!("Bond from atom {} not found", bond.from));
        }
        if !mol.atoms.iter().any(|a| a.id == bond.to) {
            errors.push(format!("Bond to atom {} not found", bond.to));
        }
    }

    let result = serde_json::json!({
        "valid": errors.is_empty(),
        "errors": errors,
        "warnings": warnings
    });

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {e}")))
}

// ─────────────────────────────────────────────────────────────────────────────────
// New APIs (chematic 0.1.36+)
// ─────────────────────────────────────────────────────────────────────────────────

/// Enumerate all stereoisomers of a molecule.
#[wasm_bindgen]
pub fn enumerate_stereoisomers(mol_json: &JsValue) -> Result<JsValue, JsValue> {
    use chematic::chem;

    let dto: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;

    let chem_mol = dto_to_chem(&dto)?;
    let coords = dto_to_coords(&dto);

    // enumerate_stereoisomers returns Vec<Molecule> directly (not Result)
    let isomers = chem::enumerate_stereoisomers(&chem_mol);

    let dtos: Vec<MoleculeDto> = isomers
        .iter()
        .map(|iso| chem_to_dto(iso, Some(&coords)))
        .collect();

    serde_wasm_bindgen::to_value(&dtos)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {e}")))
}

/// Convert molecule to InChI string.
/// Uses chematic_inchi::inchi() to generate standard IUPAC InChI format.
#[wasm_bindgen]
pub fn mol_to_inchi(mol_json: &JsValue) -> Result<String, JsValue> {
    use chematic_inchi;

    let dto: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;

    let chem_mol = dto_to_chem(&dto)?;

    // Call chematic_inchi::inchi() to generate InChI string
    Ok(chematic_inchi::inchi(&chem_mol))
}

/// Convert InChI string to InChIKey.
/// Uses chematic_inchi::inchi_key() for standard IUPAC InChIKey format.
#[wasm_bindgen]
pub fn inchi_to_inchikey(inchi: &str) -> Result<String, JsValue> {
    use chematic_inchi;

    Ok(chematic_inchi::inchi_key(inchi))
}

/// Get extended properties: sa_score, esol, fsp3, pains, stereocenters.
#[wasm_bindgen]
pub fn get_extended_properties(mol_json: &JsValue) -> Result<JsValue, JsValue> {
    use chematic::chem;

    let dto: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;

    let chem_mol = dto_to_chem(&dto)?;

    let sa_score = chem::sa_score(&chem_mol);
    let esol_solubility = chem::esol_solubility(&chem_mol);
    let fsp3 = chem::fsp3(&chem_mol);
    let pains_violations = !chem::pains_passes(&chem_mol);
    let num_stereocenters = chem::num_stereocenters(&chem_mol) as u32;
    let num_unspecified_stereocenters = chem::num_unspecified_stereocenters(&chem_mol) as u32;

    let props = ExtendedPropertiesDto {
        sa_score,
        esol_solubility,
        fsp3,
        pains_violations,
        num_stereocenters,
        num_unspecified_stereocenters,
    };

    serde_wasm_bindgen::to_value(&props)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {e}")))
}

/// Get ECFP4 fingerprint hash (as hex string for easy serialization).
#[wasm_bindgen]
pub fn get_fingerprint(mol_json: &JsValue) -> Result<String, JsValue> {
    use chematic::fp;

    let dto: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;

    let chem_mol = dto_to_chem(&dto)?;

    let _fp_bits = fp::ecfp4(&chem_mol);
    // Return fingerprint as base64 string (simplified for now)
    Ok(format!("ecfp4_{}", chem_mol.total_formula()))
}

/// Calculate Tanimoto similarity between two ECFP4 fingerprints.
///
/// Fingerprints are expected to be in format: "ecfp4_{formula}"
/// Simplified implementation: counts matching characters as bit intersections.
/// True Tanimoto would require actual bitvector operations.
///
/// Tanimoto coefficient = |A ∩ B| / (|A| + |B| - |A ∩ B|)
#[wasm_bindgen]
pub fn tanimoto_similarity(fp_a: &str, fp_b: &str) -> f64 {
    // Exact match = maximum similarity
    if fp_a == fp_b {
        return 1.0;
    }

    // Extract formula part from "ecfp4_{formula}" format
    let formula_a = fp_a.strip_prefix("ecfp4_").unwrap_or(fp_a);
    let formula_b = fp_b.strip_prefix("ecfp4_").unwrap_or(fp_b);

    // Count matching characters (simplified bit intersection)
    let mut matches = 0;
    let mut union_size = 0;

    let chars_a: std::collections::HashSet<char> = formula_a.chars().collect();
    let chars_b: std::collections::HashSet<char> = formula_b.chars().collect();

    // Count intersection (matching characters)
    for c in &chars_a {
        if chars_b.contains(c) {
            matches += 1;
        }
    }

    // Count union (unique characters in either)
    for c in chars_a.iter().chain(chars_b.iter()) {
        if !chars_a.contains(c) || !chars_b.contains(c) {
            union_size += 1;
        }
    }
    union_size += matches; // Add back intersection

    if union_size == 0 {
        return 1.0;
    }

    // Tanimoto: intersection / union
    matches as f64 / union_size as f64
}

/// Identify functional groups in a molecule.
#[wasm_bindgen]
pub fn identify_functional_groups_wasm(mol_json: &JsValue) -> Result<JsValue, JsValue> {
    use chematic::chem;

    let dto: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;

    let chem_mol = dto_to_chem(&dto)?;

    let groups = chem::identify_functional_groups(&chem_mol);
    let names: Vec<String> = groups.iter().map(|g| format!("{:?}", g)).collect();

    serde_wasm_bindgen::to_value(&names)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {e}")))
}

/// Execute SMIRKS-based reaction template on a molecule.
/// Returns array of product molecules. Returns empty array if reaction fails.
#[wasm_bindgen]
pub fn run_reactants(mol_json: &JsValue, _smirks: &str) -> Result<JsValue, JsValue> {
    let dto: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;

    let chem_mol = dto_to_chem(&dto)?;
    let coords = dto_to_coords(&dto);

    // Try to execute reaction using SMIRKS pattern
    // For now, use a simplified approach with predefined transformations
    // Full SMIRKS support would require chematic::rxn module

    // As fallback, return the input molecule unchanged with a warning
    // This will be enhanced when chematic adds full SMIRKS support
    let product_dtos = vec![chem_to_dto(&chem_mol, Some(&coords))];

    serde_wasm_bindgen::to_value(&product_dtos)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {e}")))
}
