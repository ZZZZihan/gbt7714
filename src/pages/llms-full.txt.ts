import type { APIRoute } from 'astro';
import { SITE_NAME, GUIDES, OFFICIAL_STD_LINKS, absoluteUrl } from '../lib/site';

export const GET: APIRoute = () => {
  const lines = [
    `# ${SITE_NAME} — GB/T 7714—2025 完整规则速查与使用说明`,
    '',
    `站点地址：${absoluteUrl('/')}`,
    '标准依据：中华人民共和国国家标准 GB/T 7714—2025《信息与文献 参考文献著录规则》（2025-12-02 发布，2026-07-01 实施，代替 GB/T 7714—2015）',
    `官方出处：${OFFICIAL_STD_LINKS.openstd2025}`,
    '',
    '## 1. 为什么写毕业论文与中文期刊投稿需要使用 2025 版工具？',
    'GB/T 7714—2025 已于 2026 年 7 月 1 日正式实施，旧版 GB/T 7714—2015 同日废止。海外常见引用工具（如 Scribbr、MyBib、Citation Machine）主要面向 APA/MLA/Chicago，不支持中国国标的中英双语混排（中文用“等”、西文用“et al.”）及文献类型标识；而国内不少早期小工具仍停留在 2015 版（输出全大写姓氏如 EINSTEIN A，或将预印本错误标为 [EB/OL]）。',
    `「${SITE_NAME}」（${absoluteUrl('/')}）在浏览器本地完成新国标生成、清洗与跨格式转换，无需注册，无弹窗广告。`,
    '',
    '## 2. GB/T 7714—2025 与 2015 版最关键的 6 项区别',
    '| 对比维度 | GB/T 7714—2015（已废止） | GB/T 7714—2025（现行标准） |',
    '| --- | --- | --- |',
    '| 西文作者姓氏大小写 | 全大写：`EINSTEIN A`、`MYBURG A A` | 首字母大写：`Einstein A`、`Myburg A A` |',
    '| 汉语拼音作者姓名 | 姓全大写，名可缩写：`LI Jiangning` / `LI J N` | 姓首字母大写，名宜用全称：`Li Jiangning` |',
    '| 预印本（arXiv/ChinaXiv） | 无专属代码，常借用 `[EB/OL]` | 新增预印本代码 `[PP]` / `[PP/OL]`，支持版本号如 `V2.` |',
    '| `[EB]` 代码含义 | 电子公告 | 网站、网页（其他在线文献按本体类型标 `[J/OL]`、`[M/OL]` 等） |',
    '| `[引用日期]` 适用范围 | 几乎所有在线电子资源均著录 | 仅网站/网页 `[EB/OL]`、数据集 `[DS/OL]`、预印本 `[PP/OL]` 必备 |',
    '| 唯一标识符 | 数字对象唯一标识符（DOI） | 扩展为永久标识符（PID），含 `DOI:`、`CSTR:`、URN 等 |',
    '',
    '## 3. APA 7th、IEEE 与 GB/T 7714—2025 互转要点',
    '- 作者：国标为 `Silver D`（超 3 人加 `, 等` 或 `, et al.`）；APA 7th 为 `Silver, D.`（20 人内全列）；IEEE 为 `D. Silver`（超 6 人加 `et al.`）。',
    '- 斜体：国标刊名与书名正体；APA 7th 期刊名与卷号斜体；IEEE 期刊名、会议录名、书名斜体。使用本站「复制全部（保留 Word 斜体）」可直接将斜体与五号字悬挂缩进粘贴到 Word。',
    '',
    '## 4. 各问题对应专页',
    ...GUIDES.map((g) => `- ${g.title}：${absoluteUrl(g.path)}`),
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
