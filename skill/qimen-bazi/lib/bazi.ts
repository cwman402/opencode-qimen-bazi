// 八字 (四柱命理) — pillars, 十神, 藏干, 納音, 十二長生, 五行 strength,
// 大運 and 流年. The calendrical heavy lifting is done by lunar-javascript
// (寿星天文历), so month pillars follow the true 節 times to the second.

import { Solar, LunarUtil, GAN, ZHI, JIAZI_LIST, WUXING_GAN, WUXING_ZHI, YINYANG_GAN, sheng, ke, jiaziIndex, trad } from "./cal.ts";
import type { CivilTime } from "./cal.ts";

const PILLARS = ["year", "month", "day", "hour"] as const;
type PillarKey = (typeof PILLARS)[number];

export interface Pillar {
  key: PillarKey;
  label: string;
  ganZhi: string;
  gan: string;
  zhi: string;
  ganElement: string;
  zhiElement: string;
  shiShenGan: string;
  hideGan: string[];
  shiShenZhi: string[];
  naYin: string;
  diShi: string;
  xunKong: string;
}

export interface DaYun {
  ganZhi: string;
  gan: string;
  zhi: string;
  shiShenGan: string;
  shiShenZhi: string;
  startYear: number;
  endYear: number;
  startAge: number;
  endAge: number;
  index: number;
  liuNian: { year: number; age: number; ganZhi: string; shiShenGan: string }[];
}

export interface BaziChart {
  civil: CivilTime;
  pillars: Pillar[];
  dayMaster: { gan: string; element: string; yinYang: string; strength: string; ratio: number; detail: string };
  wuxing: { element: string; score: number; pct: number; count: number }[];
  yun: { forward: boolean; startSolar: string; startAgeText: string; daYun: DaYun[] } | null;
  shenSha: { name: string; pillar: string; note: string }[];
  taiYuan: string;
  mingGong: string;
  shenGong: string;
  monthLing: string;
  notes: string[];
}

const JIAZI = JIAZI_LIST;

const HIDE_WEIGHTS: Record<number, number[]> = { 1: [1], 2: [0.7, 0.3], 3: [0.6, 0.25, 0.15] };

function shiShen(dayGan: string, other: string): string {
  return LunarUtil.SHI_SHEN[dayGan + other] ?? "—";
}

/** 旺相休囚死 by season (月支), the classical seasonal weighting. */
const SEASON: Record<string, Record<string, number>> = {
  寅: { 木: 1.3, 火: 1.15, 水: 1.0, 金: 0.85, 土: 0.7 },
  卯: { 木: 1.3, 火: 1.15, 水: 1.0, 金: 0.85, 土: 0.7 },
  巳: { 火: 1.3, 土: 1.15, 木: 1.0, 水: 0.85, 金: 0.7 },
  午: { 火: 1.3, 土: 1.15, 木: 1.0, 水: 0.85, 金: 0.7 },
  申: { 金: 1.3, 水: 1.15, 土: 1.0, 火: 0.85, 木: 0.7 },
  酉: { 金: 1.3, 水: 1.15, 土: 1.0, 火: 0.85, 木: 0.7 },
  亥: { 水: 1.3, 木: 1.15, 金: 1.0, 土: 0.85, 火: 0.7 },
  子: { 水: 1.3, 木: 1.15, 金: 1.0, 土: 0.85, 火: 0.7 },
};
const SEASON_EARTH = { 土: 1.3, 金: 1.15, 火: 1.0, 木: 0.85, 水: 0.7 };

function seasonalFactor(monthZhi: string, element: string): number {
  const t = SEASON[monthZhi] ?? SEASON_EARTH;
  return t[element] ?? 1;
}

/**
 * 日主強弱 by the classical three tests:
 *   得令 — the month branch (月令) shares or generates the day element
 *   得地 — some other branch carries the day element in its hidden stems (通根)
 *   得勢 — 同類 + 印 make up half or more of the eight characters
 */
function strengthOf(dayGan: string, pillars: { zhi: string; hideGan: string[] }[], wuxing: Record<string, number>) {
  const me = WUXING_GAN[dayGan];
  const mother = Object.keys(wuxing).find((el) => sheng(el, me)) ?? "";
  const total = Object.values(wuxing).reduce((a, b) => a + b, 0) || 1;
  const support = (wuxing[me] ?? 0) + (wuxing[mother] ?? 0);
  const ratio = support / total;

  const monthZhi = pillars[1].zhi;
  const deLing = WUXING_ZHI[monthZhi] === me || sheng(WUXING_ZHI[monthZhi], me);
  // 通根 anywhere — 建祿 in the month counts for both 得令 and 得地, as practitioners read it
  const deDi = pillars.some((p) => p.hideGan.some((h) => WUXING_GAN[h] === me));

  let ally = 0;
  for (const p of pillars) {
    if (WUXING_GAN[p.gan[0]] === me || sheng(WUXING_GAN[p.gan[0]], me)) ally += 1;
    const main = p.hideGan[0];
    if (main && (WUXING_GAN[main] === me || sheng(WUXING_GAN[main], me))) ally += 1;
  }
  const deShi = ally >= 4;

  const checks = [deLing, deDi, deShi];
  const passed = checks.filter(Boolean).length;
  const strength = passed >= 3 ? "極強" : passed === 2 ? "偏強" : passed === 1 ? "偏弱" : "極弱";
  const tags = [
    deLing ? "得令" : "失令",
    deDi ? "得地" : "無根",
    deShi ? "得勢" : "失勢",
  ].join("·");
  const detail = `${tags}（月令${monthZhi}${deLing ? "助" : "不助"}日主；同類+印 ${ally}/8；力量佔比 ${(ratio * 100).toFixed(1)}%）`;
  return { strength, ratio, detail, checks, tags };
}

/** 五鼠遁 — hour stem from the day stem. */
export function wuShu(dayGan: string, hourZhi: string): string {
  const d = GAN.indexOf(dayGan);
  const z = ZHI.indexOf(hourZhi);
  return GAN[(((d % 5) * 2) + z) % 10] + hourZhi;
}

const CHANG_SHENG_ORDER = ["長生", "沐浴", "冠帶", "臨官", "帝旺", "衰", "病", "死", "墓", "絕", "胎", "養"];
const CHANG_SHENG_START: Record<string, string> = {
  甲: "亥", 乙: "午", 丙: "寅", 丁: "酉", 戊: "寅", 己: "酉", 庚: "巳", 辛: "子", 壬: "申", 癸: "卯",
};

function diShiOf(dayGan: string, zhi: string): string {
  const start = ZHI.indexOf(CHANG_SHENG_START[dayGan]);
  const even = GAN.indexOf(dayGan) % 2 === 0;
  const z = ZHI.indexOf(zhi);
  let i = start + (even ? z : -z);
  i = ((i % 12) + 12) % 12;
  return CHANG_SHENG_ORDER[i];
}

export interface BaziOptions {
  /**
   * 晚子時 rule. true  → 23:00–23:59 keeps today's day pillar (minority school).
   * false (default)     → the day pillar rolls to the next day and the hour stem
   *                       is re-derived from it. 年/月 pillars always come from
   *                       the real instant, so 節氣 is never shifted.
   */
  sameDayZi?: boolean;
}

/** Build one pillar straight from (day master, 干支) — no library quirks. */
function makePillar(key: PillarKey, gz: string, dayGan: string): Pillar {
  const hideGan: string[] = LunarUtil.ZHI_HIDE_GAN[gz[1]] ?? [];
  return {
    key,
    label: { year: "年柱", month: "月柱", day: "日柱", hour: "時柱" }[key],
    ganZhi: gz,
    gan: gz[0],
    zhi: gz[1],
    ganElement: WUXING_GAN[gz[0]],
    zhiElement: WUXING_ZHI[gz[1]],
    shiShenGan: key === "day" ? "日主" : trad(shiShen(dayGan, gz[0])),
    hideGan,
    shiShenZhi: hideGan.map((h) => trad(shiShen(dayGan, h))),
    naYin: trad(LunarUtil.NAYIN[gz] ?? "—"),
    diShi: diShiOf(dayGan, gz[1]),
    xunKong: LunarUtil.getXunKong(gz) ?? "—",
  };
}

export function computeBazi(civil: CivilTime, gender: "male" | "female", opts: BaziOptions = {}): BaziChart {
  const lunar = Solar.fromYmdHms(civil.y, civil.mo, civil.d, civil.h, civil.mi, civil.s).getLunar();
  const ec = lunar.getEightChar();
  ec.setSect(2);

  // 年/月 pillars follow the real instant (lunar's "exact" 節氣 columns).
  const ganZhi: Record<PillarKey, string> = {
    year: ec.getYear(), month: ec.getMonth(), day: ec.getDay(), hour: ec.getTime(),
  };

  // 晚子時: 23:00–23:59 belongs to the *next* day's 子時 unless sameDayZi.
  if (civil.h === 23 && !opts.sameDayZi) {
    ganZhi.day = JIAZI[(jiaziIndex(ganZhi.day) + 1) % 60];
    ganZhi.hour = wuShu(ganZhi.day[0], "子");
  }

  const dayGan = ganZhi.day[0];
  const pillars: Pillar[] = PILLARS.map((k) => makePillar(k, ganZhi[k], dayGan));

  // ---- weighted 五行 (raw presence, then seasonal 旺相休囚死 weighting) ---
  const rawW: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const counts: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const p of pillars) {
    rawW[p.ganElement] += 1;
    counts[p.ganElement] += 1;
    const ws = HIDE_WEIGHTS[p.hideGan.length] ?? [1];
    const branchMul = p.key === "month" ? 2 : 1; // 月令双倍
    p.hideGan.forEach((hg, i) => {
      const el = WUXING_GAN[hg];
      rawW[el] += (ws[i] ?? 0) * branchMul;
      counts[el] += (ws[i] ?? 0) * branchMul;
    });
  }
  const monthZhi = ganZhi.month[1];
  const wuxing: Record<string, number> = {};
  for (const el of Object.keys(rawW)) wuxing[el] = rawW[el] * seasonalFactor(monthZhi, el);
  const totalW = Object.values(wuxing).reduce((a, b) => a + b, 0) || 1;
  const wuxingOut = Object.keys(wuxing).map((el) => ({
    element: el,
    score: Number(wuxing[el].toFixed(2)),
    pct: Math.round((wuxing[el] / totalW) * 1000) / 10,
    count: Number(counts[el].toFixed(2)),
  }));

  // ---- 大運 -------------------------------------------------------------
  let yunOut: BaziChart["yun"] = null;
  try {
    const yun = ec.getYun(gender === "male" ? 1 : 0, 2);
    const yangYear = GAN.indexOf(ganZhi.year[0]) % 2 === 0;
    const forward = (yangYear && gender === "male") || (!yangYear && gender === "female");
    const daYun: DaYun[] = [];
    for (const d of yun.getDaYun()) {
      const gz = d.getGanZhi();
      if (!gz) continue;
      const ln: DaYun["liuNian"] = [];
      for (const n of d.getLiuNian()) {
        ln.push({
          year: n.getYear(), age: n.getAge(), ganZhi: n.getGanZhi(),
          shiShenGan: trad(shiShen(dayGan, n.getGanZhi()[0])),
        });
      }
      daYun.push({
        ganZhi: gz,
        gan: gz[0],
        zhi: gz[1],
        shiShenGan: trad(shiShen(dayGan, gz[0])),
        shiShenZhi: trad(shiShen(dayGan, ZHI_HIDE_MAIN(gz[1]))),
        startYear: d.getStartYear(),
        endYear: d.getEndYear(),
        startAge: d.getStartAge(),
        endAge: d.getEndAge(),
        index: d.getIndex(),
        liuNian: ln,
      });
    }
    yunOut = {
      forward,
      startSolar: yun.getStartSolar().toYmd(),
      startAgeText: `${yun.getStartYear()} 年 ${yun.getStartMonth()} 個月 ${yun.getStartDay()} 天`,
      daYun,
    };
  } catch {
    yunOut = null;
  }

  // ---- 神煞 -------------------------------------------------------------
  const branches = pillars.map((p) => p.zhi);
  const sanHe = (zhi: string) => {
    if (["申", "子", "辰"].includes(zhi)) return "申子辰";
    if (["寅", "午", "戌"].includes(zhi)) return "寅午戌";
    if (["巳", "酉", "丑"].includes(zhi)) return "巳酉丑";
    return "亥卯未";
  };
  const group = sanHe(ganZhi.day[1]);
  const taohua = { 申子辰: "酉", 寅午戌: "卯", 巳酉丑: "午", 亥卯未: "子" }[group]!;
  const yima = { 申子辰: "寅", 寅午戌: "申", 巳酉丑: "亥", 亥卯未: "巳" }[group]!;
  const huagai = { 申子辰: "辰", 寅午戌: "戌", 巳酉丑: "丑", 亥卯未: "未" }[group]!;
  const tianYiMap: Record<string, string[]> = {
    甲: ["丑", "未"], 戊: ["丑", "未"], 庚: ["丑", "未"], 乙: ["子", "申"], 己: ["子", "申"],
    丙: ["亥", "酉"], 丁: ["亥", "酉"], 壬: ["卯", "巳"], 癸: ["卯", "巳"], 辛: ["午", "寅"],
  };
  const tianYi = tianYiMap[dayGan] ?? [];
  const yangRenMap: Record<string, string> = {
    甲: "卯", 乙: "寅", 丙: "午", 丁: "巳", 戊: "午", 己: "巳", 庚: "酉", 辛: "申", 壬: "子", 癸: "亥",
  };
  const hits = (targets: string[]) =>
    pillars.filter((p) => targets.includes(p.zhi)).map((p) => p.label);

  const shenSha: BaziChart["shenSha"] = [];
  const push = (name: string, targets: string[], note: string) => {
    const h = hits(targets);
    if (h.length) shenSha.push({ name, pillar: h.join("、"), note });
  };
  push("桃花", [taohua], `咸池在 ${taohua} — 人緣、情緣、吸引力`);
  push("驛馬", [yima], `驛馬在 ${yima} — 遷移、奔波、變動`);
  push("華蓋", [huagai], `華蓋在 ${huagai} — 孤高、宗教、藝術、獨立`);
  push("天乙貴人", tianYi, `貴人在 ${tianYi.join("")} — 逢凶化吉、得人助`);
  push("羊刃", [yangRenMap[dayGan]], `羊刃在 ${yangRenMap[dayGan]} — 剛烈、承壓、易衝動`);

  const st = strengthOf(dayGan, pillars, wuxing);

  const notes: string[] = [];
  if (st.strength === "偏強" || st.strength === "極強") {
    notes.push("日主偏強 — 喜財（耗）官（克）食傷（泄），忌再逢比劫、印星。");
  }
  if (st.strength === "偏弱" || st.strength === "極弱") {
    notes.push("日主偏弱 — 喜印（生）比（扶），忌財官食傷再耗日主。");
  }
  if (wuxingOut.some((w) => w.pct === 0)) notes.push(`五行缺 ${wuxingOut.filter((w) => w.pct === 0).map((w) => w.element).join("、")}。`);

  return {
    civil,
    pillars,
    dayMaster: {
      gan: dayGan,
      element: WUXING_GAN[dayGan],
      yinYang: YINYANG_GAN[dayGan],
      strength: st.strength,
      ratio: Math.round(st.ratio * 1000) / 10,
      detail: st.detail,
    },
    wuxing: wuxingOut,
    yun: yunOut,
    shenSha,
    taiYuan: ec.getTaiYuan(),
    mingGong: ec.getMingGong(),
    shenGong: ec.getShenGong(),
    monthLing: `${ganZhi.month[1]}月`,
    notes,
  };
}

function ZHI_HIDE_MAIN(zhi: string): string {
  const m: Record<string, string> = {
    子: "癸", 丑: "己", 寅: "甲", 卯: "乙", 辰: "戊", 巳: "丙",
    午: "丁", 未: "己", 申: "庚", 酉: "辛", 戌: "戊", 亥: "壬",
  };
  return m[zhi] ?? zhi;
}
