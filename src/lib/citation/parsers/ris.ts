import type { CitationItem, ResourceType } from '../types';
import { parseAuthor } from '../authors';

function mapRisType(ty: string): ResourceType {
  switch (ty.toUpperCase()) {
    case 'JOUR':
    case 'JFULL':
    case 'MGZN': return 'article-journal';
    case 'NEWS': return 'article-newspaper';
    case 'BOOK':
    case 'EDBOOK': return 'book';
    case 'CHAP':
    case 'SECT': return 'chapter';
    case 'CONF':
    case 'CPAPER': return 'paper-conference';
    case 'THES': return 'thesis';
    case 'RPRT': return 'report';
    case 'STAND': return 'standard';
    case 'PAT': return 'patent';
    case 'DATA': return 'dataset';
    case 'UNPB':
    case 'INPR': return 'preprint';
    case 'ELEC':
    case 'WEB':
    case 'BLOG': return 'webpage';
    default: return 'article-journal';
  }
}

export function isRisOrTaggedInput(input: string): boolean {
  return (
    /^\s*TY\s+-\s+\w+/m.test(input) ||
    /^\s*%[0ATJD]\s+\S+/m.test(input) ||
    /^\s*\{(?:Reference Type|Author|Title)\}:/im.test(input)
  );
}

function parseSingleRisBlock(lines: string[], idx: number): CitationItem | null {
  let type: ResourceType = 'article-journal';
  const authors: ReturnType<typeof parseAuthor>[] = [];
  const editors: ReturnType<typeof parseAuthor>[] = [];
  let title = '';
  let containerTitle = '';
  let publisher = '';
  let place = '';
  let year = '';
  let date = '';
  let accessedDate = '';
  let volume = '';
  let issue = '';
  let sp = '';
  let ep = '';
  let doi = '';
  let url = '';
  let edition = '';
  let version = '';
  let number = '';

  for (const rawLine of lines) {
    const m = rawLine.match(/^\s*([A-Z0-9]{2})\s*-\s*(.+)$/);
    if (!m) continue;
    const [, tag, valRaw] = m;
    const val = valRaw.trim();
    if (!val) continue;

    switch (tag) {
      case 'TY': type = mapRisType(val); break;
      case 'AU':
      case 'A1':
        for (const sub of val.split(/[;；]/).map((s) => s.trim()).filter(Boolean)) {
          authors.push(parseAuthor(sub));
        }
        break;
      case 'ED':
      case 'A2':
        editors.push(parseAuthor(val));
        break;
      case 'TI':
      case 'T1':
        if (!title) title = val;
        break;
      case 'T2':
      case 'JF':
      case 'JO':
      case 'JA':
      case 'BT':
        if (!containerTitle) containerTitle = val;
        break;
      case 'PB': publisher = val; break;
      case 'CY':
      case 'PP': place = val; break;
      case 'PY':
      case 'Y1': {
        const ym = val.match(/\b(\d{4})\b/);
        if (ym) year = ym[1];
        if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(val)) {
          date = val.slice(0, 10).replace(/\//g, '-');
        }
        break;
      }
      case 'DA': {
        const dm = val.match(/^(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2}))?/);
        if (dm) {
          year = year || dm[1];
          date = dm[3] ? `${dm[1]}-${dm[2].padStart(2, '0')}-${dm[3].padStart(2, '0')}` : `${dm[1]}-${dm[2].padStart(2, '0')}`;
        }
        break;
      }
      case 'Y2': {
        const am = val.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
        if (am) accessedDate = am[1].replace(/\//g, '-');
        break;
      }
      case 'VL': volume = val; break;
      case 'IS': issue = val; break;
      case 'SP': sp = val; break;
      case 'EP': ep = val; break;
      case 'DO': doi = val; break;
      case 'UR':
      case 'L1':
      case 'L2': if (!url) url = val; break;
      case 'ET': edition = val; break;
      case 'M1': if (!number) number = val; break;
      case 'C7': if (!sp) sp = val; break;
      case 'DP':
        if (/arxiv|chinaxiv/i.test(val)) {
          type = 'preprint';
          publisher = publisher || val;
        }
        break;
    }
  }

  if (!title && !authors.length) return null;
  const pages = sp && ep && sp !== ep ? `${sp}-${ep}` : sp || ep || undefined;

  return {
    id: `ris-${idx + 1}`,
    type,
    authors,
    editors: editors.length ? editors : undefined,
    title,
    containerTitle: containerTitle || undefined,
    publisher: publisher || undefined,
    place: place || undefined,
    edition: edition || undefined,
    version: version || undefined,
    year: year || undefined,
    date: date || undefined,
    accessedDate: accessedDate || undefined,
    volume: volume || undefined,
    issue: issue || undefined,
    pages,
    number: number || undefined,
    doi: doi || undefined,
    url: url || undefined,
    isOnline: Boolean(url || doi || type === 'webpage' || type === 'preprint' || type === 'dataset'),
    sourceKind: 'ris',
  };
}

function parseEndNoteBlocks(input: string): CitationItem[] {
  const blocks = input.trim().split(/\n\s*\n+/);
  const items: CitationItem[] = [];

  blocks.forEach((block, idx) => {
    let type: ResourceType = 'article-journal';
    const authors: ReturnType<typeof parseAuthor>[] = [];
    let title = '';
    let containerTitle = '';
    let publisher = '';
    let place = '';
    let year = '';
    let volume = '';
    let issue = '';
    let pages = '';
    let doi = '';
    let url = '';
    let edition = '';

    for (const line of block.split(/\r?\n/)) {
      // EndNote `%T ...` or NoteExpress `{Title}: ...`
      const en = line.match(/^\s*%([0A-Z])\s+(.+)$/);
      const ne = line.match(/^\s*\{([^}]+)\}:\s*(.+)$/);
      if (en) {
        const [, code, vRaw] = en;
        const v = vRaw.trim();
        switch (code) {
          case '0':
            if (/book section/i.test(v)) type = 'chapter';
            else if (/book/i.test(v)) type = 'book';
            else if (/conference/i.test(v)) type = 'paper-conference';
            else if (/thesis|dissertation/i.test(v)) type = 'thesis';
            else if (/report/i.test(v)) type = 'report';
            else if (/patent/i.test(v)) type = 'patent';
            else if (/web|electronic/i.test(v)) type = 'webpage';
            break;
          case 'A':
            for (const sub of v.split(/[;；]/).map((s) => s.trim()).filter(Boolean)) {
              authors.push(parseAuthor(sub));
            }
            break;
          case 'T': title = v; break;
          case 'J':
          case 'B': containerTitle = containerTitle || v; break;
          case 'I': publisher = v; break;
          case 'C': place = v; break;
          case 'D': year = v.slice(0, 4); break;
          case 'V': volume = v; break;
          case 'N': issue = v; break;
          case 'P': pages = v; break;
          case 'R': doi = v; break;
          case 'U': url = v; break;
          case '7': edition = v; break;
        }
      } else if (ne) {
        const key = ne[1].trim().toLowerCase();
        const v = ne[2].trim();
        if (key === 'reference type') {
          if (/thesis|学位论文/i.test(v)) type = 'thesis';
          else if (/book|图书|专著/i.test(v)) type = 'book';
          else if (/conference|会议/i.test(v)) type = 'paper-conference';
        } else if (key === 'author') {
          v.split(/[;；]/).map((s) => s.trim()).filter(Boolean).forEach((s) => authors.push(parseAuthor(s)));
        } else if (key === 'title') title = v;
        else if (key === 'journal' || key === 'secondary title') containerTitle = containerTitle || v;
        else if (key === 'year') year = v.slice(0, 4);
        else if (key === 'volume') volume = v;
        else if (key === 'issue') issue = v;
        else if (key === 'pages') pages = v;
        else if (key === 'publisher' || key === 'tertiary author') publisher = publisher || v;
        else if (key === 'place published') place = v;
        else if (key === 'doi') doi = v;
        else if (key === 'url') url = v;
      }
    }

    if (title || authors.length) {
      items.push({
        id: `tagged-${idx + 1}`,
        type,
        authors,
        title,
        containerTitle: containerTitle || undefined,
        publisher: publisher || undefined,
        place: place || undefined,
        edition: edition || undefined,
        year: year || undefined,
        volume: volume || undefined,
        issue: issue || undefined,
        pages: pages || undefined,
        doi: doi || undefined,
        url: url || undefined,
        isOnline: Boolean(url || doi),
        sourceKind: 'ris',
      });
    }
  });

  return items;
}

export function parseRisOrTagged(input: string): CitationItem[] {
  if (/^\s*TY\s+-\s+/m.test(input)) {
    const rawBlocks = input.split(/^\s*ER\s*-.*$/m);
    const results: CitationItem[] = [];
    rawBlocks.forEach((b, i) => {
      const parsed = parseSingleRisBlock(b.split(/\r?\n/), i);
      if (parsed) results.push(parsed);
    });
    return results;
  }
  return parseEndNoteBlocks(input);
}
