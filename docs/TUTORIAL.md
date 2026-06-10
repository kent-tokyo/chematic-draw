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

1. **Start in Draw Mode**
   - Click pencil icon in toolbar, or press `D`
   - You should see cursor change to crosshair

2. **Place First Carbon**
   - Click center of canvas
   - Small "C" label appears

3. **Add Second Carbon (Carbonyl)**
   - Click to the right of first carbon (~100px)
   - A new carbon appears
   - Single bond connects them

4. **Create C=O Bond**
   - Click above second carbon
   - New oxygen appears
   - Default is single bond; we need double

5. **Convert to Double Bond**
   - Click the C-O bond (should highlight)
   - Right-click → "Bond Order" → Select "Double (2)"
   - Bond changes to `=` symbol

6. **Add Third Carbon**
   - Click to the left of first carbon
   - New carbon appears connected by single bond

7. **Complete and Verify**
   - You now have CH₃-CO-CH₃
   - Hydrogens are implicit (not shown)
   - Molecular formula: **C₃H₆O** (MW: 58.08)

#### Alternative: Load from SMILES

**Faster method for known structures:**

1. **File → New from SMILES**
2. **Paste:** `CC(=O)C`
3. **Click Load**
4. Molecule loads instantly (no manual drawing needed)

### Editing Existing Molecules

#### Select an Atom
- Click atom to highlight it
- Use arrow keys to move it
- Right-click for properties (charge, element type)

#### Delete Elements
- Click atom/bond to select
- Press `Delete` or `Backspace`

#### Add Charges
- Double-click atom
- Modify "Charge" field: 0, +1, -1, etc.
- Click OK

#### Change Element
- Right-click atom
- Select "Element" → Choose new element
- Hydrogens adjust automatically

#### Toggle Bond Type
- Click bond (highlights as red line)
- Right-click → "Bond Order" → Select option
- Options: 1 (single), 2 (double), 3 (triple)

#### Add Stereochemistry
- Right-click bond
- Select "Wedge" (↗) or "Dash" (⇄)
- Changes visual appearance to show 3D orientation

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

#### Reset View
- Press `R` to reset rotation to default (0°, 0°)
- Press `Z` to reset zoom to 1.0×

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

| Molecule Size | Generation Time | Performance |
|---|---|---|
| <50 atoms | <500ms | Very fast |
| 50-200 atoms | 500ms-2s | Fast |
| 200-500 atoms | 2-5s | Moderate |
| >500 atoms | >5s | Slow (complex molecules) |

**Optimization:**
- For large molecules, consider splitting into fragments
- 3D generation offloads to WebWorker (doesn't block UI)
- Rendering uses Canvas 2D (optimized for smooth interaction)

---

## Reaction Mechanisms

### Set Up a Reaction

**Goal:** Visualize SN2 nucleophilic substitution reaction.

#### Steps

1. **Load Starting Material**
   - Draw or load: **Alkyl halide** (e.g., `CCBr` = ethyl bromide)
   - File → New from SMILES → `CCBr`

2. **Open Reactions Tab**
   - Click **"Reactions"** in right sidebar
   - You'll see reaction builder interface

3. **Select Reaction Type**
   - Dropdown: Choose **"SN2"**
   - Description: "Bimolecular nucleophilic substitution"

4. **Specify Reagent**
   - Input nucleophile SMILES
   - Example: `[O-]` (hydroxide ion for SN2 OH conversion)
   - Or draw the nucleophile

5. **Generate Mechanism**
   - Click **"Generate Mechanism"**
   - Wait for calculation
   - Multi-step visualization appears

### Understand the Mechanism

**Atoms are color-coded:**
- 🟢 **Green** = Persistent (atoms in both reactant and product)
- 🔵 **Blue** = New (atoms created in reaction)
- 🔴 **Red** = Leaving (atoms removed from structure)
- ⚫ **Gray** = Spectator (non-participating atoms)

**Example SN2:**
```
Reactant:    C-Br + HO⁻  →  C-OH + Br⁻
Mechanism:
Step 1: Nucleophile attacks from back
Step 2: Br-C bond breaks, C-O forms
Step 3: Br leaves as leaving group
```

### Step-by-Step Navigation

1. **Use arrow buttons** to advance through reaction steps
2. **Each step shows:**
   - Structural change
   - Electron flow (curved arrows, if visible)
   - Intermediate formation
3. **Reset:** Click "Reset" to return to step 0

### Available Reaction Types

| Type | Mechanism | Example |
|------|-----------|---------|
| **SN1** | Unimolecular substitution | tert-butyl carbocation + nucleophile |
| **SN2** | Bimolecular substitution | ethyl bromide + hydroxide |
| **E1** | Unimolecular elimination | t-BuCl → alkene + HCl |
| **E2** | Bimolecular elimination | RX + strong base → alkene |
| **Addition** | Electrophilic addition | alkene + HBr → alkyl halide |

---

## Property Prediction

### View Molecular Properties

**Goal:** Check if aspirin (CC(=O)Oc1ccccc1C(=O)O) follows Lipinski's Rule of 5.

#### Steps

1. **Load Aspirin**
   - File → New from SMILES
   - Paste: `CC(=O)Oc1ccccc1C(=O)O`
   - Click Load

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
   - SMILES: `CC(O)C(=O)O`
   - File → New from SMILES → Paste → Load

2. **Open Stereo Tab**
   - Click **"Stereo"** in right sidebar
   - Chiral center detection runs automatically

3. **Mark Chiral Centers**
   - Application identifies the **chiral carbon** (C with OH)
   - Visual marker (∗ or highlight) on the atom
   - Click atom to toggle selection

4. **Configure Enumeration**
   - Select: **"Enumerate All Isomers"**
   - Specify: **Absolute configuration needed** (R/S labels)
   - Click **"Generate Isomers"**

5. **Review Results**
   - **Isomer 1:** (R)-Lactic acid (D-Lactic acid)
   - **Isomer 2:** (S)-Lactic acid (L-Lactic acid)

### Multiple Chiral Centers

**For complex molecules with n chiral centers:**
- 2ⁿ stereoisomers possible
- Example: Glucose (4 chiral centers) = 2⁴ = 16 stereoisomers

```
Molecule:     Chiral Centers:    Stereoisomers:
Lactic acid        1                    2
Tartaric acid      2                    4
Glucose            4                    16
Cholesterol        8                    256
```

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

### Similarity Search

**Goal:** Find molecules similar to caffeine in database.

#### Steps

1. **Load Caffeine**
   - SMILES: `CN1C=NC2=C1C(=O)N(C(=O)N2C)C`
   - File → New from SMILES → Load

2. **Open Database Tab**
   - Click **"DB"** in right sidebar
   - You'll see "Search Similar" section

3. **Perform Similarity Search**
   - Click **"Search Database"** button
   - Fingerprint generated (ECFP4)
   - Similarity search runs against curated database

4. **Review Results**
   - Results ranked by **Tanimoto similarity** (0.0 to 1.0)
   - Each result shows:
     - Molecule name
     - Similarity score
     - Thumbnail structure
   - Click result to load into canvas

#### Similarity Interpretation

| Score | Meaning | Example |
|-------|---------|---------|
| **0.95-1.0** | Nearly identical | Same compound, different source |
| **0.85-0.95** | Highly similar | Close analogs |
| **0.70-0.85** | Similar | Same pharmacophore |
| **0.50-0.70** | Moderately similar | Structural hints |
| **<0.50** | Dissimilar | Different scaffolds |

### Maximum Common Substructure (MCS) Search

**Goal:** Highlight the common scaffold between two compounds.

#### Steps

1. **Load First Molecule**
   - Example: Aspirin `CC(=O)Oc1ccccc1C(=O)O`

2. **Open Comparison**
   - Load second molecule: Ibuprofen `CC(C)Cc1ccc(cc1)C(C)C(=O)O`

3. **Click "Find MCS"**
   - Compares both molecules
   - Highlights matching atoms/bonds in both structures

4. **Interpret MCS Result**
   - Both compounds have:
     - Benzene ring (6 common atoms)
     - Carboxylic acid group
     - Adjacent lipophilic group
   - **MCS similarity:** 0.82 (highly similar scaffolds)

### Database Search Best Practices

✨ **Pro Tips:**
- Use **similarity threshold 0.6+** for meaningful results
- **Exact match** (1.0) returns only identical compounds
- Fingerprints capture **pharmacophoric features**, not exact structure
- **MCS search** reveals common scaffolds useful for SAR (Structure-Activity Relationship)

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
3. Select reaction type (SN2, Addition, etc.)
4. Draw reagent
5. Review mechanism and products
6. If product matches target, note the reaction
7. If not, try different reagent or reaction type
8. Repeat until reaching target
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
4. Use "Stereo" to add stereochemistry if needed
5. Open "3D" to visualize shape
6. Export final design as XYZ/SVG for publication
```

### Workflow 4: Compound Deduplication

**Goal:** Remove duplicate entries from compound list.

**Process:**
```
1. Load compound 1
2. Export SMILES: Click "Canonicalize"
3. Load compound 2
4. Export SMILES: Click "Canonicalize"
5. Compare canonical SMILES strings
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
