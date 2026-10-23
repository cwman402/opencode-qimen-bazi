#!/usr/bin/env bun
// Standalone CLI — same engine the OpenCode plugin uses.
//
//   bun cli.ts                                  # cast now
//   bun cli.ts --date "1992-11-08 16:45" --tz Asia/Hong_Kong --gender male
//   bun cli.ts --date "1995-08-08 21:40" --tz Asia/Hong_Kong --gender female --export
//   bun cli.ts --qimen --date "2026-10-22 14:00" --question "這個案子成不成"

import { readFileSync } from "node:fs";
import { buildChart } from "../lib/chart.ts";
import { baziOnly, qimenOnly, fullReport, renderHtmlDoc } from "../lib/report.ts";
import { exportDocument, slugify } from "../lib/export.ts";

const args = process.argv.slice(2);
const get = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const v = args[i + 1];
  return v && !v.startsWith("--") ? v : "true";
};
const has = (name: string) => args.includes(`--${name}`);

if (has("help") || has("h")) {
  console.log(`奇門遁甲 · 八字 CLI

  --date "YYYY-MM-DD HH:mm"   出生/問事時刻（預設：現在）
  --tz Asia/Hong_Kong         時區（預設：系統）
  --longitude 114.17          經度（配合 --true-solar）
  --true-solar                真太陽時校正
  --gender male|female        性別（大運順逆）
  --name "名字"               標題
  --zi-shi same-day|next-day  晚子時規則（預設 next-day）
  --qimen                     只輸出奇門盤
  --bazi                      只輸出八字
  --question "..."            問事內容
  --notes "文字" | --notes-file x.md
                              批註 markdown，會併入 PDF/HTML
  --export                    輸出 HTML/PDF/PNG
  --out DIR                   輸出目錄（預設 ~/.local/share/opencode/qimen）
`);
  process.exit(0);
}

const chart = buildChart({
  datetime: get("date"),
  tz: get("tz"),
  longitude: get("longitude") ? Number(get("longitude")) : undefined,
  trueSolar: has("true-solar") || has("trueSolar"),
  gender: (get("gender", "male") as "male" | "female"),
  name: get("name"),
  ziShiRule: get("zi-shi") === "same-day" ? "same-day" : "next-day",
});

let body: string;
if (has("qimen")) body = qimenOnly(chart);
else if (has("bazi")) body = baziOnly(chart);
else body = fullReport(chart);

console.log(body);

if (has("export") || has("qimen") || has("bazi")) {
  if (has("export")) {
    const notesArg = get("notes");
    const notesFile = get("notes-file");
    const notes = notesFile ? readFileSync(notesFile, "utf8") : notesArg && notesArg !== "true" ? notesArg : undefined;
    const res = exportDocument(
      renderHtmlDoc(chart, notes),
      get("out") || "",
      `${slugify(get("name", "chart")!)}-${chart.meta.stamp}`,
    );
    console.log(`\nHTML ${res.html}`);
    if (res.pdf) console.log(`PDF  ${res.pdf}`);
    for (const p of res.png) console.log(`PNG  ${p}`);
    if (res.warnings.length) console.log(`note ${res.warnings.join("; ")}`);
  }
}
