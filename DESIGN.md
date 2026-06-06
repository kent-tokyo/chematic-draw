# DESIGN.md — chematic-draw Design Guidelines

> **Claude Code daily context**: colors · typography · layout dimensions · design tokens.
> Detailed interaction specs → @SPEC.md   Template SMILES → @TEMPLATES.md
>
> Research basis: VSCode, Figma, Inkscape, Krita, Blender (general desktop UX);
> Ketcher, ChemDraw, MarvinSketch, Avogadro2, DataWarrior (chemical drawing UX).

---

## 0. Design Philosophy

Primary users: **chemists, pharmacists, and students**.

| Principle | Meaning |
|-----------|---------|
| **Accuracy first** | Bond angles and atom placement must be exact. Visual imprecision is unacceptable. |
| **ChemDraw-compatible feel** | Shortcuts and tool layout should let ChemDraw users switch without relearning. |
| **Lightweight and fast** | Pure Rust implementation — no lag even with molecules exceeding 1000 atoms. |
| **File format fidelity** | MOL/SDF/CDXML/CML must round-trip without loss to coexist with other tools. |
| **OS conventions** | Menus, shortcuts, and dialogs follow platform standards (macOS, Windows, Linux). |
| **Discoverable** | Every function reachable by keyboard. Tooltips teach shortcuts. Command Palette surfaces everything. |
| **Educating** | Status bar shows context-sensitive usage tips. Tooltips always display the keyboard shortcut. |

---

## 1. Color

### 1.1 Semantic UI Colors

| Role | Light mode | Dark mode | Meaning |
|------|-----------|-----------|---------|
| **Accent** | `#0078D4` | `#60CDFF` | Selection, emphasis |
| **Success** | `#107C10` | `#6CCB5F` | Save complete, validation OK |
| **Warning** | `#C19C00` | `#FCE100` | Deprecated operation, caution |
| **Error** | `#C42B1C` | `#FF99A4` | Invalid SMILES, format error |
| **Canvas BG** | `#FFFFFF` | `#1E1E1E` | Drawing canvas background |
| **Panel BG** | `#F3F3F3` | `#282828` | Toolbar, inspector background |
| **Separator** | `#D0D0D0` | `#444444` | Panel dividers |

### 1.2 CPK Element Colors (canvas)

Retrieved from `chematic::depict::atom_color_rgb(atomic_number)`. C and H are theme-adaptive.

| Element | Color | Hex |
|---------|-------|-----|
| C (carbon) | Black / White | Dark: `#E0E0E0` / Light: `#202020` |
| H (hydrogen) | White / Gray | `#FFFFFF` / `#808080` |
| N (nitrogen) | Blue | `#3050F8` |
| O (oxygen) | Red | `#FF0D0D` |
| S (sulfur) | Yellow | `#FFFF30` |
| P (phosphorus) | Orange | `#FF8000` |
| R (R-group) | Teal | `#20C0A0` |
| Other | Pink | `#FFC0CB` |

### 1.3 Color Rules

- **Carbon atoms** render as a small dot by default. An enlarged ring appears only on hover or selection.
- Bond line color is Light: `#1A1A1A`, Dark: `#E0E0E0`. Element colors do not override bond color.
- Text on background must meet WCAG AA (contrast ratio >= 4.5:1).
- Snap indicators use `#20C0A0` (teal) — distinct from atom colors and accent, visible on both themes.
- Ring fusion hover highlight uses `#C42B1C` (error red) for bond pre-selection feedback.

---

## 2. Typography

### 2.1 Font Stack

`chem-ui::fonts::setup()` is called at startup to insert a CJK font before Ubuntu-Light.

```
[1] CJK primary   -- Hiragino Kaku Gothic W3 (macOS) / Noto Sans CJK (Linux) / Yu Gothic UI (Windows)
[2] Ubuntu-Light  -- egui built-in, covers ASCII / Latin
[3] NotoEmoji-Regular
```

### 2.2 Type Scale

| Role | Size | Usage |
|------|------|-------|
| Title | 18 px | Window titles, dialog headings |
| Body | 14 px | Labels, property values |
| Caption | 12 px | Coordinates, metadata |
| Small | 11 px | Status bar, tooltips |
| Monospace | 13 px | SMILES strings, XML output |
| AtomLabel | Zoom-linked | Element symbols on canvas |

### 2.3 Rules

- UI labels use Sentence case (`"Save file"` correct, `"Save File"` incorrect).
- SMILES and CDXML output use monospace.
- CJK fonts are appended to the Monospace family as fallback for SMILES comments with CJK characters.

---

## 3. Layout

### 3.1 Main Window Structure

```
+-----------------------------------------------------+
| Menu bar: File | Edit | View | Language | Help       |  <- 24 px
+-----------------------------------------------------+
| Mode tabs: [Structure] [Reaction] [3D]               |  <- 28 px
+-----------------------------------------------------+
| Tool Controls Bar (context-sensitive tool options)   |  <- 24 px
+------+------------------------------------+----------+
|      |                                    |          |
| Tool |             Canvas                 | Inspector|
| bar  |   (molecular drawing canvas)       | (240 px, |
|(56px)|   zoom / pan / grid                | resizable)|
|      |                                    |          |
+------+------------------------------------+----------+
| Status bar: Tool | Selection info | ... | Zoom%      |  <- 22 px
+-----------------------------------------------------+
```

| Region | Width / Height | Contents |
|--------|---------------|---------|
| Toolbar | 56 px fixed | Select, atoms, bonds, rings, eraser, R-group (flyout groups) |
| Tool Controls Bar | 24 px fixed | Context-sensitive options for the active tool |
| Canvas | Variable | Molecular drawing, grid, zoom/pan |
| Inspector | 180–400 px (default 240 px, user-resizable) | Atom/bond properties, formula, SMARTS search |
| Status bar | 22 px fixed | Tool name, selection state, zoom percentage |

### 3.2 Grid and Spacing

- Base unit: **4 px**
- Element spacing: 4 / 8 / 16 / 24 / 32 px only
- Border radius: buttons 4 px, panels 8 px

### 3.3 Canvas-Specific

- Default grid spacing: 40 px (scales with zoom)
- Grid hidden when spacing < 8 px (prevents visual noise)
- Default bond length: 60 px at 100% zoom (equivalent to 1.5 Å)

---

## 6. Dark / Light Mode

- Switched at runtime without restart. Menu: `View > Dark mode / Light mode`.
- Default: Dark mode. **OS auto-detect**: on startup, reads OS color scheme preference if no stored preference.
- All colors from `theme::Tokens::for_theme(theme)`. Hard-coded colors are prohibited.

---

## 7. Internationalization (i18n)

- Supported languages: **Japanese (ja)** / **English (en)**
- String files: `i18n/en.toml` / `i18n/ja.toml` (embedded at compile time via `include_str!`)
- Switching: `Language > English / Japanese` (instant, no restart)
- Key format: dot-separated, e.g. `menu.file.open`, `inspector.element`

---

## Appendix A: Design Tokens (tokens.rs)

```rust
// Light mode
pub const ACCENT_LIGHT:     Color32 = Color32::from_rgb(0x00, 0x78, 0xD4);
pub const CANVAS_BG_LIGHT:  Color32 = Color32::from_rgb(0xFF, 0xFF, 0xFF);

// Dark mode
pub const ACCENT_DARK:      Color32 = Color32::from_rgb(0x60, 0xCD, 0xFF);
pub const CANVAS_BG_DARK:   Color32 = Color32::from_rgb(0x1E, 0x1E, 0x1E);

// Snap / feedback
pub const SNAP_INDICATOR:   Color32 = Color32::from_rgb(0x20, 0xC0, 0xA0); // teal, both themes
pub const RING_FUSE_HOVER:  Color32 = Color32::from_rgb(0xC4, 0x2B, 0x1C); // red highlight

// Spacing (4 px grid)
pub const SPACING_XS: f32 = 4.0;
pub const SPACING_SM: f32 = 8.0;
pub const SPACING_MD: f32 = 16.0;
pub const SPACING_LG: f32 = 24.0;

// Layout
pub const TOOLBAR_WIDTH:           f32 = 56.0;
pub const TOOL_CONTROLS_HEIGHT:    f32 = 24.0;
pub const INSPECTOR_WIDTH_DEFAULT: f32 = 240.0;
pub const INSPECTOR_WIDTH_MIN:     f32 = 180.0;
pub const INSPECTOR_WIDTH_MAX:     f32 = 400.0;
pub const ATOM_RADIUS:             f32 = 8.0;
pub const BOND_WIDTH:              f32 = 2.0;

// Interaction
pub const DRAG_THRESHOLD_PX:    f32 = 4.0;
pub const SNAP_THRESHOLD_PX:    f32 = 10.0;
pub const SNAP_FLASH_MS:        u64 = 400;
pub const BOND_ANGLE_SNAP_DEG:  f32 = 15.0;
pub const BOND_LENGTH_PX:       f32 = 60.0;
pub const RING_FUSE_THRESHOLD:  f32 = 30.0; // ½ of BOND_LENGTH_PX
pub const GHOST_BOND_ALPHA:     f32 = 0.60;
pub const UNDO_HISTORY_STEPS:   usize = 64;
```
