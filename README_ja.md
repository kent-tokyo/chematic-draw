# chematic-draw

[![CI](https://github.com/kent-tokyo/chematic-draw/actions/workflows/test.yml/badge.svg)](https://github.com/kent-tokyo/chematic-draw/actions/workflows/test.yml)
[![Docs](https://img.shields.io/badge/docs-documentation-2563eb)](docs/README.md)

Windows・macOS・Linuxで動作する、オープンソースのオフラインファースト
化学構造式エディタです。マウスやキーボードで分子・反応式を描き、物性を
ローカルで確認し、レポート・授業資料・研究メモ向けの図として出力できます。
デスクトップアプリは Electron と React、化学処理は
[`crates/chem-wasm`](crates/chem-wasm) の Rust/WASM ブリッジで構成されています。

実験的なプロジェクトであり、ChemDraw・ChemDoodle・Ketcher・ChemSketchの
ドロップイン置き換えではありません。

## 対象ユーザー

学生、研究者、教員、開発者向けの、シンプルな化学構造式描画アプリです。
アカウントや必須のクラウドサービスなしで、実験レポート用の分子、講義資料用の
反応式、SMILESの確認、反応機構の下書き、化学ファイル形式の変換に使えます。

インストールせずに試す場合は、[Chematic Draw Playground](electron/playground.html)
を開いてください。デスクトップ版は[リリース一覧](https://github.com/kent-tokyo/chematic-draw/releases)
から入手できます。

## 機能

- マウスとキーボードで操作できるキャンバス型2D分子エディタ
- テンプレート、インスペクター、Undo/Redo、自動保存、クラッシュリカバリ
- 物性表示、Lipinski判定、立体異性体列挙、SMARTS検索
- 回転・ズーム・XYZ出力に対応した3Dビューア
- 検証済み実験ピークデータを表示する、損失境界付きNMRスペクトルパネル
- 反応スキームと反応機構矢印、反応検証診断
- アイテム別結果・フィルター・進捗・キャンセルに対応したバッチ処理
- SMILES、MOL V2000/V3000、SDF、CMLの読み書き、対応サブセットのCDXML読み書き
- SVG、PNG、PDFへの描画出力
- 生成したInChIKeyによるPubChem検索（ネットワーク接続が必要）
- 日英中UI、ダークモード

分子編集、SMILES解析、物性計算、SMARTS検索、主要な出力はローカルで動作します。
PubChem検索だけはネットワーク接続が必要です。

## よくある用途

- **化学構造式を描く:** キャンバス、テンプレート、元素ツール、キーボード操作で編集し、
  分子式・分子量・Lipinski物性を確認する。
- **反応式を作る:** ステップ、条件、化学量論係数、反応剤、識別子、反応機構矢印を編集し、
  原子マッピング・バランス・ステップ連続性の診断を見る。
- **資料へ出力する:** SVG・PNG・PDFで図を出力し、SMILES・MOL・SDF・CML・対応CDXMLサブセットで交換する。
- **オフラインで使う:** 構造をアップロードせずにデスクトップ版を利用する。移行前に
  [形式互換表](docs/INTEROP.md)を確認してください。

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
