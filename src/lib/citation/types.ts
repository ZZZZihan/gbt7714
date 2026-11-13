export type ResourceType =
  | 'article-journal'
  | 'article-newspaper'
  | 'book'
  | 'chapter'
  | 'paper-conference'
  | 'thesis'
  | 'report'
  | 'standard'
  | 'patent'
  | 'webpage'
  | 'archive'
  | 'map'
  | 'dataset'
  | 'preprint';

export interface AuthorName {
  literal?: string;
  family?: string;
  given?: string;
  suffix?: string;
  isChinese?: boolean;
  isPinyin?: boolean;
}

export type InputSourceKind =
  | 'doi'
  | 'bibtex'
  | 'ris'
  | 'cnki'
  | 'gbt'
  | 'apa'
  | 'ieee'
  | 'plain';

export interface CitationItem {
  id: string;
  type: ResourceType;
  authors: AuthorName[];
  hasEtAl?: boolean;
  editors?: AuthorName[];
  translators?: AuthorName[];
  title: string;
  subtitle?: string;
  containerTitle?: string;
  edition?: string;
  version?: string;
  place?: string;
  publisher?: string;
  year?: string;
  date?: string;
  accessedDate?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  articleNumber?: string;
  doi?: string;
  cstr?: string;
  url?: string;
  number?: string;
  scale?: string;
  dimensions?: string;
  isOnline?: boolean;
  language?: 'zh' | 'en';
  sourceKind?: InputSourceKind;
  notes?: string[];
}

export type OutputStyle =
  | 'gbt7714-2025-numeric'
  | 'gbt7714-2025-author-date'
  | 'gbt7714-2015-numeric'
  | 'apa-7'
  | 'ieee'
  | 'bibtex';

export interface FormatOptions {
  style: OutputStyle;
  fullwidthPunctuation?: boolean;
  includeUrlDoi?: boolean;
  index?: number;
}

export interface FormattedEntry {
  id: string;
  html: string;
  text: string;
  notes: string[];
  item: CitationItem;
}

export type SortOrder = 'zh-first' | 'en-first' | 'alphabetical' | 'none';

export interface SortOptions {
  order?: SortOrder;
  disambiguateYear?: boolean;
}

export interface DuplicateDetail {
  title: string;
  reason: 'doi' | 'title-author';
  keptId: string;
  removedId: string;
}

export interface DeduplicateResult {
  items: CitationItem[];
  duplicatesRemoved: number;
  details: DuplicateDetail[];
}
