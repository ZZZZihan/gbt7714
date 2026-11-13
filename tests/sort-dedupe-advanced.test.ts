import { describe, it, expect } from 'vitest';
import {
  sortCitationItems,
  deduplicateCitationItems,
  formatCitationList,
  type CitationItem,
} from '../src/lib/citation';

describe('Advanced Sorting & Deduplication Corner Cases', () => {
  describe('Anonymous Works & Citations without Author', () => {
    it('sorts citations without authors by title according to Pinyin and Alphabet', () => {
      const items: CitationItem[] = [
        { id: '1', type: 'book', authors: [], title: '周易正义' },
        { id: '2', type: 'book', authors: [], title: '尚书正义' },
        { id: '3', type: 'book', authors: [], title: '毛诗正义' },
        { id: '4', type: 'book', authors: [], title: 'Analytical Engine Handbook' },
      ];

      const sorted = sortCitationItems(items, { order: 'zh-first' });
      // In Chinese Pinyin: 毛 Mao < 尚 Shang < 周 Zhou, then English Analytical
      expect(sorted.map((it) => it.title)).toEqual([
        '毛诗正义',
        '尚书正义',
        '周易正义',
        'Analytical Engine Handbook',
      ]);
    });
  });

  describe('Multi-Way Duplicate Merging (3-way merge)', () => {
    it('merges 3 partial duplicate records into a complete record without losing data', () => {
      const itemA: CitationItem = {
        id: 'item-a',
        type: 'article-journal',
        authors: [{ family: 'Vaswani', given: 'A' }, { family: 'Shazeer', given: 'N' }],
        title: 'Attention is All You Need',
        year: '2017',
        doi: '10.1038/nature12373',
      };
      const itemB: CitationItem = {
        id: 'item-b',
        type: 'article-journal',
        authors: [{ family: 'Vaswani', given: 'A' }],
        title: 'Attention is All You Need',
        containerTitle: 'Advances in Neural Information Processing Systems',
        volume: '30',
        issue: '1',
        year: '2017',
      };
      const itemC: CitationItem = {
        id: 'item-c',
        type: 'article-journal',
        authors: [{ family: 'Vaswani', given: 'A' }],
        title: 'Attention is all you need',
        pages: '5998-6008',
        url: 'https://proceedings.neurips.cc/paper/2017/file/item.pdf',
        year: '2017',
      };

      const result = deduplicateCitationItems([itemA, itemB, itemC]);

      expect(result.duplicatesRemoved).toBe(2);
      expect(result.items).toHaveLength(1);

      const merged = result.items[0];
      // Check that all merged fields are present
      expect(merged.doi).toBe('10.1038/nature12373');
      expect(merged.containerTitle).toBe('Advances in Neural Information Processing Systems');
      expect(merged.volume).toBe('30');
      expect(merged.issue).toBe('1');
      expect(merged.pages).toBe('5998-6008');
      expect(merged.url).toBe('https://proceedings.neurips.cc/paper/2017/file/item.pdf');
      expect(merged.authors).toHaveLength(2);
    });
  });

  describe('False Positive Prevention (避免误伤不同文献)', () => {
    it('does not deduplicate citations with the same title but different authors', () => {
      const items: CitationItem[] = [
        {
          id: '1',
          type: 'book',
          authors: [{ family: '张三', isChinese: true }],
          title: '中国古代文学史',
          year: '2020',
        },
        {
          id: '2',
          type: 'book',
          authors: [{ family: '李四', isChinese: true }],
          title: '中国古代文学史',
          year: '2020',
        },
      ];
      const result = deduplicateCitationItems(items);
      expect(result.duplicatesRemoved).toBe(0);
      expect(result.items).toHaveLength(2);
    });

    it('does not deduplicate volume series or multivolume works with distinctive subtitles', () => {
      const items: CitationItem[] = [
        {
          id: '1',
          type: 'book',
          authors: [{ family: '司马迁', isChinese: true }],
          title: '史记：第一册',
          year: '1959',
        },
        {
          id: '2',
          type: 'book',
          authors: [{ family: '司马迁', isChinese: true }],
          title: '史记：第二册',
          year: '1959',
        },
      ];
      const result = deduplicateCitationItems(items);
      expect(result.duplicatesRemoved).toBe(0);
      expect(result.items).toHaveLength(2);
    });

    it('does not deduplicate same author with different titles in the same year', () => {
      const items: CitationItem[] = [
        {
          id: '1',
          type: 'article-journal',
          authors: [{ family: '陶哲轩', isChinese: true }],
          title: '素数在等差数列中的分布研究',
          year: '2024',
        },
        {
          id: '2',
          type: 'article-journal',
          authors: [{ family: '陶哲轩', isChinese: true }],
          title: '非线性波动方程的奇点形成机制',
          year: '2024',
        },
      ];
      const result = deduplicateCitationItems(items);
      expect(result.duplicatesRemoved).toBe(0);
      expect(result.items).toHaveLength(2);
    });
  });

  describe('Author-Date Year Suffix Scale (2024a, 2024b, 2024c, 2024d)', () => {
    it('appends correct alphabetical suffixes up to 4+ items for identical authors in the same year', () => {
      const items: CitationItem[] = [
        { id: '1', type: 'book', authors: [{ family: '王力', isChinese: true }], title: '汉语诗律学', year: '1982' },
        { id: '2', type: 'book', authors: [{ family: '王力', isChinese: true }], title: '同源字典', year: '1982' },
        { id: '3', type: 'book', authors: [{ family: '王力', isChinese: true }], title: '古代汉语', year: '1982' },
        { id: '4', type: 'book', authors: [{ family: '王力', isChinese: true }], title: '汉语史稿', year: '1982' },
      ];

      const sorted = sortCitationItems(items, { order: 'zh-first', disambiguateYear: true });
      expect(sorted.map((it) => it.year)).toEqual(['1982a', '1982b', '1982c', '1982d']);

      const formatted = formatCitationList(sorted, { style: 'gbt7714-2025-author-date' });
      expect(formatted[0].text).toContain('王力, 1982a.');
      expect(formatted[1].text).toContain('王力, 1982b.');
      expect(formatted[2].text).toContain('王力, 1982c.');
      expect(formatted[3].text).toContain('王力, 1982d.');
    });
  });
});
