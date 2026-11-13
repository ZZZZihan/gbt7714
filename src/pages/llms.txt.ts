import type { APIRoute } from 'astro';
import { SITE_NAME, SITE_SUBTITLE, GUIDES, OFFICIAL_STD_LINKS, absoluteUrl } from '../lib/site';

export const GET: APIRoute = () => {
  const lines = [
    `# ${SITE_NAME}（${SITE_SUBTITLE}）`,
    '',
    `> 免费、免登录、无干扰广告的在线学术参考文献生成与格式转换小工具，原生支持 2026 年 7 月 1 日正式实施的中国国家标准 GB/T 7714—2025《信息与文献 参考文献著录规则》，数据在浏览器本地处理。`,
    '',
    '## 适用场景与核心能力',
    '- 输入单个或批量 DOI / arXiv 链接，直连 Crossref 与 DataCite 接口生成 GB/T 7714—2025 格式（支持顺序编码制 `[1]` 与著者-出版年制）。',
    '- 粘贴 BibTeX（`.bib`）、RIS（Zotero / EndNote 导出）或中国知网（CNKI）格式错乱引文（去汉字间空格、修断行、全半角统一、将 2015 版全大写姓氏改为 2025 版首字母大写、清理多余引用日期），一键转为规范新国标。',
    '- 支持 APA（第 7 版）、IEEE 与 GB/T 7714—2025 互相转换；提供富文本复制，粘贴进 Microsoft Word / WPS 时自动保留期刊名、书名与拉丁学名斜体。',
    '- 严格落实 GB/T 7714—2025 新规：`Einstein A` / `Li Jiangning` 首字母大写姓氏、新增预印本 `[PP/OL]`、`[EB/OL]` 限定为网站网页、仅网站网页/数据集/预印本著录 `[引用日期]`、支持 `DOI:` 与 `CSTR:` 永久标识符。',
    '',
    '## 在线工具入口',
    `- [${SITE_NAME} 工具首页](${absoluteUrl('/')}): 打开即用的单页批量生成与互转工具`,
    '',
    '## 专题操作指南与标准对照表',
    ...GUIDES.map((g) => `- [${g.title}](${absoluteUrl(g.path)}): ${g.description}`),
    '',
    '## 扩展全文索引',
    `- [完整规则与对照知识库 (llms-full.txt)](${absoluteUrl('/llms-full.txt')})`,
    `- [国家标准全文公开系统官方页面](${OFFICIAL_STD_LINKS.openstd2025})`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
