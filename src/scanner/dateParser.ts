// Finds the expiry date in text read off a package label.
//
// The parser only reads text; it never decides on its own that a date is safe to save.
// Every result says how sure it is, and `reasons` lists what the user has to check
// (an ambiguous day/month order, a date without an EXP or BEST BEFORE label, and so on).
// This file has no React Native imports so it can be tested with plain Node.

export type DayOrder = 'DMY' | 'MDY';

export type LabelKind = 'expiry' | 'manufacture' | 'lot' | 'sell';

export type Precision = 'day' | 'month';

export type Interpretation = {
  // ISO calendar date, YYYY-MM-DD. Month-only dates ("EXP 10/2026") use the last day of the month.
  iso: string;
  precision: Precision;
  // The label printed no year ("BEST BEFORE 27 OCT"); the next such date was assumed.
  yearGuessed?: boolean;
};

export type DateCandidate = {
  raw: string;
  line: number;
  interpretations: Interpretation[];
  label: LabelKind | null;
  labelText: string | null;
};

export type ConfirmReason =
  // 03/04/2026 could be 3 April or 4 March.
  | 'ambiguous-order'
  // No EXP / BEST BEFORE / USE BY label next to the date.
  | 'no-label'
  // Several different dates could be the expiry date.
  | 'multiple-dates'
  // Only a month and year were printed.
  | 'month-only'
  // The date has already passed.
  | 'in-past'
  // Labelled SELL BY / DISPLAY UNTIL, which is not the same as an expiry date.
  | 'sell-by'
  // No year was printed, so it was assumed.
  | 'no-year';

export type ScanParseResult =
  | {
      kind: 'found';
      // The most likely reading, then the other readings of the same printed date.
      primary: Interpretation;
      alternatives: Interpretation[];
      confidence: 'high' | 'medium';
      reasons: ConfirmReason[];
      label: LabelKind | null;
      labelText: string | null;
      raw: string;
      // Stable across frames that read the same thing, for multi-frame agreement.
      key: string;
    }
  | {
      kind: 'none';
      // Why nothing usable was found, for the hint under the frame.
      hint: 'no-text' | 'no-date' | 'manufacture-only' | 'invalid-date';
    };

export type ParseOptions = {
  today: Date;
  // Order to prefer for numeric dates where both readings are valid. Comes from the device region.
  preferredOrder: DayOrder;
};

// Regions that write numeric dates month first. Everyone else reads day first.
const MONTH_FIRST_REGIONS = new Set(['US', 'PH', 'FM', 'MH', 'PW', 'GU', 'AS', 'MP', 'UM', 'VI', 'PR', 'BZ', 'CA']);

export function dayOrderForRegion(region: string | null | undefined): DayOrder {
  return region && MONTH_FIRST_REGIONS.has(region.toUpperCase()) ? 'MDY' : 'DMY';
}

// English first, then the abbreviations of a few other languages that show up on imported goods.
// Ambiguous spellings are left to the language they collide with least (MAR = March everywhere).
const MONTHS: Record<string, number> = {
  JAN: 1, JANUARY: 1, JANV: 1, ENE: 1, GEN: 1, JANUAR: 1,
  FEB: 2, FEBRUARY: 2, FEV: 2, FEVR: 2, FEBR: 2, FEBRUAR: 2,
  MAR: 3, MARCH: 3, MARS: 3, MRZ: 3, MAERZ: 3, MARZ: 3,
  APR: 4, APRIL: 4, AVR: 4, ABR: 4, AVRIL: 4,
  MAY: 5, MAI: 5, MAG: 5,
  JUN: 6, JUNE: 6, JUIN: 6, GIU: 6, JUNI: 6,
  JUL: 7, JULY: 7, JUIL: 7, LUG: 7, JULI: 7,
  AUG: 8, AUGUST: 8, AOUT: 8, AGO: 8,
  SEP: 9, SEPT: 9, SEPTEMBER: 9, SET: 9,
  OCT: 10, OCTOBER: 10, OKT: 10, OTT: 10, OKTOBER: 10,
  NOV: 11, NOVEMBER: 11,
  DEC: 12, DECEMBER: 12, DEZ: 12, DIC: 12, DEZEMBER: 12,
};

const MONTH_ALT = Object.keys(MONTHS)
  .sort((a, b) => b.length - a.length)
  .join('|');

// Labels, longest phrases first so "BEST BEFORE END" wins over "BEST BEFORE".
const LABELS: { kind: LabelKind; pattern: string }[] = [
  { kind: 'expiry', pattern: 'BEST\\s*BEFORE\\s*END|BEST\\s*BEFORE|BEST\\s*BY|BEST\\s*IF\\s*USED\\s*BY|USE\\s*BEFORE|USE\\s*BY' },
  { kind: 'expiry', pattern: 'EXPIRY\\s*DATE|EXPIRATION\\s*DATE|EXP\\.?\\s*DATE|EXP\\.?\\s*DT|EXPIRY|EXPIRATION|EXPIRES|EXPIRE|EXPD|EXP|BBE|B\\s*/\\s*B|BB|E\\s*/\\s*D' },
  { kind: 'manufacture', pattern: 'DATE\\s*OF\\s*MANUFACTURE|DATE\\s*OF\\s*MFG|MANUFACTURED(?:\\s*ON)?|MANUFACTURE|MANUF|MFG\\.?\\s*DATE|MFG|MFD(?:\\s*ON)?|MFR|PRODUCTION\\s*DATE|PRODUCED(?:\\s*ON)?|PROD\\.?\\s*DATE|PROD|PACKED(?:\\s*ON)?|PACK\\s*DATE|PKD|MADE\\s*ON|DOM|P\\s*/\\s*D|PD' },
  { kind: 'lot', pattern: 'LOT\\s*NO|LOT|BATCH\\s*NO|BATCH|B\\.?\\s*NO|L\\.?\\s*NO' },
  { kind: 'sell', pattern: 'SELL\\s*BY|DISPLAY\\s*UNTIL' },
];

// Label words must stand alone: "EXP" but not "EXPLORE", "BB" but not "BBQ".
const LABEL_RE = new RegExp(
  LABELS.map((l, i) => `(?<l${i}>(?<![A-Z])(?:${l.pattern})(?![A-Z]))`).join('|'),
  'g',
);

type Span = { start: number; end: number };

type RawDate = Span & { raw: string; interpretations: Interpretation[] };

type FoundLabel = Span & { kind: LabelKind; text: string };

// OCR often reads O as 0, I or L as 1, S as 5 and B as 8 inside numbers. Only standalone
// tokens that already contain a digit are touched, so "OCT", "BEST" or "27OCT" keep their letters.
function normalizeDigits(line: string): string {
  return line.replace(/(?<![A-Z])[0-9OILSB|]+(?![A-Z])/g, (token) => {
    if (!/[0-9]/.test(token)) return token;
    return token.replace(/O/g, '0').replace(/[IL|]/g, '1').replace(/S/g, '5').replace(/B/g, '8');
  });
}

export function normalizeLine(line: string): string {
  const upper = line
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    // Dashes and dots that OCR returns as other characters.
    .replace(/[‐-―−]/g, '-')
    .replace(/[·•]/g, '.')
    .replace(/\s+/g, ' ');
  return normalizeDigits(upper).trim();
}

const pad = (n: number) => String(n).padStart(2, '0');

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function makeYear(text: string): number {
  const n = Number(text);
  return text.length === 2 ? 2000 + n : n;
}

function toDay(year: number, month: number, day: number): Interpretation | null {
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { iso: `${year}-${pad(month)}-${pad(day)}`, precision: 'day' };
}

function toMonth(year: number, month: number): Interpretation | null {
  if (month < 1 || month > 12) return null;
  return { iso: `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`, precision: 'month' };
}

type Pattern = {
  re: RegExp;
  // Only used when an expiry label sits right before the date (too easy to confuse otherwise).
  labelledOnly?: boolean;
  read: (m: RegExpExecArray, opts: ParseOptions) => Interpretation[];
};

const SEP = '\\s?[./\\-]\\s?';
const SP = '[\\s./,\\-]*';
const NB = '(?<![0-9])';
const NA = '(?![0-9])';

// Order matters: earlier patterns claim their text first.
const PATTERNS: Pattern[] = [
  // 27 OCT 2026, 27OCT26, 27TH OCTOBER 2026
  {
    re: new RegExp(`${NB}(\\d{1,2})(?:ST|ND|RD|TH)?${SP}(${MONTH_ALT})(?![A-Z])${SP}(\\d{4}|\\d{2})${NA}`, 'g'),
    read: (m) => [toDay(makeYear(m[3]), MONTHS[m[2]], Number(m[1]))].filter(Boolean) as Interpretation[],
  },
  // OCT 27 2026, OCTOBER 27, 2026
  {
    re: new RegExp(`(?<![A-Z])(${MONTH_ALT})${SP}(\\d{1,2})(?:ST|ND|RD|TH)?[\\s,./\\-]+(\\d{4})${NA}`, 'g'),
    read: (m) => [toDay(Number(m[3]), MONTHS[m[1]], Number(m[2]))].filter(Boolean) as Interpretation[],
  },
  // 2026-10-27, 2026/10/27
  {
    re: new RegExp(`${NB}(\\d{4})${SEP}(\\d{1,2})${SEP}(\\d{1,2})${NA}`, 'g'),
    read: (m) => [toDay(Number(m[1]), Number(m[2]), Number(m[3]))].filter(Boolean) as Interpretation[],
  },
  // 27/10/2026, 10/27/2026, 27.10.26
  {
    re: new RegExp(`${NB}(\\d{1,2})(${SEP})(\\d{1,2})\\2(\\d{4}|\\d{2})${NA}`, 'g'),
    read: (m, opts) => {
      const a = Number(m[1]);
      const b = Number(m[3]);
      const year = makeYear(m[4]);
      const dmy = toDay(year, b, a);
      const mdy = toDay(year, a, b);
      if (dmy && mdy && dmy.iso !== mdy.iso) return opts.preferredOrder === 'MDY' ? [mdy, dmy] : [dmy, mdy];
      return [dmy ?? mdy].filter(Boolean) as Interpretation[];
    },
  },
  // OCT 2026, OCT/26
  {
    re: new RegExp(`(?<![A-Z])(${MONTH_ALT})(?![A-Z])${SP}(\\d{4}|\\d{2})${NA}`, 'g'),
    read: (m) => [toMonth(makeYear(m[2]), MONTHS[m[1]])].filter(Boolean) as Interpretation[],
  },
  // 2026-10, 2026/10
  {
    re: new RegExp(`${NB}(20\\d{2})${SEP}(\\d{1,2})${NA}`, 'g'),
    read: (m) => [toMonth(Number(m[1]), Number(m[2]))].filter(Boolean) as Interpretation[],
  },
  // 10/2026
  {
    re: new RegExp(`${NB}(\\d{1,2})${SEP}(20\\d{2})${NA}`, 'g'),
    read: (m) => [toMonth(Number(m[2]), Number(m[1]))].filter(Boolean) as Interpretation[],
  },
  // EXP 10/26 (month and two-digit year), only right after an expiry label.
  {
    re: new RegExp(`${NB}(\\d{1,2})${SEP}(\\d{2})${NA}`, 'g'),
    labelledOnly: true,
    read: (m) => [toMonth(makeYear(m[2]), Number(m[1]))].filter(Boolean) as Interpretation[],
  },
  // BEST BEFORE 27 OCT (no year), only right after an expiry label. The year is the next
  // time that day comes round, and the user is asked to check it.
  {
    re: new RegExp(`${NB}(\\d{1,2})(?:ST|ND|RD|TH)?${SP}(${MONTH_ALT})(?![A-Z0-9])(?![\\s./,\\-]*\\d)`, 'g'),
    labelledOnly: true,
    read: (m, opts) => {
      const t = opts.today;
      const month = MONTHS[m[2]];
      const day = Number(m[1]);
      const thisYear = toDay(t.getFullYear(), month, day);
      const pick = thisYear && thisYear.iso >= isoToday(t) ? thisYear : toDay(t.getFullYear() + 1, month, day);
      return pick ? [{ ...pick, yearGuessed: true }] : [];
    },
  },
  // EXP 20261027, only right after an expiry label.
  {
    re: new RegExp(`${NB}(20\\d{2})(\\d{2})(\\d{2})${NA}`, 'g'),
    labelledOnly: true,
    read: (m) => [toDay(Number(m[1]), Number(m[2]), Number(m[3]))].filter(Boolean) as Interpretation[],
  },
];

function findLabels(line: string): FoundLabel[] {
  const out: FoundLabel[] = [];
  LABEL_RE.lastIndex = 0;
  for (let m = LABEL_RE.exec(line); m; m = LABEL_RE.exec(line)) {
    const groups = m.groups ?? {};
    const idx = LABELS.findIndex((_, i) => groups[`l${i}`] !== undefined);
    out.push({ start: m.index, end: m.index + m[0].length, kind: LABELS[idx].kind, text: m[0] });
  }
  return out;
}

const overlaps = (a: Span, b: Span) => a.start < b.end && b.start < a.end;

// A date-looking match that failed calendar validation, e.g. 31/02/2026.
type Invalid = { invalid: true };

function findDates(line: string, opts: ParseOptions, expiryLabelEnds: number[]): (RawDate | (Span & Invalid))[] {
  const taken: Span[] = [];
  const out: (RawDate | (Span & Invalid))[] = [];
  for (const p of PATTERNS) {
    p.re.lastIndex = 0;
    for (let m = p.re.exec(line); m; m = p.re.exec(line)) {
      const span = { start: m.index, end: m.index + m[0].length };
      if (taken.some((t) => overlaps(t, span))) continue;
      if (p.labelledOnly) {
        // The label has to end just before the date: "EXP 10/26", "EXP: 10/26".
        const before = line.slice(0, span.start);
        const labelled = expiryLabelEnds.some((end) => end <= span.start && /^[\s:.\-]*$/.test(before.slice(end)));
        if (!labelled) continue;
      }
      const interpretations = p.read(m, opts).filter((i) => inRange(i, opts.today));
      taken.push(span);
      out.push(interpretations.length ? { ...span, raw: m[0].trim(), interpretations } : { ...span, invalid: true });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

// Anything more than five years back or fifteen ahead is a misread or not an expiry date.
function inRange(i: Interpretation, today: Date) {
  const year = Number(i.iso.slice(0, 4));
  const y = today.getFullYear();
  return year >= y - 5 && year <= y + 15;
}

export function isoToday(today: Date) {
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

// Pulls every date out of the OCR lines and attaches the label that governs it.
export function extractCandidates(lines: string[], opts: ParseOptions): { candidates: DateCandidate[]; invalid: number } {
  const norm = lines.flatMap((l) => l.split(/\r?\n/)).map(normalizeLine).filter(Boolean);
  const candidates: DateCandidate[] = [];
  let invalid = 0;

  // Labels printed on a line of their own apply to the dates on the next line,
  // matched up by position when there are several ("MFG   EXP" over "01/2025   01/2027").
  let pending: FoundLabel[] = [];

  norm.forEach((line, lineNo) => {
    const labels = findLabels(line);
    const dates = findDates(
      line,
      opts,
      labels.filter((l) => l.kind === 'expiry').map((l) => l.end),
    );
    const valid = dates.filter((d): d is RawDate => !('invalid' in d));
    invalid += dates.length - valid.length;

    if (!valid.length) {
      pending = labels;
      return;
    }

    const carried = !labels.length || labels[0].start > valid[0].start ? pending : [];
    valid.forEach((d, i) => {
      // The nearest label before the date on this line, unless another date sits between them.
      const before = labels.filter((l) => l.end <= d.start && !valid.some((o) => o !== d && o.start >= l.end && o.end <= d.start));
      let label: FoundLabel | undefined = before[before.length - 1];
      if (!label && carried.length) label = carried.length === valid.length ? carried[i] : carried[carried.length - 1];
      candidates.push({
        raw: d.raw,
        line: lineNo,
        interpretations: d.interpretations,
        label: label?.kind ?? null,
        labelText: label?.text ?? null,
      });
    });
    pending = [];
  });

  return { candidates, invalid };
}

export function parseExpiry(lines: string[], opts: ParseOptions): ScanParseResult {
  const text = lines.join(' ').trim();
  if (!text) return { kind: 'none', hint: 'no-text' };

  // Short "MM/YY" dates are only read right after an expiry label, including one that ends
  // the previous line. Joining such pairs lets the same rule cover both.
  const joined = joinLabelOnlyLines(lines);
  const { candidates, invalid } = extractCandidates(joined, opts);

  const expiry = candidates.filter((c) => c.label === 'expiry');
  const unlabelled = candidates.filter((c) => c.label === null);
  const sell = candidates.filter((c) => c.label === 'sell');

  let pool: DateCandidate[];
  const reasons: ConfirmReason[] = [];
  if (expiry.length) pool = expiry;
  else if (unlabelled.length) {
    pool = unlabelled;
    reasons.push('no-label');
  } else if (sell.length) {
    pool = sell;
    reasons.push('sell-by');
  } else if (candidates.length) {
    return { kind: 'none', hint: 'manufacture-only' };
  } else {
    return { kind: 'none', hint: invalid ? 'invalid-date' : 'no-date' };
  }

  // Several distinct dates in the pool: take the latest, since an unlabelled pair on a
  // package is almost always "made on" then "use by". Flag it so the user checks.
  const distinct = new Map<string, DateCandidate>();
  for (const c of pool) distinct.set(c.interpretations[0].iso, c);
  const chosen = [...distinct.values()].sort((a, b) => b.interpretations[0].iso.localeCompare(a.interpretations[0].iso))[0];
  if (distinct.size > 1) reasons.push('multiple-dates');

  const [primary, ...alternatives] = chosen.interpretations;
  if (alternatives.length) reasons.push('ambiguous-order');
  if (primary.precision === 'month') reasons.push('month-only');
  if (primary.iso < isoToday(opts.today)) reasons.push('in-past');
  if (primary.yearGuessed) reasons.push('no-year');

  // Month-only expiry with a clear label is how medicine is printed; that alone is not doubt.
  const doubts = reasons.filter((r) => r !== 'month-only');
  return {
    kind: 'found',
    primary,
    alternatives,
    confidence: doubts.length ? 'medium' : 'high',
    reasons,
    label: chosen.label,
    labelText: chosen.labelText,
    raw: chosen.raw,
    key: [primary.iso, ...alternatives.map((a) => a.iso), chosen.label ?? '-'].join('|'),
  };
}

// "EXP" on one line and "10/26" on the next become "EXP 10/26" so the short form can be read.
function joinLabelOnlyLines(lines: string[]): string[] {
  const norm = lines.flatMap((l) => l.split(/\r?\n/));
  const out: string[] = [];
  for (let i = 0; i < norm.length; i++) {
    const line = norm[i];
    const n = normalizeLine(line);
    const labels = findLabels(n);
    const onlyOneExpiryLabel =
      labels.length === 1 && labels[0].kind === 'expiry' && n.replace(LABEL_RE, '').replace(/[\s:.\-]/g, '') === '';
    if (onlyOneExpiryLabel && i + 1 < norm.length && !findLabels(normalizeLine(norm[i + 1])).length) {
      out.push(`${line} ${norm[i + 1]}`);
      i++;
    } else out.push(line);
  }
  return out;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "27 Oct 2026", or "Oct 2026" for month-only dates.
export function formatDate(i: Interpretation | string): string {
  const iso = typeof i === 'string' ? i : i.iso;
  const precision = typeof i === 'string' ? 'day' : i.precision;
  const [y, m, d] = iso.split('-').map(Number);
  return precision === 'month' ? `${MONTH_NAMES[m - 1]} ${y}` : `${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

export function daysUntil(iso: string, today: Date): number {
  const [y, m, d] = iso.split('-').map(Number);
  const a = Date.UTC(y, m - 1, d);
  const b = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((a - b) / 86400000);
}
