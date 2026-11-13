export const SITE_NAME = '国标引文 7714';
export const SITE_SUBTITLE = 'GB/T 7714—2025 参考文献生成与格式转换工具';
export const LAST_VERIFIED_DATE = '2026-11-12';

export const OFFICIAL_STD_LINKS = {
  openstd2025: 'https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=C6CE52E55AC09B9C79A20AEA77CEDD14',
  samrPlan2025: 'https://std.samr.gov.cn/gb/search/gbDetailed?id=14CA9D282EB75AC8E06397BE0A0AEA2E',
  samr2015Abolished: 'https://std.samr.gov.cn/gb/search/gbDetailed?id=71F772D8055ED3A7E05397BE0A0AB82A',
  crossrefApi: 'https://api.crossref.org',
  zoteroChineseStyles: 'https://github.com/zotero-chinese/styles',
};

export function getSiteUrl(): string {
  const raw = import.meta.env.PUBLIC_SITE_URL || import.meta.env.SITE || 'https://softcloudnote.top';
  return raw.replace(/\/+$/, '');
}

export function absoluteUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl()}${cleanPath}`;
}

export interface GuideMeta {
  slug: string;
  path: string;
  title: string;
  shortTitle: string;
  description: string;
  updatedAt: string;
}

export const GUIDES: GuideMeta[] = [
  {
    slug: 'doi-to-gbt7714-2025',
    path: '/guides/doi-to-gbt7714-2025/',
    title: 'DOI 怎么转成 GB/T 7714—2025 参考文献格式',
    shortTitle: 'DOI 转 2025 国标',
    description:
      '输入论文、arXiv 预印本或科学数据集的 DOI，通过 Crossref 与 DataCite 接口一键生成符合 2026 年 7 月实施的 GB/T 7714—2025 参考文献格式，附字段映射表与示例。',
    updatedAt: LAST_VERIFIED_DATE,
  },
  {
    slug: 'bibtex-zotero-cnki-to-gbt7714',
    path: '/guides/bibtex-zotero-cnki-to-gbt7714/',
    title: 'BibTeX、Zotero、知网导出的文献怎么转成国标 GB/T 7714—2025',
    shortTitle: 'BibTeX / Zotero / 知网转国标',
    description:
      '详解将 Google Scholar 的 BibTeX、Zotero 导出的 RIS/BibTeX 以及中国知网（CNKI）导出的引文批量转换为 GB/T 7714—2025 新国标格式的方法与对照表。',
    updatedAt: LAST_VERIFIED_DATE,
  },
  {
    slug: 'fix-cnki-messy-references',
    path: '/guides/fix-cnki-messy-references/',
    title: '知网导出的参考文献格式乱了怎么办（空格、断行、2015 旧版一键修复）',
    shortTitle: '知网导出格式乱了怎么办',
    description:
      '针对知网和 PDF 复制参考文献常见的汉字间乱空格、断行错位、全半角标点混排、旧版姓氏全大写及多余引用日期等 6 类问题，提供直接修复规则与在线批量清洗方法。',
    updatedAt: LAST_VERIFIED_DATE,
  },
  {
    slug: 'gbt7714-2025-vs-2015',
    path: '/guides/gbt7714-2025-vs-2015/',
    title: 'GB/T 7714—2025 和 2015 版有什么区别（新旧国标逐项对照表）',
    shortTitle: '2025 与 2015 版区别对照表',
    description:
      '基于国家标准公开信息整理 GB/T 7714—2025（2026-07-01 实施）与 2015 版的核心差异对照表：西文与拼音姓氏改为首字母大写、新增预印本 [PP]、[EB] 改为网站网页、引用日期收窄与 PID 永久标识符。',
    updatedAt: LAST_VERIFIED_DATE,
  },
  {
    slug: 'apa-ieee-gbt7714-converter',
    path: '/guides/apa-ieee-gbt7714-converter/',
    title: 'APA、IEEE 和国标 GB/T 7714—2025 怎么互相转换（保留 Word 斜体）',
    shortTitle: 'APA / IEEE 与国标互转',
    description:
      '中英文投稿改投常见需求：将 APA 第 7 版、IEEE 与 GB/T 7714—2025 参考文献互相批量转换，对比三种格式在作者、年份、题名与斜体上的差异，粘贴进 Word 自动保留刊名斜体。',
    updatedAt: LAST_VERIFIED_DATE,
  },
];

export const UPCOMING_TOOLS = [
  {
    path: '/tools/citation-check/',
    title: '正文引用与参考文献对照检查',
    shortTitle: '正文引用检查 [1]',
    badge: '即将上线',
    summary: '自动核对论文正文中 [1]、[2-5] 等顺序编码标引与文末参考文献表是否漏引、多列或序号错位。',
  },
  {
    path: '/tools/thesis-word-count/',
    title: '按高校口径统计学位论文字数',
    shortTitle: '学位论文字数统计',
    badge: '即将上线',
    summary: '分别统计中英文摘要、目录、正文各章、图表注、参考文献与致谢字数，对齐高校教务与研究生院规范口径。',
  },
];

export const SAMPLE_PRESETS: Record<string, { label: string; input: string; targetStyle?: string }> = {
  default: {
    label: '新国标混合示例',
    input: `[1] MYBURG A A, GRATTAPAGLIA D, TUSKAN G A, et al. The genome of Eucalyptus grandis[J/OL]. Nature, 2014, 510: 356-362. DOI: 10.1038/nature13308.
[2] 张 群 , 程 志 宝 , 石 志 飞 , 等 . 惯 性 增 强 动 力 吸 振 器 减 振 性 能 研 究 ［J/OL］. 铁 道 学 报 , 2024 , 46 (05) : 12 - 20 [2025-03-10].
@misc{vaswani2017attention,
  author = {Vaswani, Ashish and Shazeer, Noam and Parmar, Niki and Uszkoreit, Jakob},
  title = {Attention is all you need},
  archivePrefix = {arXiv},
  eprint = {1706.03762},
  version = {V5},
  date = {2017-06-12},
  urldate = {2026-09-01}
}`,
  },
  doi: {
    label: '批量 DOI / arXiv',
    input: `10.1038/nature13308
10.1109/CVPR.2016.90
https://arxiv.org/abs/1706.03762v5`,
  },
  cnki: {
    label: '知网格式错乱修复',
    input: `[1] 张 群 , 程 志 宝 , 石 志 飞 , 等 . 惯 性 增 强 动 力 吸 振 器 － 浮 置 板 轨 道 低 频 减 振 性 能 研
究 ［J/OL］. 铁 道 学 报 , 2024 , 46 (05) : 12 - 20 [2025-04-12]. DOI: 10.3969/j.issn.1001-8360.2024.05.002.
[2] 王 利 平 , 刘 洪 . 现 代 治 理 体 系 演 进 研 究 ［J］. 中 国 社 会 科 学 , 2023 (5) : 45 — 62 .
[3] LI Jiangning, WANG Xinya. Urban rail transit noise control[J]. Journal of Sound and Vibration, 2022, 520: 116632.`,
  },
  bibtex: {
    label: 'BibTeX 批量转换',
    input: `@article{myburg2014genome,
  author = {Myburg, Alexander A. and Grattapaglia, Dario and Tuskan, Gerald A. and Schmutz, Jeremy},
  title = {The genome of \\textit{Eucalyptus grandis}},
  journal = {Nature},
  year = {2014},
  volume = {510},
  pages = {356--362},
  url = {https://www.nature.com/articles/nature13308.pdf},
  doi = {10.1038/nature13308}
}

@phdthesis{wang2022soil,
  author = {王琦},
  title = {融合星载 GNSS-R 和 SAR 数据的高时空分辨率土壤湿度反演方法研究},
  school = {武汉大学},
  address = {武汉},
  year = {2022},
  pages = {87}
}`,
  },
  ris: {
    label: 'Zotero / RIS 导出',
    input: `TY  - JOUR
AU  - Silver, David
AU  - Huang, Aja
AU  - Maddison, Chris J.
AU  - Hassabis, Demis
TI  - Mastering the game of Go with deep neural networks and tree search
JO  - Nature
PY  - 2016
VL  - 529
IS  - 7587
SP  - 484
EP  - 489
DO  - 10.1038/nature16961
ER  -`,
  },
  apa: {
    label: 'APA / IEEE 互转',
    input: `Silver, D., Huang, A., Maddison, C. J., & Hassabis, D. (2016). Mastering the game of Go with deep neural networks and tree search. Nature, 529(7587), 484–489. https://doi.org/10.1038/nature16961
[2] K. He, X. Zhang, S. Ren, and J. Sun, "Deep residual learning for image recognition," in Proc. IEEE Conf. Comput. Vis. Pattern Recognit. (CVPR), 2016, pp. 770-778, doi: 10.1109/CVPR.2016.90.`,
  },
};
