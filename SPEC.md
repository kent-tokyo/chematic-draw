# SPEC.md — chematic-draw Interaction & Component Specification

> Design tokens, colors, and layout dimensions are in @DESIGN.md.
> Template SMILES reference is in @TEMPLATES.md.
> Chemistry crate dependency: chematic v0.1.23 (see Appendix B).

---

## S1. Status Bar

Fixed 22 px height. Always visible.

| Position | Content | Update frequency |
|----------|---------|-----------------|
| Left | `Tool: {label} [{key}]  {tip}` | On tool change |
| Center | Selection summary or atom/bond count | Every frame |
| Center (bond drag) | `Bond: 60 px / 120°` | Every frame during drag |
| Center (temporary) | Operation feedback (save OK, undo description, error) | Auto-clears after 3 s |
| Right | Zoom percentage (clickable → numeric input) | Every frame |

**Proactive tool tip (Inkscape pattern):** Appended to tool name. Tip ≤ 40 chars. See @TEMPLATES.md Appendix C for the full table. The tip is omitted during an active drag.

**Zoom click:** Clicking the zoom % field opens a `TextEdit`. Enter → apply; Esc → cancel.

**Undo/Redo feedback:** After `Ctrl+Z`, center zone shows `"Undo"` for 3 s then reverts.

---

## S1.1 Top Menu Bar

The top menu bar is always visible outside Focus Mode and contains:

`File | Edit | View | Language | Help`

**Opening behavior:** Hovering a top-level menu opens its dropdown immediately. Moving the pointer across top-level menu buttons switches the open dropdown. Clicking a top-level menu button also opens it.

**Closing behavior:** A dropdown closes when the user clicks outside it, presses `Esc`, or activates a menu item.

**Menu placement:** The menu bar is inside the application window in the current egui implementation. Platform-native menu bar integration remains a future platform-specific enhancement (see S19).

---

## S2. Tool Palette

The tool palette lives in the left **Sidebar** when the Activity Bar selection is `Tools`.
The old fixed-width left toolbar is retained only as an internal fallback component and is not the default workspace layout.

### S2.0 Activity Bar and Sidebar

| Activity | Icon | Panel |
|----------|------|-------|
| Tools | Pencil glyph | Tool tile grid |
| Inspector | List glyph | Molecule / selection inspector |
| Templates | Ring glyph | Template library |
| Chat | Star glyph | AI assistant |
| Settings | Gear glyph | API key and model settings |

**Activity Bar:** fixed 48 px, dark chrome in both light and dark modes. Icons use a light foreground independent of `sidebar_title` so they remain visible in light mode.

**Sidebar:** left panel, resizable 180-480 px, default 260 px. The current activity selection is persisted. Selecting an activity opens the sidebar if it was closed.

### S2.1 Tool List

| Tool | Shortcut | Behavior |
|------|----------|---------|
| Select | `Esc` | Click to select atom/bond; drag on empty space for lasso |
| FragmentSelect | — | Click bond to select connected component on one side |
| Eraser | `Del` | Click to delete atom or bond |
| C / N / O / S / P | `C` / `N` / `O` / `S` / `P` | Add atom or change element |
| F / Cl / Br / I / H / R | `F` / `H` / `R` | Halogens, hydrogen, R-group |
| Single bond | `1` | Draw single bond |
| Double bond | `2` | Draw double bond |
| Triple bond | `3` | Draw triple bond |
| Aromatic | `4` | Draw aromatic bond |
| Wedge up | `W` | Stereochemistry: toward viewer |
| Wedge down | `D` | Stereochemistry: away from viewer |
| Benzene | `B` | Place benzene ring |
| Cyclohexane | — | Place six-membered ring |
| Cyclopentane | — | Place five-membered ring |

**Tool groups:** Selection, Atoms, Bonds, Rings, Reaction. Tools are rendered as 44 x 38 px tiles in a wrapped grid. Group headers are uppercase captions.

**Tooltip format:** `"Tool name (key)"`. Shown on hover.

**Active tool indicator:** Accent-tinted tile background + accent border. Activity Bar selection uses an accent left rail.

### S2.2 Interaction Model

**General:**
- **Drag start threshold: 4 px.** Movement below 4 px is treated as a click, not a drag.
- **Space (hold):** Temporarily activates the Pan tool. Releasing Space returns to the prior tool.
- **Ctrl (hold during drag):** Temporarily disables all snap.
- **Alt (hold during drag):** Disables bond angle and length constraints (free-angle drawing).

**Atom tool:**
- Click on empty space: add atom at that position.
- Click on existing atom: change its element to the current tool element.
- Drag from existing atom: draw a bond. Ghost bond (60% opacity, accent color) follows cursor, snapping to 15° increments. When released over empty space, a new atom is created; over an existing atom, a bond is connected.

**Bond tool:**
- Drag from atom to atom: draw bond of the current order. Auto-creates atoms at endpoints if none exist.
- Click on existing bond: cycle bond order or change stereo.
- Click on stereo bond with the same stereo tool: flip the stereo direction (up ↔ down).

**Bond angle snapping (15° default):**
- Ghost bond snaps to nearest 15° from anchor atom's existing bond directions (or 0° if no bonds).
- Status bar center shows `Bond: 60 px / 120°` live during drag.
- Hold `Alt` to suppress snapping.

**Ring tools:**
- Click on empty space: place ring as standalone.
- Hover over existing bond → bond highlights in red to preview fusion. Click to fuse.
- Hover over existing atom → ring attaches (fused by default).
- Drag from existing atom: > 30 px → attach via single bond; ≤ 30 px → fuse.
- **Keyboard annelation** (bond highlighted): `B` → benzene, `5` → cyclopentane, `6` → cyclohexane.
- **Ring ghost silhouette:** When ring tool is active, a faint outline (30% opacity, accent color) follows the cursor. Over a bond: snaps to exact fusion position.

**Select tool:**
- Click atom or bond: select it; deselects others.
- Shift+Click: add/remove single item from selection.
- **Shift+Double-click on atom:** Select entire connected fragment (BFS from that atom).
- **Ctrl+Click on atom:** Select all atoms of the same element across the molecule.
- Drag on empty space: rectangle rubber-band selection.
- Alt+Drag on empty space: lasso (freehand) selection.
- Arrow keys: move selected atoms by one grid step (40 px at 100%).
- Shift+Arrow: move by 4× grid step.
- Double-click on atom: open Atom Properties dialog.
- Double-click on empty canvas: deselect all.
- Tab: cycle selection to the next atom in the molecule.

**Fragment select tool:**
- Click on a bond: selects the entire connected component on one side. Repeated clicks toggle between sides.

**Right-click context menus (four zones, no sub-menus, no grayed-out items):**

*On atom:* Change Element, Charge: +1/−1/Clear, Atom Map Number, Copy as SMILES, Delete Atom

*On bond:* Single/Double/Triple/Aromatic (radio), Stereo: None/Wedge Up/Wedge Down (radio), Delete Bond

*On selection (≥2 atoms):* Move… (numeric offset), Clean Structure, Copy as SMILES, Delete Selected

*On empty canvas:* Paste, Select All, Clean Structure, Zoom to Fit

**Context menu rule:** Items that do not apply are omitted entirely — never grayed-out. (Blender convention.)

**Eraser:** Click atom → delete atom and all bonds. Click bond → delete bond only.

**Scroll wheel:** Zoom (0.2× to 10×). **Middle-click drag / Space+drag / right-click drag:** Pan.

### S2.3 Cursor Specification

The cursor shape changes per tool and hover target to give immediate affordance feedback.

| Tool | Idle | Hover: atom | Hover: bond | Dragging |
|------|------|-------------|-------------|----------|
| Select | Arrow | Arrow + highlight ring | Arrow | Grab → Grabbing |
| Atom tool | Crosshair + element letter overlay | Pointing hand | Crosshair | Crosshair |
| Bond tool | Crosshair | Crosshair + connect indicator | Crosshair + change indicator | Crosshair |
| Eraser | Crosshair | Not-allowed overlay | Not-allowed overlay | Crosshair |
| Ring tool | Crosshair + ghost ring | Attach indicator | Bond turns red | Crosshair |

Element-letter overlay on Atom tool: render a small text label offset from the cursor position on the canvas — no custom cursor image required.

---

## S3. Inspector

The Inspector is a Sidebar activity, not a permanent right panel. It adapts to the current selection and uses the shared sidebar width (default 260 px, min 180 px, max 480 px). `I` toggles inspector visibility/selection behavior from the keyboard.

| Selection state | Contents |
|----------------|---------|
| Nothing selected | Formula (with implicit H), atom count, bond count, MW, LogP, TPSA, HBA/HBD, Lipinski, SMILES (editable), IUPAC name, SMARTS search |
| One atom | Element symbol (editable), charge (−8 to +8), atom map number, coordinates |
| One bond | Bond order (combo), stereochemistry (combo) |
| Multiple | Atom count, centroid, alignment buttons |

**Collapsible sections:** "Physicochemical Properties" (LogP/TPSA/HBA/HBD/Lipinski) collapsed by default.

**Editable SMILES (MarvinSketch pattern):** Clicking the SMILES field switches to `TextEdit`. Enter → parse SMILES and replace canvas molecule. Invalid SMILES shows Error color inline + error text. Esc discards without change.

**Atom Properties (one atom selected):** Element symbol editable text field; Charge spin box −8 to +8; Atom Map Number integer field; Coordinates read-only X/Y in Å.

**Multiple selection:** Atom count, bond count within selection, centroid. Alignment buttons: Align Left, Center H, Align Right, Align Top, Center V, Align Bottom.

### S3.1 IUPAC Name

Generated via `chematic::iupac::name()` (offline). Result shown asynchronously.

### S3.2 Valence Validation

`chematic::perception::validate_valence()` detects over-valenced atoms. Errors shown inline with red text in Inspector and status bar.

---

## S4. File Format Support

| Format | Extension | Crate | Status |
|--------|-----------|-------|--------|
| MDL MOL V2000/V3000 | `.mol` | `chematic-mol` | Implemented |
| MDL SDF | `.sdf` | `chematic-mol` | Implemented |
| SMILES | string | `chematic-smiles` | Implemented |
| ChemDraw XML | `.cdxml` | `chematic-mol` | Implemented |
| CML | `.cml` | `chematic-mol` | Implemented |
| MDL RXN | `.rxn` | `chematic-mol` | Implemented |
| SVG | `.svg` | `chematic-depict` | Implemented |
| PNG (1x / 2x / 4x) | `.png` | `resvg` | Implemented |
| JPEG | `.jpg` | `image` | Implemented |
| SMARTS | string | `chematic-smarts` | Implemented (substructure search) |

Format determined automatically from file extension. Native file dialogs (rfd). Save success/failure reported in status bar.

---

## S5. Keyboard Shortcuts

### S5.1 Global (Ctrl = Cmd on macOS)

| Key | Action |
|-----|--------|
| `Ctrl+N` | New file |
| `Ctrl+O` | Open file |
| `Ctrl+S` | Save |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+A` | Select all |
| `Ctrl+L` | Clean structure |
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+Shift+F` | Focus Mode toggle |
| `Ctrl+Shift+?` | Keyboard Reference dialog |
| `Ctrl+Alt+Z` | Undo History popup |
| `Delete` / `Backspace` | Delete selected atoms and bonds |
| `Esc` | Select tool / cancel / close palettes |

### S5.2 Canvas Operations

| Key | Action |
|-----|--------|
| `+` / `-` | Zoom in / zoom out |
| `0` | Zoom to fit |
| Arrow keys | Move selected atoms by one grid step |
| `Shift+Arrow` | Move selected atoms by 4× grid step |
| `Space` (hold) | Temporary pan tool |
| `I` | Toggle Inspector panel |
| `Tab` | Cycle selection to next atom |
| `C` / `N` / `O` / `S` / `P` | Atom tools |
| `F` / `H` / `R` | Fluorine / Hydrogen / R-group |
| `1` / `2` / `3` / `4` | Bond order tools |
| `B` | Benzene (or fuse to highlighted bond) |
| `5` (highlighted bond) | Annelate cyclopentane |
| `6` (highlighted bond) | Annelate cyclohexane |
| `W` | Wedge up tool |
| `D` | Wedge down tool |
| `+` / `-` (atom selected) | Increment / decrement charge |
| `Ctrl` (hold drag) | Disable all snap |
| `Alt` (hold drag) | Disable bond-angle snap only |

**Context-dependent shortcuts (Select tool, hovering bond):**
- `W`: Apply wedge-up to hovered bond without switching tool
- `D`: Apply wedge-down to hovered bond without switching tool

> **Note on `N`:** `N` is reserved for the Nitrogen atom tool. Inspector toggle uses `I` only.

---

## S6. AI Assistant

`View > AI Chat` opens a floating window backed by the Anthropic Messages API (Claude). The Chat Activity Bar entry opens the same assistant inside the left Sidebar.

- API key configured in `View > Settings` or the Settings activity (persisted via eframe storage).
- Natural-language instructions ("Draw aspirin", "アスピリンを描いて") generate structures.
- When AI returns a SMILES, a confirmation bar shows "Replace" and "Add" options.

| Model | Characteristics |
|-------|----------------|
| claude-haiku-4-5-20251001 | Fast, economical (default) |
| claude-sonnet-4-6 | Higher accuracy |

---

## S7. Accessibility

- All functions operable via keyboard alone.
- **Activity Bar tab stop:** Activity Bar is a single major navigation region; arrow-key navigation between activity buttons is the target behavior.
- **Tools Sidebar tab stop:** Tool tile grid is a single major region; arrow keys navigate between tool tiles.
- `F6` / `Shift+F6`: jump between major regions (Canvas / Activity Bar / Sidebar / Status Bar).
- Errors communicated with text in addition to color (not color-only).
- Hover lock: hold `Alt` to keep a tooltip pinned.
- Future: AccessKit integration for screen reader support.

---

## S8. Tool Controls Bar

Context-sensitive horizontal bar below the Mode buttons row. Effective height is 30 px in the current layout. Always visible outside Focus Mode.

| Active tool | Controls shown |
|-------------|----------------|
| Select | Align Left, Center H, Align Right, Align Top, Center V, Align Bottom (disabled < 2 atoms) |
| Atom tool | Read-only active element label |
| Bond tool (any) | Bond order selector (1/2/3/A), Stereo selector (Up/Down) |
| Ring tool | No controls |
| Eraser | — (no options) |

---

## S9. Snap Visual Feedback

**Snap threshold:** 10 px screen distance (invariant to zoom).

| Snap type | Trigger | Visual indicator |
|-----------|---------|-----------------|
| Atom center | Bond endpoint near existing atom | Teal circle (`#199B8C` light / `#21B8A5` dark, 8 px diameter) flashes 400 ms |
| Bond angle (15°) | Dragging bond near 15° increment | Ghost bond snaps; status bar shows angle |
| Grid point | Dragging atom near grid intersection | Subtle grid-point highlight (no flash) |

**Snap override:** Ctrl → bypass all; Alt → bypass bond-angle snap only.

---

## S10. Undo History

**Shortcut:** `Ctrl+Alt+Z` / `Cmd+Opt+Z`

Popup listing the full undo stack (width 220 px, max height 300 px, scrollable).

**Entry format (verb-object):** `"Add Atom C"`, `"Delete Bond"`, `"Move Atoms (3)"`, `"Draw Benzene"`, etc.

**Navigation:** Current position marked with ●. Clicking jumps to that state. New edit after undo discards future steps.

**Step limit:** 64 steps. Status bar shows `"Undo"` / `"Redo"` for 3 s after operation.

---

## S11. Command Palette

**Shortcut:** `Ctrl+Shift+P` / `Cmd+Shift+P`

Centered modal overlay (width 480 px, max height 360 px). Fuzzy search across tools, file operations, structure commands. Recent commands float to top. SMILES input → `"Draw from SMILES: {typed}"` entry.

---

## S12. Template Library

Accessible via the Templates Activity Bar entry and `View > Templates`. Target: ≥ 200 structures across 16 categories. See @TEMPLATES.md Appendix D for SMILES.

| Category | Count |
|----------|-------|
| Aromatic rings | 8 |
| Aliphatic rings | 8 |
| Bicyclics | 6 |
| Functional groups | 18 |
| Heterocycles (5-membered) | 10 |
| Heterocycles (6-membered) | 10 |
| Fused heterocycles | 10 |
| Amino acids (L-) | 20 |
| Nucleic acids | 5 |
| Protecting groups | 8 |
| Sugars | 6 |
| Salts / Counterions | 10 |
| Solvents | 12 |
| Common drugs | 8 |
| R-groups / Variables | 6 |
| Steroid skeleton | 3 |

**Placement:** Click template → click empty space (standalone), hover bond (fuse), or hover atom (attach).

**User-defined templates:** Right-click selection → "Save as Template…". Persists across sessions.

---

## S13. Right-click Context Palette

**Inspiration:** Krita pop-up palette

Trigger: right-click on empty canvas (no atom/bond within `SNAP_THRESHOLD_PX`). Linear context menu fires on atom/bond; this palette fires on empty space only.

**Appearance:** Circular overlay, diameter 140 px, centered at click. 8 radial slots (45° apart). Semi-transparent panel_bg + accent border. Each slot: glyph + key hint.

**Default slots (clockwise from 12 o'clock):** Single Bond, Double Bond, Benzene, Carbon, Eraser, Select, Undo, Clean.

**Interaction:** Hover highlights slot. Mouse release over slot → activate and close. `Esc` or click outside → dismiss. Does not fire when text field is focused.

---

## S14. Focus Mode

**Shortcut:** `Ctrl+Shift+F` / `Cmd+Shift+F`. Also `View > Focus Mode`.

**Hidden:** Activity Bar, Sidebar, Menu bar, Mode button row, Tool Controls Bar.

**Visible:** Canvas (full window), status bar (tool name + zoom only), context menus.

**Exit affordance:** Translucent `[Exit Focus]` button appears near top-right corner on cursor hover.

All keyboard shortcuts remain active. State persisted as `focus_mode: bool`.

---

## S15. Workspace Presets

**Inspiration:** Krita workspace configurations

Captures: sidebar visibility, active activity, sidebar width, theme, drawing mode.

**Built-in presets (read-only):**

| Name | Panels | Theme | Mode |
|------|--------|-------|------|
| Structure Drawing | Activity Bar + Tools sidebar 260 px | Dark | Structure |
| Reaction Mapping | Activity Bar + Inspector sidebar 300 px | Dark | Reaction |
| Presentation | Focus Mode | Light | Structure |

**User presets:** `View > Workspaces > Save Current Workspace…`. Stored as `Vec<WorkspacePreset>` (eframe storage). Switching does not affect the molecule.

---

## S16. Keyboard Reference Dialog

**Shortcut:** `Ctrl+Shift+?` / `Cmd+Shift+?`. Also `View > Keyboard Reference`.

Non-modal window (560 × 400 px, resizable). Searchable shortcut table by category (Global, Canvas, Tools, Reaction, 3D, Accessibility). Shows platform-correct modifier keys.

---

## S17. PubChem / Name Import

**Access:** `File > Import by Name…` or Command Palette → type compound name.

Queries PubChem REST API on a background thread (same pattern as IUPAC lookup). On success: places structure on canvas; status bar: `"Loaded from PubChem: {smiles}"`, 4 s. On failure: error in status bar, 3 s.

---

## S18. Trackpad Support

| Gesture | Action |
|---------|--------|
| Two-finger scroll (vertical) | Zoom |
| Two-finger scroll (horizontal) | Horizontal pan |
| Pinch | Zoom in/out |
| `Shift+Ctrl+Primary drag` | Pan fallback (middle-mouse substitute) |

All gestures via egui's input abstraction (`smooth_scroll_delta`, `zoom_delta()`). No additional dependencies.

---

## S19. Platform-Specific Design

> **方針:** 無理に共通化しない。各 OS で「そのOSらしい最高のデザイン」を優先する。
> Canvas の描画精度は全 OS 共通。変えるのはクロム（外枠・色・間隔・フォント・操作感）のみ。

---

### S19.1 macOS

**ターゲット感:** Keynote / Sketch に近い「洗練されたプロフェッショナルツール」

#### ウィンドウ・クロム
- タイトルバーは `eframe::NativeOptions::title_bar: false` + カスタム描画で **Unified Toolbar** スタイル（ツールバーとタイトルバーを統合）
- ウィンドウ角丸: 12 px（macOS 12+ の標準）
- パネル背景: `NSVisualEffectView` 相当のすりガラス風。egui では半透明 `panel_bg` + blur shader（将来対応）

#### 色・テーマ
- アクセント色: ユーザーの **System Accent Color** を `ctx.system_theme()` から取得して反映
- ダークモード: OS の設定に自動追従（起動時のみ。以降はユーザー設定優先）
- ライトモード背景: `#F5F5F7`（Apple の "off-white"。純白より目に優しい）

#### タイポグラフィ
- 優先フォント: **SF Pro Text** → Hiragino Kaku Gothic W3（CJK）→ Ubuntu Light
- AtomLabel（キャンバス上の元素記号）: SF Pro Rounded を使用すると化学式らしい丸みが出る
- メニュー・ラベル: 13 px / Regular（Apple HIG 準拠）

#### 操作・ショートカット
- 修飾キーは **⌘（Cmd）** が主役。Ctrl は補助のみ
- `⌘+,` → 設定を開く（macOS 標準慣例）
- `⌘+W` → ウィンドウを閉じる（アプリは終了しない）
- `⌘+Q` → アプリ終了
- Option キー = Alt として扱う（bond 自由角描画等）
- トラックパッド: ピンチズーム・2本指パン・Force Click（将来）

#### メニューバー
- アプリメニューバーは **画面上端** に表示（eframe macOS では `NativeOptions::menu_bar: true`）
- About は `[アプリ名] > chematic-draw について` に配置（Apple HIG 必須）

#### スペーシング
- ツールバーボタン: 44 × 44 px（HIG タッチターゲット基準）
- Inspector 内行間: 6 px（macOS の compact spacing）

---

### S19.2 Windows

**ターゲット感:** Microsoft Office 2025 / Windows 11 アプリの「Fluent Design」

#### ウィンドウ・クロム
- Windows 11: **Mica** エフェクト（デスクトップ壁紙を反映した半透明素材）をタイトルバーに適用
  - `eframe::NativeOptions::window_builder` で `DWMWINDOWATTRIBUTE::DWMWA_SYSTEMBACKDROP_TYPE` を設定
- Windows 10: **Acrylic** blur（フォールバック）または通常の不透明パネル
- タイトルバー: Windows 標準（最小化・最大化・閉じるボタンを右上に維持）

#### 色・テーマ
- アクセント色: `windows_sys::Windows::UI::ViewManagement::UISettings::GetColorValue(Accent)` で取得したシステムアクセント色を `tokens.accent` に反映
- ライトモード背景: `#FFFFFF`（Windows の標準）
- ダークモード: `#202020`（Windows 11 Fluent Dark より少し明るめ）
- エラー色: `#C42B1C`（Fluent の "Caution Red" と一致）

#### タイポグラフィ
- 優先フォント: **Segoe UI Variable** → Yu Gothic UI（CJK）→ Ubuntu Light
- 本文: 14 px / Regular
- キャプション: 12 px / Regular

#### 操作・ショートカット
- 修飾キーは **Ctrl** が主役
- `Ctrl+,` → 設定（Windows 11 アプリ慣例として広まりつつある）
- `Alt+F4` → アプリ終了（egui のデフォルト動作を妨げない）
- `F10` → メニューバーにフォーカス（Windows 標準）
- `Alt+←` / `Alt+→` → 将来的に Undo/Redo のナビゲーション

#### メニューバー
- ウィンドウ**内**にメニューバーを配置（Windows 標準）
- ファイル・編集・表示・言語・ヘルプ の順（Office と同順）

#### スペーシング
- ツールバーボタン: 36 × 36 px（Windows の標準密度）
- Inspector 内行間: 4 px（Windows は macOS より密度が高め）
- コンテキストメニュー: 角丸 8 px（Windows 11 Fluent 準拠）

---

### S19.3 Linux

**ターゲット感:** GNOME 46 / KDE Plasma 6 に溶け込む「ネイティブな OSS ツール」

#### ウィンドウ・クロム
- GTK / Qt のテーマ色を egui に取り込む（`eframe::NativeOptions::theme` で `System` を指定）
- 装飾は OS のウィンドウマネージャに委ねる（CSD / SSD どちらも許容）
- Wayland: `xdg_toplevel` の `set_app_id("chematic-draw")` でアイコンを正しく関連付け

#### 色・テーマ
- ダークモード: `$GTK_THEME` / `org.gnome.desktop.interface.color-scheme` を読んで起動時に自動設定
- アクセント色: GTK4 の `@accent_color` CSS variable を取得できる場合は反映。取得できない場合は `#0078D4`（フォールバック）
- GNOME 46 ダーク背景: `#1E1E2E`（Catppuccin Mocha ベースの標準的な選択）

#### タイポグラフィ
- 優先フォント: **Inter** / **Cantarell**（GNOME 標準）→ Noto Sans CJK（CJK）→ Ubuntu Light
- KDE 環境: **Noto Sans** → Noto Sans CJK
- SMILES 表示: **JetBrains Mono** / **Fira Code**（等幅）→ Noto Sans Mono

#### 操作・ショートカット
- 修飾キーは **Ctrl** が主役（Linux は macOS と違い Ctrl 統一）
- `Ctrl+Q` → アプリ終了（GNOME / KDE 共通慣例）
- X11 クリップボード: PRIMARY（マウス中クリックペースト）と CLIPBOARD（Ctrl+C/V）の両方をサポート
  - `arboard` クレートが両方を扱える
- `Super`キーはOS に渡す（アプリが捕捉しない）

#### スペーシング
- ツールバーボタン: 32 × 32 px（Linux は密度を高めに好むユーザーが多い）
- Inspector 内行間: 4 px
- GNOME HIG 準拠: 最小クリックターゲット 32 × 32 px

#### パッケージ形式
- Flatpak を第一リリース形式として採用（`io.github.chematic.draw` の app-id）
- AppImage / .deb / .rpm は二次配布

---

### S19.4 共通ルール（全OS）

以下は OS によらず固定する:

| 項目 | 固定値 | 理由 |
|------|--------|------|
| Canvas 描画精度 | 全OS同一 | 化学構造の正確性はOS非依存 |
| ボンド長デフォルト | 60 px @ 100% | MOL/CDXMLファイルとの互換性 |
| 原子ラベルフォント | ズームに比例 | 化学的可読性 |
| ファイルダイアログ | OS ネイティブ（rfd） | 各OSのルックアンドフィールに従う |
| SMILES・分子式 | 等幅フォント | 化学文字列の可読性 |
| キーボードショートカット | SPEC.md S5 に記載（OS 修飾キーのみ差分） | — |

---

## Appendix B: chematic Crate Dependency Policy

Chemistry engine: [`chematic`](https://crates.io/crates/chematic) v0.1.23 (`features = ["full"]`).

| Feature | Subcrate |
|---------|---------|
| SMILES parsing and generation | `chematic-smiles` |
| MOL / SDF / RXN file I/O | `chematic-mol` |
| Formula, MW, LogP, TPSA | `chematic-chem` |
| 2D coordinate generation | `chematic-depict` |
| Aromaticity, stereochemistry | `chematic-perception` |
| IUPAC naming (offline) | `chematic-iupac` |
| Substructure search | `chematic-smarts` |
| Fingerprints | `chematic-fp` |
| Reaction schemes | `chematic-rxn` |
| 3D coordinates, UFF optimization | `chematic-3d` |
| CPK colors, SVG rendering | `chematic-depict` |
