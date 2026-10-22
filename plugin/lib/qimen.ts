// 時家奇門遁甲 — 拆補法 · 轉盤 (the mainstream 節氣/符頭 method).
//
// Geometry (verified against qimen-rs, which implements 拆補法 轉盤):
//   • 局數  = 節氣 at the moment + 三元 from the branch of the last 符頭
//             (甲/己 day): 子午卯酉 → 上元, 寅申巳亥 → 中元, 辰戌丑未 → 下元.
//   • 地盤  = 戊己庚辛壬癸丁丙乙 from the 局數 palace, ascending (陽遁) or
//             descending (陰遁) through palaces 1..9.
//   • 值符  = 九星 on the 旬首儀's 地盤 palace; 值使 = 八門 there.
//   • 天盤  = 轉盤: the eight outer stars rotate *rigidly* round the 8-palace ring
//             (1-8-3-4-9-2-7-6) so that 值符 lands on the time-stem palace.
//             天禽 has no ring home — it rides with 天芮 (禽寄芮) and carries the
//             centre palace's stem. The centre therefore keeps no star of its own.
//   • 八門  = 值使 flies n palaces from the 旬首宮, n = 時辰 elapsed since the
//             旬首, counted over the NINE palaces (centre included; landing on 5
//             parks at 坤2). The other doors then follow 休生傷杜景死驚開 round
//             the eight-palace ring.
//   • 八神  = 值符 at the 天盤 值符 palace, then 騰蛇太陰六合白虎玄武九地九天
//             round the ring (陽遁順 / 陰遁逆).
//
// Stars and doors use different geometry on purpose: the star plate rotates,
// the doors are counted.

import { GAN, ZHI, jiaziIndex, WUXING_GAN, ke, sheng } from "./cal.ts";

export const STAR_ORDER = ["天蓬", "天芮", "天沖", "天輔", "天禽", "天心", "天柱", "天任", "天英"];
export const DOOR_SEQ = ["休門", "生門", "傷門", "杜門", "景門", "死門", "驚門", "開門"];
export const GOD_ORDER = ["值符", "騰蛇", "太陰", "六合", "白虎", "玄武", "九地", "九天"];
/** Clockwise ring of the eight outer palaces. */
export const RING = [1, 8, 3, 4, 9, 2, 7, 6];
export const OPPOSITE: Record<number, number> = { 1: 9, 9: 1, 2: 8, 8: 2, 3: 7, 7: 3, 4: 6, 6: 4 };

export const PALACE_INFO: Record<number, { gua: string; element: string; dir: string }> = {
  1: { gua: "坎", element: "水", dir: "北" },
  2: { gua: "坤", element: "土", dir: "西南" },
  3: { gua: "震", element: "木", dir: "東" },
  4: { gua: "巽", element: "木", dir: "東南" },
  5: { gua: "中", element: "土", dir: "中" },
  6: { gua: "乾", element: "金", dir: "西北" },
  7: { gua: "兌", element: "金", dir: "西" },
  8: { gua: "艮", element: "土", dir: "東北" },
  9: { gua: "離", element: "火", dir: "南" },
};

export const STAR_ELEMENT: Record<string, string> = {
  天蓬: "水", 天芮: "土", 天沖: "木", 天輔: "木", 天禽: "土",
  天心: "金", 天柱: "金", 天任: "土", 天英: "火",
};
export const STAR_LUCK: Record<string, string> = {
  天心: "大吉", 天任: "大吉", 天輔: "大吉", 天禽: "大吉", 天沖: "小吉",
  天蓬: "凶", 天芮: "凶", 天柱: "凶", 天英: "小凶",
};
export const DOOR_ELEMENT: Record<string, string> = {
  休門: "水", 生門: "土", 傷門: "木", 杜門: "木", 景門: "火", 死門: "土", 驚門: "金", 開門: "金",
};
export const DOOR_LUCK: Record<string, string> = {
  開門: "吉", 休門: "吉", 生門: "吉", 死門: "凶", 驚門: "凶", 傷門: "凶", 杜門: "中平", 景門: "中平",
};
export const GOD_LUCK: Record<string, string> = {
  值符: "吉", 太陰: "吉", 六合: "吉", 九地: "吉", 九天: "吉",
  騰蛇: "凶", 白虎: "凶", 玄武: "凶",
};

const XUN_YI: Record<string, string> = { 子: "戊", 戌: "己", 申: "庚", 午: "辛", 辰: "壬", 寅: "癸" };

export interface Palace {
  num: number;
  gua: string;
  element: string;
  dir: string;
  diPan: string;
  tianPan: string;
  /** second heaven stem, only where 天禽 piles onto 天芮's palace */
  tianPanExtra: string | null;
  star: string;
  /** 天禽 rides with 天芮 here */
  starExtra: string | null;
  door: string;
  god: string;
  starLuck: string;
  doorLuck: string;
  godLuck: string;
  relation: string;
  flags: string[];
}

export interface QimenChart {
  fourPillars: { year: string; month: string; day: string; hour: string };
  dayStem: string;
  hourStem: string;
  term: { name: string; time: string };
  nextTerm: { name: string; time: string };
  yuan: string;
  ju: number;
  yang: boolean;
  dun: string;
  juLabel: string;
  xunHead: string;
  xunHeadYi: string;
  valueStar: string;
  valueDoor: string;
  valueStarPalace: number;
  valueDoorPalace: number;
  xunPalace: number;
  kong: string[];
  ma: string;
  fuYin: boolean;
  fanYin: boolean;
  wuBuYu: boolean;
  sanQi: { stem: string; palace: number }[];
  palaces: Palace[];
  reading: {
    selfPalace: number | null;
    matterPalace: number | null;
    yearLifePalace: number | null;
    valueStarPalace: number;
    valueDoorPalace: number;
  };
  notes: string[];
}

const ringIdx = (p: number) => {
  const i = RING.indexOf(p === 5 ? 2 : p); // 中5 parks at 坤2
  return i < 0 ? 0 : i;
};

const palaceOfStems = (diPan: Record<number, string>, stem: string): number => {
  for (let p = 1; p <= 9; p++) if (diPan[p] === stem) return p;
  return 5;
};

function stemForPillar(stem: string, pillarGZ: string): string {
  if (stem !== "甲") return stem;
  const i = jiaziIndex(pillarGZ);
  return XUN_YI[ZHI[(i - (i % 10)) % 12]] ?? "戊";
}

export interface QimenInput {
  fourPillars: { year: string; month: string; day: string; hour: string };
  term: { name: string; time: string };
  nextTerm?: { name: string; time: string };
  termTable: Record<string, { yang: boolean; ju: [number, number, number] }>;
}

export function computeQimen(input: QimenInput): QimenChart {
  const fp = input.fourPillars;
  const dayGZ = fp.day;
  const hourGZ = fp.hour;
  const idx = jiaziIndex(hourGZ);
  if (idx < 0) throw new Error(`bad hour pillar ${hourGZ}`);

  // ---- 三元 from the most recent 符頭 (甲/己 day) -------------------------
  const dayIdx = jiaziIndex(dayGZ);
  const dayStemIdx = dayIdx % 10;
  const back = dayStemIdx < 5 ? dayStemIdx : dayStemIdx - 5; // 甲 or 己 day is itself a 符頭
  const fuTouIdx = ((dayIdx - back) % 60 + 60) % 60;
  const fuTouBranch = fuTouIdx % 12;
  // 子午卯酉 (0,3,6,9) 上元 · 寅申巳亥 (2,5,8,11) 中元 · 辰戌丑未 (1,4,7,10) 下元
  const yuanIdx = [0, 3, 6, 9].includes(fuTouBranch) ? 0 : [2, 5, 8, 11].includes(fuTouBranch) ? 1 : 2;
  const yuan = ["上元", "中元", "下元"][yuanIdx];

  // ---- 局 ---------------------------------------------------------------
  const cfg = input.termTable[input.term.name];
  if (!cfg) throw new Error(`unknown solar term ${input.term.name}`);
  const ju = cfg.ju[yuanIdx];
  const yang = cfg.yang;
  const dir = yang ? 1 : -1;

  // ---- 地盤 -------------------------------------------------------------
  const diPan: Record<number, string> = {};
  {
    let p = ju;
    for (const s of ["戊", "己", "庚", "辛", "壬", "癸", "丁", "丙", "乙"]) {
      diPan[p] = s;
      p = yang ? (p % 9) + 1 : p === 1 ? 9 : p - 1;
    }
  }

  // ---- 旬首 / 值符 / 值使 ------------------------------------------------
  const xunHeadIdx = idx - (idx % 10);
  const xunHead = `${GAN[xunHeadIdx % 10]}${ZHI[xunHeadIdx % 12]}`;
  const yi = XUN_YI[ZHI[xunHeadIdx % 12]];
  const xunPalace = palaceOfStems(diPan, yi);
  const valueStar = STAR_ORDER[xunPalace - 1];
  const valueDoor = doorOfPalace(xunPalace);

  // ---- 天盤九星 (轉盤: rigid ring rotation) -------------------------------
  const hourStemTarget = stemForPillar(GAN[idx % 10], hourGZ);
  const rawTarget = palaceOfStems(diPan, hourStemTarget);
  const target = rawTarget === 5 ? 2 : rawTarget;          // 中5 -> 寄坤2
  const home = xunPalace === 5 ? 2 : xunPalace;            // 禽寄芮
  const k = ringIdx(target) - ringIdx(home);               // ring offset

  const starAt: Record<number, string> = {};
  const starExtraAt: Record<number, string | null> = {};
  const tianPan: Record<number, string> = {};
  const tianPanExtra: Record<number, string | null> = {};
  for (const p of RING) {
    const src = RING[((ringIdx(p) - k) % 8 + 8) % 8];      // star homes are the ring palaces
    const star = STAR_ORDER[src - 1];
    starAt[p] = star;
    starExtraAt[p] = star === "天芮" ? "天禽" : null;
    tianPan[p] = diPan[src];
    tianPanExtra[p] = star === "天芮" ? diPan[5] : null;   // 禽 carries the centre stem
  }

  // ---- 八門 (值使 counted over nine palaces, others fly the ring) --------
  const steps = idx % 10;
  let doorPark = yang ? ((xunPalace - 1 + steps) % 9) + 1 : (((xunPalace - 1 - steps) % 9) + 9) % 9 + 1;
  const doorParked = doorPark === 5;
  if (doorPark === 5) doorPark = 2;
  const doorAt: Record<number, string> = {};
  {
    // the remaining doors always run clockwise round the ring from where 值使 lands
    const dsi = DOOR_SEQ.indexOf(valueDoor);
    for (let j = 0; j < 8; j++) {
      const pal = RING[(ringIdx(doorPark) + j) % 8];
      doorAt[pal] = DOOR_SEQ[(dsi + j) % 8];
    }
  }
  const valueDoorPalace = doorPark;

  // ---- 八神 -------------------------------------------------------------
  const godAt: Record<number, string> = {};
  for (let j = 0; j < 8; j++) {
    const pal = RING[((ringIdx(target) + dir * j) % 8 + 8) % 8];
    godAt[pal] = GOD_ORDER[j];
  }

  // ---- flags ------------------------------------------------------------
  const kong = [(xunHeadIdx + 10) % 12, (xunHeadIdx + 11) % 12].map((i) => ZHI[i]);
  const maMap: Record<string, string> = {
    申: "寅", 子: "寅", 辰: "寅", 寅: "申", 午: "申", 戌: "申",
    巳: "亥", 酉: "亥", 丑: "亥", 亥: "巳", 卯: "巳", 未: "巳",
  };
  const ma = maMap[hourGZ[1]] ?? "—";

  const dayStem = fp.day[0];
  const hourStem = fp.hour[0];
  const wuBuYu =
    ke(WUXING_GAN[hourStem], WUXING_GAN[dayStem]) &&
    GAN.indexOf(hourStem) % 2 === GAN.indexOf(dayStem) % 2;

  const palaces: Palace[] = [];
  for (let p = 1; p <= 9; p++) {
    const info = PALACE_INFO[p];
    const door = doorAt[p] || "—";
    const star = starAt[p] || (p === 5 ? "—" : "");
    let relation = "—";
    if (door !== "—") {
      const de = DOOR_ELEMENT[door];
      const pe = info.element;
      relation = ke(de, pe) ? "門迫" : ke(pe, de) ? "宮克門" : sheng(pe, de) ? "宮生門" : sheng(de, pe) ? "門生宮" : "比和";
    }
    const flags: string[] = [];
    if (p === target) flags.push("值符星");
    if (p === valueDoorPalace) flags.push("值使門");
    if (doorParked && p === valueDoorPalace) flags.push("寄坤2");
    if (p === 5) flags.push("禽寄芮");
    palaces.push({
      num: p,
      gua: info.gua,
      element: info.element,
      dir: info.dir,
      diPan: diPan[p],
      tianPan: tianPan[p] ?? "—",
      tianPanExtra: tianPanExtra[p] ?? null,
      star,
      starExtra: starExtraAt[p] ?? null,
      door,
      god: godAt[p] || "—",
      starLuck: STAR_LUCK[star] || "—",
      doorLuck: DOOR_LUCK[door] || "—",
      godLuck: GOD_LUCK[godAt[p]] || "—",
      relation,
      flags,
    });
  }

  const palaceOfTian = (stem: string, pillarGZ: string): number | null => {
    const s = stemForPillar(stem, pillarGZ);
    for (const p of RING) {
      if (tianPan[p] === s || tianPanExtra[p] === s) return p;
    }
    return null;
  };

  const fuYin = k % 8 === 0;
  const fanYin = (((k % 8) + 8) % 8) === 4;
  const notes: string[] = [];
  if (fuYin) notes.push("伏吟 — 值符未動，天盤與地盤同宮，主停滯、重複、舊事重提。");
  if (fanYin) notes.push("反吟 — 值符沖位，主反覆、動盪、事情翻轉。");
  if (wuBuYu) notes.push("五不遇時 — 時干克日干且同陰陽，主事多阻，宜守不宜進。");
  if (rawTarget === 5) notes.push("時干落中五宮，寄坤二宮起值符。");
  if (doorParked) notes.push("值使落中五宮，寄坤二宮。");
  if (xunPalace === 5) notes.push("旬首儀落中五宮，天禽為值符（禽寄芮）。");
  if (hourStem === "甲") notes.push("時干為甲（隱於旬首），以旬首儀取用。");

  return {
    fourPillars: fp,
    dayStem,
    hourStem,
    term: input.term,
    nextTerm: input.nextTerm || { name: "—", time: "—" },
    yuan,
    ju,
    yang,
    dun: yang ? "陽遁" : "陰遁",
    juLabel: `${yang ? "陽" : "陰"}遁${"一二三四五六七八九"[ju - 1]}局`,
    xunHead,
    xunHeadYi: yi,
    valueStar,
    valueDoor,
    valueStarPalace: target,
    valueDoorPalace,
    xunPalace,
    kong,
    ma,
    fuYin,
    fanYin,
    wuBuYu,
    sanQi: (["乙", "丙", "丁"] as const).map((s) => ({ stem: s, palace: palaceOfTian(s, fp.hour) ?? 0 })),
    palaces,
    reading: {
      selfPalace: palaceOfTian(dayStem, fp.day),
      matterPalace: palaceOfTian(hourStem, fp.hour),
      yearLifePalace: palaceOfTian(fp.year[0], fp.year),
      valueStarPalace: target,
      valueDoorPalace,
    },
    notes,
  };
}

function doorOfPalace(p: number): string {
  const map: Record<number, string> = {
    1: "休門", 2: "死門", 3: "傷門", 4: "杜門", 5: "死門", 6: "開門", 7: "驚門", 8: "生門", 9: "景門",
  };
  return map[p] ?? "休門";
}
