use super::{AtomDto, BondDto, MoleculeDto};
use wasm_bindgen::JsValue;

/// Convert a renderer DTO into chematic's molecule representation.
pub(super) fn dto_to_chem(dto: &MoleculeDto) -> Result<chematic::core::Molecule, JsValue> {
    use chematic::core::{
        Atom, AtomIdx, BondOrder as ChemBondOrder, Chirality, Element, MoleculeBuilder,
    };
    use std::collections::{HashMap, HashSet};

    let aromatic_atom_ids: HashSet<u32> = dto
        .bonds
        .iter()
        .filter(|bond| bond.order == 4)
        .flat_map(|bond| [bond.from, bond.to])
        .collect();
    let mut builder = MoleculeBuilder::new();
    let mut id_to_idx: HashMap<u32, AtomIdx> = HashMap::new();
    for atom in &dto.atoms {
        let element = if atom.wildcard {
            Element::C
        } else {
            Element::from_symbol(&atom.element)
                .ok_or_else(|| JsValue::from_str(&format!("Unknown element: {}", atom.element)))?
        };
        let chem_atom = Atom {
            element,
            isotope: atom.isotope,
            charge: atom.charge,
            hydrogen_count: atom.hydrogen_count,
            aromatic: aromatic_atom_ids.contains(&atom.id),
            chirality: Chirality::None,
            wildcard: atom.wildcard,
            atom_map: (atom.atom_map != 0).then_some(atom.atom_map),
            cip_code: None,
        };
        let idx = builder.add_atom(chem_atom);
        id_to_idx.insert(atom.id, idx);
    }
    for bond in &dto.bonds {
        let Some(&from) = id_to_idx.get(&bond.from) else {
            continue;
        };
        let Some(&to) = id_to_idx.get(&bond.to) else {
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
        let _ = builder.add_bond(from, to, order);
    }
    let mut molecule = builder.build();
    if dto.bonds.iter().any(|bond| bond.stereo != 0) {
        let coords: Vec<(f64, f64)> = dto.atoms.iter().map(|atom| (atom.x, -atom.y)).collect();
        chematic::perception::apply_stereo_from_2d(&mut molecule, &coords);
        chematic::perception::apply_local_parity_from_wedges(&mut molecule, &coords);
    }
    Ok(molecule)
}

/// Convert chematic's molecule representation to a renderer DTO.
pub(crate) fn chem_to_dto(
    mol: &chematic::core::Molecule,
    coords: Option<&[(f64, f64)]>,
) -> MoleculeDto {
    use chematic::core::AtomIdx;
    use chematic::depict::compute_layout;

    let display_label = |idx: AtomIdx| Some(chematic::depict::atom_display_label(mol, idx));
    let atom_dto = |i: usize, atom: &chematic::core::Atom, x: f64, y: f64| AtomDto {
        id: i as u32,
        element: atom.element.symbol().to_string(),
        x,
        y,
        charge: atom.charge,
        atom_map: atom.atom_map.unwrap_or(0),
        hydrogen_count: Some(chematic::core::implicit_hcount(mol, AtomIdx(i as u32))),
        wildcard: atom.wildcard,
        display_label: display_label(AtomIdx(i as u32)),
        isotope: atom.isotope,
    };
    let atoms: Vec<AtomDto> = match coords {
        Some(source) => mol
            .atoms()
            .enumerate()
            .map(|(i, (_, atom))| {
                let (x, y) = source.get(i).copied().unwrap_or((0.0, 0.0));
                atom_dto(i, atom, x, -y)
            })
            .collect(),
        None => {
            let layout = compute_layout(mol);
            mol.atoms()
                .enumerate()
                .map(|(i, (_, atom))| {
                    let point = layout.get(AtomIdx(i as u32));
                    atom_dto(i, atom, point.x, point.y)
                })
                .collect()
        }
    };
    let bonds = mol
        .bonds()
        .enumerate()
        .map(|(i, (_, bond))| {
            let (order, stereo) = chem_bond_order(bond.order);
            BondDto {
                id: (atoms.len() + i) as u32,
                from: bond.atom1.0,
                to: bond.atom2.0,
                order,
                stereo,
            }
        })
        .collect();
    MoleculeDto { atoms, bonds }
}

pub(super) fn dto_to_coords(mol: &MoleculeDto) -> Vec<(f64, f64)> {
    mol.atoms.iter().map(|atom| (atom.x, -atom.y)).collect()
}

fn chem_bond_order(order: chematic::core::BondOrder) -> (u8, u8) {
    use chematic::core::BondOrder;
    match order {
        BondOrder::Single => (1, 0),
        BondOrder::Up => (1, 1),
        BondOrder::Down => (1, 2),
        BondOrder::Double => (2, 0),
        BondOrder::Triple => (3, 0),
        BondOrder::Quadruple | BondOrder::Aromatic => (4, 0),
        BondOrder::Zero => (0, 0),
        BondOrder::Dative
        | BondOrder::QueryAny
        | BondOrder::QuerySingleOrDouble
        | BondOrder::QuerySingleOrAromatic => (1, 0),
        BondOrder::QueryDoubleOrAromatic => (2, 0),
    }
}
