import type { CitationItem, ResourceType } from '../types';
import { parseAuthor, hasCJK, cleanChineseSpaces } from '../authors';

function cleanLatexText(raw: string): string {
  return raw
    .replace(/\\(?:textit|emph)\{([^{}]*)\}/g, '<i>$1</i>')
    .replace(/\\textbf\{([^{}]*)\}/g, '$1')
    .replace(/\\url\{([^{}]*)\}/g, '$1')
    .replace(/\\&/g, '&')
    .replace(/\\%/g, '%')
    .replace(/\\_/g, '_')
    .replace(/\\~/g, ' ')
    .replace(/\\textendash\b|--/g, '-')
    .replace(/~+/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapBibType(entryType: string, fields: Record<string, string>): ResourceType {
  const t = entryType.toLowerCase();
  if (fields.archiveprefix?.toLowerCase() === 'arxiv' || fields.eprint || /arxiv|chinaxiv|biorxiv/i.test(fields.journal || fields.howpublished || '')) {
    return 'preprint';
  }
  switch (t) {
    case 'article': return 'article-journal';
    case 'newspaper': return 'article-newspaper';
    case 'book':
    case 'booklet':
    case 'manual':
    case 'proceedings': return 'book';
    case 'inbook':
    case 'incollection': return 'chapter';
    case 'inproceedings':
    case 'conference': return 'paper-conference';
    case 'phdthesis':
    case 'mastersthesis':
    case 'thesis': return 'thesis';
    case 'techreport':
    case 'report': return 'report';
    case 'standard': return 'standard';
    case 'patent': return 'patent';
    case 'dataset': return 'dataset';
    case 'unpublished': return 'preprint';
    case 'online':
    case 'electronic':
    case 'webpage':
    case 'www': return 'webpage';
    default:
      if (fields.journal || fields.journaltitle) return 'article-journal';
      if (fields.booktitle) return 'paper-conference';
      if (fields.school || fields.institution) return 'thesis';
      if (fields.url && !fields.publisher) return 'webpage';
      return 'book';
  }
}

export interface BibSpan {
  entryType: string;
  key: string;
  body: string;
  start: number;
  end: number;
}

export function splitBibEntries(input: string): BibSpan[] {
  const entries: BibSpan[] = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    const atIdx = input.indexOf('@', i);
    if (atIdx === -1) break;

    const headMatch = input.slice(atIdx).match(/^@([A-Za-z]+)\s*[({]/);
    if (!headMatch) {
      i = atIdx + 1;
      continue;
    }

    const entryType = headMatch[1];
    const openChar = headMatch[0].slice(-1);
    const closeChar = openChar === '{' ? '}' : ')';
    let pos = atIdx + headMatch[0].length;
    let depth = 1;
    let inQuotes = false;

    while (pos < len && depth > 0) {
      const ch = input[pos];
      const prev = input[pos - 1];
      if (ch === '"' && prev !== '\\') {
        inQuotes = !inQuotes;
      } else if (!inQuotes) {
        if (ch === openChar) depth++;
        else if (ch === closeChar) depth--;
      }
      pos++;
    }

    const inner = input.slice(atIdx + headMatch[0].length, pos - 1);
    const commaIdx = inner.indexOf(',');
    if (commaIdx !== -1 && !['comment', 'preamble', 'string'].includes(entryType.toLowerCase())) {
      const key = inner.slice(0, commaIdx).trim();
      const body = inner.slice(commaIdx + 1);
      entries.push({ entryType, key, body, start: atIdx, end: pos });
    }
    i = pos;
  }

  return entries;
}

function parseBibFields(body: string): Record<string, string> {
  const fields: Record<string, string> = {};
  let i = 0;
  const len = body.length;

  while (i < len) {
    while (i < len && /[\s,]/.test(body[i])) i++;
    if (i >= len) break;

    const eqIdx = body.indexOf('=', i);
    if (eqIdx === -1) break;

    const rawName = body.slice(i, eqIdx).trim().toLowerCase();
    i = eqIdx + 1;
    while (i < len && /\s/.test(body[i])) i++;
    if (i >= len) break;

    let value = '';
    if (body[i] === '{') {
      let depth = 1;
      i++;
      const start = i;
      while (i < len && depth > 0) {
        if (body[i] === '{') depth++;
        else if (body[i] === '}') depth--;
        i++;
      }
      value = body.slice(start, i - 1);
    } else if (body[i] === '"') {
      i++;
      const start = i;
      while (i < len && !(body[i] === '"' && body[i - 1] !== '\\')) {
        i++;
      }
      value = body.slice(start, i);
      i++;
    } else {
      const start = i;
      while (i < len && body[i] !== ',' && body[i] !== '\n') i++;
      value = body.slice(start, i).trim();
    }

    if (rawName) {
      fields[rawName] = value.trim();
    }
  }

  return fields;
}

function parseBibAuthorField(raw?: string): { authors: ReturnType<typeof parseAuthor>[]; hasEtAl: boolean } {
  if (!raw) return { authors: [], hasEtAl: false };
  // Split on top-level ` and `
  const parts = raw
    .replace(/\s+/g, ' ')
    .split(/\s+and\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

  let hasEtAl = false;
  const authors = [];
  for (const p of parts) {
    if (/^(others|et\s*al\.?|等)$/i.test(p.replace(/[{}]/g, '').trim())) {
      hasEtAl = true;
      continue;
    }
    if (p.startsWith('{') && p.endsWith('}')) {
      const inner = cleanLatexText(p);
      authors.push({ literal: hasCJK(inner) ? cleanChineseSpaces(inner) : inner, isChinese: hasCJK(inner) });
    } else {
      authors.push(parseAuthor(cleanLatexText(p)));
    }
  }
  return { authors, hasEtAl };
}

export function isBibTeXInput(input: string): boolean {
  return /@[A-Za-z]+\s*[({]\s*[^,\s]+\s*,/.test(input);
}

export function parseBibTeX(input: string): CitationItem[] {
  const rawEntries = splitBibEntries(input);
  return rawEntries.map((entry, idx) => {
    const f = parseBibFields(entry.body);
    const type = mapBibType(entry.entryType, f);
    const { authors, hasEtAl } = parseBibAuthorField(f.author);
    const { authors: editors } = parseBibAuthorField(f.editor);

    const rawTitle = cleanLatexText(f.title || '');
    const rawSub = f.subtitle ? cleanLatexText(f.subtitle) : undefined;
    const container = cleanLatexText(f.journal || f.journaltitle || f.booktitle || '');
    const publisher = cleanLatexText(
      f.publisher || f.school || f.institution || (type === 'preprint' ? f.archiveprefix || 'arXiv' : '')
    );

    const dateVal = f.date ? cleanLatexText(f.date) : undefined;
    const yearVal = f.year ? cleanLatexText(f.year) : dateVal?.slice(0, 4);
    const urlVal = f.url ? cleanLatexText(f.url) : f.eprint && type === 'preprint' ? `https://arxiv.org/abs/${cleanLatexText(f.eprint)}` : undefined;
    const doiVal = f.doi ? cleanLatexText(f.doi) : undefined;

    return {
      id: `bib-${entry.key || idx + 1}`,
      type,
      authors,
      hasEtAl: hasEtAl || undefined,
      editors: editors.length ? editors : undefined,
      title: rawTitle,
      subtitle: rawSub,
      containerTitle: container || undefined,
      publisher: publisher || undefined,
      place: f.address || f.location ? cleanLatexText(f.address || f.location) : undefined,
      edition: f.edition ? cleanLatexText(f.edition) : undefined,
      version: f.version ? cleanLatexText(f.version) : undefined,
      year: yearVal,
      date: dateVal && dateVal.length >= 8 ? dateVal : undefined,
      accessedDate: f.urldate ? cleanLatexText(f.urldate) : undefined,
      volume: f.volume ? cleanLatexText(f.volume) : undefined,
      issue: f.number || f.issue ? cleanLatexText(f.number || f.issue) : undefined,
      pages: f.pages ? cleanLatexText(f.pages) : undefined,
      articleNumber: f.eid ? cleanLatexText(f.eid) : undefined,
      number: (type === 'patent' || type === 'standard' || type === 'report') && f.number ? cleanLatexText(f.number) : undefined,
      doi: doiVal,
      url: urlVal,
      isOnline: Boolean(urlVal || doiVal || type === 'webpage' || type === 'preprint' || type === 'dataset'),
      sourceKind: 'bibtex',
    };
  });
}
