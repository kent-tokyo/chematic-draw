//! Conversion between [`CanvasMolecule`] (canvas model) and
//! [`chematic::core::Molecule`] (chemistry engine model).

use chematic::core::{
    Atom, AtomIdx, BondOrder as ChemBondOrder, Chirality, Element, MoleculeBuilder,
};
use chematic::depict::compute_layout;

use crate::canvas::{BondOrder, BondStereo, CanvasAtom, CanvasBond, CanvasMolecule};

pub const CANVAS_SCALE: f32 = 60.0;

/// Convert a `CanvasMolecule` to a `chematic::core::Molecule`.
/// Returns `None` if any element symbol is unrecognised.
pub fn canvas_to_chem(canvas: &CanvasMolecule) -> Option<chematic::core::Molecule> {
    let mut builder = MoleculeBuilder::new();
    let mut id_to_idx: std::collections::HashMap<usize, AtomIdx> = Default::default();

    for atom in &canvas.atoms {
        let element = Element::from_symbol(&atom.element)?;
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

    for bond in &canvas.bonds {
        let Some(&a) = id_to_idx.get(&bond.from) else {
            continue;
        };
        let Some(&b) = id_to_idx.get(&bond.to) else {
            continue;
        };
        let _ = builder.add_bond(a, b, canvas_bond_order(bond.order, bond.stereo));
    }

    let mol = builder.build();

    // Apply aromaticity perception when any aromatic bond was drawn.
    let mol = if canvas.bonds.iter().any(|b| b.order == BondOrder::Aromatic) {
        chematic::perception::apply_aromaticity(&mol)
    } else {
        mol
    };

    // Assign stereochemistry from wedge bond directions + 2D coordinates.
    let has_stereo = canvas.bonds.iter().any(|b| b.stereo != BondStereo::None);
    let mut mol = mol;
    if has_stereo {
        let coords = canvas_coords_chem(canvas);
        chematic::perception::apply_stereo_from_2d(&mut mol, &coords);
    }

    Some(mol)
}

/// Canvas coords in chemistry convention (Y-up), matching atom-insertion order.
/// Used internally for stereo assignment.
fn canvas_coords_chem(canvas: &CanvasMolecule) -> Vec<(f64, f64)> {
    canvas
        .atoms
        .iter()
        .map(|a| (a.pos.x as f64, -(a.pos.y as f64)))
        .collect()
}

/// Extract canvas-space coordinates from a `CanvasMolecule` in atom-insertion order.
///
/// The returned `Vec<(f64, f64)>` matches the atom order used by `canvas_to_chem`:
/// same index `i` → same atom. Y is negated to convert from screen-space (Y-down)
/// to chemistry-conventional (Y-up) coordinates for MOL/CML output.
pub fn canvas_coords(canvas: &CanvasMolecule) -> Vec<(f64, f64)> {
    canvas
        .atoms
        .iter()
        .map(|a| (a.pos.x as f64, -(a.pos.y as f64)))
        .collect()
}

/// Shared helper: build `Vec<CanvasAtom>` from an iterator of `(atom_idx, px, py)` coords.
///
/// `flip_y` must be `true` when the source coordinates follow chemistry convention
/// (Y-up), so they are mirrored to screen space (Y-down).  Pass `false` when the
/// coordinates already use screen Y direction (e.g. from `compute_layout`).
fn atoms_from_coords(
    mol: &chematic::core::Molecule,
    coords: impl Iterator<Item = (u32, f64, f64)>,
    center: egui::Pos2,
    flip_y: bool,
) -> Vec<CanvasAtom> {
    let raw: Vec<(u32, f64, f64)> = coords.collect();
    let min_x = raw.iter().map(|t| t.1).fold(f64::MAX, f64::min);
    let max_x = raw.iter().map(|t| t.1).fold(f64::MIN, f64::max);
    let min_y = raw.iter().map(|t| t.2).fold(f64::MAX, f64::min);
    let max_y = raw.iter().map(|t| t.2).fold(f64::MIN, f64::max);
    let cx = (min_x + max_x) / 2.0;
    let cy = (min_y + max_y) / 2.0;
    let y_sign: f32 = if flip_y { -1.0 } else { 1.0 };
    mol.atoms()
        .zip(raw.iter())
        .map(|((idx, atom), &(_, px, py))| CanvasAtom {
            id: idx.0 as usize,
            element: atom.element.symbol().to_string(),
            pos: egui::Pos2::new(
                center.x + ((px - cx) as f32) * CANVAS_SCALE,
                center.y + y_sign * ((py - cy) as f32) * CANVAS_SCALE,
            ),
            charge: atom.charge,
            selected: false,
            atom_map: atom.atom_map.unwrap_or(0),
        })
        .collect()
}

/// Convert a `chematic::core::Molecule` + pre-parsed 2D coords (from CDXML/CML)
/// to a `CanvasMolecule`, centred at `center`.
///
/// `parsed_coords[i]` must correspond to the atom at `AtomIdx(i)` in `mol`.
/// If coords is empty or shorter than atom count, falls back to `compute_layout`.
pub fn chem_to_canvas_with_coords(
    mol: &chematic::core::Molecule,
    parsed_coords: &[(f64, f64)],
    center: egui::Pos2,
) -> CanvasMolecule {
    if parsed_coords.len() >= mol.atom_count() {
        // flip_y=true: CML/CDXML use chemistry Y-up, must flip to screen Y-down.
        let coords = mol.atoms().map(|(idx, _)| {
            let (px, py) = parsed_coords[idx.0 as usize];
            (idx.0, px, py)
        });
        let atoms = atoms_from_coords(mol, coords, center, true);
        let bonds = build_canvas_bonds(&atoms, mol);
        CanvasMolecule { atoms, bonds }
    } else {
        chem_to_canvas(mol, center)
    }
}

/// Convert a `chematic::core::Molecule` to a `CanvasMolecule` using depict layout.
pub fn chem_to_canvas(mol: &chematic::core::Molecule, center: egui::Pos2) -> CanvasMolecule {
    let layout = compute_layout(mol);
    // flip_y=false: compute_layout already uses screen Y direction.
    let coords = mol.atoms().map(|(idx, _)| {
        let pt = layout.get(idx);
        (idx.0, pt.x, pt.y)
    });
    let atoms = atoms_from_coords(mol, coords, center, false);
    let bonds = build_canvas_bonds(&atoms, mol);
    CanvasMolecule { atoms, bonds }
}

/// Re-layout the current molecule in-place using chematic's depict engine.
/// Atom IDs and element/charge data are preserved; only `pos` is updated.
/// `center` is the canvas-space target center for the resulting layout.
pub fn clean_layout(mol: &mut CanvasMolecule, center: egui::Pos2) {
    let Some(chem_mol) = canvas_to_chem(mol) else {
        return;
    };
    if mol.atoms.is_empty() {
        return;
    }
    let layout = compute_layout(&chem_mol);
    let raw: Vec<(f64, f64)> = mol
        .atoms
        .iter()
        .enumerate()
        .map(|(i, _)| {
            // atom i in canvas order corresponds to AtomIdx(i) because canvas_to_chem
            // inserts atoms in iteration order.
            let pt = layout.get(chematic::core::AtomIdx(i as u32));
            (pt.x, pt.y)
        })
        .collect();
    let min_x = raw.iter().map(|t| t.0).fold(f64::MAX, f64::min);
    let max_x = raw.iter().map(|t| t.0).fold(f64::MIN, f64::max);
    let min_y = raw.iter().map(|t| t.1).fold(f64::MAX, f64::min);
    let max_y = raw.iter().map(|t| t.1).fold(f64::MIN, f64::max);
    let cx = (min_x + max_x) / 2.0;
    let cy = (min_y + max_y) / 2.0;
    // compute_layout uses screen-Y convention (flip_y=false), so no Y-negation needed.
    for (i, atom) in mol.atoms.iter_mut().enumerate() {
        let (px, py) = raw[i];
        atom.pos = egui::Pos2::new(
            center.x + ((px - cx) as f32) * CANVAS_SCALE,
            center.y + ((py - cy) as f32) * CANVAS_SCALE,
        );
    }
}

fn build_canvas_bonds(atoms: &[CanvasAtom], mol: &chematic::core::Molecule) -> Vec<CanvasBond> {
    mol.bonds()
        .enumerate()
        .map(|(i, (_, bond))| {
            let (order, stereo) = chem_bond_order(bond.order);
            CanvasBond {
                id: i + atoms.len(),
                from: bond.atom1.0 as usize,
                to: bond.atom2.0 as usize,
                order,
                stereo,
                selected: false,
            }
        })
        .collect()
}

fn canvas_bond_order(o: BondOrder, stereo: BondStereo) -> ChemBondOrder {
    match stereo {
        BondStereo::WedgeUp => ChemBondOrder::Up,
        BondStereo::WedgeDown => ChemBondOrder::Down,
        BondStereo::None => match o {
            BondOrder::Single => ChemBondOrder::Single,
            BondOrder::Double => ChemBondOrder::Double,
            BondOrder::Triple => ChemBondOrder::Triple,
            BondOrder::Aromatic => ChemBondOrder::Aromatic,
        },
    }
}

fn chem_bond_order(o: ChemBondOrder) -> (BondOrder, BondStereo) {
    match o {
        ChemBondOrder::Single => (BondOrder::Single, BondStereo::None),
        ChemBondOrder::Up => (BondOrder::Single, BondStereo::WedgeUp),
        ChemBondOrder::Down => (BondOrder::Single, BondStereo::WedgeDown),
        ChemBondOrder::Double => (BondOrder::Double, BondStereo::None),
        ChemBondOrder::Triple | ChemBondOrder::Quadruple => (BondOrder::Triple, BondStereo::None),
        ChemBondOrder::Aromatic => (BondOrder::Aromatic, BondStereo::None),
        // ponytail: canvas has no representation for zero/dative/query bonds yet;
        // fall back to a plain single bond rather than reject the molecule.
        ChemBondOrder::Zero
        | ChemBondOrder::Dative
        | ChemBondOrder::QueryAny
        | ChemBondOrder::QuerySingleOrDouble
        | ChemBondOrder::QuerySingleOrAromatic
        | ChemBondOrder::QueryDoubleOrAromatic => (BondOrder::Single, BondStereo::None),
    }
}
