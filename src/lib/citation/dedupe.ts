import type { CitationItem, DeduplicateResult, DuplicateDetail, AuthorName } from './types';
import { cleanChineseSpaces } from './authors';

function normalizeDoi(doi?: string): string {
  if (!doi) return '';
  return doi
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .replace(/[.,;]+$/, '');
}

function normalizeTitle(title: string): string {
  return title
    .replace(/\\(?:textit|textbf|emph|text)\{([^}]*)\}/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[\s\p{P}\p{S}]+/gu, '')
    .toLowerCase();
}

function normalizeAuthorName(a?: AuthorName): string {
  if (!a) return '';
  if (a.literal) return cleanChineseSpaces(a.literal).toLowerCase().trim();
  const fam = a.family ? cleanChineseSpaces(a.family).toLowerCase().trim() : '';
  return fam;
}

function calculateScore(item: CitationItem): number {
  let score = 0;
  if (item.doi) score += 4;
  if (item.pages) score += 2;
  if (item.volume || item.issue) score += 2;
  if (item.authors && item.authors.length > 0) score += item.authors.length;
  if (item.containerTitle || item.publisher) score += 2;
  if (item.url) score += 1;
  return score;
}

function isDuplicate(a: CitationItem, b: CitationItem): { duplicate: boolean; reason?: 'doi' | 'title-author' } {
  // 1. Check DOI
  const doiA = normalizeDoi(a.doi);
  const doiB = normalizeDoi(b.doi);
  if (doiA && doiB && doiA === doiB) {
    return { duplicate: true, reason: 'doi' };
  }

  // 2. Check Title & Author / Year
  const titleA = normalizeTitle(a.title);
  const titleB = normalizeTitle(b.title);
  if (titleA && titleB && titleA.length >= 6 && titleA === titleB) {
    const authA = normalizeAuthorName(a.authors[0]);
    const authB = normalizeAuthorName(b.authors[0]);

    const authorsMatch = !authA || !authB || authA === authB;

    const yA = (a.year || a.date || '').match(/\d{4}/)?.[0];
    const yB = (b.year || b.date || '').match(/\d{4}/)?.[0];
    const yearsMatch = !yA || !yB || yA === yB || Math.abs(parseInt(yA, 10) - parseInt(yB, 10)) <= 1;

    if (authorsMatch && yearsMatch) {
      return { duplicate: true, reason: 'title-author' };
    }
  }

  return { duplicate: false };
}

function mergeDuplicateItems(base: CitationItem, extra: CitationItem, reason: 'doi' | 'title-author'): CitationItem {
  const merged: CitationItem = {
    ...base,
    authors: (extra.authors && extra.authors.length > base.authors.length) ? [...extra.authors] : [...base.authors],
    doi: base.doi || extra.doi,
    cstr: base.cstr || extra.cstr,
    url: base.url || extra.url,
    volume: base.volume || extra.volume,
    issue: base.issue || extra.issue,
    pages: base.pages || extra.pages,
    articleNumber: base.articleNumber || extra.articleNumber,
    containerTitle: base.containerTitle || extra.containerTitle,
    publisher: base.publisher || extra.publisher,
    place: base.place || extra.place,
    edition: base.edition || extra.edition,
    version: base.version || extra.version,
    date: base.date || extra.date,
    year: base.year || extra.year,
    accessedDate: base.accessedDate || extra.accessedDate,
    notes: [...(base.notes || [])],
  };

  const reasonLabel = reason === 'doi' ? 'DOI 相同' : '题名与著者一致';
  merged.notes = merged.notes || [];
  if (!merged.notes.some((n) => n.includes('已合并重复文献'))) {
    merged.notes.push(`已自动合并重复文献（${reasonLabel}）`);
  }

  return merged;
}

/**
 * Deduplicates citation items based on DOI and normalized Title+Author.
 * Retains richer metadata across duplicate records.
 */
export function deduplicateCitationItems(items: CitationItem[]): DeduplicateResult {
  if (items.length <= 1) {
    return { items: [...items], duplicatesRemoved: 0, details: [] };
  }

  const resultItems: CitationItem[] = [];
  const details: DuplicateDetail[] = [];

  for (const current of items) {
    let matchedIdx = -1;
    let matchReason: 'doi' | 'title-author' = 'doi';

    for (let i = 0; i < resultItems.length; i++) {
      const check = isDuplicate(resultItems[i], current);
      if (check.duplicate && check.reason) {
        matchedIdx = i;
        matchReason = check.reason;
        break;
      }
    }

    if (matchedIdx >= 0) {
      const existing = resultItems[matchedIdx];
      const existingScore = calculateScore(existing);
      const currentScore = calculateScore(current);

      let kept: CitationItem;
      let removedId: string;

      if (currentScore > existingScore) {
        kept = mergeDuplicateItems(current, existing, matchReason);
        removedId = existing.id;
      } else {
        kept = mergeDuplicateItems(existing, current, matchReason);
        removedId = current.id;
      }

      resultItems[matchedIdx] = kept;
      details.push({
        title: kept.title,
        reason: matchReason,
        keptId: kept.id,
        removedId,
      });
    } else {
      resultItems.push({
        ...current,
        authors: current.authors.map((a) => ({ ...a })),
        notes: current.notes ? [...current.notes] : [],
      });
    }
  }

  return {
    items: resultItems,
    duplicatesRemoved: details.length,
    details,
  };
}
