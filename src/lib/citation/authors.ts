import type { AuthorName } from './types';

const CJK_RE = /[一-鿿]/;

const CORPORATE_ZH_RE =
  /(中心|系统|研究院|研究所|委员会|编辑部|出版社|大学|学院|医院|学会|协会|工作组|办公室|局|部|署|厅|院|馆|社|集团|公司|银行|实验室|课题组|项目组|编写组|编委会)$/;

const CORPORATE_EN_RE =
  /\b(Institute|University|Organization|Organisation|Association|Committee|Commission|Ministry|Department|Society|Foundation|Center|Centre|Press|Group|Corporation|Corp|Inc|Ltd|Team|Laboratory|Council|Bureau|Agency|Library|Museum|Collaboration)\b/i;

const PINYIN_SURNAMES = new Set([
  'wang', 'li', 'zhang', 'liu', 'chen', 'yang', 'huang', 'zhao', 'wu', 'zhou',
  'xu', 'sun', 'ma', 'zhu', 'hu', 'guo', 'he', 'gao', 'lin', 'luo',
  'zheng', 'liang', 'xie', 'song', 'tang', 'han', 'cao', 'deng', 'xiao', 'feng',
  'zeng', 'cheng', 'cai', 'peng', 'pan', 'yuan', 'yu', 'dong', 'su', 'wei',
  'lv', 'lyu', 'lu', 'ding', 'ren', 'shen', 'yao', 'jiang', 'cui', 'tan',
  'fan', 'jin', 'shi', 'liao', 'jia', 'xia', 'fu', 'fang', 'zou', 'xiong',
  'meng', 'qin', 'bai', 'hou', 'yan', 'yin', 'qian', 'dai', 'du', 'gu',
  'mao', 'qiu', 'shao', 'wan', 'kong', 'chang', 'kang', 'niu', 'lei', 'tian',
  'wan', 'duan', 'hao', 'gong', 'weng', 'qiao', 'lai', 'wen', 'hong', 'tao',
  'ye', 'xue', 'zhong', 'yan', 'ni', 'zhuang', 'yan', 'ge', 'xing', 'pei',
  'xiang', 'an', 'bi', 'ba', 'bu', 'chai', 'che', 'chi', 'chu', 'cong',
  'diao', 'dou', 'fei', 'gan', 'geng', 'gu', 'guan', 'guang', 'hai', 'hua',
  'huo', 'ji', 'jian', 'jiao', 'jing', 'ju', 'ke', 'kuang', 'lan', 'lang',
  'leng', 'lian', 'liu', 'long', 'lou', 'luan', 'mei', 'miao', 'min', 'mo',
  'mu', 'nie', 'ning', 'nong', 'ou', 'pang', 'pi', 'pu', 'qi', 'qiang',
  'qu', 'quan', 'ran', 'rao', 'rong', 'ruan', 'sang', 'sha', 'shan', 'shang',
  'she', 'sheng', 'shu', 'shui', 'si', 'suo', 'tai', 'teng', 'tong', 'tu',
  'tuo', 'wei', 'wu', 'xi', 'xiang', 'xin', 'xiong', 'xuan', 'yue', 'yun',
  'zang', 'zhan', 'zhai', 'zhang', 'zhen', 'zhuo', 'zong', 'zuo',
  'ouyang', 'shangguan', 'situ', 'sikong', 'zhuge', 'duanmu', 'huangfu', 'murong',
]);

const PINYIN_SYLLABLES = new Set([
  'a','ai','an','ang','ao',
  'ba','bai','ban','bang','bao','bei','ben','beng','bi','bian','biao','bie','bin','bing','bo','bu',
  'ca','cai','can','cang','cao','ce','cen','ceng','cha','chai','chan','chang','chao','che','chen','cheng','chi','chong','chou','chu','chua','chuai','chuan','chuang','chui','chun','chuo','ci','cong','cou','cu','cuan','cui','cun','cuo',
  'da','dai','dan','dang','dao','de','dei','den','deng','di','dia','dian','diao','die','ding','diu','dong','dou','du','duan','dui','dun','duo',
  'e','ei','en','eng','er',
  'fa','fan','fang','fei','fen','feng','fo','fou','fu',
  'ga','gai','gan','gang','gao','ge','gei','gen','geng','gong','gou','gu','gua','guai','guan','guang','gui','gun','guo',
  'ha','hai','han','hang','hao','he','hei','hen','heng','hong','hou','hu','hua','huai','huan','huang','hui','hun','huo',
  'ji','jia','jian','jiang','jiao','jie','jin','jing','jiong','jiu','ju','juan','jue','jun',
  'ka','kai','kan','kang','kao','ke','kei','ken','keng','kong','kou','ku','kua','kuai','kuan','kuang','kui','kun','kuo',
  'la','lai','lan','lang','lao','le','lei','leng','li','lia','lian','liang','liao','lie','lin','ling','liu','lo','long','lou','lu','luan','lue','lun','luo','lv','lve','lyu','lyue',
  'ma','mai','man','mang','mao','me','mei','men','meng','mi','mian','miao','mie','min','ming','miu','mo','mou','mu',
  'na','nai','nan','nang','nao','ne','nei','nen','neng','ni','nian','niang','niao','nie','nin','ning','niu','nong','nou','nu','nuan','nue','nuo','nv','nve','nyu','nyue',
  'o','ou',
  'pa','pai','pan','pang','pao','pei','pen','peng','pi','pian','piao','pie','pin','ping','po','pou','pu',
  'qi','qia','qian','qiang','qiao','qie','qin','qing','qiong','qiu','qu','quan','que','qun',
  'ran','rang','rao','re','ren','reng','ri','rong','rou','ru','rua','ruan','rui','run','ruo',
  'sa','sai','san','sang','sao','se','sen','seng','sha','shai','shan','shang','shao','she','shei','shen','sheng','shi','shou','shu','shua','shuai','shuan','shuang','shui','shun','shuo','si','song','sou','su','suan','sui','sun','suo',
  'ta','tai','tan','tang','tao','te','teng','ti','tian','tiao','tie','ting','tong','tou','tu','tuan','tui','tun','tuo',
  'wa','wai','wan','wang','wei','wen','weng','wo','wu',
  'xi','xia','xian','xiang','xiao','xie','xin','xing','xiong','xiu','xu','xuan','xue','xun',
  'ya','yan','yang','yao','ye','yi','yin','ying','yo','yong','you','yu','yuan','yue','yun',
  'za','zai','zan','zang','zao','ze','zei','zen','zeng','zha','zhai','zhan','zhang','zhao','zhe','zhei','zhen','zheng','zhi','zhong','zhou','zhu','zhua','zhuai','zhuan','zhuang','zhui','zhun','zhuo','zi','zong','zou','zu','zuan','zui','zun','zuo',
]);

// Common short English given names that coincidentally decompose into pinyin syllables
const COMMON_WESTERN_GIVEN = new Set([
  'dan', 'ben', 'ken', 'tim', 'tom', 'sam', 'bob', 'jim', 'joe', 'lee', 'ray',
  'jay', 'kay', 'may', 'ann', 'anne', 'emma', 'ava', 'mia', 'leo', 'eli', 'ian',
  'alan', 'allen', 'dean', 'sean', 'jean', 'joan', 'juan', 'ivan', 'evan', 'owen',
  'adam', 'eric', 'erik', 'mark', 'paul', 'carl', 'karl', 'hans', 'kurt', 'luke',
  'luc', 'marc', 'matt', 'nick', 'rick', 'ross', 'ryan', 'seth', 'todd', 'troy',
  'wade', 'ward', 'zane', 'sara', 'tara', 'lara', 'nina', 'tina', 'lina', 'mina',
  'mona', 'lisa', 'rita', 'rosa', 'vera', 'cora', 'dora', 'nora', 'ella', 'anna',
]);

export function hasCJK(text: string): boolean {
  return CJK_RE.test(text);
}

export function cleanChineseSpaces(text: string): string {
  return text.replace(/([一-鿿])\s+([一-鿿])/g, '$1$2')
             .replace(/([一-鿿])\s+([一-鿿])/g, '$1$2');
}

function isValidPinyinGiven(given: string): boolean {
  const cleaned = given.trim().toLowerCase().replace(/['’-]/g, '');
  if (!cleaned || !/^[a-z]+$/.test(cleaned) || cleaned.length < 2 || cleaned.length > 12) {
    return false;
  }
  if (COMMON_WESTERN_GIVEN.has(cleaned)) return false;

  // Match 1 or 2 pinyin syllables (Chinese given names have 1 or 2 characters)
  if (PINYIN_SYLLABLES.has(cleaned)) return true;
  for (let i = 1; i < cleaned.length; i++) {
    const first = cleaned.slice(0, i);
    const second = cleaned.slice(i);
    if (PINYIN_SYLLABLES.has(first) && PINYIN_SYLLABLES.has(second)) {
      return true;
    }
  }
  return false;
}

export function isLikelyPinyinName(family: string, given: string): boolean {
  const fam = family.trim().toLowerCase();
  if (!PINYIN_SURNAMES.has(fam)) return false;
  // Given could already contain spaces if written "Jiang Ning" -> check joined or parts
  const parts = given.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    // Reject single-letter initials like "J." or "J" -> not full pinyin given
    if (/^[A-Za-z]\.?$/.test(parts[0])) return false;
    return isValidPinyinGiven(parts[0]);
  }
  if (parts.length === 2 && parts.every((p) => p.length >= 2 && PINYIN_SYLLABLES.has(p.toLowerCase()) && !COMMON_WESTERN_GIVEN.has(p.toLowerCase()))) {
    return true;
  }
  return false;
}

/**
 * Normalize Western/Pinyin surname capitalization per GB/T 7714—2025 7.1.1:
 * EINSTEIN -> Einstein, WILLIAMS-ELLIS -> Williams-Ellis, DE MORGAN -> De Morgan, McDonald -> McDonald
 */
export function normalizeSurnameCase(surname: string, toUpper2015 = false): string {
  const trimmed = surname.trim();
  if (!trimmed) return '';
  if (hasCJK(trimmed)) return cleanChineseSpaces(trimmed);
  if (toUpper2015) return trimmed.toUpperCase();

  // If mixed case already (e.g. McDonald, van der Waal, DeLaCruz), preserve unless ALL CAPS
  const letters = trimmed.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
  const isAllUpper = letters.length > 1 && letters === letters.toUpperCase();
  const isAllLower = letters.length > 1 && letters === letters.toLowerCase();

  if (!isAllUpper && !isAllLower) {
    return trimmed;
  }

  return trimmed
    .split(/(\s+|-|')/)
    .map((seg) => {
      if (!seg || /^(\s+|-|')$/.test(seg)) return seg;
      return seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase();
    })
    .join('');
}

function capitalizeWord(w: string): string {
  if (!w) return '';
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

const SUFFIX_SET = new Set(['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv']);
const PARTICLES = new Set(['de', 'del', 'della', 'van', 'von', 'der', 'den', 'la', 'le', 'du', 'di', 'da', 'st', 'st.']);

function isInitialToken(tok: string): boolean {
  // "A", "A.", "J-L", "J.-L.", "A.A."
  return /^[A-Z]\.?(-[A-Z]\.?)*$/i.test(tok) && tok.replace(/[^A-Za-z]/g, '').length <= 2;
}

/**
 * Parse a single author string from any common format:
 * - Chinese: "张 群" / "张伯伟" / "中国互联网络信息中心"
 * - Comma order: "Einstein, Albert" / "Peebles, P. Z., Jr." / "LI, Jiangning"
 * - GB/T order: "EINSTEIN A" / "WILLIAMS-ELLIS A" / "DE MORGAN A" / "Peebles P Z Jr." / "LI Jiangning" / "Li Jiangning"
 * - Natural / IEEE order: "K. He" / "A. A. Myburg" / "Albert Einstein" / "Jean-Luc Godard"
 */
export function parseAuthor(raw: string): AuthorName {
  const cleaned = raw
    .replace(/\s+/g, ' ')
    .replace(/^[\d[\]().,;，；、\s]+|[,;，；.\s]+$/g, '')
    .trim();

  if (!cleaned) return { literal: '' };

  if (hasCJK(cleaned)) {
    const zh = cleanChineseSpaces(cleaned);
    if (zh.length >= 5 || CORPORATE_ZH_RE.test(zh)) {
      return { literal: zh, isChinese: true };
    }
    return { family: zh, isChinese: true };
  }

  // Corporate / acronym check
  if (
    CORPORATE_EN_RE.test(cleaned) ||
    (/^[A-Z0-9&-]{2,12}$/.test(cleaned) && !cleaned.includes(' '))
  ) {
    return { literal: cleaned };
  }

  // 1. Comma-separated: "Family, Given[, Suffix]"
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',').map((s) => s.trim()).filter(Boolean);
    const family = parts[0];
    let given = parts[1] || '';
    let suffix = parts[2] || '';
    if (!suffix && SUFFIX_SET.has(given.toLowerCase())) {
      suffix = given.replace(/\.$/, '');
      given = '';
    } else if (suffix) {
      suffix = suffix.replace(/\.$/, '');
    }
    const isPinyin = isLikelyPinyinName(family, given);
    return {
      family: normalizeSurnameCase(family),
      given,
      suffix: suffix || undefined,
      isPinyin,
    };
  }

  const tokens = cleaned.split(' ').filter(Boolean);
  if (tokens.length === 1) {
    return { literal: cleaned };
  }

  // Extract trailing suffix like Jr / Jr. / III
  let suffix: string | undefined;
  if (tokens.length >= 3 && SUFFIX_SET.has(tokens[tokens.length - 1].toLowerCase())) {
    const rawSuf = tokens.pop()!.replace(/\.$/, '');
    suffix = /^(ii|iii|iv)$/i.test(rawSuf) ? rawSuf.toUpperCase() : capitalizeWord(rawSuf);
  }

  // 2. Check IEEE / Natural initials-first: "K. He", "A. A. Myburg", "J.-L. Godard"
  // Leading token(s) have dots or are single uppercase initials, last token is full surname (>1 char without dot)
  const lastTok = tokens[tokens.length - 1];
  const leadingTokens = tokens.slice(0, -1);
  if (
    leadingTokens.every((t) => /^[A-Z]\.(-[A-Z]\.)?$/.test(t)) &&
    lastTok.length > 1 &&
    !lastTok.endsWith('.')
  ) {
    return {
      family: normalizeSurnameCase(lastTok),
      given: leadingTokens.join(' '),
      suffix,
    };
  }

  // 3. Check GB/T order: "EINSTEIN A", "MYBURG A A", "DE MORGAN A", "Williams-Ellis A", "Peebles P Z"
  // Trailing token(s) are bare single initials (e.g. "A", "P Z", "J-L") without dots, and leading part is surname
  let trailingInitialCount = 0;
  for (let i = tokens.length - 1; i >= 1; i--) {
    const tok = tokens[i];
    if (/^[A-Z](-[A-Z])?$/.test(tok)) {
      trailingInitialCount++;
    } else {
      break;
    }
  }
  if (trailingInitialCount > 0 && trailingInitialCount < tokens.length) {
    const famRaw = tokens.slice(0, tokens.length - trailingInitialCount).join(' ');
    const givRaw = tokens.slice(tokens.length - trailingInitialCount).join(' ');
    return {
      family: normalizeSurnameCase(famRaw),
      given: givRaw,
      suffix,
    };
  }

  // 4. Check GB/T 2015/2025 Pinyin order: "LI Jiangning", "Yu Yang", "Pan Erting"
  // Case 4a: First token is ALL CAPS surname (length >= 2) and second is MixedCase ("LI Jiangning")
  if (
    tokens.length === 2 &&
    /^[A-Z]{2,}$/.test(tokens[0]) &&
    /^[A-Z][a-z]+$/.test(tokens[1])
  ) {
    const isPinyin = isLikelyPinyinName(tokens[0], tokens[1]);
    return {
      family: normalizeSurnameCase(tokens[0]),
      given: tokens[1],
      suffix,
      isPinyin,
    };
  }

  // Case 4b: Two tokens where first is a Pinyin surname and second is a 2-syllable Chinese given name (e.g. "Li Jiangning", "Pan Erting", "Wang Xinya")
  // Note: for 2-token ambiguous names like "Yu Yang", in GB/T context `Yu` is family and `Yang` is given; in natural English `Yang Yu` might appear.
  // If first token is Pinyin surname and second token is a compound 2-syllable pinyin given name (not a surname), first is definitely surname!
  if (tokens.length === 2) {
    const [t0, t1] = tokens;
    const t0Surname = PINYIN_SURNAMES.has(t0.toLowerCase());
    const t1Surname = PINYIN_SURNAMES.has(t1.toLowerCase());
    const t0CompoundGiven = !PINYIN_SYLLABLES.has(t0.toLowerCase()) && isValidPinyinGiven(t0);
    const t1CompoundGiven = !PINYIN_SYLLABLES.has(t1.toLowerCase()) && isValidPinyinGiven(t1);

    if (t0Surname && t1CompoundGiven) {
      return {
        family: normalizeSurnameCase(t0),
        given: capitalizeWord(t1),
        suffix,
        isPinyin: true,
      };
    }
    if (t1Surname && t0CompoundGiven) {
      return {
        family: normalizeSurnameCase(t1),
        given: capitalizeWord(t0),
        suffix,
        isPinyin: true,
      };
    }
  }

  // 5. Default Natural Western order: "Albert Einstein", "Augustus De Morgan", "Jean-Luc Godard"
  // Check particle before last token (e.g. "Augustus De Morgan" -> family "De Morgan", given "Augustus")
  let famStart = tokens.length - 1;
  while (famStart > 1 && PARTICLES.has(tokens[famStart - 1].toLowerCase())) {
    famStart--;
  }
  const given = tokens.slice(0, famStart).join(' ');
  const family = tokens.slice(famStart).join(' ');
  const isPinyin = isLikelyPinyinName(family, given);

  return {
    family: normalizeSurnameCase(family),
    given,
    suffix,
    isPinyin,
  };
}

/**
 * Extract initials from a given name string:
 * "Albert" -> ["A"]
 * "A. A." -> ["A", "A"]
 * "Jean-Luc" -> ["J-L"]
 */
export function extractInitials(given?: string): string[] {
  if (!given) return [];
  // Expand compacted initials like "A.A." -> "A. A."
  const normalized = given.replace(/\.([A-Za-z])/g, '. $1').trim();
  const parts = normalized.split(/\s+/).filter(Boolean);
  return parts.map((part) => {
    if (part.includes('-')) {
      return part
        .split('-')
        .filter(Boolean)
        .map((sub) => sub.replace(/\./g, '').charAt(0).toUpperCase())
        .join('-');
    }
    return part.replace(/\./g, '').charAt(0).toUpperCase();
  }).filter(Boolean);
}

/**
 * Format a single AuthorName for GB/T 7714—2025 or 2015:
 * - Chinese: 张伯伟
 * - Pinyin (2025): Li Jiangning (2015: LI Jiangning)
 * - Western (2025): Einstein A / Myburg A A / Godard J-L / Peebles P Z Jr
 * - Western (2015): EINSTEIN A / MYBURG A A
 */
export function formatAuthorGBT(author: AuthorName, edition: '2025' | '2015' = '2025'): string {
  if (author.literal) return author.literal;
  if (author.isChinese) return author.family || '';

  const fam = normalizeSurnameCase(author.family || '', edition === '2015');
  if (!author.given) {
    return [fam, author.suffix].filter(Boolean).join(' ');
  }

  if (author.isPinyin) {
    // 2025 5.3: 姓首字母大写，名宜用全称（若原本就是缩写则保留缩写）
    const joinedGiven = author.given.trim().replace(/\s+/g, '');
    const formattedGiven = /^[A-Za-z]\.?$/.test(author.given.trim())
      ? extractInitials(author.given).join(' ')
      : capitalizeWord(joinedGiven);
    return [fam, formattedGiven, author.suffix].filter(Boolean).join(' ');
  }

  const initials = extractInitials(author.given).join(' ');
  return [fam, initials, author.suffix].filter(Boolean).join(' ');
}

/**
 * Format AuthorName for APA 7th:
 * - Western/Pinyin: Surname, A. B., Jr.
 * - Chinese: 张伯伟
 */
export function formatAuthorAPA(author: AuthorName): string {
  if (author.literal) return author.literal;
  if (author.isChinese) return author.family || '';
  const fam = normalizeSurnameCase(author.family || '');
  const initials = extractInitials(author.given)
    .map((ini) => (ini.includes('-') ? ini.split('-').map((s) => `${s}.`).join('-') : `${ini}.`))
    .join(' ');
  if (!initials) return fam;
  if (author.suffix) {
    return `${fam}, ${initials}, ${author.suffix}.`.replace(/\.\.$/, '.');
  }
  return `${fam}, ${initials}`;
}

/**
 * Format AuthorName for IEEE:
 * - Western/Pinyin: A. B. Surname
 * - Chinese: 张伯伟
 */
export function formatAuthorIEEE(author: AuthorName): string {
  if (author.literal) return author.literal;
  if (author.isChinese) return author.family || '';
  const fam = normalizeSurnameCase(author.family || '');
  const initials = extractInitials(author.given)
    .map((ini) => (ini.includes('-') ? ini.split('-').map((s) => `${s}.`).join('-') : `${ini}.`))
    .join(' ');
  return [initials, fam, author.suffix].filter(Boolean).join(' ');
}

export { isInitialToken };
