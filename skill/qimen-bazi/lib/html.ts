// Self-contained HTML rendering (print-ready A4, CJK fonts, no external assets).
// Layout uses <table> for the boards because WeasyPrint's grid/flex support is
// partial; tables print identically in every renderer.

import type { BaziChart } from "./bazi.ts";
import type { QimenChart } from "./qimen.ts";
import { mdToHtml } from "./md.ts";
import { narrativeMarkdown } from "./narrative.ts";

const EL_COLOR: Record<string, string> = {
  木: "#2f7d4f", 火: "#c0392b", 土: "#a5741c", 金: "#7b8794", 水: "#25629b",
};

const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function elTag(el: string) {
  return `<span class="el" style="color:${EL_COLOR[el] ?? "#333"}">${esc(el)}</span>`;
}

const LUOSHU = [
  [4, 9, 2],
  [3, 5, 7],
  [8, 1, 6],
];

export interface RenderMeta {
  title: string;
  datetime: string;
  tzLabel: string;
  location?: string;
  trueSolar?: string;
  generatedAt: string;
  gender?: string;
}

export function renderHtml(b: BaziChart, q: QimenChart, meta: RenderMeta, currentYear: number, notes?: string): string {
  const nowDaYun = b.yun?.daYun.find((d) => currentYear >= d.startYear && currentYear <= d.endYear);

  const pillarCells = b.pillars
    .map(
      (p) => `
      <td class="pillar ${p.key === "day" ? "day" : ""}">
        <div class="p-label">${esc(p.label)}</div>
        <div class="p-ss">${esc(p.shiShenGan)}</div>
        <div class="p-gan" style="color:${EL_COLOR[p.ganElement]}">${esc(p.gan)}</div>
        <div class="p-zhi" style="color:${EL_COLOR[p.zhiElement]}">${esc(p.zhi)}</div>
        <div class="p-hide">${p.hideGan.map((h, i) => `<span style="color:${EL_COLOR[elementOf(h)]}">${esc(h)}</span><small>${esc(p.shiShenZhi[i] ?? "")}</small>`).join(" ")}</div>
        <div class="p-meta">${esc(p.naYin)}</div>
        <div class="p-meta">${esc(p.diShi)} · 空${esc(p.xunKong)}</div>
      </td>`,
    )
    .join("");

  const wuxingRows = b.wuxing
    .map(
      (w) => `
      <tr>
        <td class="wx-el">${elTag(w.element)}</td>
        <td class="wx-bar"><div class="bar" style="width:${Math.max(2, w.pct)}%;background:${EL_COLOR[w.element]}"></div></td>
        <td class="wx-num">${w.pct.toFixed(1)}%</td>
        <td class="wx-num dim">${w.score.toFixed(2)}</td>
      </tr>`,
    )
    .join("");

  const cell = (num: number) => {
    const p = q.palaces.find((x) => x.num === num)!;
    const badges: string[] = [];
    if (p.flags.includes("值符星")) badges.push("符");
    if (p.flags.includes("值使門")) badges.push("使");
    const godCls = p.godLuck === "凶" ? "bad" : p.godLuck === "吉" ? "good" : "";
    const doorCls = p.doorLuck === "凶" ? "bad" : p.doorLuck === "吉" ? "good" : "";
    const starCls = p.starLuck === "凶" || p.starLuck === "小凶" ? "bad" : p.starLuck === "大吉" || p.starLuck === "小吉" ? "good" : "";
    const centre = num === 5;
    return `
      <td class="cell ${num === q.reading.selfPalace ? "self" : ""}">
        <div class="cell-head">
          <span class="gua">${esc(p.gua)}${p.num}</span>
          <span class="dir">${esc(p.dir)} · ${elTag(p.element)}</span>
          ${badges.length ? `<span class="badge">${badges.join("")}</span>` : ""}
        </div>
        <div class="god ${godCls}">${centre ? "禽寄坤2" : esc(p.god)}</div>
        <div class="star ${starCls}">${centre ? "—" : `${esc(p.star)}${p.starExtra ? "·禽" : ""} <b>${esc(p.tianPan)}${p.tianPanExtra ? esc(p.tianPanExtra) : ""}</b>`}</div>
        <div class="door ${doorCls}">${centre ? `地盤 <b>${esc(p.diPan)}</b>` : `${esc(p.door)} <b>${esc(p.diPan)}</b>`}</div>
        <div class="rel">${centre ? "" : esc(p.relation)}</div>
      </td>`;
  };

  const board = LUOSHU.map((row) => `<tr>${row.map(cell).join("")}</tr>`).join("");

  const daYunCells = (b.yun?.daYun ?? [])
    .map((d) => {
      const active = currentYear >= d.startYear && currentYear <= d.endYear;
      return `
      <td class="dy ${active ? "active" : ""}">
        <div class="dy-gz">${esc(d.ganZhi)}</div>
        <div class="dy-ss">${esc(d.shiShenGan)}</div>
        <div class="dy-yr">${d.startYear}–${d.endYear}</div>
        <div class="dy-age">${d.startAge}–${d.endAge} 歲</div>
      </td>`;
    })
    .join("");

  const liuNian = (b.yun?.daYun.flatMap((d) => d.liuNian) ?? []).filter(
    (n) => n.year >= currentYear - 2 && n.year < currentYear + 8,
  );
  const lnCell = (n: any) =>
    `<td class="ly">${n.year}</td><td class="la">${n.age}</td>` +
    `<td class="gz">${esc(n.ganZhi)}</td><td class="ls">${esc(n.shiShenGan)}</td>`;
  const liuNianRows: string[] = [];
  for (let i = 0; i < liuNian.length; i += 2) {
    const pair = liuNian.slice(i, i + 2);
    const now = pair.some((n) => n.year === currentYear);
    liuNianRows.push(
      `<tr class="${now ? "now" : ""}">${pair.map(lnCell).join("")}${pair.length === 1 ? "<td></td><td></td><td></td><td></td>" : ""}</tr>`,
    );
  }

  const anchor = (n: number | null) => {
    if (!n) return "—";
    const p = q.palaces.find((x) => x.num === n);
    return p ? `${p.gua}${p.num} · ${p.star} · ${p.door} · ${p.god}` : "—";
  };

  return `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<title>${esc(meta.title)}</title>
<style>
  @page { size: A4; margin: 12mm 11mm 10mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "WenQuanYi Zen Hei", "Noto Sans CJK TC", "PingFang TC", sans-serif;
    margin: 0; color: #1d232b; background: #fbfaf7; font-size: 10.5pt;
  }
  .wrap { max-width: 186mm; margin: 0 auto; }
  header { border-bottom: 2px solid #1d232b; padding-bottom: 8px; margin-bottom: 14px; }
  h1 { font-size: 17pt; margin: 0 0 3px; letter-spacing: 2px; }
  .sub { color: #5b6672; font-size: 9.5pt; line-height: 1.6; }
  .sub b { color: #1d232b; }
  h2 { font-size: 12pt; margin: 13px 0 6px; padding-left: 8px; border-left: 4px solid #a5741c; letter-spacing: 1px; }
  .el { font-weight: 700; }
  /* ---- 四柱 ---- */
  table.pillars { width: 100%; border-collapse: separate; border-spacing: 5px 0; }
  td.pillar { width: 25%; text-align: center; background: #fff; border: 1px solid #dfd9cd; border-radius: 6px; padding: 6px 4px; }
  td.pillar.day { background: #fffdf3; border-color: #a5741c; }
  .p-label { font-size: 8.5pt; color: #7b8794; letter-spacing: 1px; }
  .p-ss { font-size: 9pt; color: #5b6672; margin-top: 2px; }
  .p-gan, .p-zhi { font-size: 21pt; line-height: 1.1; font-weight: 700; }
  .p-hide { font-size: 8.5pt; color: #5b6672; margin-top: 3px; }
  .p-hide small { color: #97a0aa; margin-left: 1px; }
  .p-meta { font-size: 8pt; color: #7b8794; margin-top: 2px; }
  /* ---- 五行 ---- */
  table.wx { width: 100%; border-collapse: collapse; margin-top: 2px; }
  table.wx td { padding: 2px 4px; vertical-align: middle; }
  td.wx-el { width: 26px; font-weight: 700; text-align: center; }
  td.wx-bar { width: auto; }
  td.wx-num { width: 52px; text-align: right; font-variant-numeric: tabular-nums; }
  .dim { color: #97a0aa; }
  .bar { height: 8px; border-radius: 4px; min-width: 3px; }
  .verdict { margin-top: 5px; background: #fff; border: 1px solid #dfd9cd; border-radius: 6px; padding: 5px 8px; font-size: 9pt; }
  .verdict b { color: #a5741c; }
  /* ---- 奇門盤 ---- */
  table.board { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.board td.cell { border: 1px solid #d8d2c4; vertical-align: top; padding: 5px 6px; height: 22mm; width: 33.33%; background: #fff; }
  table.board td.cell.self { background: #fffdf3; box-shadow: inset 0 0 0 2px #a5741c; }
  .cell-head { display: flex; justify-content: space-between; font-size: 8pt; color: #7b8794; margin-bottom: 5px; }
  .gua { font-weight: 700; color: #1d232b; letter-spacing: 1px; }
  .badge { background: #1d232b; color: #fff; border-radius: 3px; padding: 0 4px; font-size: 7.5pt; }
  .god { font-size: 8.5pt; color: #5b6672; }
  .star { font-size: 10.5pt; margin-top: 3px; }
  .door { font-size: 10.5pt; }
  .star b, .door b { font-size: 13pt; margin-left: 2px; }
  .rel { font-size: 7.5pt; color: #97a0aa; margin-top: 4px; }
  .good { color: #2f7d4f; }
  .bad { color: #b03a2e; }
  .vals { margin-top: 6px; width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  .vals td { border: 1px solid #dfd9cd; padding: 3.5px 6px; }
  .vals td.k { background: #f4f1ea; color: #5b6672; width: 78px; white-space: nowrap; }
  /* ---- 大運 / 流年 ---- */
  table.dayun { width: 100%; border-collapse: separate; border-spacing: 3px 0; }
  td.dy { text-align: center; border: 1px solid #dfd9cd; border-radius: 5px; padding: 6px 2px; background: #fff; }
  td.dy.active { background: #1d232b; color: #fff; border-color: #1d232b; }
  .dy-gz { font-size: 13pt; font-weight: 700; }
  .dy-ss { font-size: 8pt; opacity: .85; }
  .dy-yr, .dy-age { font-size: 7.5pt; opacity: .75; }
  table.ln { border-collapse: collapse; font-size: 9pt; }
  table.ln td { border-bottom: 1px solid #eae5db; padding: 4px 14px 4px 0; }
  table.ln tr.now td { background: #fff4d6; font-weight: 700; }
  table.ln .gz { letter-spacing: 2px; }
  footer { margin-top: 16px; border-top: 1px solid #dfd9cd; padding-top: 7px; font-size: 7.8pt; color: #97a0aa; line-height: 1.6; }
  .legend { display: flex; gap: 14px; font-size: 8pt; color: #7b8794; margin-top: 6px; }
  h2.keep { page-break-after: avoid; }
  table.board, table.vals { page-break-inside: avoid; }
  .mdblock { font-size: 9.5pt; line-height: 1.75; }
  .mdblock.reading { background: #fffdf7; border: 1px solid #e8e0cd; border-radius: 6px; padding: 8px 12px; }
  .mdblock h2.md { font-size: 11pt; margin: 12px 0 5px; padding: 0 0 3px; border-left: none; border-bottom: 1px solid #e8e0cd; letter-spacing: .5px; }
  .mdblock h3.md { font-size: 10pt; margin: 10px 0 4px; color: #8a5a12; letter-spacing: .5px; }
  .mdblock p.md { margin: 0 0 6px; }
  .mdblock ul.md, .mdblock ol.md { margin: 2px 0 8px; padding-left: 18px; }
  .mdblock li { margin: 2px 0; }
  .mdblock strong { color: #7a2e22; }
  .mdblock code { font-family: "WenQuanYi Zen Hei Mono", monospace; background: #f2eee4; padding: 0 3px; border-radius: 3px; font-size: 9pt; }
  .mdblock table.md { width: 100%; border-collapse: collapse; font-size: 8.8pt; margin: 6px 0 10px; page-break-inside: avoid; }
  .mdblock table.md th { background: #f4f1ea; text-align: left; font-weight: 700; white-space: nowrap; }
  .mdblock table.md td:first-child { white-space: nowrap; }
  .mdblock table.md thead { display: table-header-group; }
  .mdblock table.md tr { page-break-inside: avoid; }
  .mdblock table.md th, .mdblock table.md td { border: 1px solid #e2dccd; padding: 3px 6px; vertical-align: top; }
  .mdblock table.md tr:nth-child(even) td { background: #fbf9f4; }
  .mdblock blockquote.md { margin: 6px 0; padding: 5px 10px; border-left: 3px solid #a5741c; background: #fdf6e7; color: #6b5320; }
  .mdblock pre.code { font-family: "WenQuanYi Zen Hei Mono", monospace; font-size: 7.6pt; line-height: 1.35; background: #f7f4ed; border: 1px solid #e8e0cd; border-radius: 5px; padding: 6px 8px; white-space: pre; overflow: hidden; margin: 6px 0 10px; }
  hr.md { border: none; border-top: 1px solid #e8e0cd; margin: 10px 0; }
  .qnotes { margin-top: 7px; font-size: 9pt; color: #8a5a12; background: #fdf6e7; border-left: 3px solid #a5741c; padding: 5px 8px; }
  table.ln td.ly { width: 58px; }
  table.ln td.la { width: 34px; color: #7b8794; }
  table.ln td.gz { width: 56px; }
  table.ln td.ls { width: 64px; color: #5b6672; padding-right: 28px; }
</style></head>
<body><div class="wrap">

<header>
  <h1>${esc(meta.title)}</h1>
  <div class="sub">
    <b>${esc(meta.datetime)}</b> · ${esc(meta.tzLabel)}${meta.location ? ` · ${esc(meta.location)}` : ""}
    ${meta.trueSolar ? ` · 真太陽時 ${esc(meta.trueSolar)}` : ""}<br>
    四柱 <b>${b.pillars.map((p) => esc(p.ganZhi)).join(" ")}</b> ·
    日主 <b>${esc(b.dayMaster.gan)}${esc(b.dayMaster.element)}</b>（${esc(b.dayMaster.strength)}）·
    節氣 <b>${esc(q.term.name)}</b> ${esc(q.term.time)} ·
    <b>${esc(q.juLabel)}</b> ${esc(q.yuan)}
    ${meta.gender ? ` · ${esc(meta.gender)}` : ""}
  </div>
</header>

<h2>四柱八字</h2>
<table class="pillars"><tr>${pillarCells}</tr></table>

<h2>五行力量</h2>
<table class="wx">${wuxingRows}</table>
<div class="verdict"><b>日主 ${esc(b.dayMaster.gan)}${esc(b.dayMaster.element)}</b>（${esc(b.dayMaster.yinYang)}）— ${esc(b.dayMaster.detail)}<br>
${b.notes.map((n) => esc(n)).join(" ")}</div>

<h2 class="keep">奇門遁甲 · 時盤</h2>
<table class="board">${board}</table>
<table class="vals">
  <tr><td class="k">局</td><td>${esc(q.juLabel)} · ${esc(q.yuan)} · ${esc(q.term.name)}</td>
      <td class="k">旬首</td><td>${esc(q.xunHead)}（${esc(q.xunHeadYi)}）</td></tr>
  <tr><td class="k">值符</td><td>${esc(q.valueStar)} · ${esc(q.palaces.find((p) => p.num === q.valueStarPalace)?.gua ?? "")}${q.valueStarPalace}</td>
      <td class="k">值使</td><td>${esc(q.valueDoor)} · ${esc(q.palaces.find((p) => p.num === q.valueDoorPalace)?.gua ?? "")}${q.valueDoorPalace}</td></tr>
  <tr><td class="k">空亡</td><td>${esc(q.kong.join(""))}</td>
      <td class="k">馬星</td><td>${esc(q.ma)}</td></tr>
  <tr><td class="k">日干（自）</td><td>${esc(anchor(q.reading.selfPalace))}</td>
      <td class="k">時干（事）</td><td>${esc(anchor(q.reading.matterPalace))}</td></tr>
  <tr><td class="k">年命</td><td>${esc(anchor(q.reading.yearLifePalace))}</td>
      <td class="k">三奇</td><td>${q.sanQi.map((s) => `${esc(s.stem)}@${esc(q.palaces.find((p) => p.num === s.palace)?.gua ?? "?")}${s.palace}`).join(" · ")}</td></tr>
</table>
${q.notes.length ? `<div class="qnotes">${q.notes.map((n) => esc(n)).join(" ")}</div>` : ""}
<div class="legend">
  <span>神 → 星/天盤 → 門/地盤</span>
  <span><span class="good">吉</span> / <span class="bad">凶</span></span>
  <span>框線高亮 = 日干落宮（自）</span>
</div>

<h2 class="keep">解讀 · 盤面</h2>
<div class="mdblock">${mdToHtml(narrativeMarkdown(q, b))}</div>

${notes && notes.trim() ? `<h2 class="keep">師傅批註</h2><div class="mdblock reading">${mdToHtml(notes)}</div>` : ""}

<h2>大運${nowDaYun ? ` · 現行 ${esc(nowDaYun.ganZhi)}（${nowDaYun.startYear}–${nowDaYun.endYear}）` : ""}</h2>
<table class="dayun"><tr>${daYunCells}</tr></table>

<h2>流年</h2>
<table class="ln">${liuNianRows.join("")}</table>

<footer>
  起運：${b.yun ? esc(b.yun.startAgeText) + `（${esc(b.yun.startSolar)} 交運，${b.yun.forward ? "順行" : "逆行"}）` : "—"} ·
  胎元 ${esc(b.taiYuan)} · 命宮 ${esc(b.mingGong)} · 身宮 ${esc(b.shenGong)}<br>
  神煞：${b.shenSha.map((s) => `${esc(s.name)}（${esc(s.pillar)}）`).join(" · ") || "—"}<br>
  八字以節氣定月、立春換年；奇門採時家拆補法，以符頭定三元。兩者皆為傳統術數模型，象徵性參考，非確定性預測，亦非投資建議。
  生成於 ${esc(meta.generatedAt)}。
</footer>
</div></body></html>`;
}

function elementOf(gan: string): string {
  const m: Record<string, string> = {
    甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
    己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
  };
  return m[gan] ?? "土";
}
