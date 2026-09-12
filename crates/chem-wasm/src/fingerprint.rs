use super::{dto_to_chem, MoleculeDto};
use serde::Serialize;
use wasm_bindgen::prelude::*;

/// Encode a `BitVec2048` fingerprint as a 512-character hex string.
pub(super) fn bitvec_to_hex(bv: &chematic::fp::BitVec2048) -> String {
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

/// Decode a fingerprint hex string produced by [`bitvec_to_hex`].
pub(super) fn hex_to_bitvec(hex: &str) -> Result<chematic::fp::BitVec2048, String> {
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
    Ok(bitvec_to_hex(&fp::ecfp4(&chem_mol)))
}

#[derive(Debug, Clone, Serialize)]
pub(super) struct FingerprintDto {
    pub hex: String,
    pub kind: String,
    pub radius: u32,
    pub bit_length: u32,
    pub mode: String,
}

/// Pure core of [`get_fingerprint_with_metadata`].
pub(super) fn fingerprint_with_metadata(chem_mol: &chematic::core::Molecule) -> FingerprintDto {
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

#[wasm_bindgen]
pub fn get_fingerprint_with_metadata(mol_json: &JsValue) -> Result<JsValue, JsValue> {
    let dto: MoleculeDto = serde_wasm_bindgen::from_value(mol_json.clone())
        .map_err(|e| JsValue::from_str(&format!("JSON decode failed: {e}")))?;
    let chem_mol = dto_to_chem(&dto)?;
    serde_wasm_bindgen::to_value(&fingerprint_with_metadata(&chem_mol))
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {e}")))
}

/// Shared hex decoding for the similarity APIs.
pub(super) fn decode_fingerprint_pair(
    fp_a_hex: &str,
    fp_b_hex: &str,
) -> Result<(chematic::fp::BitVec2048, chematic::fp::BitVec2048), String> {
    Ok((hex_to_bitvec(fp_a_hex)?, hex_to_bitvec(fp_b_hex)?))
}

#[wasm_bindgen]
pub fn tanimoto_similarity(fp_a_hex: &str, fp_b_hex: &str) -> Result<f64, JsValue> {
    let (a, b) = decode_fingerprint_pair(fp_a_hex, fp_b_hex).map_err(|e| JsValue::from_str(&e))?;
    Ok(a.tanimoto(&b))
}

#[wasm_bindgen]
pub fn dice_similarity(fp_a_hex: &str, fp_b_hex: &str) -> Result<f64, JsValue> {
    let (a, b) = decode_fingerprint_pair(fp_a_hex, fp_b_hex).map_err(|e| JsValue::from_str(&e))?;
    Ok(a.dice(&b))
}
