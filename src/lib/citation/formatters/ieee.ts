import type { CitationItem, FormatOptions, FormattedEntry } from '../types';
import { formatAuthorIEEE, hasCJK, cleanChineseSpaces } from '../authors';
import { stripHtmlTags } from './gbt7714';

function esc(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatAuthorsIEEEList(item: CitationItem): string {
  const valid = item.authors.filter((a) => a.literal || a.family);
  if (valid.length === 0) return '';
  const formatted = valid.map((a) => esc(formatAuthorIEEE(a)));
  if (item.hasEtAl) {
    return `${formatted[0]} <i>et al.</i>`;
  }
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`;
  if (formatted.length <= 6) {
    return `${formatted.slice(0, -1).join(', ')}, and ${formatted[formatted.length - 1]}`;
  }
  return `${formatted[0]} <i>et al.</i>`;
}

export function formatIEEE(item: CitationItem, opts: FormatOptions): FormattedEntry {
  const includeUrlDoi = opts.includeUrlDoi !== false;
  const isZh = hasCJK(item.title);
  const idxPrefix = opts.index ? `[${opts.index}] ` : '[1] ';
  const authors = formatAuthorsIEEEList(item);
  const rawTitle = isZh ? cleanChineseSpaces(item.title) : item.title.trim();
  const rawSub = item.subtitle ? (isZh ? cleanChineseSpaces(item.subtitle) : item.subtitle.trim()) : '';
  const fullTitle = esc(rawSub ? `${rawTitle}: ${rawSub}` : rawTitle).replace(/\.$/, '');

  const year = item.year || (item.date ? item.date.slice(0, 4) : '');
  const pages = (item.pages || '').trim().replace(/\s*[-–—－]+\s*/g, '–');
  const doiClean = item.doi
    ? item.doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '')
    : '';

  const chunks: string[] = [];
  if (authors) chunks.push(authors);

  if (item.type === 'book' || item.type === 'thesis' || item.type === 'standard') {
    chunks.push(`<i>${fullTitle}</i>`);
    if (item.edition) chunks.push(esc(item.edition));
    if (item.place && item.publisher) {
      chunks.push(`${esc(item.place)}: ${esc(item.publisher)}`);
    } else if (item.publisher) {
      chunks.push(esc(item.publisher));
    }
    if (year) chunks.push(esc(year));
    if (pages) chunks.push(`pp. ${esc(pages)}`);
  } else if (item.type === 'paper-conference') {
    chunks.push(`"${fullTitle},"`);
    if (item.containerTitle) {
      const conf = item.containerTitle.trim();
      const prefix = /^in\s+/i.test(conf) ? '' : 'in ';
      chunks.push(`${prefix}<i>${esc(isZh ? cleanChineseSpaces(conf) : conf)}</i>`);
    }
    if (item.place) chunks.push(esc(item.place));
    if (year) chunks.push(esc(year));
    if (pages) chunks.push(`pp. ${esc(pages)}`);
    else if (item.articleNumber) chunks.push(`Art. no. ${esc(item.articleNumber)}`);
  } else {
    chunks.push(`"${fullTitle},"`);
    if (item.containerTitle) {
      chunks.push(`<i>${esc(isZh ? cleanChineseSpaces(item.containerTitle) : item.containerTitle.trim())}</i>`);
    } else if (item.publisher) {
      chunks.push(esc(item.publisher));
    }
    if (item.volume) chunks.push(`vol. ${esc(item.volume)}`);
    if (item.issue) chunks.push(`no. ${esc(item.issue)}`);
    if (pages) {
      chunks.push(pages.includes('–') ? `pp. ${esc(pages)}` : `p. ${esc(pages)}`);
    } else if (item.articleNumber) {
      chunks.push(`Art. no. ${esc(item.articleNumber)}`);
    }
    if (year) chunks.push(esc(year));
  }

  if (includeUrlDoi && doiClean) {
    chunks.push(`doi: ${esc(doiClean)}`);
  }

  // Join carefully: `"Title,"` already has trailing comma, avoid `",` -> `",,`
  let body = '';
  for (const chunk of chunks) {
    if (!body) {
      body = chunk;
    } else if (body.endsWith(',"') || body.endsWith(',”')) {
      body += ` ${chunk}`;
    } else {
      body += `, ${chunk}`;
    }
  }
  body = body.replace(/\.*$/, '.');

  if (includeUrlDoi && !doiClean && item.url) {
    body += ` [Online]. Available: ${esc(item.url.trim())}`;
  }

  const html = `${idxPrefix}${body}`;
  return {
    id: item.id,
    html,
    text: stripHtmlTags(html),
    notes: item.notes || [],
    item,
  };
}
