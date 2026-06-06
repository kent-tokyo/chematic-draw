//! IUPAC name generation via chematic::iupac — offline, no network required.
//! Replaces the previous PubChem REST API integration.

#[derive(Clone)]
pub enum IupacStatus {
    Idle,
    Done(String),
    /// Structure class not supported by the local algorithm.
    NotSupported,
    Error(String),
}

pub struct IupacState {
    pub status: IupacStatus,
    /// Cache: canonical SMILES → IUPAC name.
    cache: std::collections::HashMap<String, IupacStatus>,
}

impl Default for IupacState {
    fn default() -> Self {
        Self { status: IupacStatus::Idle, cache: Default::default() }
    }
}

impl IupacState {
    /// Compute the IUPAC name for `mol` synchronously (instant — no network).
    pub fn compute(&mut self, mol: &chematic::core::Molecule, smiles_key: &str) {
        if let Some(cached) = self.cache.get(smiles_key) {
            self.status = cached.clone();
            return;
        }

        let result = match chematic::iupac::name(mol) {
            Ok(name) => IupacStatus::Done(name),
            Err(chematic::iupac::IupacError::NotSupported) => IupacStatus::NotSupported,
            Err(e) => IupacStatus::Error(e.to_string()),
        };

        self.cache.insert(smiles_key.to_string(), result.clone());
        self.status = result;
    }

    pub fn reset(&mut self) {
        self.status = IupacStatus::Idle;
    }
}
