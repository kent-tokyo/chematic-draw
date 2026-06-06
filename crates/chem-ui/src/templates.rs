//! Built-in template library — common chemical structures organised by category.

use egui::Ui;

use crate::bridge::chem_to_canvas;
use crate::canvas::CanvasMolecule;
use crate::theme::Tokens;

pub struct Template {
    pub name: &'static str,
    pub smiles: &'static str,
    pub category: &'static str,
}

pub const TEMPLATES: &[Template] = &[
    // ── Carbocycles ──
    Template { name: "Benzene",      smiles: "c1ccccc1",              category: "Carbocycles" },
    Template { name: "Naphthalene",  smiles: "c1ccc2ccccc2c1",        category: "Carbocycles" },
    Template { name: "Anthracene",   smiles: "c1ccc2cc3ccccc3cc2c1",  category: "Carbocycles" },
    Template { name: "Cyclohexane",  smiles: "C1CCCCC1",              category: "Carbocycles" },
    Template { name: "Cyclopentane", smiles: "C1CCCC1",               category: "Carbocycles" },
    Template { name: "Cyclobutane",  smiles: "C1CCC1",                category: "Carbocycles" },
    Template { name: "Cyclopropane", smiles: "C1CC1",                 category: "Carbocycles" },

    // ── Heterocycles ──
    Template { name: "Pyridine",   smiles: "c1ccncc1",               category: "Heterocycles" },
    Template { name: "Pyrrole",    smiles: "c1cc[nH]c1",             category: "Heterocycles" },
    Template { name: "Furan",      smiles: "c1ccoc1",                category: "Heterocycles" },
    Template { name: "Thiophene",  smiles: "c1ccsc1",                category: "Heterocycles" },
    Template { name: "Imidazole",  smiles: "c1cn[nH]c1",            category: "Heterocycles" },
    Template { name: "Pyrimidine", smiles: "c1ccncc1",              category: "Heterocycles" },
    Template { name: "Indole",     smiles: "c1ccc2[nH]ccc2c1",      category: "Heterocycles" },
    Template { name: "Purine",     smiles: "c1ncc2[nH]cnc2n1",      category: "Heterocycles" },
    Template { name: "Morpholine", smiles: "C1CNCCO1",              category: "Heterocycles" },
    Template { name: "Piperidine", smiles: "C1CCNCC1",              category: "Heterocycles" },
    Template { name: "Piperazine", smiles: "C1CNCCN1",              category: "Heterocycles" },

    // ── Amino acids ──
    Template { name: "Glycine",    smiles: "NCC(=O)O",              category: "Amino Acids" },
    Template { name: "Alanine",    smiles: "N[C@@H](C)C(=O)O",      category: "Amino Acids" },
    Template { name: "Serine",     smiles: "N[C@@H](CO)C(=O)O",     category: "Amino Acids" },
    Template { name: "Phenylalanine", smiles: "N[C@@H](Cc1ccccc1)C(=O)O", category: "Amino Acids" },
    Template { name: "Tryptophan", smiles: "N[C@@H](Cc1c[nH]c2ccccc12)C(=O)O", category: "Amino Acids" },

    // ── Common building blocks ──
    Template { name: "Ethanol",       smiles: "CCO",          category: "Functional Groups" },
    Template { name: "Acetic acid",   smiles: "CC(=O)O",      category: "Functional Groups" },
    Template { name: "Aniline",       smiles: "Nc1ccccc1",    category: "Functional Groups" },
    Template { name: "Phenol",        smiles: "Oc1ccccc1",    category: "Functional Groups" },
    Template { name: "Acetamide",     smiles: "CC(=O)N",      category: "Functional Groups" },
    Template { name: "Urea",          smiles: "NC(=O)N",      category: "Functional Groups" },
    Template { name: "Caffeine",      smiles: "Cn1c(=O)c2c(ncn2C)n(c1=O)C", category: "Functional Groups" },
    Template { name: "Aspirin",       smiles: "CC(=O)Oc1ccccc1C(=O)O", category: "Functional Groups" },
];

pub struct TemplatePanel;

impl TemplatePanel {
    pub fn show(
        ui: &mut Ui,
        tokens: &Tokens,
        on_insert: &mut Option<CanvasMolecule>,
    ) {
        ui.heading("Templates");
        ui.separator();

        let mut current_cat = "";
        egui::ScrollArea::vertical().show(ui, |ui| {
            for tmpl in TEMPLATES {
                if tmpl.category != current_cat {
                    current_cat = tmpl.category;
                    ui.add_space(4.0);
                    ui.label(
                        egui::RichText::new(tmpl.category)
                            .small()
                            .color(tokens.separator),
                    );
                }
                if ui.button(tmpl.name).clicked() {
                    if let Ok(mol) = chematic::smiles::parse(tmpl.smiles) {
                        let dummy_center = egui::Pos2::ZERO; // caller will re-center
                        *on_insert = Some(chem_to_canvas(&mol, dummy_center));
                    }
                }
            }
        });
    }
}
