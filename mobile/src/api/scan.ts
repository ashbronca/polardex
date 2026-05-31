import { tcgFetch, TcgCard } from '../services/tcg';
import type { OcrLine } from '../../modules/expo-card-ocr';

/** Signals read off a card by OCR. The printed `number/printedTotal` pair in a
 *  card's corner is a near-unique key across all of TCG history. */
export interface ParsedScan {
  number?: string; // e.g. "58" or "TG05" — leading zeros stripped
  printedTotal?: number; // the "/198" part
  nameGuess?: string;
}

// Matches "058/198", "4 / 102", "TG05/TG30", "SV01/SV122" …
const NUMBER_RE = /([A-Za-z]{0,3}\d{1,3})\s*\/\s*([A-Za-z]{0,3}\d{1,4})/;

function stripLeadingZeros(s: string): string {
  const m = /^([A-Za-z]*)0*(\d+)$/.exec(s);
  return m ? m[1] + m[2] : s;
}

/** Lowercase alpha-only form for fuzzy name comparison. */
function nameKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, '');
}

/** Strip card-name noise (HP, energy labels, stage words) and keep the
 *  pokémon name tokens. Used to build the API query. */
function cleanName(raw: string): string {
  return raw
    .replace(/\bHP\b.*$/i, '')
    .replace(/\b\d+\b/g, '')
    .replace(/[^A-Za-z'.\- ]/g, ' ')
    .replace(/\b(basic|stage\s*\d|evolves|from)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Pull the set number and a best-guess name out of the OCR lines. */
export function parseScan(lines: OcrLine[]): ParsedScan {
  const result: ParsedScan = {};

  // 1) Set number — search every line (it sits in a bottom corner, small font).
  for (const l of lines) {
    const m = NUMBER_RE.exec(l.text.replace(/\s+/g, ''));
    if (m) {
      result.number = stripLeadingZeros(m[1]);
      const total = parseInt(m[2].replace(/\D/g, ''), 10);
      if (!Number.isNaN(total)) result.printedTotal = total;
      break;
    }
  }

  // 2) Name — the largest text block in the top ~half of the card that reads
  //    like a word (the pokémon name is the biggest text on the card).
  const nameCandidates = lines
    .filter((l) => l.y < 0.5)
    .filter((l) => /[A-Za-z]{3,}/.test(l.text))
    .filter((l) => !NUMBER_RE.test(l.text))
    .sort((a, b) => b.height - a.height);
  for (const c of nameCandidates) {
    const cleaned = cleanName(c.text);
    if (cleaned.length >= 3) {
      result.nameGuess = cleaned;
      break;
    }
  }

  return result;
}

const SELECT = 'id,name,number,rarity,types,images,set,tcgplayer';

async function runQuery(q: string): Promise<TcgCard[]> {
  try {
    const res = await tcgFetch(
      `/cards?q=${encodeURIComponent(q)}&orderBy=-set.releaseDate&pageSize=20&select=${SELECT}`,
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: TcgCard[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

/** Higher = better match for the parsed signals. */
function score(card: TcgCard, p: ParsedScan): number {
  let s = 0;
  if (p.printedTotal && card.set.printedTotal === p.printedTotal) s += 5;
  if (p.number && stripLeadingZeros(card.number) === p.number) s += 3;
  if (p.nameGuess) {
    const a = nameKey(card.name);
    const b = nameKey(p.nameGuess);
    if (a && b) {
      if (a === b) s += 4;
      else if (a.includes(b) || b.includes(a)) s += 2;
    }
  }
  return s;
}

export interface ScanMatch {
  candidates: TcgCard[]; // best first
  /** True when the top candidate is backed by the printed-total key — a strong,
   *  low-false-positive hit worth auto-surfacing. */
  confident: boolean;
}

/**
 * Resolve OCR signals to TCG cards. Tries the strongest query first
 * (number + printed total → 1–3 cards in all of TCG history), then falls back
 * to looser queries. Returns ranked candidates, best first.
 */
export async function matchCard(p: ParsedScan): Promise<ScanMatch | null> {
  const { number: n, printedTotal: t } = p;
  const name = p.nameGuess ? p.nameGuess.replace(/"/g, '') : undefined;

  const queries: { q: string; strong: boolean }[] = [];
  if (n && t) queries.push({ q: `number:${n} set.printedTotal:${t}`, strong: true });
  if (name && n) queries.push({ q: `name:"${name}*" number:${n}`, strong: true });
  if (name && t) queries.push({ q: `name:"${name}*" set.printedTotal:${t}`, strong: true });
  if (n) queries.push({ q: `number:${n}`, strong: false });
  if (name) queries.push({ q: `name:"${name}*"`, strong: false });

  for (const { q, strong } of queries) {
    const cards = await runQuery(q);
    if (!cards.length) continue;
    const ranked = [...cards].sort((a, b) => score(b, p) - score(a, p));
    // A loose number-only query can return dozens across sets; only treat it as
    // a real hit if the printed total actually lines up.
    const top = ranked[0];
    const confident = strong || (!!t && top.set.printedTotal === t);
    if (!strong && !confident) continue;
    return { candidates: ranked.slice(0, 8), confident };
  }

  return null;
}
