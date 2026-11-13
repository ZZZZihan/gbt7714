import type { CitationItem, ResourceType, AuthorName } from '../types';
import { isLikelyPinyinName, normalizeSurnameCase, hasCJK, cleanChineseSpaces } from '../authors';

const DOI_BARE_RE = /^10\.\d{4,9}\/[-._;()/:A-Za-z0-9<>[\]]+$/i;
const DOI_URL_RE = /^https?:\/\/(?:dx\.)?doi\.org\/(10\.\d{4,9}\/\S+)$/i;
const ARXIV_RE = /^(?:arXiv:|https?:\/\/arxiv\.org\/(?:abs|pdf)\/)(\d{4}\.\d{4,5})(v\d+)?(?:\.pdf)?$/i;

export function extractStandaloneDoi(line: string): { doi: string; arxivVersion?: string } | null {
  const cleaned = line
    .trim()
    .replace(/^\[\d+\]\s*/, '')
    .replace(/^doi:\s*/i, '')
    .replace(/[.,;，；]+$/, '')
    .trim();

  if (!cleaned || cleaned.includes(' ')) return null;

  const urlMatch = cleaned.match(DOI_URL_RE);
  if (urlMatch) {
    return { doi: decodeURIComponent(urlMatch[1]).replace(/[.,;]+$/, '') };
  }

  const arxivMatch = cleaned.match(ARXIV_RE);
  if (arxivMatch) {
    return {
      doi: `10.48550/arXiv.${arxivMatch[1]}`,
      arxivVersion: arxivMatch[2] ? arxivMatch[2].toUpperCase() : undefined,
    };
  }

  if (DOI_BARE_RE.test(cleaned)) {
    return { doi: cleaned };
  }

  return null;
}

export function findEmbeddedDoi(text: string): string | undefined {
  const m = text.match(/\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/i);
  if (!m) return undefined;
  return m[1].replace(/[.,;)\]}>]+$/, '');
}

function mapCrossrefType(crType?: string, publisher?: string, doi?: string): ResourceType {
  if (doi && /^10\.48550\/arxiv\./i.test(doi)) return 'preprint';
  switch (crType) {
    case 'journal-article': return 'article-journal';
    case 'proceedings-article': return 'paper-conference';
    case 'book':
    case 'monograph':
    case 'edited-book':
    case 'reference-book': return 'book';
    case 'book-chapter':
    case 'book-section':
    case 'book-part': return 'chapter';
    case 'dissertation': return 'thesis';
    case 'report':
    case 'report-component': return 'report';
    case 'standard': return 'standard';
    case 'dataset': return 'dataset';
    case 'posted-content': return 'preprint';
    default:
      if (/arxiv|biorxiv|medrxiv|chinaxiv|ssrn|research square/i.test(publisher || '')) {
        return 'preprint';
      }
      return 'article-journal';
  }
}

function mapCrossrefAuthors(list?: Array<{ family?: string; given?: string; name?: string; suffix?: string }>): AuthorName[] {
  if (!Array.isArray(list)) return [];
  return list.map((a) => {
    if (a.name) {
      return { literal: hasCJK(a.name) ? cleanChineseSpaces(a.name) : a.name, isChinese: hasCJK(a.name) };
    }
    const fam = a.family || '';
    const giv = a.given || '';
    if (hasCJK(fam) || hasCJK(giv)) {
      return { family: cleanChineseSpaces(`${fam}${giv}`), isChinese: true };
    }
    return {
      family: normalizeSurnameCase(fam),
      given: giv,
      suffix: a.suffix?.replace(/\.$/, ''),
      isPinyin: isLikelyPinyinName(fam, giv),
    };
  });
}

function formatDateParts(parts?: number[][]): { year?: string; date?: string } {
  const first = parts?.[0];
  if (!first || !first.length) return {};
  const y = String(first[0]);
  const m = first[1] ? String(first[1]).padStart(2, '0') : undefined;
  const d = first[2] ? String(first[2]).padStart(2, '0') : undefined;
  return {
    year: y,
    date: m && d ? `${y}-${m}-${d}` : m ? `${y}-${m}` : undefined,
  };
}

async function fetchFromCrossref(doi: string, signal?: AbortSignal): Promise<CitationItem | null> {
  const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Crossref 请求失败（HTTP ${res.status}）`);
  }
  const data = await res.json();
  const msg = data?.message;
  if (!msg) return null;

  const dateObj =
    formatDateParts(msg['published-print']?.['date-parts']) ||
    {};
  const onlineDateObj = formatDateParts(msg['published-online']?.['date-parts']);
  const issuedObj = formatDateParts(msg.issued?.['date-parts']);
  const createdObj = formatDateParts(msg.created?.['date-parts']);

  const year = dateObj.year || onlineDateObj.year || issuedObj.year || createdObj.year;
  const fullDate = dateObj.date || onlineDateObj.date || issuedObj.date || createdObj.date;

  const type = mapCrossrefType(msg.type, msg.publisher || msg['institution']?.[0]?.name, msg.DOI || doi);
  const rawTitle = Array.isArray(msg.title) ? msg.title[0] || '' : String(msg.title || '');
  const rawSub = Array.isArray(msg.subtitle) ? msg.subtitle[0] || '' : '';
  const container = Array.isArray(msg['container-title'])
    ? msg['container-title'][0] || ''
    : String(msg['container-title'] || '');

  const resourceUrl = msg.resource?.primary?.URL || (msg.URL && !msg.URL.includes('doi.org/') ? msg.URL : undefined);

  return {
    id: `doi-${doi}`,
    type,
    authors: mapCrossrefAuthors(msg.author),
    editors: mapCrossrefAuthors(msg.editor),
    title: rawTitle.replace(/\s+/g, ' ').trim(),
    subtitle: rawSub ? rawSub.replace(/\s+/g, ' ').trim() : undefined,
    containerTitle:
      container ||
      (type === 'preprint' ? msg.institution?.[0]?.name || msg['group-title'] || msg.publisher : undefined),
    publisher: msg.publisher,
    place: msg['publisher-location'],
    edition: msg['edition-number'],
    year,
    date: fullDate,
    accessedDate:
      type === 'preprint' || type === 'dataset' || type === 'webpage'
        ? new Date().toISOString().slice(0, 10)
        : undefined,
    volume: msg.volume,
    issue: msg.issue,
    pages: msg.page,
    articleNumber: msg['article-number'],
    doi: msg.DOI || doi,
    url: resourceUrl,
    isOnline: true,
    sourceKind: 'doi',
  };
}

async function fetchFromDataCite(doi: string, arxivVersion?: string, signal?: AbortSignal): Promise<CitationItem | null> {
  const url = `https://api.datacite.org/dois/${encodeURIComponent(doi)}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.api+json' },
    signal,
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`DataCite 请求失败（HTTP ${res.status}）`);
  }
  const json = await res.json();
  const attr = json?.data?.attributes;
  if (!attr) return null;

  const isArxiv = /^10\.48550\/arxiv\./i.test(doi) || /arxiv/i.test(attr.publisher || '');
  const genType = attr.types?.resourceTypeGeneral;
  let type: ResourceType = 'article-journal';
  if (isArxiv || genType === 'Preprint') type = 'preprint';
  else if (genType === 'Dataset') type = 'dataset';
  else if (genType === 'Book') type = 'book';
  else if (genType === 'BookChapter') type = 'chapter';
  else if (genType === 'ConferencePaper') type = 'paper-conference';
  else if (genType === 'Dissertation') type = 'thesis';
  else if (genType === 'Report') type = 'report';

  const authors: AuthorName[] = (attr.creators || []).map((c: { familyName?: string; givenName?: string; name?: string }) => {
    if (c.familyName) {
      const fam = c.familyName;
      const giv = c.givenName || '';
      return {
        family: normalizeSurnameCase(fam),
        given: giv,
        isPinyin: isLikelyPinyinName(fam, giv),
      };
    }
    const rawName = c.name || '';
    if (rawName.includes(',')) {
      const [f, g] = rawName.split(',').map((s: string) => s.trim());
      return { family: normalizeSurnameCase(f), given: g, isPinyin: isLikelyPinyinName(f, g) };
    }
    return { literal: rawName, isChinese: hasCJK(rawName) };
  });

  const createdDate =
    attr.dates?.find((d: { dateType?: string; date?: string }) => d.dateType === 'Issued' || d.dateType === 'Submitted' || d.dateType === 'Created')?.date?.slice(0, 10) ||
    (attr.publicationYear ? String(attr.publicationYear) : undefined);

  const arxivIdMatch = doi.match(/^10\.48550\/arxiv\.(.+)$/i);
  const directUrl = arxivIdMatch ? `https://arxiv.org/abs/${arxivIdMatch[1]}` : attr.url;

  return {
    id: `doi-${doi}`,
    type,
    authors,
    title: (attr.titles?.[0]?.title || '').replace(/\s+/g, ' ').trim(),
    publisher: isArxiv ? 'arXiv' : attr.publisher,
    containerTitle: isArxiv ? 'arXiv' : attr.container?.title,
    version: arxivVersion || attr.version || undefined,
    year: attr.publicationYear ? String(attr.publicationYear) : createdDate?.slice(0, 4),
    date: createdDate && createdDate.length >= 10 ? createdDate : undefined,
    accessedDate: new Date().toISOString().slice(0, 10),
    doi: attr.doi || doi,
    url: directUrl,
    isOnline: true,
    sourceKind: 'doi',
  };
}

export async function resolveDoiToItem(
  rawInput: string,
  signal?: AbortSignal
): Promise<CitationItem> {
  const parsed = extractStandaloneDoi(rawInput);
  const doi = parsed?.doi || findEmbeddedDoi(rawInput);
  if (!doi) {
    throw new Error(`未识别到有效 DOI：${rawInput}`);
  }

  // Prefer DataCite directly for known DataCite prefixes like 10.48550 (arXiv) and 10.5281 (Zenodo)
  const preferDataCite = /^10\.(48550|5281|6084|7910|17632)\//i.test(doi);

  if (preferDataCite) {
    const dc = await fetchFromDataCite(doi, parsed?.arxivVersion, signal);
    if (dc) return dc;
  }

  const cr = await fetchFromCrossref(doi, signal);
  if (cr) return cr;

  const dcFallback = await fetchFromDataCite(doi, parsed?.arxivVersion, signal);
  if (dcFallback) return dcFallback;

  throw new Error(`未在 Crossref 或 DataCite 中查到 DOI：${doi}（注：部分早期中文知网文献未注册国际 DOI，可直接粘贴知网引文转换）`);
}
