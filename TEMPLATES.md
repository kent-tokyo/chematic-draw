# TEMPLATES.md — chematic-draw Template Reference

> SMILES validated via `chematic::smiles::parse_smiles`.
> Category counts and placement rules are in @SPEC.md §S12.

---

## Appendix C: Per-tool Status Bar Tips

Reference table for the proactive tip system. Each tip is ≤ 40 chars.
Implementation: `Tool::tip(self) -> Option<&'static str>` in `toolbar.rs`.

Status bar format: `Tool: {label} [{key}]  {tip}`

| Tool variant | `tip` string |
|-------------|--------------|
| `Tool::Select` | `Shift+click: add  Alt+drag: lasso` |
| `Tool::FragmentSelect` | `Click bond → select one side` |
| `Tool::Single` | `Alt: free angle  Ctrl: snap off` |
| `Tool::Double` | `Alt: free angle  Ctrl: snap off` |
| `Tool::Triple` | `Alt: free angle  Ctrl: snap off` |
| `Tool::Aromatic` | `Alt: free angle  Ctrl: snap off` |
| `Tool::WedgeUp` | `Click existing stereo bond to flip` |
| `Tool::WedgeDown` | `Click existing stereo bond to flip` |
| `Tool::Carbon` | `Click existing atom to change element` |
| `Tool::Nitrogen` | `Click existing atom to change element` |
| `Tool::Oxygen` | `Click existing atom to change element` |
| `Tool::Sulfur` | `Click existing atom to change element` |
| `Tool::Phosphorus` | `Click existing atom to change element` |
| `Tool::Fluorine` | `Click existing atom to change element` |
| `Tool::Chlorine` | `Click existing atom to change element` |
| `Tool::Bromine` | `Click existing atom to change element` |
| `Tool::Iodine` | `Click existing atom to change element` |
| `Tool::Hydrogen` | `Click existing atom to change element` |
| `Tool::Rgroup` | `Click existing atom to change element` |
| `Tool::Benzene` | `Hover bond for red fusion preview` |
| `Tool::Cyclohexane` | `Hover bond for red fusion preview` |
| `Tool::Cyclopentane` | `Hover bond for red fusion preview` |
| `Tool::Eraser` | `Click atom removes all its bonds` |
| `Tool::Pan` | `Release Space to return to prior tool` |
| `Tool::ReactionArrow` | `Drag to place arrow between molecules` |
| `Tool::CurlyArrow` | `Drag to place electron-push arrow` |

---

## Appendix D: Template SMILES Reference

### Functional groups (18)
| Label | SMILES |
|-------|--------|
| COOH | C(=O)O |
| NH2 | N |
| OH | O |
| SH | S |
| CHO | C=O |
| COCH3 | CC=O |
| CONH2 | C(=O)N |
| SO2H | S(=O)O |
| SO3H | S(=O)(=O)O |
| PO3H2 | P(=O)(O)O |
| NO2 | [N+](=O)[O-] |
| CN | C#N |
| CF3 | C(F)(F)F |
| CCl3 | C(Cl)(Cl)Cl |
| NCO | N=C=O |
| NCS | N=C=S |
| N3 | [N-]=[N+]=N |
| Vinyl | C=C |

### Heterocycles 5-membered (10)
| Label | SMILES |
|-------|--------|
| Furan | c1ccoc1 |
| Pyrrole | c1cc[nH]c1 |
| Thiophene | c1ccsc1 |
| Imidazole | c1cnc[nH]1 |
| Pyrazole | c1cc[nH]n1 |
| Oxazole | c1cocn1 |
| Thiazole | c1cscn1 |
| Isoxazole | c1ccno1 |
| Isothiazole | c1ccns1 |
| 1,2,3-Triazole | c1cn[nH]n1 |

### Heterocycles 6-membered (10)
| Label | SMILES |
|-------|--------|
| Pyridine | c1ccncc1 |
| Pyrimidine | c1ccncn1 |
| Pyrazine | c1cnccn1 |
| Pyridazine | c1ccnnc1 |
| s-Triazine | c1ncncn1 |
| Morpholine | C1COCCN1 |
| Piperidine | C1CCNCC1 |
| Piperazine | C1CNCCN1 |
| Oxane | C1CCOCC1 |
| Thiane | C1CCSCC1 |

### Fused heterocycles (10)
| Label | SMILES |
|-------|--------|
| Indole | c1ccc2[nH]ccc2c1 |
| Benzimidazole | c1ccc2nc[nH]c2c1 |
| Purine | c1nc2ncnc2[nH]1 |
| Quinoline | c1ccc2ncccc2c1 |
| Isoquinoline | c1ccc2cnccc2c1 |
| Benzofuran | c1ccc2occc2c1 |
| Benzothiophene | c1ccc2sccc2c1 |
| Indazole | c1ccc2[nH]ncc2c1 |
| Quinazoline | c1ccc2ncncc2c1 |
| Acridine | c1ccc2nc3ccccc3cc2c1 |

### Common drugs (8)
| Label | SMILES |
|-------|--------|
| Aspirin | CC(=O)Oc1ccccc1C(=O)O |
| Ibuprofen | CC(C)Cc1ccc(cc1)C(C)C(=O)O |
| Paracetamol | CC(=O)Nc1ccc(O)cc1 |
| Caffeine | Cn1c(=O)c2c(ncn2C)n(c1=O)C |
| Penicillin G | CC1([C@@H](N2[C@H](S1)[C@@H](C2=O)NC(=O)Cc1ccccc1)C(=O)O)C |
| Morphine | [C@@H]1(c2ccc(O)c3c2[C@H]4CC[C@@](O)([C@H]1NCC4)O3)c1ccccc1 |
| Glucose | OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O |
| Cholesterol | CC(C)CCC[C@@H](C)[C@H]1CC[C@H]2[C@@H]3CC=C4C[C@@H](O)CC[C@]4(C)[C@H]3CC[C@]12C |
