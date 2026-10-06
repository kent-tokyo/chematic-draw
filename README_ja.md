# chematic-draw

[![CI](https://github.com/kent-tokyo/chematic-draw/actions/workflows/test.yml/badge.svg)](https://github.com/kent-tokyo/chematic-draw/actions/workflows/test.yml)
[![Release](https://img.shields.io/github/v/release/kent-tokyo/chematic-draw?display_name=tag&sort=semver)](https://github.com/kent-tokyo/chematic-draw/releases/latest)
[![Docs](https://img.shields.io/badge/docs-documentation-2563eb)](docs/README.md)

Windows・macOS・Linux向けの、オープンソースかつオフラインファーストの
化学構造式エディタです。分子・反応スキームを描き、ローカルで化学情報を確認し、
図や構造ファイルとして出力できます。アカウントや必須クラウドサービスは不要です。
デスクトップアプリはElectronとReact、化学処理は
[`crates/chem-wasm`](crates/chem-wasm)のRust/WASMブリッジで動作します。

対応範囲を明示したワークフローでは、実務的に利用できるプロダクトです。日常的な
構造式作図、ファイル交換、確認作業を、ChemDrawなどから無理なく移行できます。

インストールせずに試すには[Playground](https://kent-tokyo.github.io/chematic-draw/playground/)、
デスクトップ版は[GitHub Releases](https://github.com/kent-tokyo/chematic-draw/releases)から利用できます。

## できること

- マウス・キーボード・テンプレートを使った2D作図、Undo/Redo、自動保存、復旧、
  ChemDrawに近い／コンパクトなワークスペース
- 物性、Lipinski、立体異性体、SMARTS、ECFP4類似度、有界MCS、3D、対応NMRデータの確認
- 反応スキーム、機構矢印、係数、条件の編集と、構造的一貫性診断、複数反応物SMIRKS実行
- SMILES、MOL V2000/V3000、SDF、CML、対応CDXML、RXN、反応JSON、SVG、PNG、PDF、
  session bundleの入出力。情報が失われる場合は明示します。
- 日本語・英語・簡体字中国語、ダークモード。PubChemは明示的なネットワーク検索、
  ChemSpiderはデスクトップホストで任意設定する連携です。

## ChemDrawワークフローの移行

| 用途 | chematic-draw | 判断 |
|---|---|---|
| 日常的な2D作図・反応スキーム | 対応 | ローカル編集、テンプレート、ステップ、診断を利用できます。 |
| SMILES・MOL・SDF・CML交換 | 対応 | 通常の構造交換に推奨します。 |
| 基本構造・ページ情報を含むCDXML | 対応サブセット | 移行前に代表ファイルで確認してください。 |
| 高度なテンプレート、自動レイアウト、厳密な出版組版 | 部分対応 | 決定的レイアウトとSVG・PNG・PDFを利用し、最終組版は元ツールでも確認してください。 |

これは機能の点数比較ではなく、用途判断のための表です。本番文書を移行する前に、
[移行ガイド](docs/MIGRATION.md)、[形式互換表](docs/INTEROP.md)、
[既知の制限](docs/KNOWN_LIMITATIONS.md)を確認してください。

## 開発を始める

```bash
git clone https://github.com/kent-tokyo/chematic-draw.git
cd chematic-draw/electron
npm install
npm run build:wasm
npm start
```

Node.js 24+、Rust、`wasm32-unknown-unknown` target、`wasm-pack`が必要です。
リリース版の導入は[Quick Start](docs/QUICK_START.md)、開発・テスト・パッケージ化は
[Build](docs/BUILD.md)を参照してください。

## 文書と開発系列

[文書一覧](docs/README.md)から、利用方法、形式、API、リリース境界を確認できます。
公開データ契約とElectron非依存の埋め込みパッケージは
[`packages/chematic-contract`](packages/chematic-contract/README.md)と
[`packages/chematic-web`](packages/chematic-web/README.md)にあります。

公開済みの`v1.0.14`は`chematic` v1.0.31を使用し、現在の`main`はv1.0.36を使用します。
MITライセンスです。開発方針は[Contributing](CONTRIBUTING.md)、脆弱性報告は
[Security](SECURITY.md)を参照してください。
