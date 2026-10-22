// Deterministic wording derived straight from the chart: the structural
// commentary that ships inside every PDF, whether or not a reading was supplied.

import type { BaziChart } from "./bazi.ts";
import type { QimenChart } from "./qimen.ts";
import { WUXING_GAN, ke, sheng } from "./cal.ts";

const P = (q: QimenChart, n: number | null): string => {
  if (!n) return "（不落九宮）";
  const p = q.palaces.find((x) => x.num === n);
  if (!p) return `宮${n}`;
  return `${p.gua}${p.num} · ${p.star}${p.starExtra ? "·禽" : ""} · ${p.door} · ${p.god}`;
};

const SHEN_SHA_LABEL = (q: QimenChart, god: string) => q.palaces.find((p) => p.god === god);

const CHONG = ["子午", "丑未", "寅申", "卯酉", "辰戌", "巳亥"];
const HE6 = ["子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"];
const HAI = ["子未", "丑午", "寅巳", "卯辰", "申亥", "酉戌"];
const PO = ["子酉", "卯午", "辰丑", "未戌", "寅亥", "巳申"];
const XING = ["子卯", "寅巳", "巳申", "寅申", "丑戌", "戌未", "丑未"];

function pairHit(a: string, b: string, list: string[]): boolean {
  return list.some((p) => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
}

const SANHE = [
  ["申", "子", "辰"],
  ["亥", "卯", "未"],
  ["寅", "午", "戌"],
  ["巳", "酉", "丑"],
];

function relations(b: BaziChart): string[] {
  const out: string[] = [];
  const ps = b.pillars;
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], c = ps[j];
      const tag = `${a.label}${a.zhi}×${c.label}${c.zhi}`;
      if (pairHit(a.zhi, c.zhi, CHONG)) out.push(`**${tag} 沖**`);
      if (pairHit(a.zhi, c.zhi, HE6)) out.push(`**${tag} 六合**`);
      if (pairHit(a.zhi, c.zhi, HAI)) out.push(`${tag} 害`);
      if (pairHit(a.zhi, c.zhi, PO)) out.push(`${tag} 破`);
      if (pairHit(a.zhi, c.zhi, XING)) out.push(`**${tag} 刑**`);
      for (const g of SANHE) {
        if (g.includes(a.zhi) && g.includes(c.zhi) && a.zhi !== c.zhi) {
          out.push(`${tag} 半合${g.join("")}`);
        }
      }
    }
  }
  // 自刑 needs the same branch twice
  const counts = new Map<string, number>();
  for (const p of ps) counts.set(p.zhi, (counts.get(p.zhi) ?? 0) + 1);
  for (const [zhi, n] of counts) {
    if (n >= 2 && ["辰", "午", "酉", "亥"].includes(zhi)) out.push(`${zhi}${zhi} 自刑（伏吟）`);
  }
  return out;
}

export function narrativeMarkdown(q: QimenChart, b: BaziChart): string {
  const L: string[] = [];
  const dayEl = WUXING_GAN[q.dayStem];
  const selfPal = q.palaces.find((p) => p.num === q.reading.selfPalace);
  const rel = selfPal
    ? ke(dayEl, selfPal.element)
      ? "我剋其宮（求財之位，費力）"
      : ke(selfPal.element, dayEl)
        ? "宮剋日干（環境壓身）"
        : sheng(selfPal.element, dayEl)
          ? "宮生日干（環境扶身）"
          : sheng(dayEl, selfPal.element)
            ? "日干生宮（向外耗氣）"
            : "同氣（比和）"
    : "";

  L.push("### 一、奇門盤面");
  L.push("");
  L.push(`**自（日干 ${q.dayStem}）** — ${P(q, q.reading.selfPalace)}。日干屬${dayEl}，${rel}。` +
    (selfPal ? `門宮關係：${selfPal.relation}${selfPal.relation === "門迫" ? "（行動傷根基，忌硬推）" : ""}。` : "") +
    (q.reading.selfPalace === q.reading.valueDoorPalace ? "日干宮即值使宮 — **事必躬親，責任在自己身上**。" : ""));

  const shengMen = q.palaces.find((p) => p.door === "生門");
  const wu = q.palaces.find((p) => p.diPan === "戊");
  const wuTian = q.palaces.find((p) => p.tianPan === "戊" || p.tianPanExtra === "戊");
  L.push("");
  L.push(`**財** — 生門落 ${shengMen ? P(q, shengMen.num) : "（無）"}${shengMen ? `，${shengMen.relation}` : ""}。` +
    `戊（資本）地盤在 ${wu ? `${wu.gua}${wu.num}` : "—"}${wuTian ? `，天盤在 ${wuTian.gua}${wuTian.num}` : ""}` +
    `${wuTian && shengMen && wuTian.num === shengMen.num ? " — 資本正落在財門，宜投入而非壓住" : ""}。`);

  const kai = q.palaces.find((p) => p.door === "開門");
  L.push("");
  L.push(`**事業** — 開門落 ${kai ? P(q, kai.num) : "（無）"}${kai ? `，${kai.relation}` : ""}；` +
    `值符 ${q.valueStar} 在 ${P(q, q.reading.valueStarPalace)}，值使 ${q.valueDoor} 在 ${P(q, q.reading.valueDoorPalace)}。`);

  const liuhe = SHEN_SHA_LABEL(q, "六合");
  const yiPal = q.palaces.find((p) => p.tianPan === "乙" || p.tianPanExtra === "乙");
  L.push("");
  L.push(`**婚戀** — 六合在 ${liuhe ? P(q, liuhe.num) : "（無）"}；乙（妻星/對象）在 ${yiPal ? P(q, yiPal.num) : "（無）"}；` +
    `日支（配偶宮）${b.pillars[2].zhi} 為 ${b.pillars[2].shiShenGan === "日主" ? b.pillars[2].shiShenZhi.join("/") : ""}。`);

  L.push("");
  L.push(`**身份（年命 ${q.fourPillars.year[0]}）** — ${P(q, q.reading.yearLifePalace)}；` +
    `**時干 ${q.hourStem}（事/子女/晚年）** — ${P(q, q.reading.matterPalace)}。`);

  const kongPalaces = q.palaces.filter((p) => p.num === 4 || p.num === 2).filter(() => q.kong.length === 2);
  L.push("");
  L.push(`**空亡 ${q.kong.join("")}** · **馬星 ${q.ma}**` +
    (q.kong.includes("辰") || q.kong.includes("巳") ? " — 巽4 帶空：名位易虛，宜幕後。" : "") +
    (q.fuYin ? " **伏吟**：主停滯、舊事重提。" : "") +
    (q.fanYin ? " **反吟**：主反覆、計畫翻轉。" : "") +
    (q.wuBuYu ? " **五不遇時**：時干剋日干，事多阻。" : ""));

  L.push("");
  L.push(`**三奇** ${q.sanQi.map((s) => `${s.stem}@${q.palaces.find((p) => p.num === s.palace)?.gua ?? "?"}${s.palace}`).join(" · ")}。`);

  // ---- 八字 ----
  const dm = b.dayMaster;
  L.push("");
  L.push("### 二、八字要點");
  L.push("");
  const shiShenCount = new Map<string, number>();
  for (const p of b.pillars) {
    if (p.key !== "day") shiShenCount.set(p.shiShenGan, (shiShenCount.get(p.shiShenGan) ?? 0) + 1);
    for (const s of p.shiShenZhi) shiShenCount.set(s, (shiShenCount.get(s) ?? 0) + 1);
  }
  const ssList = [...shiShenCount.entries()].filter(([k]) => k !== "日主")
    .map(([k, v]) => `${k}×${v}`).join("、");
  L.push(`**日主** ${dm.gan}${dm.element}（${dm.yinYang}）· **${dm.strength}** — ${dm.detail}。`);
  L.push("");
  L.push(`**十神** ${ssList}。`);
  L.push("");
  const w = b.wuxing.map((x) => `${x.element}${x.pct.toFixed(1)}%`).join(" · ");
  const weakest = [...b.wuxing].sort((a, c) => a.pct - c.pct)[0];
  const strongest = [...b.wuxing].sort((a, c) => c.pct - a.pct)[0];
  L.push(`**五行** ${w} — 最旺 ${strongest.element}，最弱 ${weakest.element}。`);
  L.push("");
  const r = relations(b);
  L.push(`**刑沖合** ${r.length ? r.join(" · ") : "（四支無明顯刑沖合）"}。`);
  L.push("");
  const current = b.yun?.daYun.find((d) => new Date().getFullYear() >= d.startYear && new Date().getFullYear() <= d.endYear);
  if (current) {
    L.push(`**現行大運** ${current.ganZhi}（${current.startYear}–${current.endYear}，${current.startAge}–${current.endAge} 歲）` +
      `· ${current.shiShenGan}／${current.shiShenZhi}。`);
  }
  if (b.shenSha.length) {
    L.push("");
    L.push(`**神煞** ${b.shenSha.map((s) => `${s.name}（${s.pillar}）`).join(" · ")}。`);
  }
  return L.join("\n");
}
