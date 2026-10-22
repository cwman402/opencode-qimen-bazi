// Assembles the markdown seen in the terminal.

import { currentYear, type BuiltChart } from "./chart.ts";
import { renderHtml, type RenderMeta } from "./html.ts";
import {
  boxTable, daYunBlock, fourPillarsBlock, liuNianBlock, qimenGrid,
  qimenPalaceTable, readingAnchors, wuxingBars,
} from "./text.ts";

const fence = (body: string, lang = "text") => "```" + lang + "\n" + body + "\n```";

export function headerLine(c: BuiltChart): string {
  const b = c.bazi;
  return [
    `**四柱** \`${b.pillars.map((p) => p.ganZhi).join(" ")}\``,
    `**日主** ${b.dayMaster.gan}${b.dayMaster.element}（${b.dayMaster.strength}）`,
    `**節氣** ${c.qimen.term.name} ${c.qimen.term.time.slice(5)}`,
    `**${c.qimen.juLabel}** ${c.qimen.yuan}`,
  ].join(" · ");
}

export function subHeader(c: BuiltChart): string {
  const m = c.meta;
  return `${m.datetime} · ${m.tzLabel}${m.gender ? ` · ${m.gender}` : ""}${m.trueSolar ? ` · 真太陽時 ${m.trueSolar}` : ""}`;
}

export function renderBazi(c: BuiltChart): string {
  const b = c.bazi;
  const out: string[] = [];
  out.push(fence(fourPillarsBlock(b)));
  out.push("");
  out.push("**五行力量**（已按旺相休囚死加權）");
  out.push(fence(wuxingBars(b)));
  out.push("");
  out.push(`**日主** ${b.dayMaster.gan}${b.dayMaster.element}（${b.dayMaster.yinYang}）· **${b.dayMaster.strength}** — ${b.dayMaster.detail}`);
  if (b.notes.length) out.push(b.notes.map((n) => `- ${n}`).join("\n"));
  if (b.shenSha.length) {
    out.push("");
    out.push(`**神煞** ${b.shenSha.map((s) => `${s.name}(${s.pillar}${s.note ? "：" + s.note.split("—")[1]?.trim() : ""})`).join(" · ")}`);
  }
  return out.join("\n");
}

export function renderQimen(c: BuiltChart): string {
  const q = c.qimen;
  const out: string[] = [];
  out.push(
    `\`${q.juLabel}\` · ${q.yuan} · \`${q.fourPillars.hour}時\` · 旬首 \`${q.xunHead}(${q.xunHeadYi})\` · 值符 \`${q.valueStar}\` · 值使 \`${q.valueDoor}\` · 空亡 \`${q.kong.join("")}\` · 馬 \`${q.ma}\``,
  );
  out.push("");
  out.push(fence(qimenGrid(q)));
  out.push("");
  out.push(fence(qimenPalaceTable(q)));
  out.push("");
  out.push("**取用錨點**");
  out.push(readingAnchors(q));
  if (q.notes.length) {
    out.push("");
    out.push(q.notes.map((n) => `- ${n}`).join("\n"));
  }
  return out.join("\n");
}

export function renderYun(c: BuiltChart, span = 10): string {
  const b = c.bazi;
  if (!b.yun) return "_（大運資料不可用）_";
  const cy = currentYear();
  const out: string[] = [];
  out.push(`起運 ${b.yun.startAgeText}（${b.yun.startSolar} 交運 · ${b.yun.forward ? "順行" : "逆行"}）`);
  out.push("");
  out.push(fence(daYunBlock(b, cy)));
  out.push("");
  out.push(fence(liuNianBlock(b, cy, span)));
  return out.join("\n");
}

export function renderMeta(c: BuiltChart): RenderMeta {
  return {
    title: c.meta.title,
    datetime: c.meta.datetime,
    tzLabel: c.meta.tzLabel,
    trueSolar: c.meta.trueSolar,
    generatedAt: c.meta.generatedAt,
    gender: c.meta.gender,
  };
}

export function renderHtmlDoc(c: BuiltChart, notes?: string): string {
  return renderHtml(c.bazi, c.qimen, renderMeta(c), currentYear(), notes);
}

export function baziOnly(c: BuiltChart, liuNianSpan = 10): string {
  return [
    `### 八字 — ${subHeader(c)}`,
    "",
    headerLine(c),
    "",
    renderBazi(c),
    "",
    "### 大運 / 流年",
    "",
    renderYun(c, liuNianSpan),
  ].join("\n");
}

export function qimenOnly(c: BuiltChart): string {
  return [
    `### 奇門遁甲時盤 — ${subHeader(c)}`,
    "",
    headerLine(c),
    "",
    renderQimen(c),
  ].join("\n");
}

export function fullReport(c: BuiltChart, files?: { html?: string; pdf?: string; png: string[]; warnings: string[]; hasNotes?: boolean }): string {
  const out: string[] = [];
  out.push(`# ${c.meta.title}`);
  out.push(subHeader(c));
  out.push("");
  out.push(headerLine(c));
  out.push("");
  out.push("## 一、四柱八字");
  out.push(renderBazi(c));
  out.push("");
  out.push("## 二、奇門遁甲（時盤）");
  out.push(renderQimen(c));
  out.push("");
  out.push("## 三、大運 / 流年");
  out.push(renderYun(c));
  if (files) {
    out.push("");
    out.push("## 四、圖檔");
    if (files.html) out.push(`- HTML：\`${files.html}\``);
    if (files.pdf) out.push(`- PDF：\`${files.pdf}\``);
    if (files.png.length) out.push(`- PNG：${files.png.map((p) => `\`${p}\``).join("、")}`);
    out.push(`- 內文：${files.hasNotes ? "含師傅批註" : "僅盤面解讀（可用 notes 參數補入批註）"}`);
    if (files.warnings.length) out.push(`- 提示：${files.warnings.join("；")}`);
  }
  if (c.warnings.length) {
    out.push("");
    out.push(`> ${c.warnings.join(" ")}`);
  }
  return out.join("\n");
}
