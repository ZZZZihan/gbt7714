import type { CitationItem, ResourceType, AuthorName } from '../types';
import { parseAuthor, hasCJK, cleanChineseSpaces } from '../authors';

/**
 * Merge broken wrapped lines from PDF / CNKI exports into logical single-reference lines.
 */
export function splitLogicalReferenceLines(rawText: string): string[] {
  const rawLines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (rawLines.length <= 1) return rawLines;

  // Check if lines have explicit numbering like [1], 1., (1)
  const numberedCount = rawLines.filter((l) => /^(?:\[\d+\]|［\d+］|\(\d+\)|\d+[.、])\s*/.test(l)).length;
  if (numberedCount >= 1) {
    const merged: string[] = [];
    for (const line of rawLines) {
      if (/^(?:\[\d+\]|［\d+］|\(\d+\)|\d+[.、])\s*/.test(line) || merged.length === 0) {
        merged.push(line);
      } else {
        const prev = merged[merged.length - 1];
        const joinChar = /[A-Za-z0-9]$/.test(prev) && /^[A-Za-z0-9]/.test(line) && !prev.endsWith('/') && !prev.endsWith('-') ? ' ' : '';
        merged[merged.length - 1] = `${prev}${joinChar}${line}`;
      }
    }
    return merged;
  }

  // Unnumbered: merge continuation lines if previous line doesn't end a complete reference
  const merged: string[] = [];
  for (const line of rawLines) {
    if (merged.length === 0) {
      merged.push(line);
      continue;
    }
    const prev = merged[merged.length - 1];
    const prevLooksComplete =
      /(?:\.\s*$|。\s*$|https?:\/\/\S+$|10\.\d{4,9}\/\S+$|\d+\s*[-–]\s*\d+\s*\.?$)/.test(prev) &&
      prev.length > 35;
    if (prevLooksComplete) {
      merged.push(line);
    } else {
      const joinChar = /[一-鿿]$/.test(prev) && /^[一-鿿]/.test(line) ? '' : ' ';
      merged[merged.length - 1] = `${prev}${joinChar}${line}`;
    }
  }
  return merged;
}

function normalizeCommonPunctuation(raw: string, notes: string[]): string {
  let s = raw.replace(/　/g, ' ');

  // Detect intra-Chinese spaces common in CNKI copy-paste (e.g. "张 群 , 惯 性 增 强")
  const cjkSpaceMatches = s.match(/([一-鿿])\s+([一-鿿])/g);
  if (cjkSpaceMatches && cjkSpaceMatches.length >= 2) {
    s = cleanChineseSpaces(s);
    notes.push('已清除知网/PDF 文本中的汉字间断字空格');
  }

  // Normalize fullwidth brackets around type codes ［J］ -> [J], 【M】 -> [M], 〔C〕 -> [C]
  if (/[［【〔]\s*[A-Z]{1,2}(?:\/[A-Z]{2})?\s*[］】〕]/.test(s)) {
    s = s.replace(/[［【〔]\s*([A-Z]{1,2}(?:\/[A-Z]{2})?)\s*[］】〕]/g, '[$1]');
    notes.push('已将全角文献标识括号统一为半角 [ ]');
  }

  // Clean stray spaces around punctuation without breaking URLs (https://), DOIs (DOI:10.), or quoted commas (," )
  s = s
    .replace(/^\s*(?:\[\d+\]|［\d+］|\(\d+\)|\d+[.、])\s*/, '')
    .replace(/\s+([，,；;：:])/g, '$1')
    .replace(/([，,；;])(?!["”'])/g, '$1 ')
    .replace(/([：:])(?![/0-9])/g, '$1 ')
    .replace(/\s*\.\s+/g, '. ')
    .replace(/\s*([-–—－])\s*(?=\d)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  return s;
}

function mapGBTCodeToType(code: string, hasDoubleSlash: boolean): ResourceType {
  const base = code.split('/')[0].toUpperCase();
  switch (base) {
    case 'J': return 'article-journal';
    case 'N': return 'article-newspaper';
    case 'M': return hasDoubleSlash ? 'chapter' : 'book';
    case 'C': return 'paper-conference';
    case 'D': return 'thesis';
    case 'R': return 'report';
    case 'S': return 'standard';
    case 'P': return 'patent';
    case 'EB': return 'webpage';
    case 'A': return 'archive';
    case 'CM': return 'map';
    case 'DS': return 'dataset';
    case 'PP': return 'preprint';
    default: return 'article-journal';
  }
}

function isInitialToken(tok: string): boolean {
  return /^[A-Z]\.?(-[A-Z]\.?)*(\s+[A-Z]\.?)*$/i.test(tok.trim()) && tok.replace(/[^A-Za-z]/g, '').length <= 3;
}

function parseAuthorGroup(rawAuthors: string, notes: string[]): { authors: AuthorName[]; hasEtAl: boolean } {
  let s = rawAuthors.trim().replace(/[.,，。]+$/, '');
  let hasEtAl = false;

  if (/(?:[,，]\s*)?(?:et\s+al\.?|等)\s*$/i.test(s)) {
    hasEtAl = true;
    s = s.replace(/(?:[,，]\s*)?(?:et\s+al\.?|等)\s*$/i, '').trim();
  }

  // Detect 2015 ALL-CAPS surnames like "EINSTEIN A" or "LI Jiangning"
  if (/\b[A-Z]{2,}(?:-[A-Z]{2,})?\s+[A-Z](?:\b|[a-z])/.test(s)) {
    notes.push('已将 2015 版全大写作者姓氏转为 2025 版首字母大写');
  }

  const rawTokens = s
    .split(/[,，;；、]+|\s+and\s+/i)
    .map((t) => t.trim())
    .filter(Boolean);

  // Recombine "Family, GivenInitial" where given name is a short Latin initial (e.g. "Brown", "M")
  const tokens: string[] = [];
  for (let i = 0; i < rawTokens.length; i++) {
    const cur = rawTokens[i];
    const next = rawTokens[i + 1];
    if (next && isInitialToken(next) && !isInitialToken(cur) && !hasCJK(cur)) {
      tokens.push(`${cur}, ${next}`);
      i++;
    } else {
      tokens.push(cur);
    }
  }

  const authors = tokens.map((tok) => parseAuthor(tok));
  return { authors, hasEtAl };
}

/**
 * Parse GB/T 7714 (2015 / 2025 / CNKI messy) formatted citation line
 */
function parseGBTLine(cleaned: string, idx: number, notes: string[]): CitationItem | null {
  const codeMatch = cleaned.match(/\[\s*([A-Z]{1,2}(?:\/[A-Z]{2})?)\s*\]/);
  if (!codeMatch || codeMatch.index === undefined) return null;

  const rawCode = codeMatch[1].toUpperCase();
  const isOnlineCode = rawCode.includes('/OL');
  const beforeCode = cleaned.slice(0, codeMatch.index).trim();
  let afterCode = cleaned.slice(codeMatch.index + codeMatch[0].length).trim();

  const hasDoubleSlash = afterCode.startsWith('//') || afterCode.startsWith('. //');
  const type = mapGBTCodeToType(rawCode, hasDoubleSlash);

  // Extract CSTR, DOI, and URLs from afterCode
  let cstr: string | undefined;
  const cstrMatch = afterCode.match(/CSTR:\s*([^\s.。]+(?:\.[^\s.。]+)*)/i);
  if (cstrMatch) {
    cstr = cstrMatch[1].replace(/\.$/, '');
  }

  let doi: string | undefined;
  const doiMatch = afterCode.match(/(?:DOI:\s*|https?:\/\/(?:dx\.)?doi\.org\/)(10\.\d{4,9}\/[^\s。]+)/i);
  if (doiMatch) {
    doi = doiMatch[1].replace(/[.,;。]+$/, '');
    afterCode = afterCode.replace(doiMatch[0], ' ').trim();
  }

  let url: string | undefined;
  const urlMatch = afterCode.match(/https?:\/\/[^\s。]+/i);
  if (urlMatch) {
    url = urlMatch[0].replace(/[.,;。]+$/, '');
    afterCode = afterCode.replace(urlMatch[0], ' ').trim();
  }
  if (cstrMatch && (!url || !url.includes(cstrMatch[0]))) {
    afterCode = afterCode.replace(cstrMatch[0], ' ').trim();
  }

  // Extract [YYYY-MM-DD] accessed date
  let accessedDate: string | undefined;
  const accMatch = afterCode.match(/\[\s*(\d{4}-\d{1,2}-\d{1,2})\s*\]/);
  if (accMatch) {
    accessedDate = accMatch[1];
    afterCode = afterCode.replace(accMatch[0], ' ').trim();
    if (type === 'article-journal') {
      notes.push('已按 2025 国标移除在线期刊多余的 [引用日期]');
    }
  }

  // Split beforeCode into Authors and Title
  let authors: AuthorName[] = [];
  let hasEtAl = false;
  let title = beforeCode;
  let subtitle: string | undefined;
  let number: string | undefined;

  if (type === 'standard') {
    // e.g. "GB/T 3792-2021 信息与文献资源描述" or "全国信息... GB/T 3792-2021 题名"
    const stdDot = beforeCode.indexOf('. ');
    if (stdDot !== -1 && !/^(?:GB|ISO|IEC|NB|DB|QB|JT)/i.test(beforeCode)) {
      const ag = parseAuthorGroup(beforeCode.slice(0, stdDot), notes);
      authors = ag.authors;
      hasEtAl = ag.hasEtAl;
      title = beforeCode.slice(stdDot + 2).trim();
    }
  } else {
    // Split on first `. ` or `．` (careful not to split inside initials like `Einstein A.` -> in GBT, `Einstein A. Title` IS the split!)
    const firstDot = beforeCode.match(/^(.+?)[.．。]\s*(.+)$/);
    if (firstDot && type !== 'webpage') {
      const ag = parseAuthorGroup(firstDot[1], notes);
      authors = ag.authors;
      hasEtAl = ag.hasEtAl;
      title = firstDot[2].trim();
    } else if (firstDot && type === 'webpage') {
      const ag = parseAuthorGroup(firstDot[1], notes);
      authors = ag.authors;
      hasEtAl = ag.hasEtAl;
      title = firstDot[2].trim();
    }
  }

  // Check patent / archive number or subtitle after colon in title
  const colonMatch = title.match(/^(.+?)[：:]\s*(.+)$/);
  if (colonMatch) {
    if (type === 'patent' || type === 'archive') {
      title = colonMatch[1].trim();
      number = colonMatch[2].trim();
    } else {
      title = colonMatch[1].trim();
      subtitle = colonMatch[2].trim();
    }
  }

  // Clean leading dot/slash from afterCode
  afterCode = afterCode.replace(/^[.．。]\s*/, '').trim();

  let containerTitle: string | undefined;
  let publisher: string | undefined;
  let place: string | undefined;
  let year: string | undefined;
  let date: string | undefined;
  let volume: string | undefined;
  let issue: string | undefined;
  let pages: string | undefined;
  let version: string | undefined;
  let edition: string | undefined;

  if (type === 'article-journal') {
    // Patterns:
    // 1. "清华大学学报(自然科学版), 2012, 52(11): 1518-1523."
    // 2. "中国社会科学, 2023(5): 45-62." (Year directly followed by (Issue)!)
    // 3. "Nature, 2014, 510: 356-362."
    // 4. "铁道学报, 2024-05-09." (CNKI Online-First!)
    const tail = afterCode.replace(/[.．。]+$/, '').trim();
    const onlineFirst = tail.match(/^(.+?)[,，]\s*(\d{4}-\d{1,2}-\d{1,2})(?:[：:]\s*([\w-]+))?$/);
    const yearIssueNoVol = tail.match(/^(.+?)[,，]\s*((?:19|20)\d{2})\s*\(([^)]+)\)(?:[：:]\s*([\w–—－-]+))?$/);
    const fullVolIssue = tail.match(
      /^(.+?)[,，]\s*((?:19|20)\d{2})(?:[,，]\s*([^(:：,，]+?))?\s*(?:\(([^)]+)\))?(?:\s*[：:]\s*([\w–—－\s-]+))?$/
    );

    if (onlineFirst) {
      containerTitle = onlineFirst[1].trim();
      date = onlineFirst[2];
      year = date.slice(0, 4);
      pages = onlineFirst[3]?.trim();
    } else if (yearIssueNoVol) {
      containerTitle = yearIssueNoVol[1].trim();
      year = yearIssueNoVol[2];
      issue = yearIssueNoVol[3].trim();
      pages = yearIssueNoVol[4]?.trim();
    } else if (fullVolIssue) {
      containerTitle = fullVolIssue[1].trim();
      year = fullVolIssue[2];
      volume = fullVolIssue[3]?.trim();
      issue = fullVolIssue[4]?.trim();
      pages = fullVolIssue[5]?.trim();
    } else {
      containerTitle = tail;
    }
  } else if (hasDoubleSlash) {
    // "//许厚泽, 赵其国. 长江流域洪涝灾害与科技对策. 北京: 科学出版社, 1999: 32-36."
    // or "//CVPR, 2024: 4."
    const rest = afterCode.replace(/^\/\/\s*/, '').replace(/[.．。]+$/, '').trim();
    const parts = rest.split(/[.．]\s*/).filter(Boolean);
    const lastSeg = parts[parts.length - 1] || '';
    const pubMatch = lastSeg.match(/^(?:([^:：,，]+)[：:]\s*)?([^,，:：]+?)[,，]\s*((?:19|20)\d{2})(?:[：:]\s*([\w–—－-]+))?$/);
    if (pubMatch) {
      if (parts.length === 1) {
        // e.g. "//CVPR, 2024: 4"
        containerTitle = pubMatch[2].trim();
      } else {
        place = pubMatch[1]?.trim();
        publisher = pubMatch[2].trim();
        containerTitle = parts[parts.length - 2]?.trim();
      }
      year = pubMatch[3];
      pages = pubMatch[4]?.trim();
    } else {
      containerTitle = rest;
    }
  } else if (type === 'dataset' || type === 'preprint' || type === 'webpage') {
    const rest = afterCode.replace(/[.．。]+$/, '').trim();
    const verMatch = rest.match(/^(V\d+(?:\.\d+)?)[.．]\s*(.+)$/i);
    const body = verMatch ? verMatch[2] : rest;
    if (verMatch) version = verMatch[1];

    const dateParen = body.match(/^(.*?)\s*[（(](\d{4}(?:-\d{1,2}-\d{1,2})?)[)）]/);
    if (dateParen) {
      publisher = dateParen[1].replace(/[.．]+$/, '').trim() || undefined;
      containerTitle = publisher;
      if (dateParen[2].length === 4) year = dateParen[2];
      else {
        date = dateParen[2];
        year = date.slice(0, 4);
      }
    } else if (body) {
      publisher = body;
      containerTitle = body;
    }
  } else {
    // Book, Thesis, Report, Patent
    const rest = afterCode.replace(/[.．。]+$/, '').trim();
    const edMatch = rest.match(/^((?:第?\s*\d+\s*版|\d+(?:st|nd|rd|th)\s+ed\.?))[.．]\s*(.+)$/i);
    const pubPart = edMatch ? edMatch[2] : rest;
    if (edMatch) edition = edMatch[1];

    const dateOnly = pubPart.match(/^(\d{4}-\d{1,2}-\d{1,2})(?:[：:]\s*([\w–—－-]+))?$/);
    const placePubYear = pubPart.match(
      /^(?:([^:：,，]+)[：:]\s*)?([^,，:：]+?)[,，]\s*((?:19|20)\d{2})(?:[：:]\s*([\w–—－-]+))?$/
    );

    if (dateOnly) {
      date = dateOnly[1];
      year = date.slice(0, 4);
      pages = dateOnly[2]?.trim();
    } else if (placePubYear) {
      place = placePubYear[1]?.trim();
      publisher = placePubYear[2]?.trim();
      year = placePubYear[3];
      pages = placePubYear[4]?.trim();
    } else {
      const ym = pubPart.match(/\b((?:19|20)\d{2})\b/);
      if (ym) year = ym[1];
      publisher = pubPart.replace(/[,，]?\s*(?:19|20)\d{2}.*$/, '').trim() || undefined;
    }
  }

  const isSourceCnki = notes.some((n) => n.includes('知网') || n.includes('全角'));

  return {
    id: `gbt-${idx + 1}`,
    type,
    authors,
    hasEtAl: hasEtAl || undefined,
    title: hasCJK(title) ? cleanChineseSpaces(title) : title,
    subtitle: subtitle ? (hasCJK(subtitle) ? cleanChineseSpaces(subtitle) : subtitle) : undefined,
    containerTitle: containerTitle ? (hasCJK(containerTitle) ? cleanChineseSpaces(containerTitle) : containerTitle) : undefined,
    publisher: publisher ? (hasCJK(publisher) ? cleanChineseSpaces(publisher) : publisher) : undefined,
    place: place ? (hasCJK(place) ? cleanChineseSpaces(place) : place) : undefined,
    edition,
    version,
    number,
    year,
    date,
    accessedDate,
    volume,
    issue,
    pages,
    doi,
    cstr,
    url,
    isOnline: isOnlineCode || Boolean(url || doi || cstr),
    sourceKind: isSourceCnki ? 'cnki' : 'gbt',
    notes,
  };
}

/**
 * Parse IEEE formatted citation line:
 * [1] K. He, X. Zhang, S. Ren, and J. Sun, "Deep residual learning for image recognition," in Proc. IEEE CVPR, 2016, pp. 770-778, doi: 10.1109/CVPR.2016.90.
 */
function parseIEEELine(cleaned: string, idx: number, notes: string[]): CitationItem | null {
  const quoteMatch = cleaned.match(/^(.+?),\s*(?:"|“)(.+?)(?:,"|,”|"\s*,|”\s*,)\s*(.+)$/);
  if (!quoteMatch) return null;

  const [, rawAuthors, rawTitle, rawTail] = quoteMatch;
  let authorPart = rawAuthors.trim();
  let hasEtAl = false;
  if (/\bet\s+al\.?$/i.test(authorPart)) {
    hasEtAl = true;
    authorPart = authorPart.replace(/,?\s*\bet\s+al\.?$/i, '').trim();
  }

  const authorTokens = authorPart
    .replace(/,\s+and\s+|\s+and\s+/gi, ', ')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const authors = authorTokens.map(parseAuthor);

  let tail = rawTail.trim();
  let doi: string | undefined;
  const doiMatch = tail.match(/\bdoi:\s*(10\.\d{4,9}\/[^\s,]+)/i);
  if (doiMatch) {
    doi = doiMatch[1].replace(/\.$/, '');
    tail = tail.replace(doiMatch[0], ' ');
  }

  let url: string | undefined;
  const urlMatch = tail.match(/\[Online\]\.\s*Available:\s*(https?:\/\/\S+)/i) || tail.match(/(https?:\/\/\S+)/i);
  if (urlMatch) {
    url = urlMatch[1].replace(/\.$/, '');
    tail = tail.replace(urlMatch[0], ' ');
  }

  let volume: string | undefined;
  const volMatch = tail.match(/\bvol\.\s*([\w-]+)/i);
  if (volMatch) {
    volume = volMatch[1];
    tail = tail.replace(volMatch[0], ' ');
  }

  let issue: string | undefined;
  const noMatch = tail.match(/\bno\.\s*([\w-]+)/i);
  if (noMatch) {
    issue = noMatch[1];
    tail = tail.replace(noMatch[0], ' ');
  }

  let pages: string | undefined;
  const ppMatch = tail.match(/\bpp?\.\s*([\d–—－eE-]+|\d+)/i);
  if (ppMatch) {
    pages = ppMatch[1].replace(/[–—－]/g, '-');
    tail = tail.replace(ppMatch[0], ' ');
  }

  let articleNumber: string | undefined;
  const artMatch = tail.match(/\bArt\.\s*no\.\s*([\w-]+)/i);
  if (artMatch) {
    articleNumber = artMatch[1];
    tail = tail.replace(artMatch[0], ' ');
  }

  let year: string | undefined;
  const yearMatch = tail.match(/\b((?:19|20)\d{2})\b/);
  if (yearMatch) {
    year = yearMatch[1];
    tail = tail.replace(yearMatch[0], ' ');
  }

  // Clean month names and leftover commas to get containerTitle
  const containerRaw = tail
    .replace(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\b/gi, '')
    .split(',')
    .map((s) => s.replace(/[.]+$/, '').trim())
    .filter(Boolean);

  const firstContainer = containerRaw[0] || '';
  const isConf = /^in\s+/i.test(firstContainer) || /\b(?:Proc\.|Conf\.|Symp\.|Workshop|CVPR|ICCV|NeurIPS|ICML|ICLR|AAAI|ACL)\b/i.test(firstContainer);
  const isArxiv = /\barxiv:/i.test(tail) || /\barxiv\b/i.test(firstContainer);
  const containerTitle = firstContainer.replace(/^in\s+/i, '').trim();

  let type: ResourceType = 'article-journal';
  if (isArxiv) type = 'preprint';
  else if (isConf) type = 'paper-conference';

  return {
    id: `ieee-${idx + 1}`,
    type,
    authors,
    hasEtAl: hasEtAl || undefined,
    title: rawTitle.trim(),
    containerTitle: containerTitle || (isArxiv ? 'arXiv' : undefined),
    publisher: isArxiv ? 'arXiv' : undefined,
    place: isConf && containerRaw.length > 1 ? containerRaw[1] : undefined,
    year,
    volume,
    issue,
    pages,
    articleNumber,
    doi,
    url,
    isOnline: Boolean(doi || url || isArxiv),
    sourceKind: 'ieee',
    notes,
  };
}

function parseAPAAuthors(rawAuthors: string): { authors: AuthorName[]; hasEtAl: boolean } {
  let s = rawAuthors.trim();
  let hasEtAl = false;
  if (/et\s+al\.?$/i.test(s)) {
    hasEtAl = true;
    s = s.replace(/,?\s*et\s+al\.?$/i, '');
  }
  s = s.replace(/,\s*&\s*/g, ' | ').replace(/\s+&\s+/g, ' | ').replace(/,\s*\.\.\.\s*/g, ' | ');

  const authors: AuthorName[] = [];
  for (const chunk of s.split('|').map((c) => c.trim()).filter(Boolean)) {
    if (hasCJK(chunk)) {
      chunk.replace(/\.$/, '').split(/[,，、;；]+/).map((z) => z.trim()).filter(Boolean).forEach((z) => authors.push(parseAuthor(z)));
      continue;
    }
    // Pair `Surname, I. I.` segments: split on `, ` followed by Surname (not initials)
    const parts = chunk.split(/,\s+/).filter(Boolean);
    let i = 0;
    while (i < parts.length) {
      const cur = parts[i];
      const next = parts[i + 1];
      if (next && /^(?:[A-Z]\.[\s-]*)+$/.test(next)) {
        const third = parts[i + 2];
        if (third && /^(?:Jr|Sr|II|III|IV)\.?$/i.test(third)) {
          authors.push(parseAuthor(`${cur}, ${next}, ${third}`));
          i += 3;
        } else {
          authors.push(parseAuthor(`${cur}, ${next}`));
          i += 2;
        }
      } else {
        authors.push(parseAuthor(cur));
        i += 1;
      }
    }
  }
  return { authors, hasEtAl };
}

/**
 * Parse APA 7th formatted citation line:
 * Vaswani, A., Shazeer, N., & Parmar, N. (2017). Attention is all you need. Advances in Neural Information Processing Systems, 30, 5998–6008. https://doi.org/10.xxxx
 */
function parseAPALine(cleaned: string, idx: number, notes: string[]): CitationItem | null {
  const apaMatch = cleaned.match(/^(.+?)\s*\(((?:19|20)\d{2}[a-z]?(?:,\s*[A-Za-z]+\s*\d{1,2})?|n\.d\.)\)\.\s*(.+)$/i);
  if (!apaMatch) return null;

  const [, rawAuthors, rawYear, rawRest] = apaMatch;
  const { authors, hasEtAl } = parseAPAAuthors(rawAuthors);
  const year = rawYear.match(/\d{4}/)?.[0];

  let rest = rawRest.trim();
  let doi: string | undefined;
  let url: string | undefined;

  const doiUrlMatch = rest.match(/https?:\/\/(?:dx\.)?doi\.org\/(10\.\d{4,9}\/\S+)/i);
  if (doiUrlMatch) {
    doi = doiUrlMatch[1].replace(/\.$/, '');
    rest = rest.replace(doiUrlMatch[0], '').trim();
  } else {
    const bareDoi = rest.match(/\bdoi:\s*(10\.\d{4,9}\/\S+)/i);
    if (bareDoi) {
      doi = bareDoi[1].replace(/\.$/, '');
      rest = rest.replace(bareDoi[0], '').trim();
    }
    const uMatch = rest.match(/https?:\/\/\S+/i);
    if (uMatch) {
      url = uMatch[0].replace(/\.$/, '');
      rest = rest.replace(uMatch[0], '').trim();
    }
  }

  // Split remaining into Title and Source: `Title. Journal, Vol(Issue), Pages.`
  const sentSplit = rest.match(/^(.+?[.?!])\s+(.+)$/);
  if (!sentSplit) {
    return {
      id: `apa-${idx + 1}`,
      type: 'book',
      authors,
      hasEtAl: hasEtAl || undefined,
      title: rest.replace(/\.$/, ''),
      year,
      doi,
      url,
      isOnline: Boolean(doi || url),
      sourceKind: 'apa',
      notes,
    };
  }

  let title = sentSplit[1].replace(/\.$/, '').trim();
  const sourcePart = sentSplit[2].replace(/\.$/, '').trim();

  // Check bracketed descriptor in title like `[Preprint]` / `[Data set]` / `[Doctoral dissertation, University]`
  let type: ResourceType = 'article-journal';
  let publisher: string | undefined;
  let containerTitle: string | undefined;
  let volume: string | undefined;
  let issue: string | undefined;
  let pages: string | undefined;

  if (/\[Preprint\]/i.test(title)) {
    type = 'preprint';
    title = title.replace(/\s*\[Preprint\]/i, '').trim();
    publisher = sourcePart;
    containerTitle = sourcePart;
  } else if (/\[Data\s*set\]/i.test(title)) {
    type = 'dataset';
    title = title.replace(/\s*\[Data\s*set\]/i, '').trim();
    publisher = sourcePart;
    containerTitle = sourcePart;
  } else if (/\[(?:Doctoral|Master's|Thesis)/i.test(title)) {
    type = 'thesis';
    const uniMatch = title.match(/\[[^,\]]+,\s*([^\]]+)\]/);
    if (uniMatch) publisher = uniMatch[1].trim();
    title = title.replace(/\s*\[[^\]]+\]/, '').trim();
  } else if (/^In\s+/i.test(sourcePart)) {
    type = 'paper-conference';
    const inMatch = sourcePart.match(/^In\s+(.+?)(?:\s*\(pp\.\s*([\d–—-]+)\))?(?:\.\s*(.+))?$/i);
    if (inMatch) {
      containerTitle = inMatch[1].trim();
      pages = inMatch[2]?.replace(/[–—]/g, '-');
      publisher = inMatch[3]?.trim();
    } else {
      containerTitle = sourcePart.replace(/^In\s+/i, '');
    }
  } else {
    // Journal pattern: `Journal Name, 52(11), 1518–1523` or `Journal Name, 30, 5998–6008`
    const jMatch = sourcePart.match(/^(.+?),\s*(\d+)(?:\(([^)]+)\))?(?:,\s*([\w–—-]+))?$/);
    if (jMatch) {
      type = 'article-journal';
      containerTitle = jMatch[1].trim();
      volume = jMatch[2];
      issue = jMatch[3]?.trim();
      pages = jMatch[4]?.replace(/[–—]/g, '-');
    } else {
      // Book: `Publisher`
      type = 'book';
      publisher = sourcePart;
    }
  }

  return {
    id: `apa-${idx + 1}`,
    type,
    authors,
    hasEtAl: hasEtAl || undefined,
    title,
    containerTitle,
    publisher,
    year,
    volume,
    issue,
    pages,
    doi,
    url,
    isOnline: Boolean(doi || url || type === 'preprint' || type === 'dataset'),
    sourceKind: 'apa',
    notes,
  };
}

/**
 * Fallback parser for unstructured CNKI / plain citation without `[J]` tag:
 * e.g. "张群, 程志宝. 惯性增强动力吸振器研究. 铁道学报, 2024, 46(5): 1-10."
 */
function parseFallbackPlainLine(cleaned: string, idx: number, notes: string[]): CitationItem {
  const parts = cleaned.split(/[.．。]\s*/).filter(Boolean);
  if (parts.length >= 3) {
    const { authors, hasEtAl } = parseAuthorGroup(parts[0], notes);
    const title = parts[1].trim();
    const rest = parts.slice(2).join('. ');
    const jMatch = rest.match(/^([^,，]+)[,，]\s*((?:19|20)\d{2})(?:[,，]\s*(\d+))?(?:\(([^)]+)\))?(?:[：:]\s*([\w–—－-]+))?/);
    if (jMatch) {
      notes.push('原文本缺少文献类型标识，已自动识别为期刊论文 [J]');
      return {
        id: `plain-${idx + 1}`,
        type: 'article-journal',
        authors,
        hasEtAl: hasEtAl || undefined,
        title,
        containerTitle: jMatch[1].trim(),
        year: jMatch[2],
        volume: jMatch[3],
        issue: jMatch[4],
        pages: jMatch[5]?.replace(/[–—－]/g, '-'),
        sourceKind: 'cnki',
        notes,
      };
    }
  }

  notes.push('未能完全识别全部字段，可点击「核对字段」补充信息');
  return {
    id: `plain-${idx + 1}`,
    type: 'article-journal',
    authors: [],
    title: cleaned.replace(/[.。]+$/, ''),
    sourceKind: 'plain',
    notes,
  };
}

export function parseFormattedLines(input: string): CitationItem[] {
  const lines = splitLogicalReferenceLines(input);
  return lines.map((rawLine, idx) => {
    const notes: string[] = [];
    const cleaned = normalizeCommonPunctuation(rawLine, notes);

    const gbt = parseGBTLine(cleaned, idx, notes);
    if (gbt) return gbt;

    const ieee = parseIEEELine(cleaned, idx, notes);
    if (ieee) return ieee;

    const apa = parseAPALine(cleaned, idx, notes);
    if (apa) return apa;

    return parseFallbackPlainLine(cleaned, idx, notes);
  });
}
