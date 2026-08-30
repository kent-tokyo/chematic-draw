# chematic-draw (Electron版) TODO

最終更新: 2026-08-30

ネイティブ Rust/egui 版（`tasks/`、ルート直下・gitignore対象）は削除されました。
本ファイルは electron/ 版の開発状況を追跡する、Git管理下の正式なタスクファイルです。
各修正の詳細（根本原因・検証手順・コミットハッシュ）は `internal_docs/ROADMAP.md`（gitignore対象、セッション内作業ログ）を参照してください。教訓のまとめは `electron/tasks/lessons.md` を参照。

---

## 完了済み — コア機能

- [x] 2D構造エディタ（原子・結合描画、Select/Eraser/Bondツール、テンプレート挿入）
- [x] キーボード完全対応キャンバス（Tab フォーカス、矢印キーでroving focus、Shift+元素で結合追加、Enterで結合モード）
- [x] Undo/Redo（キーボード Ctrl+Z/Ctrl+Shift+Z、メニュー Edit > Undo/Redo）
- [x] クリップボード Copy/Paste（SMILES、キーボード Ctrl+C/Ctrl+V、メニュー Edit > Copy/Paste）
- [x] Select All（キーボード Ctrl+A、メニュー Edit > Select All）
- [x] ファイルの開く/保存（MOL/SMILES/SDF/CML/CDXML読み込み、MOL/SMILES書き出し）
- [x] Recent Files（メニューへの反映、settings.json への永続化）
- [x] Export（SVG/PNG/PDF/MOL V2000/SMILES、XYZは3Dビューアから、反応スキームはCSV/JSON）
- [x] Autosave / クラッシュリカバリ（起動時に前回セッションの復元可否を確認）
- [x] ダークモード/ライトモード切り替え
- [x] ズーム（キーボード +/-/0、メニュー、マウスホイール）、パン
- [x] 原子の元素別カラーコーディング（CPK配色）
- [x] キャンバスの自動センタリング（初期ロード・ファイルオープン・クラッシュ復元時）

## 完了済み — 化学機能

- [x] 3D分子ビューア（回転・ズーム・UFF最適化座標、XYZエクスポート）
- [x] 物性予測（分子量、logP、TPSA、Lipinskiの法則、functional groups）
- [x] IUPAC命名（オフライン）、PubChem名称検索（要インターネット）
- [x] 反応機構キャンバス（電子の流れの矢印、原子マッピング）
- [x] 立体異性体列挙（ヒューリスティック、完全CIP実装ではない）
- [x] SMARTS部分構造検索
- [x] バッチ処理（複数分子の一括処理）
- [x] Database Search（PubChem InChIKey完全一致検索。MCSはWASM層にあるがUI未接続）

## 完了済み — インフラ・品質

- [x] CI/CD パイプライン、コントリビューションガイドライン
- [x] アクセシビリティ Phase A/B1/B2（ツールバー・サイドバー・モーダルのARIA、キャンバスの screen reader 対応）
- [x] リリースごとのチェックサム（SHA256SUMS）、SECURITY.md
- [x] 多言語 README（5言語）※その後 Electron 一本化に伴い README.md/README_ja.md はElectron版の説明に統合

## v0.2.2 リリース完了（2026-08-31）

- [x] rc.1後の信頼性修正を変更履歴へ反映し、Electron/WASM/Cargoのバージョンを同期
- [x] 実WASM契約・性能、Rust fmt/clippy/test、Jest、Renderer E2E、Electron smoke、macOSパッケージを検証
- [x] v0.2.2タグを作成。GitHub Releaseと各OS配布物はタグpush後のCIが生成

## v0.3.0 リリース完了（2026-08-31）

- [x] 保存先拡張子に応じたSMILES/SDF/CML/MOL出力
- [x] wildcard/isotopeの既知の情報損失を保存・エクスポート前に説明
- [x] CDXML上書きを拒否し、別形式へのSave Asを案内
- [x] loss analysisのユニットテストと既存回帰テストを検証

## v0.4.0 リリース完了（2026-08-31）

- [x] 反応スキームの原子収支診断と原子マッピング整合性チェック
- [x] ReactionPanelにVERIFIED / NOT VERIFIEDと具体的な差分を表示
- [x] ステップ編集時の診断再計算、回帰テスト、配布パッケージ検証

## 2026-08-29〜08-30 信頼性向上ラウンド（`/greenlane` 自律作業、詳細は ROADMAP.md）

一見動いているように見えて実際には機能していなかった不具合を、複数の切り口（IPC配線の突き合わせ・設定永続化の正しさ・lint警告の精読・undo網羅性・実機操作）から発見・修正:

- [x] main.js の主要メニュー項目5件の配線不備（Keyboard Shortcuts / About / Recent Files 2件 / 破損設定ファイルでのメニュー全体崩壊）
- [x] サイドバー閉状態が再起動後に復元されない
- [x] `useKeyboard.ts` の stale closure（Ctrl+C/Ctrl+L/ズーム/フォーカスモードが初回操作以降機能しない）
- [x] Research パネルの物性値が原子編集後も古いまま
- [x] Undo網羅性: ドラッグ移動・原子変換（クリックで元素変更）・Inspector編集・テンプレート挿入（クリック）がUndo対象外だった5箇所
- [x] Edit > Select All のメニュー項目が無反応（配線漏れ）
- [x] ウィンドウリサイズで分子が画面から消える（キャンバス描画バッファのクリア後に再描画がトリガーされない）
- [x] ツールバーのズーム%表示が誤って"1%"などと表示される計算バグ
- [x] Edit > Undo/Redo/Copy/Paste のメニュー項目がクリックしても無反応（Electronの `role:` ベースのメニューが `click` ハンドラを無視する仕様）
- [x] `clipboard:read` IPCハンドラが `clipboard.readText()` の戻り値（実はPromiseを返す）を await しておらず、Paste機能全体（キーボード・メニュー両方）が無期限にハングしていた
- [x] ネイティブ Rust/egui 版の削除、関連ドキュメント（DESIGN.md/SPEC.md/TEMPLATES.md、README.md/README_ja.md、AGENTS.md）の整理

---

## TODO — 未対応・要判断

### スコープ確定待ち

- [ ] ネイティブ（非WASM）フィンガープリント/MCS比較実装 — 新規スコープとして意図的に保留
- [ ] 反応の原子マッピングの整合性チェック（原子収支など）— 妥当なスコープ定義が必要
- [ ] `before-quit` のスナップショットクリアと保存中IPCとの競合可能性 — 対応不要と判断済み（詳細はROADMAP.md）

### 製品判断待ち

- [ ] Templates パネルのクリック挿入: テンプレート全体で「置換」するか「既存分子にマージ」するかの挙動統一（現状は置換のまま、Undo対応済み）

### 既知の未実装・部分実装

- [ ] `chematic-inchi` — InChI/InChIKey生成・エクスポート（chem-wasm側で未接続）
- [ ] R/S CIP コードのキャンバス表示
- [ ] 化学略号（Ph/Me/Et）の展開
- [ ] ChemSpider 検索（UIに選択肢はあるが未実装、呼ぶと例外）
- [ ] MCS（最大共通部分構造）のUI接続
- [ ] Polymer/S-group記法、Markush構造、NMR/スペクトル予測
- [ ] v1.0ゲート: 安定API・署名済みインストーラー・移行ポリシー（未着手）

### 明示的にスコープ外（延期）

クラウドストレージ/同期、リアルタイム共同編集、アカウント/認証、モバイルアプリ、AR/VR、ブラウザ拡張、ML関連機能、独自NMR/ADMET予測、2つ目の逆合成/合成可能性実装。
yomitoki（合成難易度説明）・RENKIN（逆合成・経路監査）との統合はAPI設計待ち。
mikiwame/gugen/kizashi（結晶・無機材料）は専用のドキュメントモデルが必要で未着手。
