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
| **Platform-native feel** | macOS / Windows / Linux それぞれで「そのOSらしい」最高のデザインを追求する。共通化を優先して各OSのUXを犠牲にしない。詳細は SPEC.md §S19。 |
| **Discoverable** | Every function reachable by keyboard. Tooltips teach shortcuts. Command Palette surfaces everything. |
| **Educating** | Status bar shows context-sensitive usage tips. Tooltips always display the keyboard shortcut. |

---

## 1. Color

### 1.1 Semantic UI Colors

| Role | Light mode | Dark mode | Meaning |
|------|-----------|-----------|---------|
| **Accent** | `#2F6FE8` | `#4D8DFF` | Selection, emphasis |
| **Success** | `#1F8F5F` | `#58C97A` | Save complete, validation OK |
| **Warning** | `#B77810` | `#E9B949` | Deprecated operation, caution |
| **Error** | `#C73A3A` | `#F26D6D` | Invalid SMILES, format error |
| **Canvas BG** | `#FBFCFE` | `#F8F9FB` | Drawing canvas background |
| **Panel BG** | `#F3F5F8` | `#242830` | Top bars and window panels |
| **Activity Bar BG** | `#23272E` | `#181B20` | Far-left navigation strip |
| **Sidebar BG** | `#F3F5F8` | `#21252C` | Tools / inspector / templates / chat panel |
| **Sidebar Title** | `#1D2430` | `#D8DEEA` | Sidebar labels and tool text |
| **Sidebar Hover** | `#E4E9F1` | `#313742` | Hovered sidebar rows / tiles |
| **Status Bar BG** | `#23272E` | `#21252C` | Bottom status strip |
| **Separator** | `#798393` | `#8F98A8` | Secondary text and dividers |

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
- Bond line color is `#161B22` in both themes. The "Dark" theme uses dark application chrome with a light drawing canvas, not an inverted chemistry canvas.
- Text on background must meet WCAG AA (contrast ratio >= 4.5:1).
- Snap indicators use teal (`#199B8C` light / `#21B8A5` dark) — distinct from atom colors and accent, visible on both themes.
- Ring fusion hover highlight uses error red (`#C73A3A` light / `#E85662` dark) for bond pre-selection feedback.

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
+------------------------------------------------------------+
| Menu bar: File | Edit | View | Language | Help              | <- hover opens menus
+------------------------------------------------------------+
| Mode buttons: [Structure] [Reaction] [3D]                  | <- 38 px
+------------------------------------------------------------+
| Tool Controls Bar (context-sensitive tool options)          | <- 30 px
+------+----------------------+------------------------------+
| Act. | Sidebar              |                              |
| bar  | Tools / Inspector /  |            Canvas            |
| 48px | Templates / Chat /   |  molecular drawing surface   |
|      | Settings             |  zoom / pan / grid           |
|      | 180-480 px           |                              |
+------+----------------------+------------------------------+
| Status bar: Tool | Selection info | Message | Zoom%          | <- 22 px
+------------------------------------------------------------+
```

| Region | Width / Height | Contents |
|--------|---------------|---------|
| Activity Bar | 48 px fixed | Tools, Inspector, Templates, Chat, Settings navigation |
| Sidebar | 180-480 px (default 260 px, user-resizable) | Selected activity panel |
| Tools Sidebar | 44 x 38 px tiles | Select, atoms, bonds, rings, reaction tools, eraser, R-group |
| Tool Controls Bar | 30 px fixed | Context-sensitive options for the active tool |
| Canvas | Variable | Molecular drawing, grid, zoom/pan |
| Inspector | Sidebar panel | Atom/bond properties, formula, SMARTS search |
| Status bar | 22 px fixed | Tool name, selection state, zoom percentage |

### 3.2 Grid and Spacing

- Base unit: **4 px**
- Element spacing: 4 / 8 / 16 / 24 / 32 px only
- Border radius: small controls 6-8 px, panels 8 px

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
pub const ACCENT_LIGHT:       Color32 = Color32::from_rgb(0x2F, 0x6F, 0xE8);
pub const CANVAS_BG_LIGHT:    Color32 = Color32::from_rgb(0xFB, 0xFC, 0xFE);
pub const ACTIVITY_BG_LIGHT:  Color32 = Color32::from_rgb(0x23, 0x27, 0x2E);
pub const SIDEBAR_BG_LIGHT:   Color32 = Color32::from_rgb(0xF3, 0xF5, 0xF8);

// Dark mode: dark chrome, light chemistry canvas
pub const ACCENT_DARK:        Color32 = Color32::from_rgb(0x4D, 0x8D, 0xFF);
pub const CANVAS_BG_DARK:     Color32 = Color32::from_rgb(0xF8, 0xF9, 0xFB);
pub const ACTIVITY_BG_DARK:   Color32 = Color32::from_rgb(0x18, 0x1B, 0x20);
pub const SIDEBAR_BG_DARK:    Color32 = Color32::from_rgb(0x21, 0x25, 0x2C);

// Snap / feedback
pub const SNAP_INDICATOR_LIGHT:  Color32 = Color32::from_rgb(0x19, 0x9B, 0x8C);
pub const SNAP_INDICATOR_DARK:   Color32 = Color32::from_rgb(0x21, 0xB8, 0xA5);
pub const RING_FUSE_LIGHT:       Color32 = Color32::from_rgb(0xC7, 0x3A, 0x3A);
pub const RING_FUSE_DARK:        Color32 = Color32::from_rgb(0xE8, 0x56, 0x62);

// Spacing (4 px grid)
pub const SPACING_XS: f32 = 4.0;
pub const SPACING_SM: f32 = 8.0;
pub const SPACING_MD: f32 = 16.0;
pub const SPACING_LG: f32 = 24.0;

// Layout
pub const ACTIVITY_BAR_WIDTH:      f32 = 48.0;
pub const SIDEBAR_WIDTH_DEFAULT:   f32 = 260.0;
pub const SIDEBAR_WIDTH_MIN:       f32 = 180.0;
pub const SIDEBAR_WIDTH_MAX:       f32 = 480.0;
pub const TOOL_TILE_WIDTH:         f32 = 44.0;
pub const TOOL_TILE_HEIGHT:        f32 = 38.0;
pub const TOOLBAR_WIDTH:           f32 = 64.0; // legacy vertical toolbar fallback
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
