# chematic-draw（中文版）

跨平台化学结构编辑器。使用 **Electron、React 和 WebAssembly** 构建。

[![测试](https://github.com/yourusername/chematic-draw/actions/workflows/test.yml/badge.svg)](https://github.com/yourusername/chematic-draw/actions/workflows/test.yml)
[![构建](https://github.com/yourusername/chematic-draw/actions/workflows/build.yml/badge.svg)](https://github.com/yourusername/chematic-draw/actions/workflows/build.yml)
[![覆盖率](https://codecov.io/gh/yourusername/chematic-draw/branch/main/graph/badge.svg)](https://codecov.io/gh/yourusername/chematic-draw)

[English](./README.md) | [日本語](./README.ja.md) | 中文 | [Español](./README.es.md)

---

## 主要功能

### 核心功能
- **2D 结构编辑器** — 直观的画布界面绘制分子
- **3D 分子查看器** — 支持旋转、缩放和导出的 3D 结构可视化
- **反应机制** — 逐步反应途径可视化
- **性质预测** — 分子量、LogP、ESOL、SA 评分、Lipinski 法则
- **立体异构体枚举** — 手性中心检测和全立体异构体生成
- **数据库搜索** — 相似性搜索和最大公共子结构（MCS）检测
- **批处理** — 批量处理多个分子

### 高级功能
- **WASM 后端** — 使用 chematic 0.1.40 库实现快速化学计算
- **3D 坐标生成** — 距离几何学 + UFF 力场最小化
- **分子指纹** — ECFP4 生成和 Tanimoto/Dice 相似度计算
- **文件导出** — SVG、PNG、JSON、XYZ、CSV 格式
- **键盘快捷键** — ChemDraw 兼容操作
- **深色模式** — 浅色/深色主题支持

---

## 安装

### macOS
```bash
# 下载 DMG 文件
open chematic-draw-x.x.x.dmg
# 或使用 Homebrew
brew install chematic-draw
```

### Windows
```bash
# 从发布页面下载
chematic-draw-x.x.x.exe
# 运行安装程序
```

### Linux
```bash
# AppImage
./chematic-draw-x.x.x.AppImage

# 或 snap
sudo snap install chematic-draw
```

---

## 快速开始

1. **启动应用** — 点击图标打开
2. **绘制分子** — 点击画布放置原子，拖动创建化学键
3. **从 SMILES 加载** — 文件 → 从 SMILES 新建 → 粘贴结构
4. **查看 3D** — 点击「3D」标签 → 「3D 生成」按钮
5. **导出** — 文件 → 选择格式导出

详见[快速开始指南](./docs/QUICK_START.md)。

---

## 技术栈

| 组件 | 技术 | 版本 |
|------|------|------|
| **桌面** | Electron | 33.x |
| **UI** | React + TypeScript | 18.x |
| **状态管理** | Zustand | 4.x |
| **Canvas** | Canvas 2D API | 原生 |
| **化学引擎** | chematic (Rust) | 0.1.40 |
| **WASM** | wasm-bindgen | 最新 |
| **构建** | Vite + wasm-pack | 最新 |
| **测试** | Jest + Playwright | 最新 |

---

## 系统要求

### 最低要求
- **OS**: macOS 11+、Windows 10+、Ubuntu 20.04+
- **RAM**: 4 GB
- **磁盘**: 500 MB

### 开发环境
- **Node.js**: 18+
- **Rust**: 1.70+
- **Git**: 2.30+

---

## 从源码构建

### 开发模式
```bash
# 克隆仓库
git clone https://github.com/yourusername/chematic-draw.git
cd chematic-draw

# 安装依赖
npm install
rustup target add wasm32-unknown-unknown
cargo install wasm-pack

# 运行并启用热重载
npm start
```

### 生产构建
```bash
# 构建用于发布
npm run make

# 输出到: out/make/
# - *.AppImage (Linux)
# - *.dmg (macOS)
# - *.exe (Windows)
```

详见[构建指南](./docs/BUILD.md)。

---

## 使用示例

### 绘制并导出分子
```
1. 文件 → 从 SMILES 新建
2. 粘贴: CC(=O)Oc1ccccc1C(=O)O (阿司匹林)
3. 文件 → 选择格式导出 → SVG
```

### 生成并可视化 3D 结构
```
1. 加载分子
2. 点击「3D」标签
3. 点击「3D 生成」按钮
4. 拖动旋转，滚动缩放
5. 点击「XYZ 导出」保存
```

### 检查药物相似性
```
1. 加载分子
2. 点击「Props」标签
3. 检查 Lipinski 违规和 SA 评分
```

### 比较分子
```
1. 加载分子 A
2. 点击「DB」标签
3. 点击「搜索数据库」
4. 点击相似分子 B
5. 两个结构中的 MCS 高亮显示
```

---

## 文档

| 指南 | 目的 | 阅读时间 |
|-----|------|--------|
| [快速开始](./docs/QUICK_START.md) | 5 分钟快速上手 | 5 分钟 |
| [用户教程](./docs/TUTORIAL.md) | 功能详细说明 | 20 分钟 |
| [API 参考](./docs/API.md) | WASM 函数规范 | 30 分钟 |
| [构建指南](./docs/BUILD.md) | 开发环境搭建 | 15 分钟 |
| [架构](./docs/ARCHITECTURE.md) | 系统设计 | 25 分钟 |
| [CI/CD](./docs/CI_CD.md) | 测试和发布运维 | 20 分钟 |
| [故障排除](./docs/TROUBLESHOOTING.md) | 问题解决 | 按需 |

---

## 键盘快捷键

| 按键 | 操作 |
|------|------|
| `Ctrl+N` / `Cmd+N` | 新建分子 |
| `Ctrl+O` / `Cmd+O` | 打开文件 |
| `Ctrl+S` / `Cmd+S` | 保存文件 |
| `Ctrl+Z` / `Cmd+Z` | 撤销 |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | 重做 |
| `Ctrl+V` / `Cmd+V` | 粘贴 SMILES |
| `D` | 绘图模式 |
| `S` | 选择模式 |
| `B` | 化学键工具 |
| `Delete` | 删除选中项 |
| `?` | 帮助 |

---

## 性能

### 基准测试

| 操作 | 时间 | 状态 |
|-----|------|------|
| SMILES 解析 | 5ms | ✅ 快速 |
| 指纹生成 | 30ms | ✅ 快速 |
| 3D 生成（50 原子） | 300ms | ✅ 快速 |
| 3D 生成（200 原子） | 1.2s | ✅ 良好 |
| Canvas 渲染 | 14ms | ✅ 60 FPS |
| 内存使用 | <50MB | ✅ 高效 |

详见[性能基准测试](./docs/CI_CD.md#performance-optimization)。

---

## 测试

### 运行测试
```bash
# 单元测试
npm test

# E2E 测试
npm run test:e2e

# 性能基准测试
npm run test:perf

# 覆盖率报告
npm test -- --coverage
```

### 持续集成
所有 push 和 PR 自动运行：
- TypeScript 类型检查
- 单元测试 + 覆盖率
- E2E 浏览器测试
- 性能回归测试

详见 [CI/CD 指南](./docs/CI_CD.md)。

---

## 贡献

欢迎贡献！查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解：
- 开发环境设置
- 代码风格指南
- 测试要求
- 拉取请求流程
- 提交消息格式

### 快速贡献
```bash
# Fork 并克隆
git clone https://github.com/YOUR_USERNAME/chematic-draw.git

# 创建功能分支
git checkout -b feature/my-feature

# 进行更改并测试
npm test

# push 并创建 PR
git push origin feature/my-feature
```

---

## 路线图

### v0.2.x（当前）
- ✅ 3D 分子查看器
- ✅ 性质预测
- ✅ 反应机制可视化
- ✅ 立体异构体枚举
- ✅ 数据库搜索
- ✅ 性能优化
- ✅ 完整文档

### v0.3.x（计划中）
- [ ] Web 版本（浏览器版）
- [ ] 实时协作编辑
- [ ] 云存储集成
- [ ] 高级 NMR 预测

### v0.4.x（未来）
- [ ] WebGL 渲染
- [ ] VR/AR 支持
- [ ] 机器学习集成

详见[路线图](./ROADMAP.md)。

---

## 许可证

chematic-draw 采用双重许可：
- **MIT 许可证** — 用于开源项目
- **Apache 2.0 许可证** — 用于商业用途

查看 [LICENSE.MIT](./LICENSE.MIT) 和 [LICENSE.APACHE](./LICENSE.APACHE)。

---

## 支持

### 文档
- 📖 [完整文档](./docs/)
- 🚀 [快速开始](./docs/QUICK_START.md)
- 🆘 [故障排除](./docs/TROUBLESHOOTING.md)

### 社区
- 💬 [GitHub Discussions](https://github.com/yourusername/chematic-draw/discussions)
- 🐛 [GitHub Issues](https://github.com/yourusername/chematic-draw/issues)
- 📧 邮件: support@example.com

---

## 版本信息

| 组件 | 状态 | 备注 |
|------|------|------|
| **开发** | ✅ 活跃 | 定期更新 |
| **测试** | ✅ 全面 | Jest + Playwright |
| **CI/CD** | ✅ 自动化 | GitHub Actions |
| **文档** | ✅ 完整 | 7 份指南 |
| **生产就绪** | ✅ 是 | v0.2.0+ 稳定版 |

---

**享受化学！🧪**

❤️ 为化学社区而生。

---

[English](./README.md) | [日本語](./README.ja.md) | 中文 | [Español](./README.es.md)
