import type { CitationItem, InputSourceKind } from './types';
import { isBibTeXInput, parseBibTeX, splitBibEntries } from './parsers/bibtex';
import { isRisOrTaggedInput, parseRisOrTagged } from './parsers/ris';
import { extractStandaloneDoi, resolveDoiToItem, findEmbeddedDoi } from './parsers/doi';
import { parseFormattedLines, splitLogicalReferenceLines } from './parsers/formatted';

export * from './types';
export * from './authors';
export * from './formatters';
export * from './sort';
export * from './dedupe';
export { extractStandaloneDoi, resolveDoiToItem, findEmbeddedDoi };

export interface DetectedBatch {
  kind: InputSourceKind | 'mixed-doi';
  label: string;
  hasNetworkDoi: boolean;
}

type BatchChunk =
  | { type: 'bibtex'; text: string }
  | { type: 'ris'; text: string }
  | { type: 'line'; text: string };

function tokenizeBatchChunks(rawInput: string): BatchChunk[] {
  const trimmed = rawInput.trim();
  if (!trimmed) return [];

  if (isRisOrTaggedInput(trimmed) && !isBibTeXInput(trimmed)) {
    return [{ type: 'ris', text: trimmed }];
  }

  const bibSpans = splitBibEntries(trimmed);
  if (bibSpans.length === 0) {
    return splitLogicalReferenceLines(trimmed).map((l) => ({ type: 'line', text: l }));
  }

  const chunks: BatchChunk[] = [];
  let cursor = 0;

  for (const span of bibSpans) {
    const before = trimmed.slice(cursor, span.start).trim();
    if (before) {
      if (isRisOrTaggedInput(before)) {
        chunks.push({ type: 'ris', text: before });
      } else {
        splitLogicalReferenceLines(before).forEach((l) => chunks.push({ type: 'line', text: l }));
      }
    }
    chunks.push({ type: 'bibtex', text: trimmed.slice(span.start, span.end) });
    cursor = span.end;
  }

  const tail = trimmed.slice(cursor).trim();
  if (tail) {
    if (isRisOrTaggedInput(tail)) {
      chunks.push({ type: 'ris', text: tail });
    } else {
      splitLogicalReferenceLines(tail).forEach((l) => chunks.push({ type: 'line', text: l }));
    }
  }

  return chunks;
}

export function detectInputKind(rawInput: string): DetectedBatch {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { kind: 'plain', label: '等待输入', hasNetworkDoi: false };
  }

  const chunks = tokenizeBatchChunks(trimmed);
  const hasBib = chunks.some((c) => c.type === 'bibtex');
  const hasRis = chunks.some((c) => c.type === 'ris');
  const lineChunks = chunks.filter((c) => c.type === 'line');
  const doiCount = lineChunks.filter((c) => extractStandaloneDoi(c.text) !== null).length;

  if (hasBib && lineChunks.length > 0) {
    return {
      kind: 'bibtex',
      label: `混合批量输入（${chunks.length} 条）`,
      hasNetworkDoi: doiCount > 0,
    };
  }

  if (hasBib) {
    return { kind: 'bibtex', label: `BibTeX 文献记录（${chunks.length} 条）`, hasNetworkDoi: false };
  }

  if (hasRis) {
    return { kind: 'ris', label: 'RIS / EndNote / 知网标签导出', hasNetworkDoi: false };
  }

  if (lineChunks.length > 0 && doiCount === lineChunks.length) {
    return {
      kind: 'doi',
      label: `DOI / arXiv 标识符（${doiCount} 条）`,
      hasNetworkDoi: true,
    };
  }

  if (/([一-鿿])\s+([一-鿿])/.test(trimmed) || /[［【〔]\s*[A-Z]{1,2}/.test(trimmed)) {
    return { kind: 'cnki', label: '知网导出/格式错乱引文', hasNetworkDoi: doiCount > 0 };
  }

  if (/\[\s*(?:J|M|C|D|R|S|P|N|EB|DS|PP|A|CM)(?:\/OL)?\s*\]/i.test(trimmed)) {
    return { kind: 'gbt', label: 'GB/T 7714 格式引文', hasNetworkDoi: doiCount > 0 };
  }

  if (/,\s*(?:"|“).+?(?:,"|,”)/.test(trimmed)) {
    return { kind: 'ieee', label: 'IEEE 格式引文', hasNetworkDoi: doiCount > 0 };
  }

  if (/\((?:19|20)\d{2}[a-z]?\)\.\s+/.test(trimmed)) {
    return { kind: 'apa', label: 'APA 格式引文', hasNetworkDoi: doiCount > 0 };
  }

  return { kind: 'plain', label: '自由文本引文', hasNetworkDoi: doiCount > 0 };
}

/**
 * Parse pure local input synchronously (supports mixed BibTeX, RIS, CNKI, GB/T, APA, IEEE in order).
 */
export function parseLocalCitations(rawInput: string): CitationItem[] {
  const chunks = tokenizeBatchChunks(rawInput);
  const items: CitationItem[] = [];

  chunks.forEach((chunk, idx) => {
    if (chunk.type === 'bibtex') {
      parseBibTeX(chunk.text).forEach((it) => items.push({ ...it, id: `item-${idx + 1}` }));
    } else if (chunk.type === 'ris') {
      parseRisOrTagged(chunk.text).forEach((it, s) => items.push({ ...it, id: `item-${idx + 1}-${s + 1}` }));
    } else {
      parseFormattedLines(chunk.text).forEach((it, s) => items.push({ ...it, id: `item-${idx + 1}-${s + 1}` }));
    }
  });

  return items;
}

/**
 * Parse mixed or DOI-containing input asynchronously (resolves standalone DOIs via Crossref/DataCite,
 * parses BibTeX, RIS, and formatted lines locally in exact order).
 */
export async function parseAndResolveCitations(
  rawInput: string,
  opts?: {
    onProgress?: (done: number, total: number) => void;
    signal?: AbortSignal;
  }
): Promise<{ items: CitationItem[]; errors: string[] }> {
  const chunks = tokenizeBatchChunks(rawInput);
  if (!chunks.length) return { items: [], errors: [] };

  const items: CitationItem[] = [];
  const errors: string[] = [];

  let done = 0;
  opts?.onProgress?.(0, chunks.length);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunk.type === 'bibtex') {
      parseBibTeX(chunk.text).forEach((it) => items.push({ ...it, id: `item-${i + 1}` }));
    } else if (chunk.type === 'ris') {
      parseRisOrTagged(chunk.text).forEach((it, s) => items.push({ ...it, id: `item-${i + 1}-${s + 1}` }));
    } else {
      const standalone = extractStandaloneDoi(chunk.text);
      if (standalone) {
        try {
          const fetched = await resolveDoiToItem(chunk.text, opts?.signal);
          items.push({ ...fetched, id: `item-${i + 1}` });
        } catch (err) {
          errors.push(err instanceof Error ? err.message : String(err));
        }
      } else {
        parseFormattedLines(chunk.text).forEach((it, s) => {
          items.push({ ...it, id: `item-${i + 1}-${s + 1}` });
        });
      }
    }
    done++;
    opts?.onProgress?.(done, chunks.length);
  }

  return { items, errors };
}
