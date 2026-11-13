import type { CitationItem, SortOptions, SortOrder, AuthorName } from './types';
import { hasCJK, cleanChineseSpaces } from './authors';

const collatorZh = new Intl.Collator('zh-Hans-CN', { numeric: true, sensitivity: 'base' });
const collatorEn = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

export function isChineseEntry(item: CitationItem): boolean {
  if (item.language === 'zh') return true;
  if (item.language === 'en') return false;
  return (
    hasCJK(item.title) ||
    hasCJK(item.containerTitle || '') ||
    hasCJK(item.publisher || '') ||
    item.authors.some((a) => a.isChinese || hasCJK(a.literal || '') || hasCJK(a.family || ''))
  );
}

function getAuthorSortKey(author?: AuthorName): string {
  if (!author) return '';
  if (author.literal) return cleanChineseSpaces(author.literal).trim();
  const fam = author.family ? cleanChineseSpaces(author.family).trim() : '';
  const giv = author.given ? cleanChineseSpaces(author.given).trim() : '';
  return `${fam} ${giv}`.trim();
}

function compareAuthors(aAuthors: AuthorName[], bAuthors: AuthorName[], isZh: boolean): number {
  const collator = isZh ? collatorZh : collatorEn;
  const len = Math.max(aAuthors.length, bAuthors.length);

  for (let i = 0; i < len; i++) {
    const a = aAuthors[i];
    const b = bAuthors[i];
    if (!a && b) return -1;
    if (a && !b) return 1;
    if (!a && !b) break;

    const keyA = getAuthorSortKey(a);
    const keyB = getAuthorSortKey(b);
    const cmp = collator.compare(keyA, keyB);
    if (cmp !== 0) return cmp;
  }

  return 0;
}

function extractBaseYear(yearStr?: string): { base: number; suffix: string } {
  if (!yearStr) return { base: 0, suffix: '' };
  const m = yearStr.trim().match(/^(\d{4})([a-z])?$/i);
  if (m) {
    return { base: parseInt(m[1], 10), suffix: m[2] ? m[2].toLowerCase() : '' };
  }
  const digits = yearStr.match(/\d{4}/);
  return { base: digits ? parseInt(digits[0], 10) : 0, suffix: '' };
}

export function compareCitationItems(a: CitationItem, b: CitationItem, order: SortOrder = 'zh-first'): number {
  if (order === 'none') return 0;

  const aZh = isChineseEntry(a);
  const bZh = isChineseEntry(b);

  if (order === 'zh-first') {
    if (aZh && !bZh) return -1;
    if (!aZh && bZh) return 1;
  } else if (order === 'en-first') {
    if (!aZh && bZh) return -1;
    if (aZh && !bZh) return 1;
  }

  // Same language group or pure alphabetical
  const collator = (order === 'zh-first' && aZh) ? collatorZh : collatorEn;

  // 1. Compare authors
  const authorCmp = compareAuthors(a.authors, b.authors, aZh);
  if (authorCmp !== 0) return authorCmp;

  // If no authors on either, compare title
  if (a.authors.length === 0 && b.authors.length === 0) {
    const titleCmp = collator.compare(a.title, b.title);
    if (titleCmp !== 0) return titleCmp;
  }

  // 2. Compare publication year (ascending)
  const aYear = extractBaseYear(a.year || a.date);
  const bYear = extractBaseYear(b.year || b.date);
  if (aYear.base !== bYear.base) {
    return aYear.base - bYear.base;
  }

  // 3. Compare title if author and year are identical
  return collator.compare(a.title, b.title);
}

/**
 * Sorts citation items according to academic rules (e.g. GB/T 7714 Author-Date).
 * Can also disambiguate same author + same year by appending 'a', 'b', 'c', etc.
 */
export function sortCitationItems(items: CitationItem[], opts?: SortOptions): CitationItem[] {
  const order: SortOrder = opts?.order ?? 'zh-first';
  if (order === 'none') {
    return [...items];
  }

  // Clone items to avoid mutating input objects
  const sorted = items.map((it) => ({
    ...it,
    authors: it.authors.map((a) => ({ ...a })),
    notes: it.notes ? [...it.notes] : undefined,
  }));

  sorted.sort((a, b) => compareCitationItems(a, b, order));

  if (opts?.disambiguateYear) {
    // Group by author string + base 4-digit year
    const groups = new Map<string, CitationItem[]>();

    for (const it of sorted) {
      const yearInfo = extractBaseYear(it.year || it.date);
      if (!yearInfo.base) continue;

      const authorKey = it.authors
        .map((a) => getAuthorSortKey(a).toLowerCase())
        .join(';') || `_title_${it.title.slice(0, 10).toLowerCase()}`;
      const groupKey = `${authorKey}___${yearInfo.base}`;

      const list = groups.get(groupKey) || [];
      list.push(it);
      groups.set(groupKey, list);
    }

    for (const [, group] of groups) {
      if (group.length > 1) {
        group.forEach((item, idx) => {
          const suffix = String.fromCharCode(97 + idx); // 'a', 'b', 'c'...
          const yearInfo = extractBaseYear(item.year || item.date);
          item.year = `${yearInfo.base}${suffix}`;
        });
      }
    }
  }

  return sorted;
}
