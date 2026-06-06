fn main() -> eframe::Result {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_title("chematic-draw")
            .with_inner_size([1200.0, 800.0])
            .with_min_inner_size([800.0, 600.0]),
        ..Default::default()
    };

    eframe::run_native(
        "chematic-draw",
        options,
        Box::new(|cc| Ok(Box::new(chem_ui::app::ChemDrawApp::new(cc)))),
    )
}
