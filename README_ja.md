# chematic-draw

Electron・React・Rust/WASM製の化学エンジンで構築された、オープンソースのオフラインファースト化学構造描画エディタです。
実験的なプロジェクトであり、ChemDraw・ChemDoodle・Ketcher・ChemSketchの代替を目指していますが、まだドロップイン置き換えではなく、科学的正確性と相互運用性を優先して開発しています。

> 以前はネイティブ Rust/egui デスクトップ版（`crates/chem-ui`, `crates/chem-io`）も存在していましたが、削除されました。現在の開発対象は [`electron/`](electron/) 以下の Electron 版のみです。

---

## 機能

- **2D構造エディタ** — キャンバスベースの描画、完全キーボード操作対応（Tabでキャンバスにフォーカス、矢印キーで原子フォーカス移動、Shift+C/N/O/S/Pで結合した原子を追加、Enterで結合開始）
- **3D分子ビューア** — 回転、ズーム、XYZエクスポート
- **反応機構** — 電子の流れを示す矢印と原子マッピングによるステップバイステップ表示
- **物性予測** — 分子量、分子式、logP、TPSA、Lipinskiの法則
- **立体異性体列挙** — ヒューリスティックな候補生成（完全なCIP実装ではありません）
- **SMARTS部分構造検索**
- **ファイル形式** — MOL V2000、SMILES（正規形・反応式）、SDF、CMLの読み書き対応、CDXMLは読み込みのみ。SVG/PNG/PDFエクスポート、SMILES/MOLのクリップボード貼り付け（Ctrl+V）
- **IUPAC命名** — オフラインのローカルアルゴリズム。名称→構造変換にはPubChem検索も利用可能（この機能のみインターネット接続が必要）
- **バッチ処理**、**自動保存・クラッシュリカバリ**、**Undo/Redo**
- ダークモード、日英UI

正確なバージョン情報や、どの機能が部分対応か・既知の制限事項などの詳細は [docs/README.md](docs/README.md) を参照してください — こちらが正式な最新情報源で、本ファイルは概要のみです。

---

## はじめに

```bash
git clone https://github.com/kent-tokyo/chematic-draw.git
cd chematic-draw/electron
npm install
npm run build:wasm
npm start
```

ビルド済みインストーラーとダウンロード検証手順: [Quick Start](docs/QUICK_START.md)
開発環境の完全なセットアップ: [Build Guide](docs/BUILD.md)

---

## 化学エンジン

化学処理（構造解析、2Dレイアウト、物性計算、フィンガープリント、反応、SMARTS）はすべて [`chematic`](https://crates.io/crates/chematic) クレートが担っています — C/C++ FFIを持たないPure Rustのケモインフォマティクスライブラリです。WASMにコンパイルされ（`crates/chem-wasm`）、Electronのレンダラーから直接読み込まれます。なお、Electron/Chromium本体はこれとは別に、独自のネイティブ依存関係を持っています。

---

## コントリビューション

開発フロー・コーディングスタイル・PRプロセスについては [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## セキュリティ

サポート対象バージョンや脆弱性の報告方法については [SECURITY.md](SECURITY.md) を参照してください。

## ライセンス

MIT — `electron/package.json` を参照。
