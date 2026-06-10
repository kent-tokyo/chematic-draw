# chematic-draw（日本語版）

クロスプラットフォーム対応の化学構造エディタ。**Electron, React, WebAssembly** で構築されています。

[![テスト](https://github.com/yourusername/chematic-draw/actions/workflows/test.yml/badge.svg)](https://github.com/yourusername/chematic-draw/actions/workflows/test.yml)
[![ビルド](https://github.com/yourusername/chematic-draw/actions/workflows/build.yml/badge.svg)](https://github.com/yourusername/chematic-draw/actions/workflows/build.yml)
[![カバレッジ](https://codecov.io/gh/yourusername/chematic-draw/branch/main/graph/badge.svg)](https://codecov.io/gh/yourusername/chematic-draw)

[English](./README.md) | 日本語 | [中文](./README.zh.md) | [Español](./README.es.md)

---

## 主な機能

### コア機能
- **2D 構造エディタ** — 直感的なキャンバス操作で分子を描画
- **3D 分子ビューア** — 回転・ズーム・エクスポート可能な 3D 構造表示
- **反応メカニズム** — ステップバイステップの反応経路可視化
- **プロパティ予測** — 分子量、LogP、ESOL、SA スコア、Lipinski の法則
- **立体異性体列挙** — キラル中心の検出と全立体異性体の生成
- **データベース検索** — 類似度検索と最大共通部分構造（MCS）検出
- **バッチ処理** — 複数の分子を一括処理

### 高度な機能
- **WASM バックエンド** — chematic 0.1.40 ライブラリを使用した高速化学演算
- **3D 座標生成** — 距離幾何学 + UFF 力場最適化
- **分子指紋** — ECFP4 生成と Tanimoto/Dice 類似度計算
- **ファイルエクスポート** — SVG, PNG, JSON, XYZ, CSV 形式
- **キーボードショートカット** — ChemDraw 互換の操作性
- **ダークモード** — ライト/ダークテーマ対応

---

## インストール

### macOS
```bash
# DMG ファイルをダウンロード
open chematic-draw-x.x.x.dmg
# または Homebrew
brew install chematic-draw
```

### Windows
```bash
# リリースページからダウンロード
chematic-draw-x.x.x.exe
# インストーラを実行
```

### Linux
```bash
# AppImage
./chematic-draw-x.x.x.AppImage

# または snap
sudo snap install chematic-draw
```

---

## クイックスタート

1. **アプリケーション起動** — アイコンをクリック
2. **分子を描画** — キャンバスをクリックして原子を配置、ドラッグして結合
3. **SMILES から読み込む** — ファイル → SMILES から新規 → 構造をペースト
4. **3D 表示** — 「3D」タブ → 「3D 生成」ボタン
5. **エクスポート** — ファイル → 形式を選択してエクスポート

詳細は[クイックスタートガイド](./docs/QUICK_START.md)を参照。

---

## 技術スタック

| コンポーネント | 技術 | バージョン |
|-----------|------|----------|
| **デスクトップ** | Electron | 33.x |
| **UI** | React + TypeScript | 18.x |
| **状態管理** | Zustand | 4.x |
| **Canvas** | Canvas 2D API | ネイティブ |
| **化学エンジン** | chematic (Rust) | 0.1.40 |
| **WASM** | wasm-bindgen | 最新 |
| **ビルド** | Vite + wasm-pack | 最新 |
| **テスト** | Jest + Playwright | 最新 |

---

## システム要件

### 最小要件
- **OS**: macOS 11+, Windows 10+, Ubuntu 20.04+
- **RAM**: 4 GB
- **ディスク**: 500 MB

### 開発環境
- **Node.js**: 18+
- **Rust**: 1.70+
- **Git**: 2.30+

---

## ソースからビルド

### 開発モード
```bash
# リポジトリをクローン
git clone https://github.com/yourusername/chematic-draw.git
cd chematic-draw

# 依存関係をインストール
npm install
rustup target add wasm32-unknown-unknown
cargo install wasm-pack

# ホットリロード対応で実行
npm start
```

### 本番ビルド
```bash
# 配布用にビルド
npm run make

# 出力: out/make/
# - *.AppImage (Linux)
# - *.dmg (macOS)
# - *.exe (Windows)
```

詳細は[ビルドガイド](./docs/BUILD.md)を参照。

---

## 使用例

### 分子を描画してエクスポート
```
1. ファイル → SMILES から新規
2. 貼り付け: CC(=O)Oc1ccccc1C(=O)O （アスピリン）
3. ファイル → 形式を選択してエクスポート → SVG
```

### 3D 構造を生成して可視化
```
1. 分子を読み込む
2. 「3D」タブをクリック
3. 「3D 生成」ボタンをクリック
4. ドラッグで回転、スクロールでズーム
5. 「XYZ エクスポート」で保存
```

### 医薬品適性を確認
```
1. 分子を読み込む
2. 「Props」タブをクリック
3. Lipinski 違反と SA スコアを確認
```

### 分子を比較
```
1. 分子 A を読み込む
2. 「DB」タブをクリック
3. 「データベース検索」をクリック
4. 似ている分子 B をクリック
5. 両構造で MCS がハイライト表示
```

---

## ドキュメント

| ガイド | 目的 | 読了時間 |
|-------|------|--------|
| [クイックスタート](./docs/QUICK_START.md) | 5 分で開始 | 5 分 |
| [ユーザーチュートリアル](./docs/TUTORIAL.md) | 機能の詳細解説 | 20 分 |
| [API リファレンス](./docs/API.md) | WASM 関数仕様 | 30 分 |
| [ビルドガイド](./docs/BUILD.md) | 開発環境構築 | 15 分 |
| [アーキテクチャ](./docs/ARCHITECTURE.md) | システム設計 | 25 分 |
| [CI/CD](./docs/CI_CD.md) | テスト・リリース運用 | 20 分 |
| [トラブルシューティング](./docs/TROUBLESHOOTING.md) | 問題解決 | 必要に応じて |

---

## キーボードショートカット

| キー | 動作 |
|-----|------|
| `Ctrl+N` / `Cmd+N` | 新規分子 |
| `Ctrl+O` / `Cmd+O` | ファイルを開く |
| `Ctrl+S` / `Cmd+S` | ファイルを保存 |
| `Ctrl+Z` / `Cmd+Z` | 戻す |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | やり直す |
| `Ctrl+V` / `Cmd+V` | SMILES をペースト |
| `D` | 描画モード |
| `S` | 選択モード |
| `B` | 結合ツール |
| `Delete` | 選択項目を削除 |
| `?` | ヘルプ |

---

## パフォーマンス

### ベンチマーク

| 処理 | 時間 | 状態 |
|-----|------|------|
| SMILES パース | 5ms | ✅ 高速 |
| 指紋生成 | 30ms | ✅ 高速 |
| 3D 生成（50 原子） | 300ms | ✅ 高速 |
| 3D 生成（200 原子） | 1.2s | ✅ 良好 |
| Canvas レンダリング | 14ms | ✅ 60 FPS |
| メモリ使用量 | <50MB | ✅ 効率的 |

詳細は[パフォーマンスベンチマーク](./docs/CI_CD.md#performance-optimization)を参照。

---

## テスト

### テストを実行
```bash
# ユニットテスト
npm test

# E2E テスト
npm run test:e2e

# パフォーマンスベンチマーク
npm run test:perf

# カバレッジレポート
npm test -- --coverage
```

### 継続的インテグレーション
すべてのプッシュと PR は自動的に以下を実行：
- TypeScript 型チェック
- ユニットテスト + カバレッジ
- E2E ブラウザテスト
- パフォーマンス回帰テスト

詳細は[CI/CD ガイド](./docs/CI_CD.md)を参照。

---

## 貢献

貢献を歓迎します！[CONTRIBUTING.md](./CONTRIBUTING.md)を参照して以下を確認：
- 開発環境セットアップ
- コードスタイルガイドライン
- テスト要件
- プルリクエストプロセス
- コミットメッセージ形式

### クイック貢献
```bash
# フォークしてクローン
git clone https://github.com/YOUR_USERNAME/chematic-draw.git

# 機能ブランチを作成
git checkout -b feature/my-feature

# 変更してテスト
npm test

# プッシュして PR を作成
git push origin feature/my-feature
```

---

## ロードマップ

### v0.2.x（現在）
- ✅ 3D 分子ビューア
- ✅ プロパティ予測
- ✅ 反応メカニズム可視化
- ✅ 立体異性体列挙
- ✅ データベース検索
- ✅ パフォーマンス最適化
- ✅ 包括的なドキュメント

### v0.3.x（計画中）
- [ ] Web 版（ブラウザ版）
- [ ] リアルタイム協調編集
- [ ] クラウドストレージ統合
- [ ] 高度な NMR 予測

### v0.4.x（将来）
- [ ] WebGL レンダリング
- [ ] VR/AR サポート
- [ ] 機械学習統合

詳細は[ロードマップ](./ROADMAP.md)を参照。

---

## ライセンス

chematic-draw はデュアルライセンス：
- **MIT ライセンス** — オープンソースプロジェクト向け
- **Apache 2.0 ライセンス** — 商用利用向け

[LICENSE.MIT](./LICENSE.MIT) と [LICENSE.APACHE](./LICENSE.APACHE) を参照。

---

## サポート

### ドキュメント
- 📖 [完全ドキュメント](./docs/)
- 🚀 [クイックスタート](./docs/QUICK_START.md)
- 🆘 [トラブルシューティング](./docs/TROUBLESHOOTING.md)

### コミュニティ
- 💬 [GitHub Discussions](https://github.com/yourusername/chematic-draw/discussions)
- 🐛 [GitHub Issues](https://github.com/yourusername/chematic-draw/issues)
- 📧 Email: support@example.com

---

## バージョン情報

| コンポーネント | ステータス | 備考 |
|-----------|---------|------|
| **開発** | ✅ 活発 | 定期的に更新 |
| **テスト** | ✅ 包括的 | Jest + Playwright |
| **CI/CD** | ✅ 自動化 | GitHub Actions |
| **ドキュメント** | ✅ 完全 | 7 つのガイド |
| **本番対応** | ✅ あり | v0.2.0+ 安定版 |

---

**化学を楽しんでください！🧪**

❤️ 化学コミュニティのために作られています。

---

[English](./README.md) | 日本語 | [中文](./README.zh.md) | [Español](./README.es.md)
