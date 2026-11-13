import type { CitationItem, FormatOptions, FormattedEntry, AuthorName } from '../types';
import { formatAuthorGBT, hasCJK, cleanChineseSpaces } from '../authors';

function escapeHtmlPreservingItalics(raw: string): string {
  // Preserve <i>...</i> and <em>...</em> from Crossref / parsed input, escape everything else
  const placeholders: string[] = [];
  const tokenized = raw.replace(/<(i|em)>(.*?)<\/\1>/gi, (_, _tag, inner) => {
    const idx = placeholders.length;
    const safeInner = inner
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    placeholders.push(`<i>${safeInner}</i>`);
    return `\u0000ITALIC_${idx}\u0000`;
  });

  const escaped = tokenized
    .replace(/<[^>]+>/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped.replace(/\u0000ITALIC_(\d+)\u0000/g, (_, idx) => placeholders[Number(idx)]);
}

export function stripHtmlTags(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function isChineseEntry(item: CitationItem): boolean {
  if (item.language === 'zh') return true;
  if (item.language === 'en') return false;
  return (
    hasCJK(item.title) ||
    hasCJK(item.containerTitle || '') ||
    hasCJK(item.publisher || '') ||
    (item.authors || []).some((a) => a.isChinese || hasCJK(a.literal || '') || hasCJK(a.family || ''))
  );
}

function formatAuthorListGBT(
  authors: AuthorName[] | undefined,
  isZh: boolean,
  edition: '2025' | '2015',
  commaSep: string,
  suffixRole?: string,
  forceEtAl = false
): string {
  const valid = (authors || []).filter((a) => a.literal || a.family);
  if (valid.length === 0) return '';

  const shown = valid.slice(0, 3).map((a) => formatAuthorGBT(a, edition));
  let res = shown.join(commaSep);
  if (valid.length > 3 || forceEtAl) {
    res += isZh ? `${commaSep}等` : `${commaSep}et al.`;
  }
  if (suffixRole) {
    res += `${commaSep}${suffixRole}`;
  }
  return res;
}

function normalizeEdition(edition: string, isZh: boolean): string {
  const e = edition.trim();
  if (!e || e === '1' || /^1st\b/i.test(e) || e === '1版' || e === '第1版') return '';
  if (isZh) {
    const numMatch = e.match(/^第?(\d+)\s*版?$/);
    if (numMatch) return `${numMatch[1]}版`;
    return e.endsWith('版') ? e : `${e}版`;
  }
  if (/^\d+$/.test(e)) {
    const n = Number(e);
    const ord = n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th';
    return `${n}${ord} ed.`;
  }
  return /ed\.?$/i.test(e) ? (e.endsWith('.') ? e : `${e}.`) : e;
}

function normalizePages(pages?: string, articleNumber?: string): string {
  const raw = (pages || articleNumber || '').trim();
  if (!raw) return '';
  return raw.replace(/\s*(?:[-–—－]+|--)\s*/g, '-');
}

function normalizeDoi(doi?: string): string {
  if (!doi) return '';
  return doi
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .replace(/\.$/, '');
}

function normalizeCstr(cstr?: string): string {
  if (!cstr) return '';
  return cstr.trim().replace(/^cstr:\s*/i, '').replace(/\.$/, '');
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function typeCodeGBT(item: CitationItem, edition: '2025' | '2015', hasOnlineOutput: boolean): string {
  let base = 'J';
  switch (item.type) {
    case 'article-journal': base = 'J'; break;
    case 'article-newspaper': base = 'N'; break;
    case 'book':
    case 'chapter': base = 'M'; break;
    case 'paper-conference': base = 'C'; break;
    case 'thesis': base = 'D'; break;
    case 'report': base = 'R'; break;
    case 'standard': base = 'S'; break;
    case 'patent': base = 'P'; break;
    case 'webpage': base = 'EB'; break;
    case 'archive': base = 'A'; break;
    case 'map': base = 'CM'; break;
    case 'dataset': base = 'DS'; break;
    case 'preprint': base = edition === '2015' ? 'EB' : 'PP'; break;
  }

  const alwaysOnline = item.type === 'webpage' || item.type === 'dataset' || item.type === 'preprint';
  const online = alwaysOnline || (hasOnlineOutput && (item.isOnline || Boolean(item.url) || Boolean(item.doi) || Boolean(item.cstr)));

  if (online && item.type !== 'standard') {
    return `${base}/OL`;
  }
  return base;
}

function ensureSinglePeriod(str: string): string {
  const trimmed = str.trim();
  if (!trimmed) return '';
  if (trimmed.endsWith('.') || trimmed.endsWith('．')) return trimmed;
  return `${trimmed}.`;
}

export function formatGBT7714(item: CitationItem, opts: FormatOptions): FormattedEntry {
  const edition: '2025' | '2015' = opts.style === 'gbt7714-2015-numeric' ? '2015' : '2025';
  const isAuthorDate = opts.style === 'gbt7714-2025-author-date';
  const includeUrlDoi = opts.includeUrlDoi !== false;
  const isZh = isChineseEntry(item);
  const fullwidth = Boolean(opts.fullwidthPunctuation) && isZh;

  const comma = fullwidth ? '，' : ', ';
  const colon = fullwidth ? '：' : ': ';
  const notes = [...(item.notes || [])];

  if (edition === '2015' && item.type === 'preprint') {
    notes.push('2015 版无预印本代码 [PP]，已退回旧版 [EB/OL]');
  }

  const cleanDoi = includeUrlDoi ? normalizeDoi(item.doi) : '';
  const cleanCstr = includeUrlDoi ? normalizeCstr(item.cstr) : '';
  let cleanUrl = includeUrlDoi && item.url ? item.url.trim() : '';
  if (cleanUrl && cleanDoi && cleanUrl.toLowerCase() === `https://doi.org/${cleanDoi.toLowerCase()}`) {
    cleanUrl = '';
  }

  const hasOnlineOutput = includeUrlDoi && (Boolean(cleanUrl) || Boolean(cleanDoi) || Boolean(cleanCstr) || Boolean(item.isOnline));
  const code = typeCodeGBT(item, edition, hasOnlineOutput);

  const authorStr = formatAuthorListGBT(item.authors, isZh, edition, comma, undefined, Boolean(item.hasEtAl));
  const yearVal = item.year || (item.date ? item.date.slice(0, 4) : '');

  // Build title + subtitle + number/scale
  const rawTitle = item.title.trim();
  const rawSub = item.subtitle ? item.subtitle.trim() : '';
  let fullTitleHtml = escapeHtmlPreservingItalics(rawTitle);
  if (rawSub) {
    fullTitleHtml += `${colon}${escapeHtmlPreservingItalics(rawSub)}`;
  }

  if (item.type === 'patent' && item.number) {
    fullTitleHtml += `${colon}${escapeHtmlPreservingItalics(item.number.trim())}`;
  } else if (item.type === 'archive' && item.number) {
    fullTitleHtml += `${colon}${escapeHtmlPreservingItalics(item.number.trim())}`;
  } else if (item.type === 'map' && item.scale) {
    fullTitleHtml += ` ${escapeHtmlPreservingItalics(item.scale.trim())}`;
  } else if (item.type === 'standard' && item.number && !rawTitle.includes(item.number)) {
    fullTitleHtml = `${escapeHtmlPreservingItalics(item.number.trim())} ${fullTitleHtml}`;
  }

  const prefixNum = !isAuthorDate && opts.index ? `[${opts.index}] ` : '';

  // Header: Author (+ Year in author-date mode)
  const segments: string[] = [];
  if (authorStr) {
    if (isAuthorDate && yearVal) {
      segments.push(ensureSinglePeriod(`${escapeHtmlPreservingItalics(authorStr)}${comma}${yearVal}`));
    } else {
      segments.push(ensureSinglePeriod(escapeHtmlPreservingItalics(authorStr)));
    }
  }

  // Needs accessed date?
  // 2025: ONLY webpage (EB/OL), dataset (DS/OL), preprint (PP/OL)
  // 2015: Any /OL with accessedDate (or EB/OL)
  const needsAccessed2025 =
    item.type === 'webpage' || item.type === 'dataset' || item.type === 'preprint';
  let accessed = item.accessedDate?.trim() || '';
  if (edition === '2025' && needsAccessed2025 && !accessed) {
    accessed = todayISO();
    notes.push(`2025 国标规定 [${code}] 必备引用日期，已自动填入 ${accessed}`);
  }
  const showAccessed =
    edition === '2025'
      ? needsAccessed2025 && Boolean(accessed)
      : code.endsWith('/OL') && Boolean(accessed || item.type === 'webpage');
  const accessedBracket = showAccessed ? `[${accessed || todayISO()}]` : '';

  const pages = normalizePages(item.pages, item.articleNumber);
  const editionStr = item.edition ? normalizeEdition(item.edition, isZh) : '';

  // Type-specific middle body
  if (item.type === 'article-journal') {
    segments.push(`${fullTitleHtml}[${code}].`);
    const container = item.containerTitle
      ? escapeHtmlPreservingItalics(isZh ? cleanChineseSpaces(item.containerTitle) : item.containerTitle.trim())
      : '';
    // Journal detail: Container, Year, Vol(Issue): Pages
    const jParts: string[] = [];
    if (container) jParts.push(container);
    if (!isAuthorDate) {
      // Online-first article without vol/issue/pages uses full date if present
      if (!item.volume && !item.issue && !pages && item.date) {
        jParts.push(item.date);
      } else if (yearVal) {
        jParts.push(yearVal);
      }
    }
    if (item.volume && item.issue) {
      jParts.push(`${item.volume}(${item.issue})`);
    } else if (item.volume) {
      jParts.push(item.volume);
    } else if (item.issue) {
      // No volume: attach (Issue) directly to year if year is last in jParts, e.g. 2023(5)
      if (jParts.length > 0 && /^\d{4}$/.test(jParts[jParts.length - 1])) {
        jParts[jParts.length - 1] = `${jParts[jParts.length - 1]}(${item.issue})`;
      } else {
        jParts.push(`(${item.issue})`);
      }
    }

    let jStr = jParts.join(comma);
    if (pages) {
      jStr += `${colon}${pages}`;
    }
    if (accessedBracket) {
      jStr += accessedBracket;
    }
    if (jStr) segments.push(ensureSinglePeriod(jStr));
  } else if (item.type === 'article-newspaper') {
    segments.push(`${fullTitleHtml}[${code}].`);
    const paper = item.containerTitle ? escapeHtmlPreservingItalics(cleanChineseSpaces(item.containerTitle)) : '';
    const pubDate = item.date || yearVal;
    let nStr = [paper, pubDate].filter(Boolean).join(comma);
    if (pages || item.issue) {
      nStr += `(${pages || item.issue})`;
    }
    if (accessedBracket) nStr += accessedBracket;
    if (nStr) segments.push(ensureSinglePeriod(nStr));
  } else if (item.type === 'chapter' || (item.type === 'paper-conference' && item.containerTitle)) {
    const edStr = item.editors?.length
      ? formatAuthorListGBT(item.editors, isZh, edition, comma)
      : '';
    const container = item.containerTitle
      ? escapeHtmlPreservingItalics(isZh ? cleanChineseSpaces(item.containerTitle) : item.containerTitle.trim())
      : '';
    const afterSlash = [edStr ? ensureSinglePeriod(escapeHtmlPreservingItalics(edStr)) : '', container]
      .filter(Boolean)
      .join(' ');

    const hasPubPlace = Boolean(item.place || item.publisher);
    const pubCore: string[] = [];
    if (item.place && item.publisher) {
      pubCore.push(`${escapeHtmlPreservingItalics(item.place)}${colon}${escapeHtmlPreservingItalics(item.publisher)}`);
    } else if (item.publisher) {
      pubCore.push(escapeHtmlPreservingItalics(item.publisher));
    } else if (item.place) {
      pubCore.push(escapeHtmlPreservingItalics(item.place));
    }
    if (!isAuthorDate && yearVal) {
      pubCore.push(yearVal);
    }
    let pubLine = pubCore.join(comma);
    if (pages) {
      pubLine = pubLine ? `${pubLine}${colon}${pages}` : pages;
    }
    if (accessedBracket) pubLine += accessedBracket;

    if (!hasPubPlace && !editionStr && pubLine) {
      segments.push(ensureSinglePeriod(`${fullTitleHtml}[${code}]//${afterSlash}${comma}${pubLine}`));
    } else {
      segments.push(ensureSinglePeriod(`${fullTitleHtml}[${code}]//${afterSlash}`));
      if (editionStr) segments.push(ensureSinglePeriod(editionStr));
      if (pubLine) segments.push(ensureSinglePeriod(pubLine));
    }
  } else if (item.type === 'dataset' || item.type === 'preprint') {
    segments.push(`${fullTitleHtml}[${code}].`);
    if (item.version) {
      const ver = /^v/i.test(item.version.trim()) ? item.version.trim() : `V${item.version.trim()}`;
      segments.push(ensureSinglePeriod(escapeHtmlPreservingItalics(ver)));
    }
    const platform = escapeHtmlPreservingItalics(
      item.publisher || item.containerTitle || (item.type === 'preprint' ? 'arXiv' : '')
    );
    const createDate = item.date || (!isAuthorDate ? yearVal : '');
    let platDate = platform;
    if (createDate) {
      platDate = platDate ? `${platDate} (${createDate})` : `(${createDate})`;
    }
    if (accessedBracket) {
      platDate = platDate ? `${platDate} ${accessedBracket}` : accessedBracket;
    }
    if (platDate) segments.push(ensureSinglePeriod(platDate));
  } else if (item.type === 'webpage') {
    segments.push(`${fullTitleHtml}[${code}].`);
    if (item.containerTitle && item.containerTitle !== item.title) {
      segments.push(ensureSinglePeriod(escapeHtmlPreservingItalics(item.containerTitle)));
    }
    const pubDate = item.date ? `(${item.date})` : '';
    const dateBlock = [pubDate, accessedBracket].filter(Boolean).join(' ');
    if (dateBlock) segments.push(ensureSinglePeriod(dateBlock));
  } else if (item.type === 'standard') {
    segments.push(`${fullTitleHtml}[${code}].`);
    if (item.place || item.publisher) {
      const pubParts: string[] = [];
      if (item.place && item.publisher) {
        pubParts.push(`${escapeHtmlPreservingItalics(item.place)}${colon}${escapeHtmlPreservingItalics(item.publisher)}`);
      } else {
        pubParts.push(escapeHtmlPreservingItalics(item.publisher || item.place || ''));
      }
      if (!isAuthorDate && yearVal) pubParts.push(yearVal);
      segments.push(ensureSinglePeriod(pubParts.join(comma)));
    }
  } else if (item.type === 'patent') {
    segments.push(`${fullTitleHtml}[${code}].`);
    const pubDate = item.date || (!isAuthorDate ? yearVal : '');
    let pLine = pubDate;
    if (pages) pLine = pLine ? `${pLine}${colon}${pages}` : pages;
    if (accessedBracket) pLine += accessedBracket;
    if (pLine) segments.push(ensureSinglePeriod(pLine));
  } else {
    // book (M), thesis (D), report (R), conference volume (C), archive (A), map (CM)
    segments.push(`${fullTitleHtml}[${code}].`);
    if (item.translators?.length) {
      segments.push(ensureSinglePeriod(formatAuthorListGBT(item.translators, isZh, edition, comma, '译')));
    }
    if (editionStr) segments.push(ensureSinglePeriod(editionStr));

    const pubParts: string[] = [];
    if (item.place && item.publisher) {
      pubParts.push(`${escapeHtmlPreservingItalics(item.place)}${colon}${escapeHtmlPreservingItalics(item.publisher)}`);
    } else if (item.publisher) {
      pubParts.push(escapeHtmlPreservingItalics(item.publisher));
    } else if (item.place) {
      pubParts.push(escapeHtmlPreservingItalics(item.place));
    }
    const datePiece =
      (item.type === 'report' || item.type === 'archive') && item.date
        ? item.date
        : !isAuthorDate
          ? yearVal
          : '';
    if (datePiece) pubParts.push(datePiece);

    let pubLine = pubParts.join(comma);
    if (pages) {
      pubLine = pubLine ? `${pubLine}${colon}${pages}` : pages;
    }
    if (accessedBracket) pubLine += accessedBracket;
    if (pubLine) segments.push(ensureSinglePeriod(pubLine));

    if (item.type === 'map' && item.dimensions) {
      segments.push(ensureSinglePeriod(escapeHtmlPreservingItalics(item.dimensions)));
    }
  }

  // Trailing URL & Persistent Identifiers (PID: DOI / CSTR)
  if (cleanUrl) {
    segments.push(ensureSinglePeriod(escapeHtmlPreservingItalics(cleanUrl)));
  }
  if (cleanDoi) {
    segments.push(`DOI:${escapeHtmlPreservingItalics(cleanDoi)}.`);
  }
  if (cleanCstr && (!cleanUrl || !cleanUrl.includes(`CSTR:${cleanCstr}`))) {
    segments.push(`CSTR:${escapeHtmlPreservingItalics(cleanCstr)}.`);
  }

  const joiner = ' ';
  const bodyHtml = segments
    .filter(Boolean)
    .join(joiner)
    .replace(/\.\./g, '.');

  const html = `${prefixNum}${bodyHtml}`.trim();
  const text = stripHtmlTags(html);

  return {
    id: item.id,
    html,
    text,
    notes,
    item,
  };
}
