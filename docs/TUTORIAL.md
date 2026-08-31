# User Tutorial

Step-by-step guides for all major features in chematic-draw.

## Table of Contents

1. [Drawing Molecules](#drawing-molecules)
2. [3D Molecular Viewer](#3d-molecular-viewer)
3. [Reaction Mechanisms](#reaction-mechanisms)
4. [Property Prediction](#property-prediction)
5. [Stereochemistry](#stereochemistry)
6. [Search Functionality](#search-functionality)
7. [Advanced Workflows](#advanced-workflows)

---

## Drawing Molecules

### Creating a Molecule from Scratch

**Goal:** Draw acetone (CH₃-CO-CH₃) using the canvas editor.

#### Steps

1. **Select the carbon tool**
   - Click the `C` button in the toolbar (top of the canvas), or press `C`

2. **Place First Carbon**
   - Click center of canvas
   - Small "C" label appears

3. **Add Second Carbon (Carbonyl)**
   - Click to the right of first carbon (~100px)
   - A new carbon appears, bonded to the first (clicking near an existing
     atom with an element tool active bonds the new atom to it)

4. **Create C=O Bond**
   - Select the `O` tool, click above the second carbon — a new oxygen
     appears, connected by a single bond (default)

5. **Convert to Double Bond**
   - Click the bond tool for a double bond (toolbar button, or press `2`)
   - Click the C-O bond to change its order to double

6. **Add Third Carbon**
   - Select the `C` tool again, click to the left of the first carbon
   - New carbon appears connected by single bond

7. **Complete and Verify**
   - You now have CH₃-CO-CH₃
   - Hydrogens are implicit (not shown)
   - Molecular formula: **C₃H₆O** (MW: 58.08)

#### Alternative: Load from SMILES

**Faster method for known structures:** there's no "paste a SMILES string"
dialog — save the SMILES to a text file and use **File → Open...**, which
auto-detects the format:

1. Save `CC(=O)C` to a `.smi` file
2. **File → Open...** → select the file
3. Molecule loads instantly (no manual drawing needed)

### Editing Existing Molecules

#### Select an Atom
- Click atom to highlight it
- Shift-click or Ctrl-click to add more atoms/bonds to the selection

#### Delete Elements
- Click atom/bond to select
- Press `Delete` or `Backspace`

#### Add Charges / Isotope
- Select an atom, then open the **Inspector** tab (right sidebar)
- Use the **Charge** button group (−2 to +2) or the **Isotope (mass
  number)** field
- Changes apply immediately — no separate "OK" step

#### Change Element
- Select an atom, then use the **Element** picker in the **Inspector** tab

#### Toggle Bond Type
- Select the bond tool for the order you want (toolbar, or `1`/`2`/`3`/`4`
  for single/double/triple/aromatic), then click the bond
- Alternatively, select an existing bond and change its **Bond Order** in
  the Inspector tab

#### Add Stereochemistry
- Select a bond, then use the **Stereo** button group in the **Inspector**
  tab: None / Wedge / Dash

**Right-click context menu:** right-clicking the canvas opens a real,
selection-sensitive menu — verified live: an atom, a bond, or empty canvas
each show different options.
- On a **bond**: Single/Double/Triple/Aromatic Bond, Wedge Up, Dash Down,
  Delete Bond — all fully functional.
- On **empty canvas**: Clean Layout, Standardize — both fully functional.
- On an **atom**: Delete Atom works, but **Set Element**, **Charge +1**, and
  **Charge -1** are currently no-ops (they log to the console and close the
  menu, but don't change anything) — use the Inspector tab's Element picker
  and Charge buttons above instead for those two.

### Viewing Molecule Properties

1. **Click "Props" Tab** (right sidebar)
2. **Molecular Information:**
   - **Formula:** C₃H₆O
   - **Weight:** 58.08 g/mol
   - **LogP:** -0.24 (lipophilicity)
   - **HBA:** 1 (hydrogen bond acceptors)
   - **HBD:** 0 (hydrogen bond donors)

---

## 3D Molecular Viewer

### Generate 3D Structure

**Goal:** Create 3D coordinates and visualize molecular shape.

#### Steps

1. **Open 3D Panel**
   - Click **"3D" tab** in right sidebar
   - You'll see canvas area and controls

2. **Generate Coordinates**
   - Click **"3D 生成"** button
   - Wait for calculation (1-3 seconds for typical molecules)
   - Canvas shows molecular structure in 3D

3. **Interpret the View**
   - Atoms shown as **colored spheres** (CPK coloring)
     - Gray = Carbon
     - Blue = Nitrogen
     - Red = Oxygen
     - Yellow = Sulfur
     - White = Hydrogen (if shown)
   - Sphere size = Van der Waals radius
   - Bonds connect atoms with lines

### Interact with 3D Structure

#### Rotate
- **Click and drag** on canvas
- Drag right → rotate around Y-axis
- Drag up/down → rotate around X-axis
- Smooth continuous rotation

#### Zoom
- **Scroll mouse wheel**
- Scroll up = zoom in
- Scroll down = zoom out
- Range: 0.1× to 8.0× (min to max magnification)

There's currently no reset-view button or shortcut — re-generate the 3D
structure, or scroll/drag back manually.

### Export 3D Structure

#### Export as XYZ File
1. **Click "XYZ エクスポート"** (after generating 3D)
2. **Choose save location**
3. **File downloads** with extension `.xyz`

#### XYZ Format
```
6                           # Number of atoms
Benzene 3D structure        # Comment line
C    0.000   1.400   0.000
C    1.212   0.700   0.000
C    1.212  -0.700   0.000
C    0.000  -1.400   0.000
C   -1.212  -0.700   0.000
C   -1.212   0.700   0.000
```

**Use XYZ for:**
- Quantum chemistry software (Gaussian, ORCA)
- Molecular dynamics simulations
- Structure visualization in third-party tools

### 3D Performance Tips

Exact timings depend on the molecule and machine — see
`electron/src/__tests__/wasmPerformance.bench.ts` for the real, measured
benchmark suite (`npm run test:perf`) rather than the estimates below.

**Notes:**
- 3D generation (`generate3dCoords`) runs on the main thread, not a
  WebWorker — it can briefly block the UI for very large molecules
- Rendering uses Canvas 2D

---

## Reaction Mechanisms

This is two separate tabs, not one "mechanism generator": the **Reactions**
tab runs template SMIRKS transforms and tracks steps; the **Mech** tab is
for manually drawing electron-pushing arrows. There's no dropdown that
auto-generates a full SN1/SN2/E1/E2 mechanism from a reactant + reagent —
that has to be built step by step.

### Run a Template Reaction

**Goal:** Convert a carboxylic acid to an amide.

#### Steps

1. **Load Starting Material**
   - Save `CC(=O)O` (acetic acid) to a `.smi` file and open it via
     **File → Open...**

2. **Open the Reactions Tab**
   - Click **"Reactions"** in the sidebar
   - Pick a template from the dropdown, e.g. **"Carboxylic acid → Amide"**
     (other built-in templates: ester → acid, ester → alcohol, alcohol →
     aldehyde, aldehyde → carboxylic acid, ketone → alcohol; or write a
     custom SMIRKS pattern)
   - Click **"Execute Reaction"**
   - If the pattern matches, a new step is added showing the product;
     otherwise you get an explicit "SMIRKS pattern did not match this
     molecule" message, not a silent failure

3. **Or add a step manually**
   - Click **"+ Add Reaction Step"** to add an empty step you can fill in
     by hand, with conditions (temperature/solvent/catalyst/time/yield)

Once two or more steps exist, the panel shows live **atom mapping**,
**reaction classification** (single-step/multi-step), and **green
chemistry metrics** (atom economy, E-factor).

**Atoms are color-coded in the atom-mapping legend:**
- 🟢 **Green** = Persistent (atoms present in both steps)
- 🔵 **Blue** = New
- 🔴 **Red** = Leaving
- ⚫ **Gray** = Spectator

### Draw Electron-Pushing Arrows

**Goal:** Annotate a mechanism step with arrows manually.

1. **Open the "Mech" tab** (separate from "Reactions")
2. Click **"+ Add Arrow"**
3. Click a **source atom**, then a **sink atom** on the canvas
4. Pick an arrow type: **Forward** (→, standard electron flow), **Retro**
   (⇌, reverse/equilibrium), or **Resonance** (↔, delocalization)
5. The arrow appears in the "Arrows" list, where you can change its type
   or remove it

There's no built-in "step through electron flow automatically" animation —
arrows are placed and reviewed manually.

---

## Property Prediction

### View Molecular Properties

**Goal:** Check if aspirin (CC(=O)Oc1ccccc1C(=O)O) follows Lipinski's Rule of 5.

#### Steps

1. **Load Aspirin**
   - Save `CC(=O)Oc1ccccc1C(=O)O` to a `.smi` file, then **File → Open...**

2. **Open Props Tab**
   - Click **"Props"** in right sidebar
   - Properties calculated automatically

3. **Review Results**

**Properties displayed:**

| Property | Value | Interpretation |
|----------|-------|-----------------|
| **Molecular Weight** | 180.16 | <500 ✓ (Lipinski OK) |
| **LogP** | 1.19 | Optimal lipophilicity |
| **HBA** | 3 | <10 ✓ |
| **HBD** | 1 | <5 ✓ |
| **Rot. Bonds** | 3 | Moderate flexibility |
| **SA Score** | 2.8 | Easy to synthesize (0-10 scale) |
| **ESOL Solubility** | -1.35 | LogS (more negative = less soluble) |
| **PAINS** | 0 violations | ✓ No alerts |

### Interpret Property Values

#### Lipinski's Rule of 5
- **MW** ≤ 500 — Molecular weight
- **LogP** ≤ 5 — Lipophilicity (oil-water partition)
- **HBA** ≤ 10 — Hydrogen bond acceptors (N, O)
- **HBD** ≤ 5 — Hydrogen bond donors (N-H, O-H)

✓ **Aspirin passes all checks** — Good oral bioavailability predicted.

#### SA Score (Synthetic Accessibility)
- **0-3** = Easy to synthesize (common reactions)
- **3-6** = Moderate difficulty
- **6-10** = Difficult/impossible to synthesize

#### Solubility (ESOL)
- **LogS = log₁₀(Solubility in M)**
- **-1 to 0** = Soluble
- **-2 to -1** = Moderately soluble
- **<-2** = Poor solubility
- **<-6** = Insoluble

#### PAINS (Pan-Assay Interference Compounds)
- **0 violations** ✓ = Clean compound (no false positives in assays)
- **1+ violations** ⚠️ = May interfere with cell assays

---

## Stereochemistry

### Enumerate Stereoisomers

**Goal:** Find all stereoisomers of lactic acid (CH₃CH(OH)COOH).

#### Steps

1. **Load Lactic Acid**
   - Save `CC(O)C(=O)O` to a `.smi` file, then **File → Open...**

2. **Open the "Stereo" Tab**
   - Click **"Enumerate Stereoisomers"** — this is the only control; there's
     no separate "mark chiral centers" step or R/S-labeling option
   - Results appear as a list: "Isomer 1", "Isomer 2", ... each with a
     **View** button that loads it into the canvas

Caveat: the underlying stereocenter detection is a candidate heuristic (any
sp3 carbon with 4 distinct connections), not a real CIP-based
substituent-uniqueness check — it can over-report on molecules with no real
stereocenters (e.g. it flags 2 "centers" on ethanol, which has none). Treat
the isomer count as an upper bound to inspect, not a guaranteed-correct
count.

### Multiple Chiral Centers

**For complex molecules with n real chiral centers:**
- Up to 2ⁿ stereoisomers possible (fewer if the molecule has internal
  symmetry, e.g. a meso compound)

### Stereo Notation

**Stereochemical descriptors:**

| Symbol | Meaning | Example |
|--------|---------|---------|
| **↗** (Wedge) | Bond coming toward viewer | `C[C@H](O)C(=O)O` (R config) |
| **⇄** (Dash) | Bond going away from viewer | `C[C@@H](O)C(=O)O` (S config) |
| **R** | Rectus (right) | Priority 1→2→3 clockwise |
| **S** | Sinister (left) | Priority 1→2→3 counterclockwise |
| **D/L** | Carbohydrate reference | D-glucose (not rigorous) |

---

## Search Functionality

### Database Lookup

**Goal:** Look up the exact compound represented by the current molecule.

#### Steps

1. **Load Caffeine**
   - Save `CN1C=NC2=C1C(=O)N(C(=O)N2C)C` to a `.smi` file, then
     **File → Open...**

2. **Open the "DB" Tab**
   - Choose **PubChem** (the implemented source)
   - Click **"Search Compounds"**

3. **Review Results**
   PubChem results show the compound name, properties, and a link to the
   public record. The lookup uses the generated InChIKey and may return no
   result when the local InChI implementation differs from PubChem's record.
   ChemSpider is visible in the selector but is not implemented.

### Maximum Common Substructure (MCS)

MCS comparison is implemented at the WASM layer (`mcs`/`mcsSimilarity` in
`wasmBridge.ts`, covered by real tests in `wasmContract.test.ts`), but
there's currently no sidebar panel exposing it — no "Find MCS" button or
two-molecule comparison UI exists yet. If you need it today, it's reachable
programmatically, not through the app's UI.

---

## Advanced Workflows

### Workflow 1: Drug-Like Compound Filtering

**Goal:** Identify which of 5 compounds are drug candidates.

**Process:**
```
1. Load each compound (SMILES or draw)
2. Click "Props" tab for each
3. Check Lipinski's Rule of 5:
   ✓ MW < 500
   ✓ LogP < 5
   ✓ HBA ≤ 10
   ✓ HBD ≤ 5
4. Filter compounds that pass all criteria
5. Review SA score (prefer <6 for synthetic ease)
```

**Result:**
- Compounds passing filters are good starting points
- Compounds failing filters need structure modifications

### Workflow 2: Reaction Discovery

**Goal:** Design a synthetic route to target compound.

**Process:**
```
1. Load starting material
2. Click "Reactions" tab
3. Pick a matching SMIRKS template (or write a custom one) and Execute
4. If it matches, a new step appears with the product; if not, you get an
   explicit "did not match" message — try a different template
5. Repeat, adding steps, until you reach the target
6. Optionally: use the "Mech" tab to annotate electron flow for any step
```

**Example Route:**
```
Benzene → Nitrobenzene (Nitration)
       → Aniline (Reduction)
       → N-Acetylaniline (Acetylation) = Paracetamol precursor
```

### Workflow 3: Molecular Design

**Goal:** Optimize molecule for desired properties.

**Process:**
```
1. Start with lead compound
2. Open "Props" tab, note problem properties
3. Example: High LogP (too lipophilic)
   → Add polar group (OH, COOH) to reduce LogP
   → Recheck properties
4. Use "Stereo" to check/enumerate stereoisomers if needed
5. Open "3D" to visualize shape
6. Export the 2D structure via **File → Export** (SVG/PNG/PDF), or the 3D
   structure via the **3D** tab's "XYZ エクスポート" button
```

### Workflow 4: Compound Deduplication

**Goal:** Remove duplicate entries from compound list.

**Process:**
```
1. Load compound 1
2. File → Export → Export as SMILES... (already canonical form)
3. Load compound 2
4. File → Export → Export as SMILES...
5. Compare the two exported SMILES strings
   → If identical, same compound
   → If different, different compounds
```

**Alternative:** Use fingerprint similarity:
- If similarity = 1.0 → Identical compounds
- Remove duplicates before structure-activity relationship analysis

---

## Troubleshooting

### Common Issues

**Q: "Invalid SMILES" error**
- A: Check SMILES syntax (brackets, charges, aromatic rings)
- Example: `c1ccccc1` ✓ vs `C1CCCCC1` (cyclohexane, not benzene)

**Q: 3D generation takes too long**
- A: Molecule is large (>300 atoms). This is normal.
- For very large molecules, consider breaking into fragments.

**Q: Reaction mechanism doesn't match expected product**
- A: Check SMIRKS pattern for errors
- Verify atom mapping is present
- Ensure starting material matches SMIRKS reactant pattern

**Q: Properties seem wrong**
- A: Properties are predictions, not measurements
- More accurate for typical drug-like molecules
- May be off for exotic compounds

---

## Next Steps

- 📖 Explore [API Reference](./API.md) for developer integration
- 🏗️ Check [Architecture](./ARCHITECTURE.md) for technical details
- 🔧 See [Build Guide](./BUILD.md) to compile from source

Happy chemistry! 🧪
