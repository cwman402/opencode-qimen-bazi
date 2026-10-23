// Terminal / markdown rendering. Everything is CJK-aware: East-Asian wide
// characters occupy two columns, so plain .padEnd() would break every table.

import type { BaziChart } from "./bazi.ts";
import type { QimenChart, Palace } from "./qimen.ts";

const WIDE = /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/;

export function dw(s: string): number {
  let w = 0;
  for (const ch of s) w += WIDE.test(ch) ? 2 : 1;
  return w;
}

export function pad(s: string, width: number, align: "left" | "right" | "center" = "left"): string {
  const gap = Math.max(0, width - dw(s));
  if (align === "right") return " ".repeat(gap) + s;
  if (align === "center") {
    const l = Math.floor(gap / 2);
    return " ".repeat(l) + s + " ".repeat(gap - l);
  }
  return s + " ".repeat(gap);
}

/** Rounded box table. rows[i] is an array of cells; first row is the header. */
export function boxTable(rows: string[][], align: ("left" | "right" | "center")[] = []): string {
  const cols = Math.max(...rows.map((r) => r.length));
  const widths = new Array(cols).fill(0);
  for (const r of rows) r.forEach((c, i) => (widths[i] = Math.max(widths[i], dw(c))));
  const line = (l: string, m: string, r: string) =>
    l + widths.map((w) => "─".repeat(w + 2)).join(m) + r;
  const fmt = (r: string[]) =>
    "│" + widths.map((w, i) => " " + pad(r[i] ?? "", w, align[i] ?? "left") + " ").join("│") + "│";
  const out: string[] = [line("┌", "┬", "┐")];
  rows.forEach((r, i) => {
    out.push(fmt(r));
    if (i === 0) out.push(line("├", "┼", "┤"));
  });
  out.push(line("└", "┴", "┘"));
  return out.join("\n");
}

const LUOSHU_ROWS = [
  [4, 9, 2],
  [3, 5, 7],
  [8, 1, 6],
];

function palaceCell(p: Palace): string[] {
  const tags: string[] = [];
  if (p.flags.includes("值符星")) tags.push("符");
  if (p.flags.includes("值使門")) tags.push("使");
  const head = `${p.gua}${p.num} ${p.dir} ${p.element}${tags.length ? " " + tags.join("") : ""}`;
  if (p.num === 5) {
    return [head, "禽寄坤2", "—", `地盤 ${p.diPan}`];
  }
  const godLine = p.god;
  const starLine = `${p.star}${p.starExtra ? "·禽" : ""} ${p.tianPan}${p.tianPanExtra ?? ""}`;
  const doorLine = `${p.door} ${p.diPan}`;
  return [head, godLine, starLine, doorLine];
}

/** 3×3 洛書 grid as a monospace code block. */
export function qimenGrid(q: QimenChart): string {
  const cells = new Map<number, string[]>();
  for (const p of q.palaces) cells.set(p.num, palaceCell(p));

  // one uniform width keeps the board square and readable
  let width = 0;
  for (const cell of cells.values()) for (const line of cell) width = Math.max(width, dw(line));

  const sep = (l: string, m: string, r: string) => l + Array(3).fill("─".repeat(width + 2)).join(m) + r;
  const lines: string[] = [sep("┌", "┬", "┐")];
  LUOSHU_ROWS.forEach((row, ri) => {
    const cellLines = row.map((n) => cells.get(n) ?? ["", "", "", ""]);
    for (let i = 0; i < 4; i++) {
      lines.push("│" + cellLines.map((c) => " " + pad(c[i] ?? "", width) + " ").join("│") + "│");
    }
    if (ri < LUOSHU_ROWS.length - 1) lines.push(sep("├", "┼", "┤"));
  });
  lines.push(sep("└", "┴", "┘"));
  return lines.join("\n");
}

export function fourPillarsBlock(b: BaziChart): string {
  const cols = ["年柱", "月柱", "日柱", "時柱"];
  const rows: string[][] = [
    ["", ...cols],
    ["天干", ...b.pillars.map((p) => p.gan)],
    ["地支", ...b.pillars.map((p) => p.zhi)],
    ["十神", ...b.pillars.map((p) => p.shiShenGan)],
    ["藏干", ...b.pillars.map((p) => p.hideGan.join(""))],
    ["藏神", ...b.pillars.map((p) => p.shiShenZhi.join("·"))],
    ["長生", ...b.pillars.map((p) => p.diShi)],
    ["納音", ...b.pillars.map((p) => p.naYin)],
    ["空亡", ...b.pillars.map((p) => p.xunKong)],
  ];
  return boxTable(rows, ["left", "center", "center", "center", "center"]);
}

const EL_BLOCK: Record<string, string> = { 木: "▓", 火: "▓", 土: "▓", 金: "▓", 水: "▓" };

export function wuxingBars(b: BaziChart, width = 28): string {
  const max = Math.max(...b.wuxing.map((w) => w.pct), 1);
  return b.wuxing
    .map((w) => {
      const n = Math.round((w.pct / max) * width);
      return `${w.element} ${EL_BLOCK[w.element].repeat(n)}${"░".repeat(width - n)} ${pad(w.pct.toFixed(1) + "%", 6, "right")} (${w.score.toFixed(2)})`;
    })
    .join("\n");
}

export function daYunBlock(b: BaziChart, currentYear: number): string {
  if (!b.yun || !b.yun.daYun.length) return "（無大運資料）";
  const rows: string[][] = [["大運", "十神", "起運年", "年齡", ""]];
  for (const d of b.yun.daYun) {
    const active = currentYear >= d.startYear && currentYear <= d.endYear;
    rows.push([
      d.ganZhi,
      `${d.shiShenGan}`,
      `${d.startYear}`,
      `${d.startAge}–${d.endAge}`,
      active ? "◀ 現行" : "",
    ]);
  }
  return boxTable(rows, ["center", "left", "right", "center", "left"]);
}

export function liuNianBlock(b: BaziChart, currentYear: number, span = 10): string {
  if (!b.yun) return "";
  const all = b.yun.daYun.flatMap((d) => d.liuNian);
  const start = currentYear - 2;
  const pick = all.filter((n) => n.year >= start && n.year < start + span);
  if (!pick.length) return "";
  const rows: string[][] = [["年份", "年齡", "流年", "十神"]];
  for (const n of pick) {
    rows.push([`${n.year}${n.year === currentYear ? " ◀" : ""}`, `${n.age}`, n.ganZhi, n.shiShenGan]);
  }
  return boxTable(rows, ["center", "right", "center", "left"]);
}

/** Interpretation anchors — the skeleton a practitioner reads first. */
export function readingAnchors(q: QimenChart): string {
  const P = (n: number | null) => {
    if (!n) return "（落中宮/無）";
    const p = q.palaces.find((x) => x.num === n);
    if (!p) return `宮${n}`;
    return `${p.gua}${p.num} · ${p.star} · ${p.door} · ${p.god}`;
  };
  const lines = [
    `**日干 ${q.dayStem}（自）** → ${P(q.reading.selfPalace)}`,
    `**時干 ${q.hourStem}（事/對方）** → ${P(q.reading.matterPalace)}`,
    `**年命 ${q.fourPillars.year[0]}** → ${P(q.reading.yearLifePalace)}`,
    `**值符 ${q.valueStar}** → ${P(q.reading.valueStarPalace)}`,
    `**值使 ${q.valueDoor}** → ${P(q.reading.valueDoorPalace)}`,
  ];
  const doors = q.palaces.filter((p) => p.door === "生門" || p.door === "開門" || p.door === "休門");
  lines.push(`**三吉門** → ${doors.map((p) => `${p.gua}${p.num}:${p.door}`).join("、") || "（無）"}`);
  lines.push(`**三奇** → ${q.sanQi.map((s) => `${s.stem}@${q.palaces.find((p) => p.num === s.palace)?.gua ?? "?"}${s.palace}`).join("、")}`);
  const marriage = q.palaces.find((p) => p.god === "六合");
  if (marriage) lines.push(`**六合（婚戀）** → ${marriage.gua}${marriage.num} · ${marriage.star} · ${marriage.door}`);
  lines.push(`**空亡 ${q.kong.join("")}** · **馬星 ${q.ma}**`);
  return lines.join("\n");
}

export function qimenPalaceTable(q: QimenChart): string {
  const rows: string[][] = [["宮", "方位", "地盤", "天盤", "九星", "八門", "八神", "門宮"]];
  for (const p of q.palaces) {
    rows.push([
      `${p.gua}${p.num}`, p.dir, p.diPan,
      `${p.tianPan}${p.tianPanExtra ?? ""}`,
      `${p.star}${p.starExtra ? "·禽" : ""}`, p.door, p.god, p.relation,
    ]);
  }
  return boxTable(rows);
}
