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
    pub order: u8,  // 1=Single, 2=Double, 3=Triple, 4=Aromatic
    pub stereo: u8, // 0=None, 1=WedgeUp, 2=WedgeDown
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Atom3dDto {
    pub id: u32,
    pub element: String,
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Coords3dDto {
    pub atoms: Vec<Atom3dDto>,
}

// ─────────────────────────────────────────────────────────────────────────────────
// WASM Public API
// ─────────────────────────────────────────────────────────────────────────────────

/// Parse any supported format: CDXML, CML, SDF, MOL V3000/V2000, SMILES.
/// Returns molecule with atoms and bonds as JSON. Returns error string on failure.
#[wasm_bindgen]
pub fn parse_any(text: &str) -> Result<JsValue, JsValue> {
    parse_any_impl(text).and_then(|mol| {
        serde_wasm_bindgen::to_value(&mol)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {e}")))
    })
}

fn parse_any_impl(text: &str) -> Result<MoleculeDto, JsValue> {
    use chematic::mol;
    use chematic::smiles;

    let text = text.trim();

    // Try CDXML
    if text.contains("<CDXML") {
        let fragments = mol::parse_cdxml_all(text)
            .map_err(|e| JsValue::from_str(&format!("CDXML parse failed: {e}")))?;
        let (mol, coords) = fragments
            .into_iter()
            .next()
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
        let (mol, _meta, coords) = records
            .into_iter()
            .next()
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
    let mol =
        smiles::parse(text).map_err(|e| JsValue::from_str(&format!("SMILES parse failed: {e}")))?;
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
    Ok(chematic::mol::write_mol_with_coords(
        &chem_mol, &meta, &coords,
    ))
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
    use chematic::core::AtomIdx;
    use chematic::depict::compute_layout;

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
        .map(|e| {
            format!(
                "Atom #{}: {} bonds (allowed: {:?})",
                e.atom.0, e.actual, e.allowed
            )
        })
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
            match_map
                .keys()
                .map(|&idx| idx as u32)
                .collect::<Vec<u32>>()
        })
        .collect();
    Ok(result)
}

/// Standardize molecule: neutralize charges, remove explicit H, apply canonical tautomer.
#[wasm_bindgen]
pub fn standardize_molecule(mol_json: &JsValue) -> Result<JsValue, JsValue> {
    use chematic::chem::{StandardizeOptions, standardize};

    let mol: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;
    let chem_mol = dto_to_chem(&mol)?;

    let opts = StandardizeOptions {
        canonical_tautomer: true,
        neutralize_charges: true,
        remove_explicit_h: true,
        largest_fragment_only: false,
        zwitterion_handling: chematic::chem::ZwitterionHandling::Normalize,
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
    use chematic::core::{
        Atom, AtomIdx, BondOrder as ChemBondOrder, Chirality, Element, MoleculeBuilder,
    };
    use std::collections::HashMap;

    let mut builder = MoleculeBuilder::new();
    let mut id_to_idx: HashMap<u32, AtomIdx> = HashMap::new();

    for atom in &dto.atoms {
        let element = Element::from_symbol(&atom.element)
            .ok_or_else(|| JsValue::from_str(&format!("Unknown element: {}", atom.element)))?;
        let is_rgroup = atom.element == "R"
            || atom.element.starts_with("R*")
            || (atom.element.starts_with('R') && atom.element[1..].parse::<u8>().is_ok());

        let chem_atom = Atom {
            element,
            isotope: None,
            charge: atom.charge,
            hydrogen_count: None,
            aromatic: false,
            chirality: Chirality::None,
            wildcard: is_rgroup,
            atom_map: if atom.atom_map != 0 {
                Some(atom.atom_map)
            } else {
                None
            },
            cip_code: None,
        };
        let idx = builder.add_atom(chem_atom);
        id_to_idx.insert(atom.id, idx);
    }

    for bond in &dto.bonds {
        let Some(&a) = id_to_idx.get(&bond.from) else {
            continue;
        };
        let Some(&b) = id_to_idx.get(&bond.to) else {
            continue;
        };

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
        let coords: Vec<(f64, f64)> = dto
            .atoms
            .iter()
            .map(|a| (a.x, -a.y)) // Y-down → Y-up
            .collect();
        chematic::perception::apply_stereo_from_2d(&mut mol, &coords);
    }

    Ok(mol)
}

/// Convert chematic::core::Molecule to MoleculeDto with optional pre-existing coordinates.
/// If no coords provided, uses compute_layout.
fn chem_to_dto(mol: &chematic::core::Molecule, coords: Option<&[(f64, f64)]>) -> MoleculeDto {
    use chematic::core::AtomIdx;
    use chematic::depict::compute_layout;

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
                    y: -py, // chemistry Y-up → screen Y-down
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
                    y: pt.y, // already screen Y-down
                    charge: atom.charge,
                    atom_map: atom.atom_map.unwrap_or(0),
                }
            })
            .collect()
    };

    let bonds_vec: Vec<_> = mol
        .bonds()
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
    if mol.atoms.len() > 1 && mol.bonds.is_empty() {
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

/// Encode a `BitVec2048` fingerprint as a 512-character hex string (2048 bits = 256 bytes).
fn bitvec_to_hex(bv: &chematic::fp::BitVec2048) -> String {
    let mut hex = String::with_capacity(512);
    for byte_idx in 0..256 {
        let mut byte = 0u8;
        for bit_in_byte in 0..8 {
            if bv.get(byte_idx * 8 + bit_in_byte) {
                byte |= 1 << bit_in_byte;
            }
        }
        hex.push_str(&format!("{byte:02x}"));
    }
    hex
}

/// Decode a fingerprint hex string produced by [`bitvec_to_hex`] back into its bits.
fn hex_to_bitvec(hex: &str) -> chematic::fp::BitVec2048 {
    assert_eq!(
        hex.len(),
        512,
        "fingerprint hex must be 512 chars (2048 bits), got {}",
        hex.len()
    );
    let mut bv = chematic::fp::BitVec2048::new();
    for byte_idx in 0..256 {
        let byte = u8::from_str_radix(&hex[byte_idx * 2..byte_idx * 2 + 2], 16)
            .expect("fingerprint hex must be valid hex digits");
        for bit_in_byte in 0..8 {
            if (byte >> bit_in_byte) & 1 == 1 {
                bv.set(byte_idx * 8 + bit_in_byte);
            }
        }
    }
    bv
}

/// Get ECFP4 fingerprint as a 512-char hex string encoding the real 2048-bit vector.
#[wasm_bindgen]
pub fn get_fingerprint(mol_json: &JsValue) -> Result<String, JsValue> {
    use chematic::fp;

    let dto: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;

    let chem_mol = dto_to_chem(&dto)?;

    let fp_bits = fp::ecfp4(&chem_mol);
    Ok(bitvec_to_hex(&fp_bits))
}

/// Calculate Tanimoto similarity between two ECFP4 fingerprints (hex format from `get_fingerprint`).
#[wasm_bindgen]
pub fn tanimoto_similarity(fp_a_hex: &str, fp_b_hex: &str) -> f64 {
    hex_to_bitvec(fp_a_hex).tanimoto(&hex_to_bitvec(fp_b_hex))
}

/// Calculate Dice similarity between two ECFP4 fingerprints (hex format from `get_fingerprint`).
#[wasm_bindgen]
pub fn dice_similarity(fp_a_hex: &str, fp_b_hex: &str) -> f64 {
    hex_to_bitvec(fp_a_hex).dice(&hex_to_bitvec(fp_b_hex))
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

/// Run a SMIRKS-based reaction template against a molecule.
///
/// `Ok(products)` — possibly empty when the SMIRKS pattern simply doesn't match
/// this molecule, a valid "no reaction" outcome distinct from an error. `Err`
/// only for an invalid SMIRKS or an internal execution failure. Never fabricates
/// a fake product by silently returning the unchanged input molecule.
/// Pure Rust core of [`run_reactants`], kept free of the wasm/JsValue boundary
/// so it's directly unit-testable.
fn execute_reaction(
    chem_mol: &chematic::core::Molecule,
    smirks: &str,
    coords: &[(f64, f64)],
) -> Result<Vec<MoleculeDto>, String> {
    use chematic::rxn;

    let product_sets = rxn::run_reactants(smirks, &[chem_mol]).map_err(|e| e.to_string())?;

    // product_sets is Vec<Vec<Molecule>>; empty means the SMIRKS pattern found no
    // match on this molecule — surface it as zero products, not a fabricated one.
    let mut all_products = Vec::new();
    for product_vec in product_sets {
        for product in product_vec {
            all_products.push(chem_to_dto(&product, Some(coords)));
        }
    }
    Ok(all_products)
}

/// Execute SMIRKS-based reaction template on a molecule.
#[wasm_bindgen]
pub fn run_reactants(mol_json: &JsValue, smirks: &str) -> Result<JsValue, JsValue> {
    let dto: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;

    let chem_mol = dto_to_chem(&dto)?;
    let coords = dto_to_coords(&dto);

    let products = execute_reaction(&chem_mol, smirks, &coords)
        .map_err(|e| JsValue::from_str(&format!("Reaction execution failed: {e}")))?;

    serde_wasm_bindgen::to_value(&products)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {e}")))
}

// ─────────────────────────────────────────────────────────────────────────────────
// Maximum Common Substructure (MCS) - chematic 0.1.40+
// ─────────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McsResultDto {
    pub common_atoms: Vec<u32>,
    pub common_bonds: Vec<u32>,
    pub similarity: f64,
}

/// Compute the maximum common substructure between two molecules, mapped onto
/// molecule A's atom/bond indices, with an MCS-based Tanimoto similarity score.
/// Pure Rust core of [`find_mcs`], kept free of the wasm/JsValue boundary so it's
/// directly unit-testable.
fn compute_mcs(
    chem_mol_a: &chematic::core::Molecule,
    chem_mol_b: &chematic::core::Molecule,
) -> McsResultDto {
    use chematic::smarts;

    // find_mcs returns a QueryMolecule representing the common substructure as an
    // abstract pattern; map it back onto molecule A's atom/bond indices via substructure
    // matching so the UI can highlight the actual shared atoms/bonds.
    let mcs_query = smarts::find_mcs(&[chem_mol_a, chem_mol_b]);
    let matches_a = smarts::find_matches(&mcs_query, chem_mol_a);

    let (common_atoms, common_bonds) = match matches_a.first() {
        Some(atom_map) => {
            let common_atoms: Vec<u32> = atom_map.values().map(|idx| idx.0).collect();
            let common_bonds: Vec<u32> = mcs_query
                .bonds
                .iter()
                .filter_map(|qb| {
                    let a = *atom_map.get(&qb.atom1)?;
                    let b = *atom_map.get(&qb.atom2)?;
                    chem_mol_a
                        .bond_between(a, b)
                        .map(|(bond_idx, _)| bond_idx.0)
                })
                .collect();
            (common_atoms, common_bonds)
        }
        None => (Vec::new(), Vec::new()),
    };

    // MCS-based Tanimoto similarity: |MCS| / (|A| + |B| - |MCS|), using the real
    // common-substructure atom count rather than an atom-count-ratio proxy.
    let a_count = chem_mol_a.atom_count() as f64;
    let b_count = chem_mol_b.atom_count() as f64;
    let mcs_count = common_atoms.len() as f64;
    let denom = a_count + b_count - mcs_count;
    let similarity = if denom <= 0.0 { 1.0 } else { mcs_count / denom };

    McsResultDto {
        common_atoms,
        common_bonds,
        similarity,
    }
}

/// Find maximum common substructure (MCS) between two molecules.
#[wasm_bindgen]
pub fn find_mcs(mol_a_json: &JsValue, mol_b_json: &JsValue) -> Result<JsValue, JsValue> {
    let mol_a_dto: MoleculeDto = serde_wasm_bindgen::from_value(mol_a_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;

    let mol_b_dto: MoleculeDto = serde_wasm_bindgen::from_value(mol_b_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;

    let chem_mol_a = dto_to_chem(&mol_a_dto)?;
    let chem_mol_b = dto_to_chem(&mol_b_dto)?;

    let result = compute_mcs(&chem_mol_a, &chem_mol_b);

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {e}")))
}

// ─────────────────────────────────────────────────────────────────────────────────
// 3D Molecular Geometry (chematic 0.1.40+)
// ─────────────────────────────────────────────────────────────────────────────────

/// Generate initial 3D coordinates for a molecule using distance geometry.
#[wasm_bindgen]
pub fn generate_3d_coords(mol_json: &JsValue) -> Result<JsValue, JsValue> {
    use chematic::core::AtomIdx;
    use chematic::threed;

    let dto: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;

    let chem_mol = dto_to_chem(&dto)?;
    let coords3d = threed::generate_coords(&chem_mol);

    let atoms = chem_mol
        .atoms()
        .enumerate()
        .map(|(i, (_, atom))| {
            let pt = coords3d.get(AtomIdx(i as u32));
            Atom3dDto {
                id: i as u32,
                element: atom.element.symbol().to_string(),
                x: pt.x,
                y: pt.y,
                z: pt.z,
            }
        })
        .collect();

    serde_wasm_bindgen::to_value(&Coords3dDto { atoms })
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {e}")))
}

/// Optimize 3D coordinates using UFF force field.
#[wasm_bindgen]
pub fn minimize_3d_uff(mol_json: &JsValue, coords_json: &JsValue) -> Result<JsValue, JsValue> {
    use chematic::core::AtomIdx;
    use chematic::threed;

    let dto: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;

    let coords3d_dto: Coords3dDto = serde_wasm_bindgen::from_value(coords_json.clone())
        .map_err(|e| JsValue::from_str(&format!("Coords decode failed: {e}")))?;

    let chem_mol = dto_to_chem(&dto)?;

    // Reconstruct 3D coordinates from DTO
    let mut coords = threed::generate_coords(&chem_mol);
    for atom3d in &coords3d_dto.atoms {
        coords.set(
            AtomIdx(atom3d.id),
            chematic::threed::Point3 {
                x: atom3d.x,
                y: atom3d.y,
                z: atom3d.z,
            },
        );
    }

    // Minimize
    let minimized = threed::minimize_uff(&chem_mol, coords);

    let atoms = chem_mol
        .atoms()
        .enumerate()
        .map(|(i, (_, atom))| {
            let pt = minimized.get(AtomIdx(i as u32));
            Atom3dDto {
                id: i as u32,
                element: atom.element.symbol().to_string(),
                x: pt.x,
                y: pt.y,
                z: pt.z,
            }
        })
        .collect();

    serde_wasm_bindgen::to_value(&Coords3dDto { atoms })
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {e}")))
}

/// Parse XYZ format coordinates.
#[wasm_bindgen]
pub fn parse_xyz_format(text: &str) -> Result<JsValue, JsValue> {
    use chematic::core::AtomIdx;
    use chematic::threed;

    let (mol, coords) = threed::parse_xyz(text)
        .map_err(|e| JsValue::from_str(&format!("XYZ parse failed: {e}")))?;

    let atoms = mol
        .atoms()
        .enumerate()
        .map(|(i, (_, atom))| {
            let pt = coords.get(AtomIdx(i as u32));
            Atom3dDto {
                id: i as u32,
                element: atom.element.symbol().to_string(),
                x: pt.x,
                y: pt.y,
                z: pt.z,
            }
        })
        .collect();

    serde_wasm_bindgen::to_value(&Coords3dDto { atoms })
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {e}")))
}

/// Parse PDB format file.
#[wasm_bindgen]
pub fn parse_pdb_text(text: &str) -> Result<JsValue, JsValue> {
    use chematic::threed;

    let atoms = threed::parse_pdb_atoms(text);

    let coords_dto = Coords3dDto {
        atoms: atoms
            .into_iter()
            .enumerate()
            .map(|(i, pdb_atom)| Atom3dDto {
                id: i as u32,
                element: pdb_atom.element,
                x: pdb_atom.x,
                y: pdb_atom.y,
                z: pdb_atom.z,
            })
            .collect(),
    };

    serde_wasm_bindgen::to_value(&coords_dto)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {e}")))
}

#[cfg(test)]
mod correctness_tests {
    use super::*;

    fn mol(smiles: &str) -> chematic::core::Molecule {
        chematic::smiles::parse(smiles).expect("test SMILES must parse")
    }

    // ── Fingerprint hex round-trip and real bit-vector similarity ──

    #[test]
    fn fingerprint_hex_round_trips_exactly() {
        let bits = chematic::fp::ecfp4(&mol("c1ccccc1O")); // phenol
        let round_tripped = hex_to_bitvec(&bitvec_to_hex(&bits));
        assert_eq!(bits, round_tripped);
    }

    #[test]
    fn tanimoto_and_dice_are_one_for_identical_molecules() {
        let fp = bitvec_to_hex(&chematic::fp::ecfp4(&mol("CCO")));
        assert_eq!(tanimoto_similarity(&fp, &fp), 1.0);
        assert_eq!(dice_similarity(&fp, &fp), 1.0);
    }

    #[test]
    fn tanimoto_and_dice_are_lower_for_dissimilar_molecules() {
        let fp_ethanol = bitvec_to_hex(&chematic::fp::ecfp4(&mol("CCO")));
        let fp_benzene = bitvec_to_hex(&chematic::fp::ecfp4(&mol("c1ccccc1")));
        let tanimoto = tanimoto_similarity(&fp_ethanol, &fp_benzene);
        let dice = dice_similarity(&fp_ethanol, &fp_benzene);
        assert!(
            (0.0..1.0).contains(&tanimoto),
            "tanimoto out of range: {tanimoto}"
        );
        assert!((0.0..1.0).contains(&dice), "dice out of range: {dice}");
    }

    #[test]
    fn similar_molecules_score_higher_than_dissimilar_ones() {
        // Propan-1-ol shares far more structure with ethanol than benzene does.
        let fp_ethanol = bitvec_to_hex(&chematic::fp::ecfp4(&mol("CCO")));
        let fp_propanol = bitvec_to_hex(&chematic::fp::ecfp4(&mol("CCCO")));
        let fp_benzene = bitvec_to_hex(&chematic::fp::ecfp4(&mol("c1ccccc1")));
        let close = tanimoto_similarity(&fp_ethanol, &fp_propanol);
        let far = tanimoto_similarity(&fp_ethanol, &fp_benzene);
        assert!(
            close > far,
            "expected ethanol~propanol ({close}) > ethanol~benzene ({far})"
        );
    }

    // ── MCS: real substructure match, not an atom-count proxy ──

    #[test]
    fn mcs_of_identical_molecules_is_the_whole_molecule() {
        let m = mol("CCO");
        let result = compute_mcs(&m, &m);
        assert_eq!(result.common_atoms.len(), m.atom_count());
        assert_eq!(result.similarity, 1.0);
    }

    #[test]
    fn mcs_finds_shared_substructure_between_related_molecules() {
        // Ethanol (C-C-O) is a substructure of propan-1-ol (C-C-C-O).
        let ethanol = mol("CCO");
        let propanol = mol("CCCO");
        let result = compute_mcs(&ethanol, &propanol);
        assert!(
            result.common_atoms.len() >= 3,
            "expected at least the 3-atom C-C-O chain, got {}",
            result.common_atoms.len()
        );
        assert!(result.similarity > 0.0 && result.similarity < 1.0);
    }

    #[test]
    fn mcs_similarity_is_lower_for_unrelated_molecules() {
        let ethanol = mol("CCO");
        let propanol = mol("CCCO");
        let benzene = mol("c1ccccc1");
        let related = compute_mcs(&ethanol, &propanol).similarity;
        let unrelated = compute_mcs(&ethanol, &benzene).similarity;
        assert!(
            related > unrelated,
            "expected ethanol~propanol ({related}) > ethanol~benzene ({unrelated})"
        );
    }

    // ── Reaction execution: real success/no-match/error states, never a fake product ──

    const CARBOXYLIC_ACID_TO_AMIDE: &str = "[C:1](=[O])[OH]>>[C:1](=[O])[NH2]";

    #[test]
    fn reaction_produces_real_product_on_match() {
        let acetic_acid = mol("CC(=O)O");
        let products = execute_reaction(&acetic_acid, CARBOXYLIC_ACID_TO_AMIDE, &[])
            .expect("valid SMIRKS on a matching molecule must succeed");
        assert!(!products.is_empty(), "expected at least one product");
        // The product should be the amide, not the unchanged carboxylic acid input:
        // it must contain a nitrogen the reactant never had. `element` is a
        // depiction label (e.g. "NH₂" for a terminal amine), not a bare symbol.
        let has_nitrogen = products[0].atoms.iter().any(|a| a.element.contains('N'));
        assert!(
            has_nitrogen,
            "product should contain the newly-introduced N"
        );
    }

    #[test]
    fn reaction_returns_empty_not_a_fake_product_on_no_match() {
        // Ethanol has no carboxylic acid group, so this SMIRKS cannot apply.
        let ethanol = mol("CCO");
        let products = execute_reaction(&ethanol, CARBOXYLIC_ACID_TO_AMIDE, &[])
            .expect("a non-matching SMIRKS is a valid outcome, not an error");
        assert!(
            products.is_empty(),
            "no match must yield zero products, not the unchanged input molecule"
        );
    }

    #[test]
    fn reaction_returns_err_on_invalid_smirks() {
        let ethanol = mol("CCO");
        let result = execute_reaction(&ethanol, "not a valid smirks pattern", &[]);
        assert!(
            result.is_err(),
            "an invalid SMIRKS must be a real error, not a silently-returned empty/unchanged result"
        );
    }
}
