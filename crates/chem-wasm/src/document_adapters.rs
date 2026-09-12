use super::*;

const DOCUMENT_MAX_INPUT_BYTES: usize = 64 * 1024 * 1024;
const DOCUMENT_MAX_JSON_BYTES: usize = 64 * 1024 * 1024;

fn check_document_size(label: &str, bytes: usize, limit: usize) -> Result<(), JsValue> {
    if bytes > limit {
        return Err(JsValue::from_str(&format!(
            "{label} exceeds maximum size ({bytes} > {limit} bytes)"
        )));
    }
    Ok(())
}

#[wasm_bindgen]
pub fn rxn_document_from_rxn(text: &str) -> Result<String, JsValue> {
    check_document_size("RXN input", text.len(), DOCUMENT_MAX_INPUT_BYTES)?;
    let document = chematic::mol::parse_rxn_document(text)
        .map_err(|error| JsValue::from_str(&error.to_string()))?;
    serde_json::to_string(&document)
        .map_err(|error| JsValue::from_str(&format!("RXN document serialization failed: {error}")))
}

#[wasm_bindgen]
pub fn rxn_document_to_rxn(document_json: &str) -> Result<String, JsValue> {
    check_document_size(
        "RXN document JSON",
        document_json.len(),
        DOCUMENT_MAX_JSON_BYTES,
    )?;
    let document: chematic::rxn::ReactionDocument = serde_json::from_str(document_json)
        .map_err(|error| JsValue::from_str(&format!("invalid reaction document JSON: {error}")))?;
    chematic::mol::write_rxn_document(&document)
        .map_err(|error| JsValue::from_str(&error.to_string()))
}

#[wasm_bindgen]
pub fn cdxml_document_json(cdxml: &str) -> Result<String, JsValue> {
    check_document_size("CDXML input", cdxml.len(), DOCUMENT_MAX_INPUT_BYTES)?;
    let document = chematic::mol::CdxmlDocument::parse_with_limits(
        cdxml,
        &chematic::mol::CdxmlParseLimits {
            max_input_bytes: DOCUMENT_MAX_INPUT_BYTES,
            ..Default::default()
        },
    )
    .map_err(|error| JsValue::from_str(&error.to_string()))?;
    serde_json::to_string(&document.to_json()).map_err(|error| {
        JsValue::from_str(&format!("CDXML document serialization failed: {error}"))
    })
}

#[wasm_bindgen]
pub fn edit_cdxml_document_json(cdxml: &str, edit_json: &str) -> Result<String, JsValue> {
    check_document_size("CDXML input", cdxml.len(), DOCUMENT_MAX_INPUT_BYTES)?;
    check_document_size("CDXML edit JSON", edit_json.len(), DOCUMENT_MAX_JSON_BYTES)?;
    let document = chematic::mol::CdxmlDocument::parse_with_limits(
        cdxml,
        &chematic::mol::CdxmlParseLimits {
            max_input_bytes: DOCUMENT_MAX_INPUT_BYTES,
            ..Default::default()
        },
    )
    .map_err(|error| JsValue::from_str(&error.to_string()))?;
    document
        .apply_json_edit(edit_json)
        .map(|edited| edited.write())
        .map_err(|error| JsValue::from_str(&error.to_string()))
}
