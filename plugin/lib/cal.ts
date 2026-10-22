// Calendrical core — wraps lunar-javascript (寿星天文历) which supplies
// accurate 24 solar terms (節氣) to the second, sexagenary (干支) pillars,
// 十神 / 藏干 / 納音 / 十二長生 / 大運 / 流年.
//
// Everything below works in *naive civil time* (the wall clock at the place of
// birth). Time-zone offsets are only used for (a) 真太陽時 correction and
// (b) labelling output.

import lunarPkg from "../vendor/lunar.cjs";

const L = lunarPkg as any;
export const Solar = L.Solar;
export const LunarUtil = L.LunarUtil;

/** lunar-javascript leaks a few simplified forms; normalise to traditional. */
const S2T: Record<string, string> = {
  财: "財", 杀: "殺", 枭: "梟", 伤: "傷", 禄: "祿", 驿: "驛", 炉: "爐", 剑: "劍",
  锋: "鋒", 头: "頭", 涧: "澗", 蜡: "蠟", 杨: "楊", 雳: "靂", 长: "長", 灯: "燈",
  钗: "釵", 钏: "釧", 鹅: "鵝", 鸡: "雞", 马: "馬", 龙: "龍", 风: "風", 云: "雲",
};
export function trad(s: string): string {
  let out = "";
  for (const ch of s) out += S2T[ch] ?? ch;
  return out;
}

export const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
export const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

const JIAZI: string[] = [];
for (let i = 0; i < 60; i++) JIAZI.push(GAN[i % 10] + ZHI[i % 12]);
export const JIAZI_LIST = JIAZI;

/** 60-cycle index of a 干支 string (0 = 甲子). Returns -1 when unknown. */
export function jiaziIndex(gz: string): number {
  const i = JIAZI.indexOf(gz);
  if (i >= 0) return i;
  const s = GAN.indexOf(gz[0]);
  const b = ZHI.indexOf(gz[1]);
  if (s < 0 || b < 0) return -1;
  for (let k = 0; k < 60; k++) if (k % 10 === s && k % 12 === b) return k;
  return -1;
}

export const WUXING_GAN: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};
export const WUXING_ZHI: Record<string, string> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
};
export const YINYANG_GAN: Record<string, string> = {
  甲: "陽", 乙: "陰", 丙: "陽", 丁: "陰", 戊: "陽", 己: "陰", 庚: "陽", 辛: "陰", 壬: "陽", 癸: "陰",
};

const KE: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };
const SHENG: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
export function ke(a: string, b: string) { return KE[a] === b; }
export function sheng(a: string, b: string) { return SHENG[a] === b; }

// ---------------------------------------------------------------------------
// Solar terms
// ---------------------------------------------------------------------------

export interface TermInfo {
  name: string;      // canonical (traditional) name
  time: string;      // YYYY-MM-DD HH:mm
  ming: number;      // index within the 24 terms, 0 = 冬至
}

const TERM_ALIAS: Record<string, string> = {
  惊蛰: "驚蟄", 谷雨: "穀雨", 小满: "小滿", 芒种: "芒種", 处暑: "處暑",
  惊蟄: "驚蟄", 穀兩: "穀雨",
};

export function normalizeTermName(n: string): string {
  return TERM_ALIAS[n] || n;
}

/** 節氣 → 上元 / 中元 / 下元 局數, plus 陰陽遁. */
export const TERM_JU: Record<string, { yang: boolean; ju: [number, number, number] }> = {
  冬至: { yang: true, ju: [1, 7, 4] },
  小寒: { yang: true, ju: [2, 8, 5] },
  大寒: { yang: true, ju: [3, 9, 6] },
  立春: { yang: true, ju: [8, 5, 2] },
  雨水: { yang: true, ju: [9, 6, 3] },
  驚蟄: { yang: true, ju: [1, 7, 4] },
  春分: { yang: true, ju: [3, 9, 6] },
  清明: { yang: true, ju: [4, 1, 7] },
  穀雨: { yang: true, ju: [5, 2, 8] },
  立夏: { yang: true, ju: [4, 1, 7] },
  小滿: { yang: true, ju: [5, 2, 8] },
  芒種: { yang: true, ju: [6, 3, 9] },
  夏至: { yang: false, ju: [9, 3, 6] },
  小暑: { yang: false, ju: [8, 2, 5] },
  大暑: { yang: false, ju: [7, 1, 4] },
  立秋: { yang: false, ju: [2, 5, 8] },
  處暑: { yang: false, ju: [1, 4, 7] },
  白露: { yang: false, ju: [9, 3, 6] },
  秋分: { yang: false, ju: [7, 1, 4] },
  寒露: { yang: false, ju: [6, 9, 3] },
  霜降: { yang: false, ju: [5, 8, 2] },
  立冬: { yang: false, ju: [6, 9, 3] },
  小雪: { yang: false, ju: [5, 8, 2] },
  大雪: { yang: false, ju: [4, 7, 1] },
};

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

export interface CivilTime {
  y: number; mo: number; d: number; h: number; mi: number; s: number;
}

const pad2 = (n: number) => String(Math.abs(n)).padStart(2, "0");

export function fmtCivil(t: CivilTime): string {
  return `${String(t.y).padStart(4, "0")}-${pad2(t.mo)}-${pad2(t.d)} ${pad2(t.h)}:${pad2(t.mi)}`;
}

/** IANA time zone -> offset in minutes east of UTC at the given instant. */
export function tzOffsetMinutes(tz: string, utcMs: number): number {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const p: Record<string, number> = {};
    for (const part of dtf.formatToParts(new Date(utcMs))) {
      if (part.type !== "literal") p[part.type] = Number(part.value);
    }
    const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
    return Math.round((asUTC - utcMs) / 60000);
  } catch {
    // Unknown zone -> fall back to the host offset.
    return -new Date(utcMs).getTimezoneOffset();
  }
}

export function parseDateInput(input?: string): { civil: CivilTime; explicit: boolean } {
  const now = new Date();
  if (!input || !input.trim() || /^now$/i.test(input.trim())) {
    return {
      civil: {
        y: now.getFullYear(), mo: now.getMonth() + 1, d: now.getDate(),
        h: now.getHours(), mi: now.getMinutes(), s: 0,
      },
      explicit: false,
    };
  }
  const s = input.trim().replace("T", " ");
  const m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ ]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) throw new Error(`Cannot parse date "${input}". Use YYYY-MM-DD HH:mm.`);
  return {
    civil: {
      y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]),
      h: m[4] ? Number(m[4]) : 12, mi: m[5] ? Number(m[5]) : 0, s: m[6] ? Number(m[6]) : 0,
    },
    explicit: true,
  };
}

/** Equation of time in minutes (approx, ±0.3 min). */
export function equationOfTime(c: CivilTime): number {
  const start = Date.UTC(c.y, 0, 0);
  const dayOfYear = Math.floor((Date.UTC(c.y, c.mo - 1, c.d) - start) / 86400000);
  const B = (2 * Math.PI * (dayOfYear - 81)) / 364;
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

/**
 * 真太陽時 (true solar time): longitude correction + equation of time.
 * `lonEast` is positive east of Greenwich.
 */
export function toTrueSolar(c: CivilTime, offsetMin: number, lonEast: number): { civil: CivilTime; deltaMin: number } {
  const tzMeridian = offsetMin / 4;             // degrees east implied by the zone
  const lonDelta = (lonEast - tzMeridian) * 4;  // 4 minutes per degree
  const eot = equationOfTime(c);
  const deltaMin = lonDelta + eot;
  const d = new Date(Date.UTC(c.y, c.mo - 1, c.d, c.h, c.mi + Math.round(deltaMin), c.s));
  return {
    civil: {
      y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(),
      h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds(),
    },
    deltaMin,
  };
}

// ---------------------------------------------------------------------------
// Lunar / 干支 access
// ---------------------------------------------------------------------------

export function lunarOf(c: CivilTime): any {
  return Solar.fromYmdHms(c.y, c.mo, c.d, c.h, c.mi, c.s).getLunar();
}

/** Previous solar term strictly by time (the 24-term cycle, includes 中氣). */
export function prevTerm(lunar: any): TermInfo {
  let jq: any = null;
  try { jq = lunar.getPrevJieQi(false); } catch { jq = null; }
  if (!jq) jq = lunar.getPrevJieQi(true);
  const name = normalizeTermName(jq.getName());
  return { name, time: jq.getSolar().toYmdHms().slice(0, 16), ming: 0 };
}

/** Next solar term strictly by time. */
export function nextTerm(lunar: any): TermInfo {
  let jq: any = null;
  try { jq = lunar.getNextJieQi(false); } catch { jq = null; }
  if (!jq) jq = lunar.getNextJieQi(true);
  const name = normalizeTermName(jq.getName());
  return { name, time: jq.getSolar().toYmdHms().slice(0, 16), ming: 0 };
}

/** The 12 "節" (sectional terms) that start a 月柱, in order. */
export const JIE_NAMES = [
  "立春", "驚蟄", "清明", "立夏", "芒種", "小暑",
  "立秋", "白露", "寒露", "立冬", "大雪", "小寒",
];

export const SOLAR_TERMS_24 = [
  "冬至", "小寒", "大寒", "立春", "雨水", "驚蟄", "春分", "清明", "穀雨", "立夏", "小滿", "芒種",
  "夏至", "小暑", "大暑", "立秋", "處暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪",
];
