# Format Interoperability

This is the supported read/write boundary, verified against the WASM bridge and
its focused adapter tests. “Round-trip” means an equivalent chemical graph,
not byte-identical text: formatting, atom order, and some coordinates may
change.

| Format | Read | Write | Round-trip verified | Notes |
|---|---|---|---|---|
| SMILES | ✅ | ✅ (`toSmiles`, `toCanonicalSmiles`) | ✅ | Canonical form is deterministic. |
| MOL V2000 | ✅ | ✅ | ✅ | Use V3000 for more than 999 atoms/bonds. |
| MOL V3000 | ✅ | ✅ | ✅ | |
| SDF | ✅ | ✅ | ✅ | `parseMolecule` and `parseAny` read the first record only. |
| CML | ✅ | ✅ | ✅ | |
| CDXML | ✅ supported subset | ✅ supported subset | ✅ single-fragment corpus | Pages, text, arrows, basic graphics, documented transforms, and molecule data are covered. Advanced presentation semantics are not. |
| RXN | ✅ V2000, one step | ✅ V2000, one step | ✅ | Use reaction JSON v2 for agents, coefficients, or multiple steps. |
| InChI | ❌ | ✅ one-way | N/A | `molToInchi` and `inchiToInchiKey`; there is no `inchiToMol`. |
| XYZ / PDB | ✅ coordinates only | ❌ | N/A | Import for the 3D viewer; neither supplies molecular connectivity here. |
| JSON session bundle | ✅ | ✅ | ✅ | Local review bundle, not general chemical interchange. |
| JSON reaction document | ✅ v2; v1 migration | ✅ v2 | ✅ | Unknown future schemas are rejected. |
| SVG | ❌ | ✅ (`to_svg`) | N/A | Rendering target, not chemical interchange. |

## External providers

PubChem is an explicit structure lookup. ChemSpider is a separate Electron-only,
opt-in name lookup: the host reads `CHEMSPIDER_API_KEY` and
`CHEMSPIDER_ATTRIBUTION_ACCEPTED=true`, keeps the key in the main process, and
never persists or exposes it to the renderer. Browser and Playground builds do
not provide ChemSpider. Live availability depends on an approved RSC account,
terms, network access, and current provider limits.

## Query and reaction boundary

The versioned query document supports editable element lists, wildcards,
charge/isotope, aromaticity, valence, hydrogen, ring, and query-bond orders.
The SMARTS writer covers connected linear queries. Markush, R-groups, and
polymers remain typed data; unsupported constructs are rejected by
concrete-molecule export, not converted to carbon or a wildcard.

RXN V2000 import/export covers one authored reactant/product step. Keep
agents, coefficients, and multi-step schemes in reaction-document JSON v2.
Known RXN loss needs explicit confirmation, and multi-step RXN export is
blocked rather than flattening step boundaries.

## Known lossy conversions

Before a molecule save or explicit MOL/SMILES export, the renderer explains a
known loss and asks whether to continue. Important non-lossless cases are:

- **CDXML:** advanced presentation attributes are not synthesized.
- **3D conformers:** exporting through SMILES drops them; the session model
  does not retain the viewer conformer to infer a warning later.
- **Wildcards:** `[*]` round-trips through SMILES but degrades to carbon in
  MOL, SDF, CML, and supported CDXML output.
- **Isotopes:** canonical SMILES and CML preserve them; MOL V2000 and SDF do
  not currently preserve the mass-difference field.
- **Depiction labels:** display labels are regenerated cosmetics, not file
  data, and therefore are never serialized.

## See also

- [API Reference](API.md) — operation groups and source pointers
- `electron/src/__tests__/parseAnyContract.test.ts` — round-trip regressions
