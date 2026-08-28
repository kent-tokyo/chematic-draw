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

/// `element` is ALWAYS a real periodic-table symbol ("C", "N", "Cl", ...) —
/// never a depiction label ("CH3", "OH", "") and never an R-group token
/// ("R", "R1", "*"). It is the chemical meaning of the atom and is what
/// every WASM function that takes a `MoleculeDto` as input requires.
///
/// `display_label` is a separate, purely cosmetic field: the condensed
/// label a 2D renderer would show (e.g. "CH3" for a terminal methyl, ""
/// to suppress the label entirely for a skeletal interior carbon). It is a
/// derived value — it depends on bonding, implicit H, and aromaticity, so
/// it goes stale the instant the structure is edited — and must never be
/// used as input to chemistry: nothing in this file parses it, and no
/// caller should either.
///
/// `wildcard` marks an R-group/variable-attachment atom. When true,
/// `element` is a meaningless placeholder (chematic-core itself has no
/// concept of a "real" element for a wildcard atom); check `wildcard`
/// before trusting `element`. There is deliberately no `rgroup_label`
/// field: `chematic::core::Atom` has no backing storage for R-group
/// numbering, so a field this bridge can't honestly populate would be
/// worse than its absence.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AtomDto {
    pub id: u32,
    pub element: String,
    pub x: f64,
    pub y: f64,
    pub charge: i8,
    pub atom_map: u16,
    /// Explicit hydrogen count. Required to correctly round-trip an
    /// aromatic heteroatom whose implicit-H count can't be inferred from
    /// ring topology alone (e.g. pyrrole-type N, which donates its lone
    /// pair and carries an H, vs. pyridine-type N, which doesn't) — see
    /// `chem_to_dto`/`dto_to_chem`. `#[serde(default)]` so DTOs built
    /// before this field existed (tests, hand-built fixtures) still
    /// deserialize; `None` means "let chematic infer it," which is only
    /// correct when there's no aromatic-heteroatom ambiguity to resolve.
    #[serde(default)]
    pub hydrogen_count: Option<u8>,
    #[serde(default)]
    pub wildcard: bool,
    #[serde(default)]
    pub display_label: Option<String>,
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

    // `sniff` (trimmed) is ONLY for format detection below, never for the
    // actual parse calls on MOL/SDF/V3000: those formats' first three lines
    // (title/program/comment) are POSITIONAL, and an empty title — entirely
    // legitimate, and exactly what this bridge's own to_mol_v2000/to_sdf
    // writers produce — starts with a blank line. Trimming that blank line
    // away shifts every subsequent line up by one, so the parser reads what
    // was really the first atom line as the counts line and fails with
    // "missing V2000 version tag". (Found via this bridge's own write/parse
    // round-trip failing on its own output — see internal_docs/ROADMAP.md.)
    // CDXML/CML (XML, whitespace-insensitive) and the SMILES fallback
    // (single-line) have no such positional sensitivity, so they use the
    // trimmed form for robustness against incidentally pasted whitespace.
    let sniff = text.trim();

    // Try CDXML
    if sniff.contains("<CDXML") {
        let fragments = mol::parse_cdxml_all(sniff)
            .map_err(|e| JsValue::from_str(&format!("CDXML parse failed: {e}")))?;
        let (mol, coords) = fragments
            .into_iter()
            .next()
            .ok_or_else(|| JsValue::from_str("CDXML: no molecules found"))?;
        return Ok(chem_to_dto(&mol, Some(&coords)));
    }

    // Try CML
    if (sniff.starts_with("<?xml") || sniff.starts_with("<molecule") || sniff.contains("<cml"))
        && sniff.contains("elementType")
    {
        let (mol, coords) = mol::parse_cml(sniff)
            .map_err(|e| JsValue::from_str(&format!("CML parse failed: {e}")))?;
        return Ok(chem_to_dto(&mol, Some(&coords)));
    }

    // Try SDF (positional header, like MOL — do not trim)
    if sniff.contains("$$$$") {
        let records = mol::parse_sdf_with_coords(text)
            .map_err(|e| JsValue::from_str(&format!("SDF parse failed: {e}")))?;
        let (mol, _meta, coords) = records
            .into_iter()
            .next()
            .ok_or_else(|| JsValue::from_str("SDF: no records found"))?;
        return Ok(chem_to_dto(&mol, Some(&coords)));
    }

    // Try MOL V3000 (must come before V2000; positional header, do not trim)
    if sniff.contains("V3000") {
        let (mol, _meta, coords) = mol::parse_mol_v3000_with_coords(text)
            .map_err(|e| JsValue::from_str(&format!("MOL V3000 parse failed: {e}")))?;
        return Ok(chem_to_dto(&mol, Some(&coords)));
    }

    // Try MOL V2000 (positional header, do not trim)
    if sniff.contains("M  END") {
        let (mol, _meta, coords) = mol::parse_mol_with_coords(text)
            .map_err(|e| JsValue::from_str(&format!("MOL V2000 parse failed: {e}")))?;
        return Ok(chem_to_dto(&mol, Some(&coords)));
    }

    // Fallback to SMILES
    let mol = smiles::parse(sniff)
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

/// Pure Rust core of [`smarts_search`], kept free of the wasm/JsValue boundary so
/// it's directly unit-testable.
fn find_smarts_matches(
    chem_mol: &chematic::core::Molecule,
    pattern: &str,
) -> Result<Vec<u32>, String> {
    use chematic::smarts;

    let query_mol =
        smarts::parse_smarts(pattern).map_err(|e| format!("SMARTS parse failed: {e}"))?;
    let matches = smarts::find_matches(&query_mol, chem_mol);

    // find_matches returns Vec<FxHashMap<usize, AtomIdx>>: key = SMARTS pattern atom
    // index (always small sequential ints like 0,1,2…), value = the *target molecule's*
    // real matched AtomIdx. Must use .values(), not .keys() — the query-pattern index
    // isn't a real atom in the user's molecule at all.
    Ok(matches
        .into_iter()
        .flat_map(|match_map| match_map.values().map(|idx| idx.0).collect::<Vec<u32>>())
        .collect())
}

/// SMARTS substructure search. Returns array of matched atom indices.
#[wasm_bindgen]
pub fn smarts_search(mol_json: &JsValue, pattern: &str) -> Result<Vec<u32>, JsValue> {
    let mol: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;
    let chem_mol = dto_to_chem(&mol)?;
    find_smarts_matches(&chem_mol, pattern).map_err(|e| JsValue::from_str(&e))
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
/// Returns error if a non-wildcard atom's element symbol is unrecognized.
fn dto_to_chem(dto: &MoleculeDto) -> Result<chematic::core::Molecule, JsValue> {
    use chematic::core::{
        Atom, AtomIdx, BondOrder as ChemBondOrder, Chirality, Element, MoleculeBuilder,
    };
    use std::collections::{HashMap, HashSet};

    // Aromaticity must be set on each Atom AT CONSTRUCTION TIME, not derived
    // afterward: chematic-core exposes no public setter for `Atom.aromatic`,
    // and calling `perception::apply_aromaticity` on a molecule whose bonds
    // are ALREADY BondOrder::Aromatic (rather than a Kekulized single/double
    // structure, which is what that perception pass expects as input) is a
    // no-op — it leaves every atom's `aromatic` flag false. That silently
    // broke ring perception for any DTO round-trip of an aromatic molecule,
    // and specifically broke aromatic-heteroatom implicit-H inference below
    // (confirmed via a native chematic probe: pyrrole's `c1cc[nH]c1` came
    // back from this bridge as the non-aromatic-perceived, wrong-formula
    // "C4H4N" instead of the correct "C4H5N" until this was fixed).
    let aromatic_atom_ids: HashSet<u32> = dto
        .bonds
        .iter()
        .filter(|b| b.order == 4)
        .flat_map(|b| [b.from, b.to])
        .collect();

    let mut builder = MoleculeBuilder::new();
    let mut id_to_idx: HashMap<u32, AtomIdx> = HashMap::new();

    for atom in &dto.atoms {
        // Wildcard/R-group atoms carry no real chemical element — chematic-core
        // itself has no dedicated "wildcard element," `Atom::wildcard()` just
        // uses Carbon as an placeholder callers are told to ignore. Trust the
        // explicit `wildcard` flag instead of guessing from the (meaningless,
        // for these atoms) `element` string, and skip `Element::from_symbol`
        // entirely so a wildcard atom can never trigger "Unknown element."
        let element = if atom.wildcard {
            Element::C
        } else {
            Element::from_symbol(&atom.element)
                .ok_or_else(|| JsValue::from_str(&format!("Unknown element: {}", atom.element)))?
        };

        let chem_atom = Atom {
            element,
            isotope: None,
            charge: atom.charge,
            // Explicit H count from the DTO, not inferred: ring topology
            // alone can't distinguish e.g. pyrrole-type N (donates its lone
            // pair, carries an H) from pyridine-type N (doesn't) — only the
            // originating parse (or an explicit edit) knows which one this
            // is. `None` falls back to chematic's own valence-based
            // inference, correct only when there's no such ambiguity.
            hydrogen_count: atom.hydrogen_count,
            aromatic: aromatic_atom_ids.contains(&atom.id),
            chirality: Chirality::None,
            wildcard: atom.wildcard,
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

    // `display_label` is always populated (even as `Some("")` for a
    // skeletal interior carbon) since chem_to_dto always has a real
    // molecule to compute it from — `None` is reserved for DTOs that never
    // went through this function (hand-built fixtures, older callers),
    // which is exactly when a consumer should fall back to `element`.
    let display_label = |idx: AtomIdx| Some(chematic::depict::atom_display_label(mol, idx));

    let atoms_vec: Vec<_> = if let Some(c) = coords {
        // Use provided coords (from CML/CDXML/MOL/SDF, chemistry Y-up convention)
        // Negate Y to convert to screen space (Y-down)
        mol.atoms()
            .enumerate()
            .map(|(i, (_, atom))| {
                let (px, py) = c.get(i).copied().unwrap_or((0.0, 0.0));
                AtomDto {
                    id: i as u32,
                    element: atom.element.symbol().to_string(),
                    x: px,
                    y: -py, // chemistry Y-up → screen Y-down
                    charge: atom.charge,
                    atom_map: atom.atom_map.unwrap_or(0),
                    hydrogen_count: Some(chematic::core::implicit_hcount(mol, AtomIdx(i as u32))),
                    wildcard: atom.wildcard,
                    display_label: display_label(AtomIdx(i as u32)),
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
                    element: atom.element.symbol().to_string(),
                    x: pt.x,
                    y: pt.y, // already screen Y-down
                    charge: atom.charge,
                    atom_map: atom.atom_map.unwrap_or(0),
                    hydrogen_count: Some(chematic::core::implicit_hcount(mol, AtomIdx(i as u32))),
                    wildcard: atom.wildcard,
                    display_label: display_label(AtomIdx(i as u32)),
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

#[derive(Debug, Clone, Serialize)]
pub struct ValidationResultDto {
    pub valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
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
        warnings.push("Disconnected atoms detected".to_string());
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

    let result = ValidationResultDto {
        valid: errors.is_empty(),
        errors,
        warnings,
    };

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

/// Convert molecule to an InChI-like string via chematic_inchi::inchi() — a pure-Rust,
/// FFI-free approximation documented by that crate as not bit-exact with the real
/// IUPAC reference implementation (which needs the `native-inchi` feature, unavailable
/// in WASM). Do not expect this to match InChIKeys computed by PubChem/RDKit/ChemSpider.
#[wasm_bindgen]
pub fn mol_to_inchi(mol_json: &JsValue) -> Result<String, JsValue> {
    use chematic_inchi;

    let dto: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;

    let chem_mol = dto_to_chem(&dto)?;

    // Call chematic_inchi::inchi() to generate InChI string
    Ok(chematic_inchi::inchi(&chem_mol))
}

/// Convert an InChI string to its InChIKey (real SHA-256-based hashing, but built
/// on the approximate InChI above, so it inherits the same non-bit-exactness).
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
/// Never panics: malformed input (wrong length, non-hex characters) is a normal,
/// expected failure mode for a value that crossed the JS boundary, so it's reported
/// as a structured `Err` rather than a Rust panic (which would surface as an opaque
/// WASM trap instead of a catchable, descriptive JS exception).
fn hex_to_bitvec(hex: &str) -> Result<chematic::fp::BitVec2048, String> {
    if hex.len() != 512 {
        return Err(format!(
            "fingerprint hex must be 512 chars (2048 bits), got {}",
            hex.len()
        ));
    }
    let mut bv = chematic::fp::BitVec2048::new();
    for byte_idx in 0..256 {
        let byte = u8::from_str_radix(&hex[byte_idx * 2..byte_idx * 2 + 2], 16)
            .map_err(|_| format!("fingerprint hex has invalid hex digits at byte {byte_idx}"))?;
        for bit_in_byte in 0..8 {
            if (byte >> bit_in_byte) & 1 == 1 {
                bv.set(byte_idx * 8 + bit_in_byte);
            }
        }
    }
    Ok(bv)
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

/// Fingerprint plus the parameters that produced it. `radius`/`bit_length`/`mode`
/// are read from `chematic::fp::EcfpConfig::default()` (what [`chematic::fp::ecfp4`]
/// actually calls internally) rather than assumed from the "ECFP4" name — the "4" in
/// RDKit-style ECFP naming is the diameter (2×radius), so it's not directly the
/// `radius` field, and asserting it without checking the source would be exactly the
/// kind of plausible-but-unsourced value this DTO exists to avoid.
#[derive(Debug, Clone, Serialize)]
pub struct FingerprintDto {
    pub hex: String,
    /// Algorithm identifier: "ECFP4" (radius=2, matching RDKit's ECFP4 naming).
    pub kind: String,
    pub radius: u32,
    pub bit_length: u32,
    /// "bit": each position is a 0/1 presence flag ([`chematic::fp::BitVec2048`]),
    /// not an occurrence count.
    pub mode: String,
}

/// Pure core of [`get_fingerprint_with_metadata`], kept free of the wasm/JsValue
/// boundary so it's directly unit-testable.
fn fingerprint_with_metadata(chem_mol: &chematic::core::Molecule) -> FingerprintDto {
    use chematic::fp;

    let fp_bits = fp::ecfp4(chem_mol);
    let config = fp::EcfpConfig::default();
    FingerprintDto {
        hex: bitvec_to_hex(&fp_bits),
        kind: "ECFP4".to_string(),
        radius: config.radius,
        bit_length: config.nbits as u32,
        mode: "bit".to_string(),
    }
}

/// Get the ECFP4 fingerprint together with its real algorithm parameters, for
/// callers that need to know what they're comparing rather than just a hex blob.
/// [`get_fingerprint`] is kept separate and unchanged so existing callers
/// (`tanimoto_similarity`/`dice_similarity`, which take hex strings) aren't affected.
#[wasm_bindgen]
pub fn get_fingerprint_with_metadata(mol_json: &JsValue) -> Result<JsValue, JsValue> {
    let dto: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;

    let chem_mol = dto_to_chem(&dto)?;

    serde_wasm_bindgen::to_value(&fingerprint_with_metadata(&chem_mol))
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {e}")))
}

/// Pure core of [`tanimoto_similarity`]/[`dice_similarity`]'s shared hex decoding,
/// kept free of the wasm/JsValue boundary so it's directly unit-testable: JsValue
/// FFI stubs (e.g. `JsValue::from_str`) panic when called outside a real wasm32/JS
/// host, so error paths that construct one can't be exercised by native `cargo test`.
fn decode_fingerprint_pair(
    fp_a_hex: &str,
    fp_b_hex: &str,
) -> Result<(chematic::fp::BitVec2048, chematic::fp::BitVec2048), String> {
    Ok((hex_to_bitvec(fp_a_hex)?, hex_to_bitvec(fp_b_hex)?))
}

/// Calculate Tanimoto similarity between two ECFP4 fingerprints (hex format from `get_fingerprint`).
#[wasm_bindgen]
pub fn tanimoto_similarity(fp_a_hex: &str, fp_b_hex: &str) -> Result<f64, JsValue> {
    let (a, b) = decode_fingerprint_pair(fp_a_hex, fp_b_hex).map_err(|e| JsValue::from_str(&e))?;
    Ok(a.tanimoto(&b))
}

/// Calculate Dice similarity between two ECFP4 fingerprints (hex format from `get_fingerprint`).
#[wasm_bindgen]
pub fn dice_similarity(fp_a_hex: &str, fp_b_hex: &str) -> Result<f64, JsValue> {
    let (a, b) = decode_fingerprint_pair(fp_a_hex, fp_b_hex).map_err(|e| JsValue::from_str(&e))?;
    Ok(a.dice(&b))
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

/// Why a reaction failed to apply — distinguished using chematic-rxn's own
/// [`chematic::rxn::TransformError`] variants, not a guess:
/// - `InvalidReaction`: the SMIRKS string itself doesn't parse
///   (`TransformError::SmirksParse`, e.g. missing `>>` or an unparsable SMILES
///   component).
/// - `UnsupportedChemistry`: the SMIRKS is syntactically valid but needs a
///   different number of reactant molecules than chematic-draw supplies
///   (`TransformError::ReactantCountMismatch`) — chematic-draw always calls
///   `run_reactants` with exactly one reactant molecule today, so a
///   multi-reactant template is a real, honestly-distinguishable "not
///   supported by this call site" case, not a parse failure.
#[derive(Debug, Clone)]
enum ReactionError {
    InvalidReaction(String),
    UnsupportedChemistry(String),
}

impl std::fmt::Display for ReactionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidReaction(msg) | Self::UnsupportedChemistry(msg) => write!(f, "{msg}"),
        }
    }
}

impl From<chematic::rxn::TransformError> for ReactionError {
    fn from(e: chematic::rxn::TransformError) -> Self {
        match &e {
            chematic::rxn::TransformError::SmirksParse(_) => Self::InvalidReaction(e.to_string()),
            chematic::rxn::TransformError::ReactantCountMismatch { .. } => {
                Self::UnsupportedChemistry(e.to_string())
            }
        }
    }
}

/// Run a SMIRKS-based reaction template against a molecule.
///
/// `Ok(products)` — possibly empty when the SMIRKS pattern simply doesn't match
/// this molecule, a valid "no reaction" outcome distinct from an error. `Err`
/// only for an invalid SMIRKS or unsupported reactant-count chemistry (see
/// [`ReactionError`]). Never fabricates a fake product by silently returning
/// the unchanged input molecule.
/// Pure Rust core of [`run_reactants`], kept free of the wasm/JsValue boundary
/// so it's directly unit-testable.
///
/// Products get a freshly computed 2D layout ([`chem_to_dto`] with `coords: None`)
/// rather than reusing the reactant's coordinates: a reaction can add, remove, or
/// reorder atoms, so indexing into the reactant's coordinate array by product atom
/// index would silently misplace atoms (new atoms piling up at the origin, or
/// existing atoms inheriting a stranger's position) rather than erroring.
fn execute_reaction(
    chem_mol: &chematic::core::Molecule,
    smirks: &str,
) -> Result<Vec<MoleculeDto>, ReactionError> {
    use chematic::rxn;

    let product_sets = rxn::run_reactants(smirks, &[chem_mol])?;

    // product_sets is Vec<Vec<Molecule>>; empty means the SMIRKS pattern found no
    // match on this molecule — surface it as zero products, not a fabricated one.
    let mut all_products = Vec::new();
    for product_vec in product_sets {
        for product in product_vec {
            all_products.push(chem_to_dto(&product, None));
        }
    }
    Ok(all_products)
}

/// Tagged reaction outcome sent to JS — every domain-level result (success, no
/// match, invalid SMIRKS, or unsupported reactant count) is a normal `Ok`
/// value; the `#[wasm_bindgen]` `Err` channel is reserved for FFI-level
/// failures (e.g. the input JSON not decoding), which can't happen once
/// `execute_reaction` is reached. Serializes to `{"status": "applied", ...}`
/// etc., matching `ReactionRunResult` on the TS side.
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
enum ReactionOutcome {
    Applied { products: Vec<MoleculeDto> },
    NoMatch,
    InvalidReaction { message: String },
    UnsupportedChemistry { message: String },
}

impl From<Result<Vec<MoleculeDto>, ReactionError>> for ReactionOutcome {
    fn from(result: Result<Vec<MoleculeDto>, ReactionError>) -> Self {
        match result {
            Ok(products) if products.is_empty() => Self::NoMatch,
            Ok(products) => Self::Applied { products },
            Err(ReactionError::InvalidReaction(message)) => Self::InvalidReaction { message },
            Err(ReactionError::UnsupportedChemistry(message)) => {
                Self::UnsupportedChemistry { message }
            }
        }
    }
}

/// Execute SMIRKS-based reaction template on a molecule.
///
/// Returns a tagged [`ReactionOutcome`] on success — `applied`, `no_match`,
/// `invalid_reaction`, and `unsupported_chemistry` are all `Ok` values here.
/// `Err` is reserved for FFI-level failures that happen before any chemistry
/// is attempted (malformed input JSON).
#[wasm_bindgen]
pub fn run_reactants(mol_json: &JsValue, smirks: &str) -> Result<JsValue, JsValue> {
    let dto: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;

    let chem_mol = dto_to_chem(&dto)?;

    let outcome: ReactionOutcome = execute_reaction(&chem_mol, smirks).into();

    serde_wasm_bindgen::to_value(&outcome)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {e}")))
}

// ─────────────────────────────────────────────────────────────────────────────────
// Maximum Common Substructure (MCS) - chematic 0.1.40+
// ─────────────────────────────────────────────────────────────────────────────────

/// MCS search is combinatorially explosive (branch-and-bound over the Cartesian
/// product of candidate atom mappings) and this API accepts arbitrary user-drawn
/// molecules, so the search is bounded rather than run to unbounded completion.
///
/// Note: `chematic-smarts` 0.20.1's public API (`find_mcs_with_config`) accepts this
/// deadline and silently returns its best-so-far result when it's hit, but does not
/// expose whether a given run was exhaustive or cut short — that distinction exists
/// only as a private field on its internal search state. Reporting an honest
/// `exhaustive` flag here would require either an upstream API addition (tracked as
/// follow-up) or a wall-clock measurement good enough to guess it, which was judged
/// not worth a new dependency for an approximate answer. `search_budget_ms` is
/// reported instead so callers can show an honest "may be incomplete for complex
/// structures" caveat rather than a fabricated exhaustive/timed-out verdict.
const MCS_SEARCH_BUDGET_MS: u64 = 5_000;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McsResultDto {
    pub common_atoms: Vec<u32>,
    pub common_bonds: Vec<u32>,
    pub similarity: f64,
    /// The time budget (milliseconds) applied to the search. The result may be a
    /// partial best-effort match rather than the true maximum for structures complex
    /// enough to exhaust this budget.
    pub search_budget_ms: u64,
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

    let config = smarts::McsConfig {
        timeout_ms: Some(MCS_SEARCH_BUDGET_MS),
        ..Default::default()
    };

    // find_mcs_with_config returns a QueryMolecule representing the common
    // substructure as an abstract pattern; map it back onto molecule A's atom/bond
    // indices via substructure matching so the UI can highlight the actual shared
    // atoms/bonds.
    let mcs_query = smarts::find_mcs_with_config(&[chem_mol_a, chem_mol_b], &config);
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
        search_budget_ms: MCS_SEARCH_BUDGET_MS,
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
        let round_tripped = hex_to_bitvec(&bitvec_to_hex(&bits)).expect("valid hex must decode");
        assert_eq!(bits, round_tripped);
    }

    #[test]
    fn fingerprint_metadata_matches_ecfp4s_real_config_not_a_guess() {
        // Sourced from chematic::fp::EcfpConfig::default() (what ecfp4() actually
        // calls) rather than inferred from the "ECFP4" name: the "4" in RDKit-style
        // ECFP naming is the diameter (2x radius), not the radius value directly.
        let result = fingerprint_with_metadata(&mol("c1ccccc1O"));
        assert_eq!(result.radius, chematic::fp::EcfpConfig::default().radius);
        assert_eq!(
            result.bit_length,
            chematic::fp::EcfpConfig::default().nbits as u32
        );
        assert_eq!(result.mode, "bit");
        assert_eq!(result.kind, "ECFP4");
        assert_eq!(result.hex.len(), 512);
        // And it must be the same bits get_fingerprint's hex-only path produces.
        assert_eq!(
            result.hex,
            bitvec_to_hex(&chematic::fp::ecfp4(&mol("c1ccccc1O")))
        );
    }

    #[test]
    fn tanimoto_and_dice_are_one_for_identical_molecules() {
        let fp = bitvec_to_hex(&chematic::fp::ecfp4(&mol("CCO")));
        assert_eq!(tanimoto_similarity(&fp, &fp).unwrap(), 1.0);
        assert_eq!(dice_similarity(&fp, &fp).unwrap(), 1.0);
    }

    #[test]
    fn tanimoto_and_dice_are_lower_for_dissimilar_molecules() {
        let fp_ethanol = bitvec_to_hex(&chematic::fp::ecfp4(&mol("CCO")));
        let fp_benzene = bitvec_to_hex(&chematic::fp::ecfp4(&mol("c1ccccc1")));
        let tanimoto = tanimoto_similarity(&fp_ethanol, &fp_benzene).unwrap();
        let dice = dice_similarity(&fp_ethanol, &fp_benzene).unwrap();
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
        let close = tanimoto_similarity(&fp_ethanol, &fp_propanol).unwrap();
        let far = tanimoto_similarity(&fp_ethanol, &fp_benzene).unwrap();
        assert!(
            close > far,
            "expected ethanol~propanol ({close}) > ethanol~benzene ({far})"
        );
    }

    // ── Fingerprint hex decoding: malformed input is a structured Err, never a panic ──

    #[test]
    fn fingerprint_decode_rejects_too_short_hex() {
        let short = "a".repeat(511);
        assert!(hex_to_bitvec(&short).is_err());
        // Exercises the same path tanimoto_similarity/dice_similarity delegate to
        // (calling the #[wasm_bindgen] fns directly would panic natively as soon as
        // they touch JsValue::from_str, which is a real-JS-host-only FFI stub).
        assert!(decode_fingerprint_pair(&short, &short).is_err());
    }

    #[test]
    fn fingerprint_decode_rejects_too_long_hex() {
        let long = "a".repeat(513);
        assert!(hex_to_bitvec(&long).is_err());
        assert!(decode_fingerprint_pair(&long, &long).is_err());
    }

    #[test]
    fn fingerprint_decode_rejects_non_hex_characters() {
        let mut bad = "0".repeat(511);
        bad.push('z'); // not a hex digit
        assert!(hex_to_bitvec(&bad).is_err());
    }

    #[test]
    fn fingerprint_decode_rejects_empty_string() {
        assert!(hex_to_bitvec("").is_err());
        assert!(decode_fingerprint_pair("", "").is_err());
    }

    #[test]
    fn fingerprint_decode_accepts_uppercase_and_lowercase_hex() {
        let hex = bitvec_to_hex(&chematic::fp::ecfp4(&mol("CCO")));
        let upper = hex.to_uppercase();
        let lower_decoded = hex_to_bitvec(&hex).expect("lowercase must decode");
        let upper_decoded = hex_to_bitvec(&upper).expect("uppercase must decode too");
        assert_eq!(lower_decoded, upper_decoded);
    }

    #[test]
    fn fingerprint_decode_rejects_correct_length_but_corrupted_input() {
        // Right length (512), but not a fingerprint this app ever produced —
        // must still decode (it's valid hex) rather than silently misbehaving,
        // and must round-trip back to the same bits it encodes.
        let corrupted: String = "f".repeat(512);
        let decoded = hex_to_bitvec(&corrupted).expect("valid hex chars must decode");
        assert_eq!(decoded.popcount(), 2048); // all bits set, as "f" x512 implies
    }

    // ── SMARTS search: real target-molecule atom indices, not the query's own indices ──

    #[test]
    fn smarts_search_returns_target_molecule_indices_not_query_indices() {
        // Ethanol "CCO" parses as atom 0=C, 1=C, 2=O. A single-atom oxygen query has
        // its own (query-pattern) atom index 0 — the bug returned that unconditionally
        // instead of the real matched atom, so this would wrongly return [0] instead
        // of [2] no matter which molecule/pattern was searched.
        let ethanol = mol("CCO");
        let matches = find_smarts_matches(&ethanol, "[#8]").expect("valid SMARTS must search");
        assert_eq!(
            matches,
            vec![2],
            "expected the real oxygen atom index (2), not the query's own atom index (0)"
        );
    }

    #[test]
    fn smarts_search_multi_atom_pattern_returns_real_indices() {
        // A 2-atom C-O query has query-pattern indices {0,1}; the bug would return
        // that fixed pair regardless of molecule. The real C-O bond in ethanol is
        // atoms {1,2} (the second C and the O), not {0,1}.
        let ethanol = mol("CCO");
        let mut matches =
            find_smarts_matches(&ethanol, "[#6]-[#8]").expect("valid SMARTS must search");
        matches.sort_unstable();
        assert_eq!(matches, vec![1, 2]);
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

    #[test]
    fn mcs_reports_the_search_budget_it_used() {
        // The search must be bounded (arbitrary user molecules + combinatorial
        // branch-and-bound = unbounded worst case), and callers need to know what
        // budget was applied since a hit budget means a possibly-partial result.
        let result = compute_mcs(&mol("CCO"), &mol("CCCO"));
        assert_eq!(result.search_budget_ms, MCS_SEARCH_BUDGET_MS);
        assert!(
            result.search_budget_ms > 0,
            "an unbounded search is the bug being fixed"
        );
    }

    #[test]
    fn mcs_reports_no_match_for_molecules_sharing_no_element() {
        // A single carbon and a single nitrogen atom cannot share any substructure.
        let methane = mol("C");
        let ammonia = mol("N");
        let result = compute_mcs(&methane, &ammonia);
        assert!(
            result.common_atoms.is_empty(),
            "expected no shared atoms between C and N, got {:?}",
            result.common_atoms
        );
        assert_eq!(result.similarity, 0.0);
    }

    #[test]
    fn mcs_handles_disconnected_fragments_in_the_input() {
        // mol_a has two disconnected components (an ethanol-like fragment and an
        // ethylamine-like fragment); mol_b is just the ethanol-like fragment. The
        // search must still find that shared fragment rather than erroring or
        // treating the multi-fragment input as unsupported.
        let two_fragments = mol("CCO.CCN");
        let ethanol = mol("CCO");
        let result = compute_mcs(&two_fragments, &ethanol);
        assert!(
            result.common_atoms.len() >= 3,
            "expected at least the 3-atom C-C-O fragment to match, got {}",
            result.common_atoms.len()
        );
    }

    #[test]
    fn mcs_finds_shared_ring_between_aromatic_systems() {
        // Benzene and pyridine share a 5-carbon aromatic chain (pyridine's ring
        // swaps one CH for N), so the real MCS should be well above zero and
        // below a full match, not an atom-count proxy that ignores aromaticity.
        let benzene = mol("c1ccccc1");
        let pyridine = mol("c1ccncc1");
        let result = compute_mcs(&benzene, &pyridine);
        assert!(
            result.common_atoms.len() >= 4,
            "expected at least 4 shared aromatic carbons, got {}",
            result.common_atoms.len()
        );
        assert!(result.similarity > 0.0 && result.similarity < 1.0);
    }

    // ── Reaction execution: real success/no-match/error states, never a fake product ──

    const CARBOXYLIC_ACID_TO_AMIDE: &str = "[C:1](=[O])[OH]>>[C:1](=[O])[NH2]";

    #[test]
    fn reaction_produces_real_product_on_match() {
        let acetic_acid = mol("CC(=O)O");
        let products = execute_reaction(&acetic_acid, CARBOXYLIC_ACID_TO_AMIDE)
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
        let products = execute_reaction(&ethanol, CARBOXYLIC_ACID_TO_AMIDE)
            .expect("a non-matching SMIRKS is a valid outcome, not an error");
        assert!(
            products.is_empty(),
            "no match must yield zero products, not the unchanged input molecule"
        );
    }

    #[test]
    fn reaction_returns_invalid_reaction_on_unparseable_smirks() {
        let ethanol = mol("CCO");
        let result = execute_reaction(&ethanol, "not a valid smirks pattern");
        assert!(
            matches!(result, Err(ReactionError::InvalidReaction(_))),
            "an unparseable SMIRKS must be a real error, not a silently-returned empty/unchanged result: {result:?}"
        );
    }

    #[test]
    fn reaction_returns_unsupported_chemistry_on_reactant_count_mismatch() {
        // Syntactically valid SMIRKS, but written for two separate reactant
        // molecules. chematic-draw always calls run_reactants with exactly one
        // reactant, so this is a real, library-reported mismatch — not a parse
        // failure, and not something we should misreport as one.
        let ethanol = mol("CCO");
        let two_reactant_smirks = "[C:1].[N:2]>>[C:1][N:2]";
        let result = execute_reaction(&ethanol, two_reactant_smirks);
        assert!(
            matches!(result, Err(ReactionError::UnsupportedChemistry(_))),
            "a reactant-count mismatch must be distinguished from an invalid-SMIRKS parse error: {result:?}"
        );
    }

    #[test]
    fn reaction_outcome_tags_each_case_distinctly() {
        let acetic_acid = mol("CC(=O)O");
        let ethanol = mol("CCO");

        let applied: ReactionOutcome =
            execute_reaction(&acetic_acid, CARBOXYLIC_ACID_TO_AMIDE).into();
        assert!(matches!(applied, ReactionOutcome::Applied { .. }));

        let no_match: ReactionOutcome = execute_reaction(&ethanol, CARBOXYLIC_ACID_TO_AMIDE).into();
        assert!(matches!(no_match, ReactionOutcome::NoMatch));

        let invalid: ReactionOutcome = execute_reaction(&ethanol, "not valid").into();
        assert!(matches!(invalid, ReactionOutcome::InvalidReaction { .. }));

        let unsupported: ReactionOutcome =
            execute_reaction(&ethanol, "[C:1].[N:2]>>[C:1][N:2]").into();
        assert!(matches!(
            unsupported,
            ReactionOutcome::UnsupportedChemistry { .. }
        ));
    }

    #[test]
    fn reaction_product_gets_its_own_layout_not_the_reactants_coordinates() {
        // A reaction that grows the atom count (ester -> acid + alcohol fragment):
        // indexing into the reactant's coordinate array by product atom index would
        // put the new/reordered atoms at the wrong place or piled at the origin.
        let ester = mol("CC(=O)OC"); // methyl acetate
        let products = execute_reaction(&ester, "[C:1](=[O])[O][C:2]>>[C:1](=[O])[O].[C:2]")
            .expect("valid SMIRKS on a matching molecule must succeed");
        assert!(!products.is_empty(), "expected at least one product");

        for product in &products {
            let distinct_positions: std::collections::HashSet<(i64, i64)> = product
                .atoms
                .iter()
                .map(|a| ((a.x * 1000.0) as i64, (a.y * 1000.0) as i64))
                .collect();
            assert!(
                distinct_positions.len() > 1 || product.atoms.len() <= 1,
                "product atoms all landed on the same point ({:?}) — looks like \
                 reused/misindexed reactant coordinates, not a real layout",
                product.atoms.first().map(|a| (a.x, a.y))
            );
        }
    }
}
