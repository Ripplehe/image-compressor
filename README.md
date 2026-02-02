# 图片压缩工具 🖼️

一个快速、高效、免费的在线图片压缩工具，支持批量处理、实时预估、ZIP打包下载，完美适配桌面端和移动端。

![License](https://img.shields.io/badge/license-MIT-green)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## 🌐 在线体验

**立即访问：[https://image-ashy-nine.vercel.app/](https://image-ashy-nine.vercel.app/)**

无需安装，打开即用！支持手机、平板、电脑等所有设备。

## ✨ 功能特性

### 🎯 核心功能
- **多格式支持**：支持 JPG、PNG、WebP、GIF、AVIF 等常见图片格式
- **批量处理**：一次上传多张图片，批量压缩更高效
- **智能压缩**：基于 Sharp 库的高质量图片压缩引擎
- **实时预估**：上传即显示原始大小和压缩后的预估大小
- **ZIP 打包**：多张图片压缩完成后，一键打包下载 ZIP 文件

### ⚙️ 压缩设置
- **质量预设**：高质量（90%）、中等（70%）、低质量（50%）
- **自定义质量**：10%-100% 自由调节，满足不同需求
- **格式转换**：支持保持原格式或转换为 JPEG/PNG/WebP

### 📊 可视化体验
- **大小对比**：清晰展示压缩前后的文件大小变化
- **压缩率显示**：直观的进度条和百分比展示
- **网格预览**：缩略图网格布局，一目了然
- **实时统计**：显示已压缩数量、节省空间、平均压缩率

### 📱 响应式设计
- **单页应用**：所有功能集成在一个页面，无需滚动操作
- **移动端适配**：完美支持手机、平板等移动设备
- **触摸友好**：针对触摸屏优化的交互体验
- **拖放上传**：支持拖拽文件上传，操作更便捷

## 🚀 快速开始

### 环境要求
- Node.js 18.0 或更高版本
- npm 或 yarn 包管理器

### 安装依赖

```bash
npm install
# 或
yarn install
```

### 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可使用。

### 构建生产版本

```bash
npm run build
npm start
```

## 🛠️ 技术栈

- **框架**：[Next.js 16](https://nextjs.org/) - React 全栈框架
- **语言**：[TypeScript](https://www.typescriptlang.org/) - 类型安全的 JavaScript
- **样式**：[Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
- **图片处理**：[Sharp](https://sharp.pixelplumbing.com/) - 高性能 Node.js 图片处理库
- **文件上传**：[react-dropzone](https://react-dropzone.js.org/) - 拖放文件上传组件
- **ZIP 打包**：[JSZip](https://stuk.github.io/jszip/) + [FileSaver.js](https://github.com/eligrey/FileSaver.js/)

## 📁 项目结构

```
image-compressor/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── compress/
│   │   │       └── route.ts          # 图片压缩 API
│   │   ├── globals.css               # 全局样式
│   │   ├── layout.tsx                # 应用布局
│   │   └── page.tsx                  # 主页面
│   └── components/
│       └── ImageCompressor.tsx       # 图片压缩组件
├── public/                           # 静态资源
├── package.json                      # 项目依赖
└── README.md                         # 项目文档
```

## 💡 使用说明

1. **上传图片**
   - 点击上传区域选择文件，或直接拖拽图片到上传区域
   - 支持一次上传多张图片

2. **选择压缩质量**
   - 选择预设质量（高/中/低）或使用滑块自定义
   - 查看预估压缩后的文件大小

3. **开始压缩**
   - 点击"开始压缩"按钮
   - 等待压缩完成，查看压缩结果

4. **下载图片**
   - 单张图片：点击图片卡片上的"下载"按钮
   - 批量下载：点击"ZIP"按钮，打包下载所有压缩图片

## 🎨 界面预览

- **清新绿色主题**：现代简约的视觉设计
- **左右分栏布局**：左侧设置区，右侧预览区
- **卡片式展示**：每张图片独立卡片，信息清晰
- **动画反馈**：流畅的过渡动画和加载状态

## 🚢 部署

### Vercel 部署（推荐）

本项目已部署在 Vercel 上，你也可以一键部署自己的版本：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Ripplehe/image-compressor)

### 手动部署步骤

1. Fork 本仓库到你的 GitHub 账号
2. 在 [Vercel](https://vercel.com) 上导入你的仓库
3. Vercel 会自动检测 Next.js 项目并完成部署
4. 部署完成后即可访问你的在线图片压缩工具

### 其他平台部署

本项目是标准的 Next.js 应用，也支持部署到：
- Netlify
- Cloudflare Pages
- Railway
- 或任何支持 Node.js 的服务器

## 📄 开源协议

本项目采用 [MIT](LICENSE) 协议开源。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

如有问题或建议，欢迎通过 GitHub Issues 联系我们。

---

⭐ 如果这个项目对你有帮助，欢迎给个 Star！
