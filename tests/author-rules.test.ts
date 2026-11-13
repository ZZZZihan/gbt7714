import { describe, it, expect } from 'vitest';
import {
  parseAuthor,
  formatAuthorGBT,
  formatCitation,
  type CitationItem,
} from '../src/lib/citation';

describe('Author Name Parsing & Formatting Comprehensive Rules', () => {
  describe('Western Name Capitalization (GB/T 7714—2025 Clause 7.1.1 Title Case)', () => {
    it('normalizes uppercase surnames to Title Case', () => {
      expect(formatAuthorGBT(parseAuthor('EINSTEIN, Albert'), '2025')).toBe('Einstein A');
      expect(formatAuthorGBT(parseAuthor('HAWKING S W'), '2025')).toBe('Hawking S W');
      expect(formatAuthorGBT(parseAuthor('TURING, Alan M.'), '2025')).toBe('Turing A M');
    });

    it('handles compound surnames with hyphens and particles', () => {
      expect(formatAuthorGBT(parseAuthor('WILLIAMS-ELLIS, A.'), '2025')).toBe('Williams-Ellis A');
      expect(formatAuthorGBT(parseAuthor('DE MORGAN, Augustus'), '2025')).toBe('De Morgan A');
      expect(formatAuthorGBT(parseAuthor('van der Waals, Johannes Diderik'), '2025')).toBe('van der Waals J D');
      expect(formatAuthorGBT(parseAuthor('McDonald, John'), '2025')).toBe('McDonald J');
    });

    it('handles hyphenated given names with abbreviation', () => {
      expect(formatAuthorGBT(parseAuthor('Godard, Jean-Luc'), '2025')).toBe('Godard J-L');
      expect(formatAuthorGBT(parseAuthor('Serre, Jean-Pierre'), '2025')).toBe('Serre J-P');
    });

    it('handles generation suffixes (Jr., Sr., III)', () => {
      expect(formatAuthorGBT(parseAuthor('Peebles, P. Z., Jr.'), '2025')).toBe('Peebles P Z Jr');
      expect(formatAuthorGBT(parseAuthor('King, Martin Luther, Jr.'), '2025')).toBe('King M L Jr');
      expect(formatAuthorGBT(parseAuthor('Gates, William H., III'), '2025')).toBe('Gates W H III');
    });
  });

  describe('Chinese Names & Pinyin Rules', () => {
    it('preserves full Chinese character names', () => {
      expect(formatAuthorGBT(parseAuthor('张三'), '2025')).toBe('张三');
      expect(formatAuthorGBT(parseAuthor('诸葛孔明'), '2025')).toBe('诸葛孔明');
      expect(formatAuthorGBT(parseAuthor('欧阳修'), '2025')).toBe('欧阳修');
    });

    it('preserves Chinese Pinyin names with full given name in Title Case', () => {
      expect(formatAuthorGBT(parseAuthor('LI, Jiangning'), '2025')).toBe('Li Jiangning');
      expect(formatAuthorGBT(parseAuthor('WANG, Xiaoping'), '2025')).toBe('Wang Xiaoping');
      expect(formatAuthorGBT(parseAuthor('ZHANG San'), '2025')).toBe('Zhang San');
    });

    it('cleans stray spaces between Chinese characters in author names', () => {
      expect(formatAuthorGBT(parseAuthor('张   群'), '2025')).toBe('张群');
      expect(formatAuthorGBT(parseAuthor('石  志  飞'), '2025')).toBe('石志飞');
    });
  });

  describe('Institutional / Corporate Authors', () => {
    it('recognizes Chinese corporate and government entities as single literal authors', () => {
      const auth1 = parseAuthor('中国互联网络信息中心');
      expect(auth1.literal).toBe('中国互联网络信息中心');
      expect(formatAuthorGBT(auth1, '2025')).toBe('中国互联网络信息中心');

      const auth2 = parseAuthor('国家统计局');
      expect(auth2.literal).toBe('国家统计局');
      expect(formatAuthorGBT(auth2, '2025')).toBe('国家统计局');

      const auth3 = parseAuthor('北京大学数学科学学院');
      expect(auth3.literal).toBe('北京大学数学科学学院');
      expect(formatAuthorGBT(auth3, '2025')).toBe('北京大学数学科学学院');
    });

    it('recognizes English corporate entities as single literal authors', () => {
      const auth1 = parseAuthor('World Health Organization');
      expect(auth1.literal).toBe('World Health Organization');
      expect(formatAuthorGBT(auth1, '2025')).toBe('World Health Organization');

      const auth2 = parseAuthor('IEEE Computer Society');
      expect(auth2.literal).toBe('IEEE Computer Society');
      expect(formatAuthorGBT(auth2, '2025')).toBe('IEEE Computer Society');
    });
  });

  describe('Author Cutoff Boundary (1, 2, 3 vs 4+ Authors)', () => {
    it('lists all authors when there are 1, 2, or 3 authors (Chinese and Western)', () => {
      const item3Zh: CitationItem = {
        id: 'zh-3',
        type: 'book',
        authors: [
          { family: '钱学森', isChinese: true },
          { family: '宋健', isChinese: true },
          { family: '汪成为', isChinese: true },
        ],
        title: '工程控制论',
        place: '北京',
        publisher: '科学出版社',
        year: '1980',
      };
      const outZh = formatCitation(item3Zh, { style: 'gbt7714-2025-numeric', index: 1 });
      expect(outZh.text).toContain('钱学森, 宋健, 汪成为. 工程控制论[M].');
      expect(outZh.text).not.toContain('等');

      const item3En: CitationItem = {
        id: 'en-3',
        type: 'book',
        authors: [
          { family: 'Aho', given: 'Alfred V' },
          { family: 'Lam', given: 'Monica S' },
          { family: 'Sethi', given: 'Ravi' },
        ],
        title: 'Compilers: Principles, Techniques, and Tools',
        place: 'Boston',
        publisher: 'Addison-Wesley',
        year: '2006',
      };
      const outEn = formatCitation(item3En, { style: 'gbt7714-2025-numeric', index: 2 });
      expect(outEn.text).toContain('Aho A V, Lam M S, Sethi R. Compilers: Principles, Techniques, and Tools[M].');
      expect(outEn.text).not.toContain('et al.');
    });

    it('cuts off at 3 authors and appends "等" or "et al." when 4 or more authors exist', () => {
      const item4Zh: CitationItem = {
        id: 'zh-4',
        type: 'book',
        authors: [
          { family: '张三', isChinese: true },
          { family: '李四', isChinese: true },
          { family: '王五', isChinese: true },
          { family: '赵六', isChinese: true },
        ],
        title: '测试专著',
        year: '2023',
      };
      const outZh = formatCitation(item4Zh, { style: 'gbt7714-2025-numeric', index: 1 });
      expect(outZh.text).toContain('张三, 李四, 王五, 等. 测试专著[M].');

      const item4En: CitationItem = {
        id: 'en-4',
        type: 'book',
        authors: [
          { family: 'Aho', given: 'A V' },
          { family: 'Lam', given: 'M S' },
          { family: 'Sethi', given: 'R' },
          { family: 'Ullman', given: 'J D' },
        ],
        title: 'Compilers',
        year: '2006',
      };
      const outEn = formatCitation(item4En, { style: 'gbt7714-2025-numeric', index: 2 });
      expect(outEn.text).toContain('Aho A V, Lam M S, Sethi R, et al. Compilers[M].');
    });
  });
});
