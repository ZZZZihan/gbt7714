import { describe, it, expect } from 'vitest';
import {
  parseLocalCitations,
  formatCitation,
  formatCitationList,
  sortCitationItems,
  deduplicateCitationItems,
  type CitationItem,
} from '../src/lib/citation';

describe('Citation Sorting (著者-出版年制字顺与年份消歧)', () => {
  it('sorts Chinese citations by Pinyin and Western citations by English Alphabet (zh-first)', () => {
    const raw = `
[1] 张三. 汉语研究[M]. 北京: 中华书局, 2020.
[2] Brown, M. Deep Learning[M]. London: MIT Press, 2019.
[3] 安生. 古代哲学[M]. 上海: 古籍出版社, 2018.
[4] Einstein, A. Relativity[M]. New York: Dover, 1920.
[5] 李四. 计算机科学[M]. 北京: 科学出版社, 2021.
`;
    const items = parseLocalCitations(raw);
    const sorted = sortCitationItems(items, { order: 'zh-first' });

    // Chinese first in Pinyin order: 安生 (A) -> 李四 (L) -> 张三 (Z)
    // Then Western in A-Z order: Brown (B) -> Einstein (E)
    expect(sorted.map((it) => it.authors[0].family)).toEqual([
      '安生',
      '李四',
      '张三',
      'Brown',
      'Einstein',
    ]);
  });

  it('sorts same author by publication year ascending', () => {
    const raw = `
[1] 张三. 后期著作[M]. 2024.
[2] 张三. 早期论文[M]. 2015.
[3] 张三. 中期探索[M]. 2019.
`;
    const items = parseLocalCitations(raw);
    const sorted = sortCitationItems(items, { order: 'zh-first' });

    expect(sorted.map((it) => it.year)).toEqual(['2015', '2019', '2024']);
  });

  it('automatically appends a, b, c suffixes for same author in same year when disambiguateYear is true', () => {
    const raw = `
[1] 张三. 论唐诗之一[J]. 文学评论, 2024: 1-10.
[2] 张三. 论唐诗之二[J]. 文学评论, 2024: 11-20.
[3] 张三. 论唐诗之三[J]. 文学评论, 2024: 21-30.
`;
    const items = parseLocalCitations(raw);
    const sorted = sortCitationItems(items, { order: 'zh-first', disambiguateYear: true });

    expect(sorted.map((it) => it.year)).toEqual(['2024a', '2024b', '2024c']);

    const formatted = formatCitationList(sorted, { style: 'gbt7714-2025-author-date' });
    expect(formatted[0].text).toContain('张三, 2024a.');
    expect(formatted[1].text).toContain('张三, 2024b.');
    expect(formatted[2].text).toContain('张三, 2024c.');
  });
});

describe('Citation Deduplication (重复文献识别与合并)', () => {
  it('deduplicates citations having the same DOI with different casing and URLs', () => {
    const raw = `
[1] Vaswani A, Shazeer N. Attention is all you need[J]. NeurIPS, 2017. https://doi.org/10.1038/NATURE12373.
[2] Vaswani A, Shazeer N. Attention is all you need[J]. NeurIPS, 2017, 30: 5998-6008. DOI: 10.1038/nature12373.
`;
    const items = parseLocalCitations(raw);
    expect(items).toHaveLength(2);

    const result = deduplicateCitationItems(items);
    expect(result.duplicatesRemoved).toBe(1);
    expect(result.items).toHaveLength(1);

    // Richer information (pages, volume) should be preserved
    const kept = result.items[0];
    expect(kept.pages).toBe('5998-6008');
    expect(kept.volume).toBe('30');
    expect(kept.notes?.some((n) => n.includes('已自动合并重复文献'))).toBe(true);
  });

  it('deduplicates citations having identical normalized title and first author', () => {
    const bib = `
@article{item1,
  author = {张群 and 程志宝 and 石志飞},
  title = {惯性增强动力吸振器减振性能研究},
  journal = {铁道学报},
  year = {2024}
}
@article{item2,
  author = {张群 and 程志宝 and 石志飞},
  title = {惯性增强动力吸振器减振性能研究},
  journal = {铁道学报},
  year = {2024},
  volume = {46},
  number = {5},
  pages = {12--20}
}`;
    const items = parseLocalCitations(bib);
    expect(items).toHaveLength(2);

    const result = deduplicateCitationItems(items);
    expect(result.duplicatesRemoved).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].volume).toBe('46');
    expect(result.items[0].pages).toBe('12-20');
  });

  it('preserves distinct citations without false positives', () => {
    const raw = `
[1] 张三. 论唐诗之一[J]. 文学评论, 2024: 1-10.
[2] 张三. 论宋词之一[J]. 文学评论, 2024: 11-20.
[3] 李四. 论唐诗之一[J]. 艺术评论, 2024: 1-10.
`;
    const items = parseLocalCitations(raw);
    const result = deduplicateCitationItems(items);
    expect(result.duplicatesRemoved).toBe(0);
    expect(result.items).toHaveLength(3);
  });
});
