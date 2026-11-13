import { describe, it, expect } from 'vitest';
import {
  parseLocalCitations,
  detectInputKind,
  extractStandaloneDoi,
  findEmbeddedDoi,
  formatCitation,
  formatCitationList,
} from '../src/lib/citation';

describe('Parser Robustness & Dirty Data Cleaning (知网/PDF/BibTeX/RIS 容错与解析)', () => {
  describe('CNKI Dirty Copy-Paste & Soft Line Breaks', () => {
    it('handles Chinese references with hard line-wraps inside title and author lists', () => {
      const wrapped = `
[1] 张三, 李
四, 王五. 基于
深度学习的遥感
图像处理[J]. 测绘学报, 2023, 52(4): 501-510.
[2] 赵六. 现代信号处理[M]. 北京: 科学出版社, 2021.
`;
      const items = parseLocalCitations(wrapped);
      expect(items).toHaveLength(2);
      expect(items[0].title).toBe('基于深度学习的遥感图像处理');
      expect(items[0].authors.map((a) => a.family)).toEqual(['张三', '李四', '王五']);
      expect(items[1].title).toBe('现代信号处理');
    });

    it('cleans various fullwidth punctuation brackets around type marks: ［J］, 【M】, 〔C〕', () => {
      const raw = `
[1] 刘备. 三国志研究［J］. 历史研究, 2020(2): 10-20.
[2] 关羽. 兵法要义【M】. 成都: 巴蜀书社, 2019.
[3] 张飞. 战役规划〔C〕. 武汉: 武汉大学出版社, 2018.
`;
      const items = parseLocalCitations(raw);
      expect(items).toHaveLength(3);
      expect(items[0].type).toBe('article-journal');
      expect(items[1].type).toBe('book');
      expect(items[2].type).toBe('paper-conference');
    });

    it('cleans obsolete bracketed accessed dates from journal citations while preserving DOIs', () => {
      const raw =
        '[1] 李明. 机器学习在金融领域的应用[J/OL]. 数量经济技术经济研究, 2022, 39(1): 88-105 [2023-01-15]. https://doi.org/10.13653/j.cnki.jqte.2022.01.005.';
      const items = parseLocalCitations(raw);
      expect(items).toHaveLength(1);
      const out = formatCitation(items[0], { style: 'gbt7714-2025-numeric', index: 1 });
      // Per 2025 rule, [J/OL] with standard pub info should NOT display [2023-01-15]
      expect(out.text).not.toContain('[2023-01-15]');
      expect(out.text).toContain('DOI:10.13653/j.cnki.jqte.2022.01.005.');
    });
  });

  describe('BibTeX Parsing Robustness & Escaped Special Characters', () => {
    it('handles LaTeX escapes such as \\&, \\%, \\_, \\~, and \\textbf', () => {
      const bib = `
@article{test2024,
  author = {Smith, John \\& Doe, Jane},
  title = {A 99\\% Accurate \\textbf{Study} on Model\\_A \\~ Model\\_B},
  journal = {ACM \\& IEEE Transactions},
  year = {2024},
  pages = {10--20}
}`;
      const items = parseLocalCitations(bib);
      expect(items).toHaveLength(1);
      expect(items[0].title).toBe('A 99% Accurate Study on Model_A Model_B');
      expect(items[0].containerTitle).toBe('ACM & IEEE Transactions');
      expect(items[0].pages).toBe('10-20');
    });

    it('handles BibTeX entries delimited by parentheses @article(key, ...)', () => {
      const bib = `
@article(parenKey2021,
  author = "Knuth, Donald E.",
  title = "Algorithms and Computation",
  year = "2021",
  journal = "Journal of ACM"
)
`;
      const items = parseLocalCitations(bib);
      expect(items).toHaveLength(1);
      expect(items[0].authors[0].family).toBe('Knuth');
      expect(items[0].title).toBe('Algorithms and Computation');
      expect(items[0].year).toBe('2021');
    });

    it('correctly maps diverse BibTeX types to ResourceTypes', () => {
      const bib = `
@phdthesis{phd1,
  author = {Shannon, Claude},
  title = {A Symbolic Analysis of Relay and Switching Circuits},
  school = {MIT},
  year = {1940}
}
@inproceedings{proc1,
  author = {Turing, Alan},
  title = {On Computable Numbers},
  booktitle = {Proc. London Math. Soc.},
  year = {1936}
}
@techreport{rep1,
  author = {Bush, Vannevar},
  title = {Science The Endless Frontier},
  institution = {NSF},
  year = {1945}
}
`;
      const items = parseLocalCitations(bib);
      expect(items).toHaveLength(3);
      expect(items[0].type).toBe('thesis');
      expect(items[1].type).toBe('paper-conference');
      expect(items[2].type).toBe('report');
    });
  });

  describe('RIS Tag Parsing Edge Cases', () => {
    it('parses RIS with Windows CRLF line endings and multiple references', () => {
      const ris =
        'TY  - JOUR\r\nAU  - LeCun, Yann\r\nTI  - Deep Learning\r\nJO  - Nature\r\nPY  - 2015\r\nER  -\r\n\r\nTY  - BOOK\r\nAU  - Goodfellow, Ian\r\nTI  - Deep Learning Book\r\nPB  - MIT Press\r\nPY  - 2016\r\nER  -';
      const items = parseLocalCitations(ris);
      expect(items).toHaveLength(2);
      expect(items[0].type).toBe('article-journal');
      expect(items[0].title).toBe('Deep Learning');
      expect(items[1].type).toBe('book');
      expect(items[1].title).toBe('Deep Learning Book');
    });

    it('parses RIS author tags: AU, A1, A2', () => {
      const ris = `
TY  - CONF
A1  - He, Kaiming
A1  - Sun, Jian
T1  - Residual Networks
JO  - CVPR
Y1  - 2016
ER  -`;
      const items = parseLocalCitations(ris);
      expect(items).toHaveLength(1);
      expect(items[0].authors).toHaveLength(2);
      expect(items[0].authors[0].family).toBe('He');
      expect(items[0].authors[1].family).toBe('Sun');
    });
  });

  describe('DOI & arXiv Extraction and Normalization', () => {
    it('extracts standalone DOIs with various prefixes and trailing punctuation', () => {
      expect(extractStandaloneDoi('10.1038/nature12373')?.doi).toBe('10.1038/nature12373');
      expect(extractStandaloneDoi('https://doi.org/10.1038/nature12373')?.doi).toBe('10.1038/nature12373');
      expect(extractStandaloneDoi('http://dx.doi.org/10.1038/nature12373.')?.doi).toBe('10.1038/nature12373');
      expect(extractStandaloneDoi('doi: 10.1038/nature12373;')?.doi).toBe('10.1038/nature12373');
    });

    it('finds embedded DOIs inside freeform citation text', () => {
      const line = 'Vaswani et al. Attention is all you need. NeurIPS 2017. doi: 10.1038/nature12373.';
      expect(findEmbeddedDoi(line)).toBe('10.1038/nature12373');
    });

    it('detects input kinds reliably', () => {
      expect(detectInputKind('@article{key, title={Test}}').kind).toBe('bibtex');
      expect(detectInputKind('TY  - JOUR\r\nTI  - Test\r\nER  -').kind).toBe('ris');
      expect(detectInputKind('10.1038/nature12373').kind).toBe('doi');
      expect(detectInputKind('[1] 张三. 论语研究[M]. 2020.').kind).toBe('gbt');
      expect(detectInputKind('Silver, D. (2016). Go. Nature.').kind).toBe('apa');
      expect(detectInputKind('   ').kind).toBe('plain');
    });
  });
});
