import { addDays, addHours, addMinutes, addMonths, nextDay, setHours, setMinutes, startOfHour, type Day } from "date-fns";

/**
 * Entende datas escritas no título, em português:
 * "Gerar ATPV amanhã 10h" → { title: "Gerar ATPV", remindAt: amanhã 10:00 }.
 * Aceita: hoje, amanhã, depois de amanhã, dia da semana, "dia 25", "25/10", "10h", "14h30", "14:30",
 * "às 9", "meio-dia", "em 30 min", "daqui a 2 horas".
 */
export interface Parsed {
  title: string;
  remindAt: number | null;
}

// \b do JS não entende acentos ("amanhã"), então usamos limites com \p{L} (qualquer letra).
const rx = (s: string) => new RegExp(`(?<![\\p{L}\\d])${s}(?![\\p{L}\\d])`, "iu");
// Preposição opcional antes da expressão, removida junto: "na segunda", "para amanhã", "até dia 5".
const PREP = "(?:(?:para|pra|até|ate|na|no|nesta|neste|de|em|o|a)\\s+)?";

const WEEKDAYS: [RegExp, Day][] = [
  [rx(`${PREP}(?:próxim[ao]\\s+|proxim[ao]\\s+)?domingo`), 0],
  [rx(`${PREP}(?:próxim[ao]\\s+|proxim[ao]\\s+)?segunda(?:-feira)?`), 1],
  [rx(`${PREP}(?:próxim[ao]\\s+|proxim[ao]\\s+)?ter[çc]a(?:-feira)?`), 2],
  [rx(`${PREP}(?:próxim[ao]\\s+|proxim[ao]\\s+)?quarta(?:-feira)?`), 3],
  [rx(`${PREP}(?:próxim[ao]\\s+|proxim[ao]\\s+)?quinta(?:-feira)?`), 4],
  [rx(`${PREP}(?:próxim[ao]\\s+|proxim[ao]\\s+)?sexta(?:-feira)?`), 5],
  [rx(`${PREP}(?:próxim[ao]\\s+|proxim[ao]\\s+)?s[áa]bado`), 6],
];

const RELATIVE = rx("(?:em|daqui(?:\\s+a)?)\\s+(\\d{1,3})\\s*(min(?:utos?)?|h(?:oras?)?|hrs?)");
const AFTER_TOMORROW = rx(`${PREP}depois\\s+de\\s+amanh[ãa]`);
const TOMORROW = rx(`${PREP}amanh[ãa]`);
const TODAY = rx(`${PREP}hoje`);
const DAY_OF_MONTH = rx(`${PREP}dia\\s+(\\d{1,2})`);
const DATE = rx(`${PREP}(\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{2}|\\d{4}))?`);
const NOON = rx("(?:ao\\s+)?meio[- ]dia");
const TIME = rx("(?:(?:[àa]s|para\\s+as|pras?)\\s+)?(\\d{1,2})(?:h(?:rs?)?(\\d{2})?|:(\\d{2}))");
const AT_HOUR = rx("[àa]s\\s+(\\d{1,2})"); // "às 9" sem "h"

const at = (d: Date | number, h: number, m = 0) => setMinutes(setHours(d, h), m).setSeconds(0, 0);

export function parseQuick(text: string, now: number = Date.now()): Parsed {
  let rest = ` ${text} `;
  const take = (re: RegExp) => {
    const m = rest.match(re);
    if (m) rest = rest.replace(m[0], " ");
    return m;
  };
  const done = (remindAt: number | null): Parsed => {
    const title = rest.replace(/\s+/g, " ").replace(/^[\s,.;:–—-]+|[\s,.;:–—-]+$/g, "");
    // Só data, sem texto ("amanhã 10h"): não dá para tirar tudo do título.
    return title && remindAt !== null ? { title, remindAt } : { title: text.trim(), remindAt: null };
  };

  // Relativo ("em 30 min") é completo por si só.
  const rel = take(RELATIVE);
  if (rel) {
    const n = Number(rel[1]);
    return done(rel[2].toLowerCase().startsWith("m") ? addMinutes(now, n).getTime() : addHours(now, n).getTime());
  }

  // Dia
  let day: Date | null = null;
  let m: RegExpMatchArray | null;
  if (take(AFTER_TOMORROW)) day = addDays(now, 2);
  else if (take(TOMORROW)) day = addDays(now, 1);
  else if (take(TODAY)) day = new Date(now);
  else if ((m = take(DATE))) {
    const [d, mo] = [Number(m[1]), Number(m[2]) - 1];
    const y = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : new Date(now).getFullYear();
    let date = new Date(y, mo, d);
    if (!m[3] && date.getTime() < new Date(now).setHours(0, 0, 0, 0)) date = new Date(y + 1, mo, d);
    if (date.getDate() === d && date.getMonth() === mo) day = date; // descarta 31/02 etc.
  } else if ((m = take(DAY_OF_MONTH))) {
    const d = Number(m[1]);
    const base = new Date(now);
    let date = new Date(base.getFullYear(), base.getMonth(), d);
    if (d < base.getDate()) date = addMonths(new Date(base.getFullYear(), base.getMonth(), 1), 1);
    date.setDate(d);
    if (date.getDate() === d) day = date;
  } else {
    for (const [re, wd] of WEEKDAYS) if (take(re)) day = nextDay(now, wd);
  }

  // Hora
  let time: [number, number] | null = null;
  if (take(NOON)) time = [12, 0];
  else if ((m = take(TIME)) || (m = take(AT_HOUR))) {
    const h = Number(m[1]);
    const min = Number(m[2] ?? m[3] ?? 0);
    if (h < 24 && min < 60) time = [h, min];
  }

  if (!day && !time) return done(null);
  if (day && time) return done(at(day, ...time));
  if (time) {
    const today = at(now, ...time);
    return done(today > now ? today : at(addDays(now, 1), ...time));
  }
  // Só o dia: 9h; se for hoje e já passou, "daqui a pouco".
  const nine = at(day!, 9);
  return done(nine > now ? nine : addHours(startOfHour(now), 2).getTime());
}
