import type { CitationItem, FormatOptions, FormattedEntry } from '../types';

function makeCiteKey(item: CitationItem, index = 1): string {
  const first = item.authors[0];
  let authorSlug = 'ref';
  if (first) {
    const raw = (first.family || first.literal || '').toLowerCase();
    const ascii = raw.replace(/[^a-z0-9]/g, '');
    authorSlug = ascii || `zh${index}`;
  }
  const year = item.year || (item.date ? item.date.slice(0, 4) : 'nd');
  const titleWord =
    item.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim()
      .split(/\s+/)[0] || `item${index}`;
  return `${authorSlug}${year}${titleWord}`;
}

function bibType(item: CitationItem): string {
  switch (item.type) {
    case 'article-journal':
    case 'article-newspaper': return 'article';
    case 'book': return 'book';
    case 'chapter': return 'incollection';
    case 'paper-conference': return 'inproceedings';
    case 'thesis': return 'phdthesis';
    case 'report': return 'techreport';
    case 'dataset':
    case 'preprint':
    case 'webpage':
    default: return 'misc';
  }
}

export function formatBibTeX(item: CitationItem, opts: FormatOptions): FormattedEntry {
  const key = makeCiteKey(item, opts.index || 1);
  const type = bibType(item);
  const fields: [string, string | undefined][] = [];

  if (item.authors.length) {
    const authorStr = item.authors
      .map((a) => {
        if (a.literal) return `{${a.literal}}`;
        if (a.isChinese) return a.family || '';
        return a.given ? `${a.family}, ${a.given}` : a.family || '';
      })
      .filter(Boolean)
      .join(' and ');
    fields.push(['author', authorStr]);
  }

  const fullTitle = item.subtitle ? `${item.title}: ${item.subtitle}` : item.title;
  fields.push(['title', fullTitle.replace(/<[^>]+>/g, '')]);

  if (item.type === 'article-journal' || item.type === 'article-newspaper') {
    fields.push(['journal', item.containerTitle]);
  } else if (item.type === 'paper-conference' || item.type === 'chapter') {
    fields.push(['booktitle', item.containerTitle]);
  }

  if (item.type === 'thesis') {
    fields.push(['school', item.publisher]);
  } else {
    fields.push(['publisher', item.publisher]);
  }
  fields.push(['address', item.place]);
  fields.push(['year', item.year || (item.date ? item.date.slice(0, 4) : undefined)]);
  fields.push(['volume', item.volume]);
  fields.push(['number', item.issue || item.number]);
  fields.push(['pages', (item.pages || item.articleNumber)?.replace(/-/g, '--')]);
  fields.push(['edition', item.edition]);
  fields.push(['version', item.version]);
  fields.push(['doi', item.doi]);
  fields.push(['url', item.url]);
  if (item.type === 'preprint') {
    fields.push(['archivePrefix', item.publisher || item.containerTitle || 'arXiv']);
  }
  fields.push(['urldate', item.accessedDate]);

  const lines = [`@${type}{${key},`];
  for (const [k, v] of fields) {
    if (v && v.trim()) {
      lines.push(`  ${k} = {${v.trim()}},`);
    }
  }
  lines.push('}');
  const text = lines.join('\n');
  const html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return {
    id: item.id,
    html,
    text,
    notes: item.notes || [],
    item,
  };
}
