# Stellaris Writing

一个星座主题的 Obsidian 写作插件。把每片星座、每个星点变成可打卡的写作席位，写下的内容会自动同步为 Obsidian 笔记，人物与世界观白板可以导出为 Canvas。

![version](https://img.shields.io/badge/version-0.1.6-blue)

## 主要功能

- **星座打卡**：12 星座、每个星座 4–7 个星点，作为独立的写作条目
- **写作编辑器**：分页编辑、字数统计、段落缩进模式（中文/英文/不缩进）
- **星标锚点**：在正文中选中内容并添加 `#锚点` 标签，便于后续回顾
- **笔记同步**：每次保存自动把内容写成 Markdown 到 `Stellaris Writing/Notes/`
- **白板画布**：创建人物/地点/设定节点，手绘连线，导出手绘草图与 PDF
- **Canvas 导出**：白板一键导出为 Obsidian Canvas 文件到 `Stellaris Writing/Whiteboards/`
- **备份迁移**：支持导出/导入插件数据 JSON，跨设备迁移
- **字体设置**：可导入并启用自定义中文字体与英文字体
- **日夜主题**：自动/日间/夜间三种模式

## 安装

### 从 Obsidian 社区插件市场安装（推荐）

等待上架。

### 手动安装（打开即用）

1. 到 [Releases](https://github.com/uan-iel/stellaris-writing-obsidian/releases/latest) 下载 `stellaris-writing-0.1.6.zip`
2. 解压后把文件夹放到你的 Obsidian 仓库：
   ```text
   <你的仓库>/.obsidian/plugins/stellaris-writing/
   ```
   最终结构应为：
   ```text
   stellaris-writing/
   ├── main.js
   ├── styles.css
   ├── manifest.json
   └── assets/
   ```
3. 在 Obsidian 中打开 **设置 → 社区插件 → 已安装插件**
4. 找到 **Stellaris Writing** 并启用

> **注意**：不要直接从源码仓库的 `src/` 目录复制文件到插件目录，必须先运行 `npm run build` 生成 `dist/`，或使用 Release 里已经构建好的压缩包。早期版本因 `manifest.json` 缺少 `main` 字段会导致加载失败，已在 0.1.6 修复。

## 使用

1. 点击左侧丝带图标（sparkles）或运行命令 **Open Stellaris Writing**
2. 在星图中选择星座和星点
3. 点击 **开始写作** 进入编辑器
4. 写完后点击 **保存 Markdown**，内容会写入 `Stellaris Writing/Notes/<标题> - <ID>.md`
5. 关闭插件窗口时可以选择填写一句「停泊记录」，记录本次写作收尾

## 从源码构建

```sh
npm install
npm run build
```

构建产物位于 `dist/`，包含：

```text
dist/
├── main.js
├── styles.css
├── manifest.json
└── assets/
    └── *.png
```

把这些文件复制到 Obsidian 插件目录：

```text
<你的仓库>/.obsidian/plugins/stellaris-writing/
```

## 开发

```sh
npm run dev    # 监听构建，生成 dist/
npm run build  # 生产构建
npm run lint   # 代码检查
```

修改 `src/App.css` 或 `src/App.tsx` 后，重新构建并复制 `dist/` 到 Obsidian 插件目录，然后在 Obsidian 中重载插件（命令面板 → Reload app without saving）。

## 目录结构

```text
src/
├── App.tsx          # React 主应用
├── App.css          # 全局样式
├── obsidian-main.tsx # Obsidian 插件入口
├── main.tsx         # 浏览器预览入口
└── assets/          # 背景图与图标
```

## 数据存储

- 插件数据（写作内容、白板、设置）保存在 Obsidian 插件数据区
- 同时会同步生成：
  - `Stellaris Writing/Notes/*.md`
  - `Stellaris Writing/Whiteboards/*.canvas`
- 字体文件使用 IndexedDB 本地存储

## 发布

推送版本标签会自动触发 GitHub Actions 构建安装包：

```sh
git tag v0.1.6
git push origin v0.1.6
```

## 版本记录

### 0.1.6

- 修复写作区鼠标悬停/聚焦时背景变白、文字不清的问题
- 统一右下角语言切换按钮背景与面板风格

### 0.1.5

- 新增白板工作区与迁移控制
- 支持导入字体管理

## License

MIT
