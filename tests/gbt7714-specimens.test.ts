import { describe, it, expect } from 'vitest';
import {
  parseLocalCitations,
  formatCitation,
  formatCitationList,
  type CitationItem,
} from '../src/lib/citation';

describe('GB/T 7714—2025 All Document Types Specification (附录 B 示例全面覆盖)', () => {
  it('formats [M] Book / 专著 with edition, place, publisher, year, pages', () => {
    const item: CitationItem = {
      id: 'book-1',
      type: 'book',
      authors: [{ family: '余敏', isChinese: true }],
      title: '出版集团研究',
      edition: '第2版',
      place: '北京',
      publisher: '中国书籍出版社',
      year: '2001',
      pages: '179-193',
    };
    const out = formatCitation(item, { style: 'gbt7714-2025-numeric', index: 1 });
    expect(out.text).toBe('[1] 余敏. 出版集团研究[M]. 2版. 北京: 中国书籍出版社, 2001: 179-193.');
  });

  it('formats [M] Book with Western authors and English edition (3rd ed.)', () => {
    const item: CitationItem = {
      id: 'book-en',
      type: 'book',
      authors: [
        { family: 'Patterson', given: 'David A' },
        { family: 'Hennessy', given: 'John L' },
      ],
      title: 'Computer Organization and Design',
      edition: '3',
      place: 'San Francisco',
      publisher: 'Morgan Kaufmann',
      year: '2005',
    };
    const out = formatCitation(item, { style: 'gbt7714-2025-numeric', index: 2 });
    expect(out.text).toBe(
      '[2] Patterson D A, Hennessy J L. Computer Organization and Design[M]. 3rd ed. San Francisco: Morgan Kaufmann, 2005.'
    );
  });

  it('formats [M] Translated Book with translator (含译者)', () => {
    const item: CitationItem = {
      id: 'book-trans',
      type: 'book',
      authors: [{ family: '霍夫斯塔特', given: '道格拉斯', isChinese: true }],
      translators: [
        { family: '郭维德', isChinese: true },
        { family: '樊棣', isChinese: true },
      ],
      title: '哥德尔、艾舍尔、巴赫：集异璧之大成',
      place: '北京',
      publisher: '商务印书馆',
      year: '1996',
    };
    const out = formatCitation(item, { style: 'gbt7714-2025-numeric', index: 3 });
    expect(out.text).toBe(
      '[3] 霍夫斯塔特. 哥德尔、艾舍尔、巴赫：集异璧之大成[M]. 郭维德, 樊棣, 译. 北京: 商务印书馆, 1996.'
    );
  });

  it('formats [M//] Book Chapter / 析出文献 with editor and pages', () => {
    const item: CitationItem = {
      id: 'chapter-1',
      type: 'chapter',
      authors: [{ family: '白书农', isChinese: true }],
      title: '植物开花研究',
      editors: [{ family: '李承森', isChinese: true }],
      containerTitle: '植物科学进展',
      place: '北京',
      publisher: '高等教育出版社',
      year: '1998',
      pages: '146-163',
    };
    const out = formatCitation(item, { style: 'gbt7714-2025-numeric', index: 4 });
    expect(out.text).toBe(
      '[4] 白书农. 植物开花研究[M]//李承森. 植物科学进展. 北京: 高等教育出版社, 1998: 146-163.'
    );
  });

  it('formats [C] Conference proceedings / 论文集析出文献', () => {
    const item: CitationItem = {
      id: 'conf-1',
      type: 'paper-conference',
      authors: [{ family: '钟文发', isChinese: true }],
      title: '非线性规划在可燃毒物配置中的应用',
      editors: [{ family: '赵玮', isChinese: true }],
      containerTitle: '运筹学的理论与应用：中国运筹学会第五届大会论文集',
      place: '西安',
      publisher: '西安电子科技大学出版社',
      year: '1996',
      pages: '468-471',
    };
    const out = formatCitation(item, { style: 'gbt7714-2025-numeric', index: 5 });
    expect(out.text).toBe(
      '[5] 钟文发. 非线性规划在可燃毒物配置中的应用[C]//赵玮. 运筹学的理论与应用：中国运筹学会第五届大会论文集. 西安: 西安电子科技大学出版社, 1996: 468-471.'
    );
  });

  it('formats [D] Thesis / 学位论文', () => {
    const item: CitationItem = {
      id: 'thesis-1',
      type: 'thesis',
      authors: [{ family: '张志祥', isChinese: true }],
      title: '间歇式间歇加热系统热特性研究',
      place: '北京',
      publisher: '清华大学',
      year: '2020',
      pages: '45-50',
    };
    const out = formatCitation(item, { style: 'gbt7714-2025-numeric', index: 6 });
    expect(out.text).toBe('[6] 张志祥. 间歇式间歇加热系统热特性研究[D]. 北京: 清华大学, 2020: 45-50.');
  });

  it('formats [R] Technical Report / 科技报告', () => {
    const item: CitationItem = {
      id: 'report-1',
      type: 'report',
      authors: [{ family: 'World Health Organization' }],
      title: 'Global Tuberculosis Report 2023',
      place: 'Geneva',
      publisher: 'World Health Organization',
      year: '2023',
    };
    const out = formatCitation(item, { style: 'gbt7714-2025-numeric', index: 7 });
    expect(out.text).toBe(
      '[7] World Health Organization. Global Tuberculosis Report 2023[R]. Geneva: World Health Organization, 2023.'
    );
  });

  it('formats [S] Standard / 标准文献', () => {
    const item: CitationItem = {
      id: 'standard-1',
      type: 'standard',
      authors: [{ literal: '全国信息与文献标准化技术委员会' }],
      number: 'GB/T 7714—2025',
      title: '信息与文献 参考文献著录规则',
      place: '北京',
      publisher: '中国标准出版社',
      year: '2025',
    };
    const out = formatCitation(item, { style: 'gbt7714-2025-numeric', index: 8 });
    expect(out.text).toBe(
      '[8] 全国信息与文献标准化技术委员会. GB/T 7714—2025 信息与文献 参考文献著录规则[S]. 北京: 中国标准出版社, 2025.'
    );
  });

  it('formats [P] Patent / 专利文献 with patent number and announcement date', () => {
    const item: CitationItem = {
      id: 'patent-1',
      type: 'patent',
      authors: [{ family: '姜锡洲', isChinese: true }],
      title: '一种温热外敷药制备方案',
      number: '中国, 881056073',
      date: '1989-07-26',
    };
    const out = formatCitation(item, { style: 'gbt7714-2025-numeric', index: 9 });
    expect(out.text).toBe('[9] 姜锡洲. 一种温热外敷药制备方案: 中国, 881056073[P]. 1989-07-26.');
  });

  it('formats [N] Newspaper Article / 报纸文章', () => {
    const item: CitationItem = {
      id: 'news-1',
      type: 'article-newspaper',
      authors: [{ family: '丁文祥', isChinese: true }],
      title: '数字革命与竞争国际化',
      containerTitle: '光明日报',
      date: '2000-11-20',
      pages: '15',
    };
    const out = formatCitation(item, { style: 'gbt7714-2025-numeric', index: 10 });
    expect(out.text).toBe('[10] 丁文祥. 数字革命与竞争国际化[N]. 光明日报, 2000-11-20(15).');
  });

  it('formats [EB/OL] Webpage / 电子公告 with accessed date and URL', () => {
    const item: CitationItem = {
      id: 'web-1',
      type: 'webpage',
      authors: [{ literal: '国家统计局' }],
      title: '2023年国民经济和社会发展统计公报',
      date: '2024-02-29',
      accessedDate: '2024-05-15',
      url: 'https://www.stats.gov.cn/sj/zxfb/202402/t20240229_1947915.html',
    };
    const out = formatCitation(item, { style: 'gbt7714-2025-numeric', index: 11 });
    expect(out.text).toBe(
      '[11] 国家统计局. 2023年国民经济和社会发展统计公报[EB/OL]. (2024-02-29) [2024-05-15]. https://www.stats.gov.cn/sj/zxfb/202402/t20240229_1947915.html.'
    );
  });

  it('formats [DS/OL] Dataset / 数据集 (2025 新增规范)', () => {
    const item: CitationItem = {
      id: 'dataset-1',
      type: 'dataset',
      authors: [{ family: '王军', isChinese: true }, { family: '赵强', isChinese: true }],
      title: '黄河流域水文水资源观测数据集',
      version: 'V1.0',
      publisher: '国家冰川冻土沙漠科学数据中心',
      year: '2024',
      accessedDate: '2024-06-01',
      doi: '10.12072/ncdc.001.2024.1234',
    };
    const out = formatCitation(item, { style: 'gbt7714-2025-numeric', index: 12 });
    expect(out.text).toBe(
      '[12] 王军, 赵强. 黄河流域水文水资源观测数据集[DS/OL]. V1.0. 国家冰川冻土沙漠科学数据中心 (2024) [2024-06-01]. DOI:10.12072/ncdc.001.2024.1234.'
    );
  });

  it('formats [A] Archive / 档案文献', () => {
    const item: CitationItem = {
      id: 'archive-1',
      type: 'archive',
      title: '中国科学院近代史研究所档案',
      number: '全宗号 120, 案卷号 35',
      date: '1955-08-10',
    };
    const out = formatCitation(item, { style: 'gbt7714-2025-numeric', index: 13 });
    expect(out.text).toBe(
      '[13] 中国科学院近代史研究所档案: 全宗号 120, 案卷号 35[A]. 1955-08-10.'
    );
  });
});

describe('GB/T 7714—2025 Author-Date (著者-出版年制) In-depth Rules', () => {
  it('formats single author, two authors, and >3 authors with proper cutoff', () => {
    const item1: CitationItem = {
      id: 'ad-1',
      type: 'book',
      authors: [{ family: '张三', isChinese: true }],
      title: '单著者专著',
      place: '北京',
      publisher: '科学出版社',
      year: '2020',
    };
    const item2: CitationItem = {
      id: 'ad-2',
      type: 'book',
      authors: [{ family: '张三', isChinese: true }, { family: '李四', isChinese: true }],
      title: '双著者专著',
      place: '北京',
      publisher: '科学出版社',
      year: '2021',
    };
    const item4: CitationItem = {
      id: 'ad-4',
      type: 'book',
      authors: [
        { family: '张三', isChinese: true },
        { family: '李四', isChinese: true },
        { family: '王五', isChinese: true },
        { family: '赵六', isChinese: true },
      ],
      title: '四著者专著',
      place: '北京',
      publisher: '科学出版社',
      year: '2022',
    };

    expect(formatCitation(item1, { style: 'gbt7714-2025-author-date' }).text).toBe(
      '张三, 2020. 单著者专著[M]. 北京: 科学出版社.'
    );
    expect(formatCitation(item2, { style: 'gbt7714-2025-author-date' }).text).toBe(
      '张三, 李四, 2021. 双著者专著[M]. 北京: 科学出版社.'
    );
    expect(formatCitation(item4, { style: 'gbt7714-2025-author-date' }).text).toBe(
      '张三, 李四, 王五, 等, 2022. 四著者专著[M]. 北京: 科学出版社.'
    );
  });

  it('formats fullwidth Chinese punctuation when fullwidthPunctuation is true', () => {
    const item: CitationItem = {
      id: 'zh-full',
      type: 'article-journal',
      authors: [{ family: '陈建国', isChinese: true }, { family: '李红', isChinese: true }],
      title: '人工智能驱动的高等教育变革',
      containerTitle: '教育研究',
      year: '2024',
      volume: '45',
      issue: '3',
      pages: '100-112',
    };
    const out = formatCitation(item, {
      style: 'gbt7714-2025-numeric',
      index: 1,
      fullwidthPunctuation: true,
    });
    expect(out.text).toContain('陈建国，李红. 人工智能驱动的高等教育变革[J]. 教育研究，2024，45(3)：100-112.');
  });
});
