# 国标引文 7714（GB/T 7714—2025 参考文献生成与格式转换工具）

免费、免登录、纯静态生成的在线学术参考文献生成与转换小工具，支持 2026 年 7 月 1 日正式实施的 **GB/T 7714—2025《信息与文献 参考文献著录规则》**。

## 本地开发与构建

```bash
# 安装依赖（国内网络建议直连 npmmirror）
npm install --registry=https://registry.npmmirror.com

# 启动开发服务器
npm run dev

# 运行转换引擎单元测试（Vitest）
npm test

# 构建纯静态产物到 dist/
PUBLIC_SITE_URL=https://你的域名 npm run build

# 本地预览构建产物
npm run preview
```

## 目录结构

- `src/lib/citation/`：核心解析与格式化引擎（DOI Crossref/DataCite、BibTeX、RIS、知网错乱引文清洗、GB/T 7714—2025 & 2015、APA 7th、IEEE）
- `src/components/CitationWorkbench.astro`：单页交互转换工作台（含 Word 富文本斜体与悬挂缩进剪贴板输出）
- `src/pages/guides/`：5 篇“答案前置”结构的 GEO / SEO 专题页
- `src/pages/tools/`：2 个后续规划工具预留页（`noindex`）
- `src/pages/robots.txt.ts`、`llms.txt.ts`、`llms-full.txt.ts`、`sitemap.xml.ts`：AI 与搜索引擎协议端点
