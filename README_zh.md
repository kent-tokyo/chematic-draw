# chematic-draw

[![CI](https://github.com/kent-tokyo/chematic-draw/actions/workflows/test.yml/badge.svg)](https://github.com/kent-tokyo/chematic-draw/actions/workflows/test.yml)
[![Docs](https://img.shields.io/badge/docs-documentation-2563eb)](docs/README.md)

面向 Windows、macOS 和 Linux 的开源、离线优先化学结构式编辑器。可以用鼠标或
键盘绘制分子和反应方案，在本地检查分子属性，并为报告、教学材料和研究笔记导出
清晰的结构图。桌面应用使用 Electron 和 React 构建，化学操作由
[`crates/chem-wasm`](crates/chem-wasm) 中的 Rust/WASM 桥接层执行。

本项目仍处于实验阶段，并不是 ChemDraw、ChemDoodle、Ketcher 或 ChemSketch
的直接替代品。

## 适用人群

适合学生、研究人员、教师和开发者使用。无需账号或强制云服务，即可绘制实验报告
中的分子、制作课程幻灯片中的反应式、检查 SMILES、草拟反应机理，或在常见化学文件
格式之间转换。可以先试用[浏览器版 Playground](https://kent-tokyo.github.io/chematic-draw/playground/)，桌面版可从
[发布页面](https://github.com/kent-tokyo/chematic-draw/releases)下载。

## 功能

- 支持鼠标和键盘操作的二维分子画布
- 接近 ChemDraw 的菜单布局、左侧绘图工具和模板、右侧 Properties/Query/Stereo、
  紧凑模式、撤销/重做、布局持久化、自动保存和崩溃恢复
- 分子属性、Lipinski 检查、立体异构体枚举和 SMARTS 搜索
- ECFP4 指纹、带元数据的 Tanimoto/Dice 相似度以及有界 MCS 搜索
- 支持旋转、缩放和 XYZ 导出的三维查看器
- 支持验证实验峰数据的、明确损失边界的 NMR 光谱面板
- 反应方案、反应机理箭头和反应验证诊断
- 支持 2 至 8 个反应物的多反应物 SMIRKS 执行
- 支持 SMARTS 约束、Markush、聚合物和核酸元数据的类型化查询文档
- 支持逐项结果、筛选、进度、取消和失败重试的批处理
- 支持 SMILES、MOL V2000/V3000、SDF、CML 和 CDXML 子集导入导出
- 在安全范围内保留 CDXML 页面、group，并对原始文件进行patch输出
- 支持 SVG、PNG 和 PDF 图形导出
- 通过生成的 InChIKey 查询 PubChem（需要网络连接）
- 英文、日文和简体中文界面、深色模式

分子编辑、SMILES 解析、属性计算、SMARTS 搜索和主要导出功能均可在本地运行；PubChem
查询需要网络连接。

仓库还包含私有的、与 Electron 无关的 `@chematic/web` 包，用于验证后将分子嵌入
HTML。它提供只读显示、由宿主控制的编辑器，以及通过 Worker 实现的渲染、序列化、
摘要和有界不可变编辑。

## 常见用途

- **绘制化学结构式：** 使用画布、模板、元素工具和键盘快捷键，并查看分子式、分子量和 Lipinski 属性。
- **制作反应方案：** 编辑步骤、条件、化学计量系数、试剂、组件标识和反应机理箭头，查看原子映射、平衡和连续性诊断。
- **用于文档：** 导出 SVG、PNG、PDF 图形，或使用 SMILES、MOL、SDF、CML 和支持的 CDXML 子集交换数据。
- **离线工作：** 不上传结构即可使用桌面应用。迁移生产数据前请先查看[格式互操作矩阵](docs/INTEROP.md)。

## 截图

![chematic-draw 应用界面](docs/images/chematic-draw-app.jpeg)

截图展示了桌面应用中的画布、Inspector、验证状态和 SMARTS 搜索功能。

## 快速开始

```bash
git clone https://github.com/kent-tokyo/chematic-draw.git
cd chematic-draw/electron
npm install
npm run build:wasm
npm start
```

开发和测试命令请参阅 [`docs/BUILD.md`](docs/BUILD.md)，发布版安装说明请参阅
[`docs/QUICK_START.md`](docs/QUICK_START.md)。

## 化学引擎

应用通过 WebAssembly 使用 Rust 化学信息学库
[`chematic`](https://crates.io/crates/chematic)。化学层不使用 C/C++ FFI；
Electron 和 Chromium 仍属于独立的原生依赖。`chematic-draw` 1.0.12
固定使用 `chematic` v1.0.19。
Rust/WASM 桥接层的公共 API 位于 `crates/chem-wasm/src/lib.rs`；分子转换、指纹处理以及
RXN/CDXML adapter 已按功能拆分到独立模块。当前验证结果请参阅
[`CHANGELOG.md`](CHANGELOG.md)。

## 文档、贡献和许可证

已知限制和文档索引见 [`docs/README.md`](docs/README.md)，格式互操作性见
[`docs/INTEROP.md`](docs/INTEROP.md)。贡献指南见 [`CONTRIBUTING.md`](CONTRIBUTING.md)，
安全问题请参阅 [`SECURITY.md`](SECURITY.md)。本项目采用 MIT 许可证。
