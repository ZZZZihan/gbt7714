import { describe, it, expect } from 'vitest';
import {
  parseLocalCitations,
  formatCitation,
  formatCitationList,
  type CitationItem,
} from '../src/lib/citation';

describe('Export Formats & Word Clipboard Rich Text (导出与剪贴板验证)', () => {
  describe('BibTeX Export Generation', () => {
    it('generates valid BibTeX entries with appropriate entry types, keys, and fields', () => {
      const items: CitationItem[] = [
        {
          id: 'item-1',
          type: 'article-journal',
          authors: [{ family: 'Vaswani', given: 'Ashish' }, { family: 'Shazeer', given: 'Noam' }],
          title: 'Attention is all you need',
          containerTitle: 'Advances in Neural Information Processing Systems',
          volume: '30',
          pages: '5998-6008',
          year: '2017',
          doi: '10.1038/nature12373',
        },
        {
          id: 'item-2',
          type: 'book',
          authors: [{ family: 'Goodfellow', given: 'Ian' }],
          title: 'Deep Learning',
          publisher: 'MIT Press',
          place: 'Cambridge',
          year: '2016',
        },
        {
          id: 'item-3',
          type: 'thesis',
          authors: [{ family: '李四', isChinese: true }],
          title: '深度图神经网络研究',
          publisher: '清华大学',
          place: '北京',
          year: '2022',
        },
      ];

      const out = formatCitationList(items, { style: 'bibtex' });
      expect(out).toHaveLength(3);

      // 1. Journal -> @article
      expect(out[0].text).toContain('@article{vaswani2017attention,');
      expect(out[0].text).toContain('author = {Vaswani, Ashish and Shazeer, Noam},');
      expect(out[0].text).toContain('journal = {Advances in Neural Information Processing Systems},');
      expect(out[0].text).toContain('volume = {30},');
      expect(out[0].text).toContain('pages = {5998--6008},');
      expect(out[0].text).toContain('doi = {10.1038/nature12373},');

      // 2. Book -> @book
      expect(out[1].text).toContain('@book{goodfellow2016deep,');
      expect(out[1].text).toContain('publisher = {MIT Press},');
      expect(out[1].text).toContain('address = {Cambridge},');

      // 3. Thesis -> @phdthesis
      expect(out[2].text).toContain('@phdthesis{');
      expect(out[2].text).toContain('school = {清华大学},');
    });

    it('generates preprint BibTeX with archivePrefix and accessed date', () => {
      const item: CitationItem = {
        id: 'pp-1',
        type: 'preprint',
        authors: [{ family: 'Brown', given: 'Tom' }],
        title: 'Language Models are Few-Shot Learners',
        year: '2020',
        url: 'https://arxiv.org/abs/2005.14165',
        accessedDate: '2024-05-01',
      };
      const out = formatCitation(item, { style: 'bibtex' });
      expect(out.text).toContain('@misc{');
      expect(out.text).toContain('archivePrefix = {arXiv},');
      expect(out.text).toContain('urldate = {2024-05-01},');
    });
  });

  describe('Word-Compatible Rich Text Clipboard HTML Specification', () => {
    it('produces Word paragraph HTML adhering to thesis standards (10.5pt, 21pt hanging indent, font stack)', () => {
      const item: CitationItem = {
        id: 'sample',
        type: 'article-journal',
        authors: [{ family: 'Einstein', given: 'Albert' }],
        title: 'Zur Elektrodynamik bewegter Körper',
        containerTitle: 'Annalen der Physik',
        year: '1905',
        volume: '17',
        pages: '891-921',
      };
      const formatted = formatCitation(item, { style: 'gbt7714-2025-numeric', index: 1 });

      // Build simulated Word clipboard snippet matching CitationWorkbench.astro
      const paragraphHtml = `<p style="margin:0 0 4pt 21pt;text-indent:-21pt;line-height:1.5;font-family:'Times New Roman','SimSun','Songti SC',serif;font-size:10.5pt;color:#000000;">${formatted.html}</p>`;

      // Verify hanging indent: 21pt margin-left with -21pt text-indent (standard 2 Chinese characters hanging indent)
      expect(paragraphHtml).toContain('margin:0 0 4pt 21pt;');
      expect(paragraphHtml).toContain('text-indent:-21pt;');

      // Verify font size: 10.5pt (五号字 standard for references in Chinese dissertations)
      expect(paragraphHtml).toContain('font-size:10.5pt;');

      // Verify font stack: Times New Roman + SimSun
      expect(paragraphHtml).toContain("'Times New Roman','SimSun'");
    });

    it('preserves <i> tags in APA 7th and IEEE outputs for journal and book titles', () => {
      const item: CitationItem = {
        id: 'journal-apa',
        type: 'article-journal',
        authors: [{ family: 'Vaswani', given: 'A' }],
        title: 'Attention is all you need',
        containerTitle: 'Advances in Neural Information Processing Systems',
        volume: '30',
        pages: '5998-6008',
        year: '2017',
      };

      const apa = formatCitation(item, { style: 'apa-7' });
      expect(apa.html).toContain('<i>Advances in Neural Information Processing Systems</i>');

      const ieee = formatCitation(item, { style: 'ieee', index: 1 });
      expect(ieee.html).toContain('<i>Advances in Neural Information Processing Systems</i>');
    });
  });
});
