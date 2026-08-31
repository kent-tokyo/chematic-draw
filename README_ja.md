# chematic-draw

Windows・macOS・Linuxで動作する、オープンソースのオフラインファースト
化学構造エディタです。デスクトップアプリは Electron と React、化学処理は
[`crates/chem-wasm`](crates/chem-wasm) の Rust/WASM ブリッジで構成されています。

実験的なプロジェクトであり、ChemDraw・ChemDoodle・Ketcher・ChemSketchの
ドロップイン置き換えではありません。

## 機能

- マウスとキーボードで操作できるキャンバス型2D分子エディタ
- テンプレート、インスペクター、Undo/Redo、自動保存、クラッシュリカバリ
- 物性表示、Lipinski判定、立体異性体列挙、SMARTS検索
- 回転・ズーム・XYZ出力に対応した3Dビューア
- 反応スキームと反応機構矢印、反応検証診断
- アイテム別結果・フィルター・進捗・キャンセルに対応したバッチ処理
- SMILES、MOL V2000/V3000、SDF、CMLの読み書き、CDXMLの読み込み
- SVG、PNG、PDFへの描画出力
- 生成したInChIKeyによるPubChem検索（ネットワーク接続が必要）
- 日英UI、ダークモード

既知の制限と文書一覧は [`docs/README.md`](docs/README.md)、形式の詳細は
[`docs/INTEROP.md`](docs/INTEROP.md) を参照してください。

## はじめに

```bash
git clone https://github.com/kent-tokyo/chematic-draw.git
cd chematic-draw/electron
npm install
npm run build:wasm
npm start
```

開発・テスト手順は [`docs/BUILD.md`](docs/BUILD.md)、リリース版の導入は
[`docs/QUICK_START.md`](docs/QUICK_START.md) を参照してください。

## 化学エンジン

[`chematic`](https://crates.io/crates/chematic) Rustケモインフォマティクス
ライブラリをWebAssembly経由で利用しています。化学処理層にC/C++ FFIは
ありません（Electron/Chromium本体のネイティブ依存関係は別です）。

## コントリビューション・セキュリティ・ライセンス

開発については [`CONTRIBUTING.md`](CONTRIBUTING.md)、脆弱性の報告は
[`SECURITY.md`](SECURITY.md) を参照してください。MITライセンスです。
