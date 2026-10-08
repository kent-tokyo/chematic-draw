# chematic-draw

[![CI](https://github.com/kent-tokyo/chematic-draw/actions/workflows/test.yml/badge.svg)](https://github.com/kent-tokyo/chematic-draw/actions/workflows/test.yml)
[![Release](https://img.shields.io/github/v/release/kent-tokyo/chematic-draw?display_name=tag&sort=semver)](https://github.com/kent-tokyo/chematic-draw/releases/latest)
[![Docs](https://img.shields.io/badge/docs-documentation-2563eb)](docs/README.md)

面向 Windows、macOS 和 Linux 的开源、离线优先化学结构式编辑器。无需账号或强制云服务，
即可绘制分子和反应方案、在本地查看化学信息，并导出图形或结构文件。桌面应用使用
Electron 和 React；化学操作由 [`crates/chem-wasm`](crates/chem-wasm) 的 Rust/WASM
桥接层执行。

对于已文档化的工作流，这是面向生产使用的编辑器。它适合日常结构式绘制、文件交换和
复核，也支持从 ChemDraw 等编辑器逐步迁移，同时明确保留格式和排版边界。

可先使用浏览器版[Playground](https://kent-tokyo.github.io/chematic-draw/playground/)，
桌面版可从[GitHub Releases](https://github.com/kent-tokyo/chematic-draw/releases)下载。

## 可以做什么

- 使用鼠标、键盘和模板进行二维绘制，支持撤销/重做、自动保存、恢复，以及接近ChemDraw
  或紧凑的工作区。
- 查看属性、Lipinski、立体异构体、SMARTS、ECFP4 相似度、有界 MCS、三维结构和支持的 NMR 数据。
- 编辑反应方案、机理箭头、系数和条件；查看结构一致性诊断并运行有界多反应物 SMIRKS。
- 导入或导出 SMILES、MOL V2000/V3000、SDF、CML、支持子集 CDXML、RXN、反应 JSON、
  SVG、PNG、PDF 和 session bundle；发生信息损失时会明确提示。
- 提供英文、日文、简体中文和深色模式。PubChem 是显式网络查询；ChemSpider 是桌面宿主可选集成。

## 迁移 ChemDraw 工作流

| 工作流 | chematic-draw | 建议 |
|---|---|---|
| 日常二维绘制和反应方案 | 支持 | 可本地编辑，并使用模板、步骤和诊断。 |
| SMILES、MOL、SDF、CML 交换 | 支持 | 推荐用于普通结构交换。 |
| 含基本结构和页面数据的 CDXML | 支持子集 | 迁移前请用代表性文件验证。 |
| 高级模板、自动布局、精确出版排版 | 部分支持 | 可使用确定性布局和SVG/PNG/PDF，最终排版仍应在源工具中检查。 |

这不是功能评分，而是工作流选择指南。迁移生产文档集前，请阅读
[迁移指南](docs/MIGRATION.md)、[格式互操作矩阵](docs/INTEROP.md)和
[已知限制](docs/KNOWN_LIMITATIONS.md)。

## 开始开发

```bash
git clone https://github.com/kent-tokyo/chematic-draw.git
cd chematic-draw/electron
npm install
npm run build:wasm
npm start
```

需要 Node.js 24+、Rust、`wasm32-unknown-unknown` target 和 `wasm-pack`。
安装发布版请看[Quick Start](docs/QUICK_START.md)；开发、测试和打包请看
[Build](docs/BUILD.md)。

## 文档和开发分支

[文档索引](docs/README.md)涵盖使用方法、格式、API 和发布边界。公开数据契约和不依赖
Electron 的嵌入包分别见 [`packages/chematic-contract`](packages/chematic-contract/README.md)
和 [`packages/chematic-web`](packages/chematic-web/README.md)。

已发布的 `v1.0.14` 使用 `chematic` v1.0.31；当前 `main` 使用 v1.0.38。
项目采用 MIT 许可证。贡献请看[Contributing](CONTRIBUTING.md)，安全报告请看
[Security](SECURITY.md)。
