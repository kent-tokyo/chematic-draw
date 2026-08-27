# Development Roadmap

Long-term vision and planned features for chematic-draw.

## Vision

Create a **free, open-source, cross-platform chemical structure editor** that rivals commercial tools while remaining lightweight and easy to extend.

---

## Version History

### v0.1.0 (Initial Release)
- ✅ 2D structure editor
- ✅ Basic canvas drawing
- ✅ SMILES input/output
- ✅ Electron desktop framework

### v0.2.0 (Current)
- ✅ chematic 0.1.40 integration
- ✅ 3D molecular viewer with WebGL-free rendering
- ✅ Property prediction (Lipinski, SA score, ESOL, PAINS)
- ✅ Reaction mechanism visualization
- ✅ Stereoisomer enumeration
- ✅ Database similarity search with MCS
- ✅ Performance optimization (WebWorker, profiler)
- ✅ Comprehensive documentation
- ✅ CI/CD automation (GitHub Actions)

---

## Upcoming Releases

### v0.3.0 - Web Version (Q3 2026)

#### Web Version
- [ ] Compile Electron app to web (same WASM bridge)
- [ ] Browser-based access (no installation)
- [ ] PWA support for offline use

**Benefits:**
- No installation required
- Works on any device (desktop, tablet)
- Share molecules via URL

> Cloud storage integration and real-time collaboration were deferred to
> v0.5.0+ — see [Long-term](#long-term-v050) — to keep this release scoped
> to the web build itself.

#### Timeline
- Months 1-2: Web build pipeline
- Month 3: Testing, documentation, release

---

### v0.4.0 - Advanced Chemistry (Q4 2026)

#### NMR Prediction
- [ ] ¹H NMR peak prediction (chemical shift, coupling constants)
- [ ] ¹³C NMR prediction
- [ ] Integration with experimental data comparison

**Algorithm:**
- HOSE code-based prediction
- Machine learning model (trained on SDBS database)
- Uncertainty estimates

#### Advanced Property Models
- [ ] Metabolic stability prediction
- [ ] Toxicity assessment (ADMET)
- [ ] Protein binding affinity estimation
- [ ] Blood-brain barrier permeability

**Data Sources:**
- Literature + ChEMBL database
- Published QSAR models
- Machine learning models

#### Synthetic Route Planning
- [ ] Reaction template library (built-in)
- [ ] Retrosynthetic analysis
- [ ] Multi-step synthesis planning
- [ ] Cost estimation per route

**Integration:**
- Interface with reaction templates
- Step-by-step synthesis visualization
- Material sourcing info (price, availability)

#### Timeline
- Months 1-2: NMR model development and training
- Months 2-3: ADMET property models
- Month 3: Retrosynthesis engine, testing

---

### v0.5.0 - Extended Reality (Q1 2027)

#### 3D Visualization Upgrades
- [ ] WebGL-based high-quality rendering
- [ ] Surface visualization (molecular surface, electrostatic potential)
- [ ] Crystal structure viewer
- [ ] Protein-ligand complex visualization

#### AR/VR Support
- [ ] Augmented reality (iOS/Android with ARKit/ARCore)
- [ ] Virtual reality (HTC Vive, Meta Quest)
- [ ] Haptic feedback (optional: specialized hardware)
- [ ] Multi-user immersive environments

**Use Cases:**
- Educational: Visualize molecules at scale
- Research: Collaborate in 3D space
- Training: Interactive molecular modeling

#### Timeline
- Months 1-2: WebGL integration, performance optimization
- Months 2-3: Mobile AR framework
- Month 3: VR support, testing

---

## Planned Enhancements

### Shorter-term (v0.2.1 - v0.2.5)

#### Performance
- [ ] Optimize WASM memory allocations (reduce heap size by 20%)
- [ ] Parallel WASM calculations for batch operations
- [ ] Canvas rendering batching (fewer draw calls)
- [ ] Lazy loading for large files

**Target:** 2x faster for large molecules (>200 atoms)

#### File Format Support
- [ ] Full MOL V3000 support
- [ ] PDB files with full connectivity
- [ ] CIF crystal format
- [ ] Automatic format detection on import

#### UI Improvements
- [ ] Customizable toolbars
- [ ] User preference saving (theme, layout, defaults)
- [ ] Undo/Redo with visual timeline
- [ ] Atom/bond property dialogs
- [ ] Templates library search/tagging

#### Testing
- [ ] Snapshot testing for UI regressions
- [ ] Visual regression testing (screenshots)
- [ ] Accessibility testing (WCAG 2.1)
- [ ] Mobile responsiveness testing

---

### Medium-term (v0.3.0 - v0.4.0)

#### Extended Chemistry
- [ ] Tautomer generation and visualization
- [ ] Conformer generation and ranking
- [ ] Atom mapping for complex reactions
- [ ] Reaction yield prediction
- [ ] Mechanism arrow templates (predefined types)

#### Integration
- [ ] Python API (scripting support)
- [ ] RDKit compatibility layer
- [ ] ChemOffice format import/export
- [ ] REST API for batch processing

#### Enterprise Features
- [ ] User authentication and roles
- [ ] Audit logging for compliance
- [ ] Backup and disaster recovery
- [ ] Multi-tenant support

---

### Long-term (v0.5.0+)

#### Cloud & Collaboration
- [ ] Cloud storage integration (Google Drive, OneDrive)
- [ ] Real-time collaborative editing (WebSocket)
- [ ] User comments and annotations
- [ ] Project sharing with permissions (view/edit/admin)
- [ ] Version history and conflict resolution

**Use Cases:**
- Research teams working on same project
- Teaching labs with shared datasets
- Structure validation workflows

#### Machine Learning
- [ ] Custom model training interface
- [ ] Transfer learning for property prediction
- [ ] Generative models for molecule design
- [ ] Active learning workflows

#### Platform Expansion
- [ ] Mobile native apps (React Native)
- [ ] Jupyter notebook integration
- [ ] Slack bot for structure queries
- [ ] Browser extensions for web scraping

#### Community
- [ ] Plugin ecosystem (third-party tools)
- [ ] Community contribution guidelines
- [ ] Crowdsourced template library
- [ ] Open data integration (PubChem, ChEMBL)

---

## Not Planned

### Features We Won't Implement

❌ **3D Protein Structure Visualization** — Out of scope (use PyMOL)
❌ **Quantum Calculation Backend** — Delegate to ORCA/Gaussian
❌ **Full Retrosynthesis Engine** — Too complex; basic planning only
❌ **Virtual Screening** — Not in scope
❌ **Lab Automation** — Not a lab management tool
❌ **Chemical Database** — Use ChEMBL or PubChem instead

### Why?

These features:
- Are better implemented by specialized tools
- Require massive external datasets
- Add complexity without value-add
- Distract from core editing functionality

---

## Development Priorities

### Current Focus (v0.2.x)

1. **Stability** — Bug fixes and regression testing
2. **Performance** — Benchmark-driven optimization
3. **Documentation** — User guides and API docs
4. **Community** — Contributing guidelines, issue templates

### Next Focus (v0.3.0)

1. **Web Version** — Browser accessibility
2. **Extended Chemistry** — NMR, ADMET, retrosynthesis
3. **Mobile Support** — iOS/Android native apps

Cloud storage and real-time collaboration are deferred to v0.5.0+ (see
[Long-term](#long-term-v050)).

---

## Contributing to the Roadmap

### Suggest a Feature
1. Open a [GitHub Discussion](https://github.com/yourusername/chematic-draw/discussions)
2. Describe the use case and benefits
3. Link to related issues
4. Community votes on priority

### Roadmap Items

Features are prioritized by:
- **Demand** — How many users want it?
- **Effort** — How hard to implement?
- **Impact** — How much value for users?
- **Alignment** — Does it fit the vision?

### Get Involved

Want to help build these features?
1. Pick a [roadmap item](https://github.com/yourusername/chematic-draw/projects)
2. Comment: "I'd like to work on this"
3. Discuss implementation approach
4. Submit PR when ready

See [CONTRIBUTING.md](./CONTRIBUTING.md) for process.

---

## Timeline Expectations

**Dates are estimates and subject to change.**

- **v0.2.x**: Regular maintenance and patch releases
- **v0.3.0**: Web version (6-9 months from v0.2.0)
- **v0.4.0**: Advanced chemistry (12-15 months from v0.2.0)
- **v0.5.0**: AR/VR support (18-24 months from v0.2.0)

Progress depends on:
- Community contributions
- Funding/sponsorship
- External dependencies (new chematic features)

---

## Funding & Sponsorship

To accelerate development:

💰 **Sponsorship Options:**
- Become a GitHub Sponsor
- Corporate sponsorship
- Grant funding (NSF, NIH)
- Academic partnerships

**How sponsor funds are used:**
- Developer time (features & maintenance)
- Infrastructure (servers, CI/CD, hosting)
- Community events (workshops, conferences)
- Dependency development (chematic library)

Interested in sponsoring? Email support@example.com

---

## Related Projects

We collaborate with:
- **[chematic](https://github.com/rapodaca/chematic)** — Core chemistry library
- **[Electron Fiddle](https://www.electronjs.org/fiddle)** — Desktop framework
- **[RDKit](https://github.com/rdkit/rdkit)** — Chemistry reference
- **[OpenChemistry](https://www.openchemistry.org/)** — Community standards

---

## Contact

- 📧 Email: support@example.com
- 💬 GitHub Discussions: [Link](https://github.com/yourusername/chematic-draw/discussions)
- 🐛 Bug Reports: [GitHub Issues](https://github.com/yourusername/chematic-draw/issues)
- 📋 Feature Requests: [GitHub Issues](https://github.com/yourusername/chematic-draw/issues/new?template=feature_request.md)

---

Last updated: August 2026

**Next review:** December 2026
