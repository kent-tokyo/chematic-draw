use crate::molecule_conversion::chem_to_dto;
use crate::MoleculeDto;
use serde::Serialize;

/// Why a reaction failed to apply. Categories map to chematic-rxn errors.
#[derive(Debug, Clone)]
pub(crate) enum ReactionError {
    InvalidReaction(String),
    UnsupportedChemistry(String),
}

impl std::fmt::Display for ReactionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidReaction(message) | Self::UnsupportedChemistry(message) => write!(f, "{message}"),
        }
    }
}

impl From<chematic::rxn::TransformError> for ReactionError {
    fn from(error: chematic::rxn::TransformError) -> Self {
        match &error {
            chematic::rxn::TransformError::SmirksParse(_) => Self::InvalidReaction(error.to_string()),
            chematic::rxn::TransformError::ReactantCountMismatch { .. }
            | chematic::rxn::TransformError::ResourceLimit { .. } => Self::UnsupportedChemistry(error.to_string()),
        }
    }
}

/// Run a SMIRKS transformation without crossing the WASM boundary. Product
/// layouts are recomputed because a reaction can add, remove, or reorder atoms.
pub(crate) fn execute_reaction_many(
    chem_molecules: &[&chematic::core::Molecule],
    smirks: &str,
) -> Result<Vec<MoleculeDto>, ReactionError> {
    let product_sets = chematic::rxn::run_reactants(smirks, chem_molecules)?;
    let mut all_products = Vec::new();
    for product_set in product_sets {
        for product in product_set {
            all_products.push(chem_to_dto(&product, None));
        }
    }
    Ok(all_products)
}

pub(crate) fn execute_reaction(
    chem_molecule: &chematic::core::Molecule,
    smirks: &str,
) -> Result<Vec<MoleculeDto>, ReactionError> {
    execute_reaction_many(&[chem_molecule], smirks)
}

/// Tagged domain outcome returned by the stable WASM reaction functions.
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub(crate) enum ReactionOutcome {
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
            Err(ReactionError::UnsupportedChemistry(message)) => Self::UnsupportedChemistry { message },
        }
    }
}
