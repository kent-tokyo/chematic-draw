# chematic-draw

[![CI](https://github.com/kent-tokyo/chematic-draw/actions/workflows/test.yml/badge.svg)](https://github.com/kent-tokyo/chematic-draw/actions/workflows/test.yml)
[![Release](https://img.shields.io/github/v/release/kent-tokyo/chematic-draw?display_name=tag&sort=semver)](https://github.com/kent-tokyo/chematic-draw/releases/latest)
[![Docs](https://img.shields.io/badge/docs-documentation-2563eb)](docs/README.md)

Windows・macOS・Linuxで動作する、オープンソースのオフラインファースト
化学構造式エディタです。マウスやキーボードで分子・反応式を描き、物性を
ローカルで確認し、レポート・授業資料・研究メモ向けの図として出力できます。
デスクトップアプリは Electron と React、化学処理は
[`crates/chem-wasm`](crates/chem-wasm) の Rust/WASM ブリッジで構成されています。

対応ワークフローで実用的に使える成熟したプロダクトです。ChemDraw・ChemDoodle・
Ketcher・ChemSketchからの移行を支援しつつ、形式・組版の対応範囲は明示しています。

## 対象ユーザー

学生、研究者、教員、開発者向けの、シンプルな化学構造式描画アプリです。
アカウントや必須のクラウドサービスなしで、実験レポート用の分子、講義資料用の
反応式、SMILESの確認、反応機構の下書き、化学ファイル形式の変換に使えます。

インストールせずに試す場合は、[Chematic Draw Playground](https://kent-tokyo.github.io/chematic-draw/playground/)
を開いてください。デスクトップ版は[リリース一覧](https://github.com/kent-tokyo/chematic-draw/releases)
から入手できます。

## 機能

- マウスとキーボードで操作できるキャンバス型2D分子エディタ
- ChemDrawに近いメニュー配置、左側の描画ツール・テンプレート、右側の
  Properties・Query・Stereo、コンパクト表示、Undo/Redo、配置の保存、
  自動保存、クラッシュリカバリ
- 物性表示、Lipinski判定、立体異性体列挙、SMARTS検索
- ECFP4フィンガープリント、metadata付き類似度（Tanimoto/Dice）、MCS検索
- 回転・ズーム・XYZ出力に対応した3Dビューア
- 汎用JSON・Bruker 1D peak listの読み込み、手動注釈、JSON出力に対応したNMRスペクトルパネル
- 反応スキームと反応機構矢印、構造的一貫性の診断（機構・生成物予測ではない）
- 2〜8個の反応物に対応した複数反応物SMIRKS実行
- SMARTS制約、Markush、ポリマー、核酸メタデータに対応した型付きクエリ文書
- アイテム別結果・フィルター・進捗・キャンセルに対応したバッチ処理
- SMILES、MOL V2000/V3000、SDF、CML、対応サブセットのCDXML読み書き
- CDXMLのページ・group保持と、安全な場合の元ファイルpatch出力
- SVG、PNG、PDFへの描画出力
- 生成したInChIKeyによるPubChem検索と、Electron限定の任意ChemSpider名検索
- 日英中UI、ダークモード

## ChemDrawとの比較（概要）

| ワークフロー | chematic-draw | ChemDraw |
|---|---|---|
| 2D構造式・反応スキーム | ローカルのデスクトップ編集、ステップ作成と診断 | 対応 |
| 構造データの交換 | SMILES、MOL、SDF、CML、対応CDXMLサブセット | ネイティブCDXML文書ワークフロー |
| レイアウト・出版出力 | 決定的レイアウト、SVG・PNG・PDF出力 | 高度なテンプレート、自動レイアウト、出版組版 |
| CDXML表示の再現性 | loss-awareな対応サブセット | ネイティブのpresentation semantics |
| ソース・ライセンス | オープンソース（MIT） | 商用ソフトウェア |

これは機能の点数比較ではなく、用途判断のための概要です。本番の文書を移行する前に、
[移行ガイド](docs/MIGRATION.md)、[形式互換表](docs/INTEROP.md)、
[詳細比較](docs/COMPARISON.md)を確認してください。

分子編集、SMILES解析、物性計算、SMARTS検索、NMR表示、主要な出力はローカルで動作します。
PubChemは明示操作によるネットワーク検索です。ChemSpiderはRSC APIキーと帰属確認を
Electronホストに設定した場合だけ有効で、設定ファイルには保存しません。

リポジトリには、検証済み分子をHTMLへ埋め込むElectron非依存の
`@chematic/web`パッケージも含まれています。読み取り専用表示、ホスト制御の
エディタ、Worker経由の描画・シリアライズ・要約・限定的なimmutable編集を提供します。

## よくある用途

- **化学構造式を描く:** 55件のカテゴリ別テンプレート、キャンバス、元素ツール、キーボード操作で編集し、
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
ありません（Electron/Chromium本体のネイティブ依存関係は別です）。現在の開発系列では
`chematic-draw` 1.0.13では`chematic` v1.0.19を使用しています。
Rust/WASMブリッジの公開APIは`crates/chem-wasm/src/lib.rs`に置き、分子変換、
フィンガープリント、RXN/CDXML adapterは機能別moduleに分離しています。現在の検証結果は
[`CHANGELOG.md`](CHANGELOG.md)を参照してください。

## コントリビューション・セキュリティ・ライセンス

開発については [`CONTRIBUTING.md`](CONTRIBUTING.md)、脆弱性の報告は
[`SECURITY.md`](SECURITY.md) を参照してください。MITライセンスです。
