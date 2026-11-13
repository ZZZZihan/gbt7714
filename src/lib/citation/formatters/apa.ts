import type { CitationItem, FormatOptions, FormattedEntry } from '../types';
import { formatAuthorAPA, hasCJK, cleanChineseSpaces } from '../authors';
import { stripHtmlTags } from './gbt7714';

function esc(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatAuthorsAPA7(item: CitationItem): string {
  const valid = item.authors.filter((a) => a.literal || a.family);
  if (valid.length === 0) return '';
  const formatted = valid.map(formatAuthorAPA);
  if (item.hasEtAl && formatted.length <= 3) {
    return `${formatted.join(', ')}, et al.`;
  }
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]}, & ${formatted[1]}`;
  if (formatted.length <= 20) {
    return `${formatted.slice(0, -1).join(', ')}, & ${formatted[formatted.length - 1]}`;
  }
  return `${formatted.slice(0, 19).join(', ')}, ... ${formatted[formatted.length - 1]}`;
}

function ensurePeriod(s: string): string {
  const t = s.trim();
  if (!t) return '';
  return /[.?!]$/.test(t) ? t : `${t}.`;
}

export function formatAPA7(item: CitationItem, opts: FormatOptions): FormattedEntry {
  const includeUrlDoi = opts.includeUrlDoi !== false;
  const isZh = hasCJK(item.title);
  const authors = esc(formatAuthorsAPA7(item));
  const year = item.year || (item.date ? item.date.slice(0, 4) : 'n.d.');
  const rawTitle = isZh ? cleanChineseSpaces(item.title) : item.title.trim();
  const rawSub = item.subtitle ? (isZh ? cleanChineseSpaces(item.subtitle) : item.subtitle.trim()) : '';
  const fullTitle = esc(rawSub ? `${rawTitle}: ${rawSub}` : rawTitle);
  const pages = (item.pages || item.articleNumber || '').trim().replace(/\s*[-–—－]+\s*/g, '–');

  const doiClean = item.doi
    ? item.doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '')
    : '';
  const linkTail =
    includeUrlDoi && doiClean
      ? `https://doi.org/${esc(doiClean)}`
      : includeUrlDoi && item.url
        ? esc(item.url.trim())
        : '';

  const parts: string[] = [];
  if (authors) parts.push(ensurePeriod(authors));
  parts.push(`(${esc(year)}).`);

  if (item.type === 'article-journal' || item.type === 'article-newspaper') {
    parts.push(ensurePeriod(fullTitle));
    const journal = item.containerTitle ? `<i>${esc(isZh ? cleanChineseSpaces(item.containerTitle) : item.containerTitle.trim())}</i>` : '';
    let volPart = '';
    if (item.volume && item.issue) {
      volPart = `<i>${esc(item.volume)}</i>(${esc(item.issue)})`;
    } else if (item.volume) {
      volPart = `<i>${esc(item.volume)}</i>`;
    } else if (item.issue) {
      volPart = `(${esc(item.issue)})`;
    }
    const jPieces = [journal, volPart, esc(pages)].filter(Boolean);
    if (jPieces.length) {
      parts.push(`${jPieces.join(', ')}.`);
    }
  } else if (item.type === 'chapter' || (item.type === 'paper-conference' && item.containerTitle)) {
    parts.push(ensurePeriod(fullTitle));
    const container = `<i>${esc(item.containerTitle!)}</i>`;
    const ppPart = pages ? ` (pp. ${esc(pages)})` : '';
    parts.push(`In ${container}${ppPart}.`);
    if (item.publisher) parts.push(ensurePeriod(esc(item.publisher)));
  } else if (item.type === 'thesis') {
    const pub = item.publisher ? `[Doctoral dissertation or master's thesis, ${esc(item.publisher)}]` : '[Thesis]';
    parts.push(`<i>${fullTitle}</i> ${pub}.`);
  } else if (item.type === 'preprint') {
    parts.push(`<i>${fullTitle}</i> [Preprint].`);
    if (item.publisher || item.containerTitle) {
      parts.push(ensurePeriod(esc(item.publisher || item.containerTitle || 'arXiv')));
    }
  } else if (item.type === 'dataset') {
    const ver = item.version ? ` (${esc(item.version)})` : '';
    parts.push(`<i>${fullTitle}</i>${ver} [Data set].`);
    if (item.publisher || item.containerTitle) {
      parts.push(ensurePeriod(esc(item.publisher || item.containerTitle || '')));
    }
  } else {
    const ed = item.edition ? ` (${esc(item.edition)})` : '';
    parts.push(`<i>${fullTitle}</i>${ed}.`);
    if (item.publisher || item.containerTitle) {
      parts.push(ensurePeriod(esc(item.publisher || item.containerTitle || '')));
    }
  }

  if (linkTail) parts.push(linkTail);

  const html = parts.filter(Boolean).join(' ').replace(/\.\./g, '.');
  return {
    id: item.id,
    html,
    text: stripHtmlTags(html),
    notes: item.notes || [],
    item,
  };
}
