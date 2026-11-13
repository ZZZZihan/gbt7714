import type { CitationItem, FormatOptions, FormattedEntry } from '../types';
import { formatGBT7714 } from './gbt7714';
import { formatAPA7 } from './apa';
import { formatIEEE } from './ieee';
import { formatBibTeX } from './bibtex';

export function formatCitation(item: CitationItem, opts: FormatOptions): FormattedEntry {
  switch (opts.style) {
    case 'gbt7714-2025-numeric':
    case 'gbt7714-2025-author-date':
    case 'gbt7714-2015-numeric':
      return formatGBT7714(item, opts);
    case 'apa-7':
      return formatAPA7(item, opts);
    case 'ieee':
      return formatIEEE(item, opts);
    case 'bibtex':
      return formatBibTeX(item, opts);
  }
}

export function formatCitationList(items: CitationItem[], opts: Omit<FormatOptions, 'index'>): FormattedEntry[] {
  return items.map((item, i) => formatCitation(item, { ...opts, index: i + 1 }));
}
