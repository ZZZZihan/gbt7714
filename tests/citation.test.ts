import { describe, it, expect } from 'vitest';
import {
  parseAuthor,
  formatAuthorGBT,
  parseLocalCitations,
  formatCitation,
  formatCitationList,
} from '../src/lib/citation';
import { SAMPLE_PRESETS } from '../src/lib/site';

describe('GB/T 7714—2025 Author Name Rules (Clause 5.3 & 7.1.1)', () => {
  it('converts 2015 ALL-CAPS Western and Pinyin surnames to 2025 Title Case', () => {
    expect(formatAuthorGBT(parseAuthor('EINSTEIN A'), '2025')).toBe('Einstein A');
    expect(formatAuthorGBT(parseAuthor('WILLIAMS-ELLIS A'), '2025')).toBe('Williams-Ellis A');
    expect(formatAuthorGBT(parseAuthor('DE MORGAN A'), '2025')).toBe('De Morgan A');
    expect(formatAuthorGBT(parseAuthor('LI Jiangning'), '2025')).toBe('Li Jiangning');
    expect(formatAuthorGBT(parseAuthor('Peebles, P. Z., Jr.'), '2025')).toBe('Peebles P Z Jr');
    expect(formatAuthorGBT(parseAuthor('Godard, Jean-Luc'), '2025')).toBe('Godard J-L');
  });

  it('retains 2015 uppercase when explicitly formatting in 2015 legacy mode', () => {
    expect(formatAuthorGBT(parseAuthor('Einstein, Albert'), '2015')).toBe('EINSTEIN A');
    expect(formatAuthorGBT(parseAuthor('Li, Jiangning'), '2015')).toBe('LI Jiangning');
  });
});

describe('GB/T 7714—2025 Official Appendix B Specimen Formatting', () => {
  it('formats online journal [J/OL] without accessed date and keeps species italics in HTML', () => {
    const bib = `
@article{myburg2014,
  author = {Myburg, Alexander A. and Grattapaglia, Dario and Tuskan, Gerald A. and Schmutz, Jeremy},
  title = {The genome of \\textit{Eucalyptus grandis}},
  journal = {Nature},
  year = {2014},
  volume = {510},
  pages = {356--362},
  url = {https://www.nature.com/articles/nature13308.pdf},
  doi = {10.1038/nature13308},
  urldate = {2025-06-01}
}`;
    const items = parseLocalCitations(bib);
    const out = formatCitation(items[0], { style: 'gbt7714-2025-numeric', index: 1 });

    expect(out.text).toBe(
      '[1] Myburg A A, Grattapaglia D, Tuskan G A, et al. The genome of Eucalyptus grandis[J/OL]. Nature, 2014, 510: 356-362. https://www.nature.com/articles/nature13308.pdf. DOI:10.1038/nature13308.'
    );
    expect(out.html).toContain('<i>Eucalyptus grandis</i>');
    // 2025 rule: [J/OL] does NOT output [2025-06-01] accessed date
    expect(out.text).not.toContain('[2025-06-01]');
  });

  it('formats arXiv preprints with new 2025 [PP/OL] code and mandatory accessed date', () => {
    const bib = `
@misc{jenkins2012,
  author = {Jenkins, S. D. and Ruostekoski, J.},
  title = {Controlled manipulation of light by cooperative response of atoms in an optical lattice},
  archivePrefix = {arXiv},
  eprint = {1112.6136},
  version = {V2},
  date = {2012-03-18},
  urldate = {2020-06-24}
}`;
    const items = parseLocalCitations(bib);
    const out = formatCitation(items[0], { style: 'gbt7714-2025-numeric', index: 1 });
    expect(out.text).toBe(
      '[1] Jenkins S D, Ruostekoski J. Controlled manipulation of light by cooperative response of atoms in an optical lattice[PP/OL]. V2. arXiv (2012-03-18) [2020-06-24]. https://arxiv.org/abs/1112.6136.'
    );
  });

  it('formats 2025 Author-Date (著者-出版年制) with comma between author and year', () => {
    const items = parseLocalCitations(
      '[1] 张伯伟. 全唐五代诗格汇考[M]. 南京: 江苏古籍出版社, 2002: 288.'
    );
    const out = formatCitation(items[0], { style: 'gbt7714-2025-author-date' });
    expect(out.text).toBe('张伯伟, 2002. 全唐五代诗格汇考[M]. 南京: 江苏古籍出版社: 288.');
  });
});

describe('CNKI Messy Text Cleaning & Legacy 2015 Upgrading', () => {
  it('cleans intra-Chinese spaces, broken line wraps, fullwidth brackets, and obsolete [引用日期]', () => {
    const messyCnki = `[1] 张 群 , 程 志 宝 , 石 志 飞 , 等 . 惯 性 增 强 动 力 吸 振 器 减 振 性 能 研
究 ［J/OL］. 铁 道 学 报 , 2024 , 46 (05) : 12 - 20 [2025-03-10]. DOI: 10.3969/j.issn.1001-8360.2024.05.002.`;

    const items = parseLocalCitations(messyCnki);
    expect(items).toHaveLength(1);
    const out = formatCitation(items[0], { style: 'gbt7714-2025-numeric', index: 1 });

    expect(out.text).toBe(
      '[1] 张群, 程志宝, 石志飞, 等. 惯性增强动力吸振器减振性能研究[J/OL]. 铁道学报, 2024, 46(05): 12-20. DOI:10.3969/j.issn.1001-8360.2024.05.002.'
    );
    expect(out.notes.length).toBeGreaterThanOrEqual(2);
  });

  it('correctly parses Chinese journals without volume number like 2023(5): 45-62', () => {
    const items = parseLocalCitations(
      '[1] 王利平, 刘洪. 现代治理体系演进研究[J]. 中国社会科学, 2023(5): 45-62.'
    );
    const out = formatCitation(items[0], { style: 'gbt7714-2025-numeric', index: 1 });
    expect(items[0].year).toBe('2023');
    expect(items[0].volume).toBeUndefined();
    expect(items[0].issue).toBe('5');
    expect(out.text).toBe('[1] 王利平, 刘洪. 现代治理体系演进研究[J]. 中国社会科学, 2023(5): 45-62.');
  });

  it('parses RIS exported from Zotero / ScienceDirect', () => {
    const ris = `TY  - JOUR
AU  - Vaswani, Ashish
AU  - Shazeer, Noam
AU  - Parmar, Niki
AU  - Uszkoreit, Jakob
TI  - Attention is all you need
JO  - Advances in Neural Information Processing Systems
PY  - 2017
VL  - 30
SP  - 5998
EP  - 6008
ER  -`;
    const items = parseLocalCitations(ris);
    const out = formatCitation(items[0], { style: 'gbt7714-2025-numeric', index: 1 });
    expect(out.text).toBe(
      '[1] Vaswani A, Shazeer N, Parmar N, et al. Attention is all you need[J]. Advances in Neural Information Processing Systems, 2017, 30: 5998-6008.'
    );
  });
});

describe('Mutual Conversion between APA 7th, IEEE, and GB/T 7714—2025', () => {
  it('converts IEEE formatted citation to GB/T 7714—2025 and APA 7th with Word italics', () => {
    const ieee =
      '[1] K. He, X. Zhang, S. Ren, and J. Sun, "Deep residual learning for image recognition," in Proc. IEEE Conf. Comput. Vis. Pattern Recognit. (CVPR), 2016, pp. 770-778, doi: 10.1109/CVPR.2016.90.';
    const items = parseLocalCitations(ieee);

    const gbt = formatCitation(items[0], { style: 'gbt7714-2025-numeric', index: 1 });
    expect(gbt.text).toBe(
      '[1] He K, Zhang X, Ren S, et al. Deep residual learning for image recognition[C/OL]//Proc. IEEE Conf. Comput. Vis. Pattern Recognit. (CVPR), 2016: 770-778. DOI:10.1109/CVPR.2016.90.'
    );

    const apa = formatCitation(items[0], { style: 'apa-7' });
    expect(apa.html).toContain('<i>Proc. IEEE Conf. Comput. Vis. Pattern Recognit. (CVPR)</i>');
    expect(apa.text).toContain('He, K., Zhang, X., Ren, S., & Sun, J. (2016).');
  });

  it('converts APA 7th formatted citation to GB/T 7714—2025 and IEEE with italics', () => {
    const apaInput =
      'Silver, D., Huang, A., Maddison, C. J., & Hassabis, D. (2016). Mastering the game of Go with deep neural networks and tree search. Nature, 529(7587), 484–489. https://doi.org/10.1038/nature16961';
    const items = parseLocalCitations(apaInput);

    const gbtList = formatCitationList(items, { style: 'gbt7714-2025-numeric' });
    expect(gbtList[0].text).toBe(
      '[1] Silver D, Huang A, Maddison C J, et al. Mastering the game of Go with deep neural networks and tree search[J/OL]. Nature, 2016, 529(7587): 484-489. DOI:10.1038/nature16961.'
    );

    const ieeeOut = formatCitation(items[0], { style: 'ieee', index: 1 });
    expect(ieeeOut.html).toBe(
      '[1] D. Silver, A. Huang, C. J. Maddison, and D. Hassabis, "Mastering the game of Go with deep neural networks and tree search," <i>Nature</i>, vol. 529, no. 7587, pp. 484–489, 2016, doi: 10.1038/nature16961.'
    );
  });

  it('parses mixed batch containing 2015 GB/T, messy CNKI, and BibTeX in exact order', () => {
    const items = parseLocalCitations(SAMPLE_PRESETS.default.input);
    expect(items).toHaveLength(3);
    const out = formatCitationList(items, { style: 'gbt7714-2025-numeric' });
    expect(out[0].text).toContain('[1] Myburg A A, Grattapaglia D, Tuskan G A, et al.');
    expect(out[1].text).toContain('[2] 张群, 程志宝, 石志飞, 等. 惯性增强动力吸振器减振性能研究[J/OL].');
    expect(out[2].text).toContain('[3] Vaswani A, Shazeer N, Parmar N, et al. Attention is all you need[PP/OL].');
  });
});
