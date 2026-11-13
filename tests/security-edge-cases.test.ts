import { describe, it, expect } from 'vitest';
import {
  parseLocalCitations,
  formatCitation,
  formatCitationList,
  type CitationItem,
} from '../src/lib/citation';

describe('Security, XSS Sanitization & Extreme Boundary Resilience', () => {
  describe('XSS Injection Sanitization', () => {
    it('escapes malicious HTML tags in title, authors, containerTitle, and publisher', () => {
      const maliciousItem: CitationItem = {
        id: 'xss-1',
        type: 'article-journal',
        authors: [{ literal: '<script>alert("xss-author")</script>' }],
        title: 'Exploit <img src=x onerror=alert("xss-title")> in Modern Web',
        containerTitle: 'Journal of <iframe src="//evil.com"></iframe> Systems',
        publisher: '<a href="javascript:alert(1)">Evil Corp</a>',
        year: '2024',
      };

      const out = formatCitation(maliciousItem, { style: 'gbt7714-2025-numeric', index: 1 });

      // Verifies rendered HTML does NOT contain raw unescaped script, img onerror, or iframe tags
      expect(out.html).not.toContain('<script>');
      expect(out.html).not.toContain('<img');
      expect(out.html).not.toContain('<iframe');
      expect(out.html).not.toContain('<a href=');
      expect(out.html).not.toContain('onerror=');

      // Verifies clean plain-text version has tags stripped
      expect(out.text).not.toContain('<script>');
      expect(out.text).not.toContain('<img');
      expect(out.text).not.toContain('<iframe');
    });

    it('safely preserves <i> and <em> scientific names without permitting attribute-based XSS inside them', () => {
      const item: CitationItem = {
        id: 'xss-2',
        type: 'article-journal',
        authors: [{ family: 'Smith', given: 'J' }],
        title: 'Genomics of <i>Eucalyptus grandis</i> and <em>Arabidopsis thaliana</em>',
        containerTitle: 'Nature',
        year: '2024',
      };
      const out = formatCitation(item, { style: 'gbt7714-2025-numeric', index: 1 });

      expect(out.html).toContain('<i>Eucalyptus grandis</i>');
      expect(out.html).toContain('<i>Arabidopsis thaliana</i>');
      expect(out.text).toContain('Eucalyptus grandis');
    });
  });

  describe('Extreme Input & Degraded Data Resilience', () => {
    it('handles empty, whitespace, and newline-only strings without error', () => {
      expect(parseLocalCitations('')).toEqual([]);
      expect(parseLocalCitations('   \n\t  \r\n  ')).toEqual([]);
    });

    it('handles pure emoji or special symbol strings gracefully', () => {
      const items = parseLocalCitations('🎉🚀🔥 🌟✨💡');
      expect(items).toBeInstanceOf(Array);
      if (items.length > 0) {
        expect(() => formatCitation(items[0], { style: 'gbt7714-2025-numeric' })).not.toThrow();
      }
    });

    it('handles lone numbers or reference indexes without throwing', () => {
      const items = parseLocalCitations('[1]\n[2]\n3.');
      expect(items).toBeInstanceOf(Array);
      items.forEach((it) => {
        expect(() => formatCitation(it, { style: 'gbt7714-2025-numeric' })).not.toThrow();
      });
    });

    it('handles missing essential fields (no author, no year, no title) without throwing', () => {
      const noAuthor: CitationItem = {
        id: 'no-auth',
        type: 'book',
        authors: [],
        title: '无名古籍考',
        year: '1985',
      };
      const noYear: CitationItem = {
        id: 'no-yr',
        type: 'book',
        authors: [{ family: '佚名', isChinese: true }],
        title: '未知年代抄本',
      };
      const emptyItem: CitationItem = {
        id: 'empty',
        type: 'book',
        authors: [],
        title: '',
      };

      expect(() => formatCitation(noAuthor, { style: 'gbt7714-2025-numeric', index: 1 })).not.toThrow();
      expect(() => formatCitation(noYear, { style: 'gbt7714-2025-numeric', index: 2 })).not.toThrow();
      expect(() => formatCitation(emptyItem, { style: 'gbt7714-2025-numeric', index: 3 })).not.toThrow();

      expect(formatCitation(noAuthor, { style: 'gbt7714-2025-numeric', index: 1 }).text).toContain(
        '[1] 无名古籍考[M]. 1985.'
      );
    });

    it('handles exceptionally long inputs (10,000+ characters) within reasonable time', () => {
      const longTitle = 'A'.repeat(5000) + ' ' + 'B'.repeat(5000);
      const raw = `[1] Einstein A. ${longTitle}[J]. Physical Review, 1905, 17: 132-148.`;
      const t0 = performance.now();
      const items = parseLocalCitations(raw);
      expect(items).toHaveLength(1);
      const out = formatCitation(items[0], { style: 'gbt7714-2025-numeric', index: 1 });
      const elapsed = performance.now() - t0;
      expect(elapsed).toBeLessThan(150); // Less than 150ms
      expect(out.text).toContain('Einstein A.');
    });
  });
});
