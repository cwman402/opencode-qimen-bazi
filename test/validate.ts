// Regression test — fixed chart, no dependencies.
//
// 1992-11-08 16:45 Asia/Hong_Kong (陰遁九局 · 中元 · 旬首 甲寅(癸) · 值符 天輔 · 值使 杜門).
// Every palace below was produced by the independent Rust implementation qimen-rs
// (拆補法 轉盤), so this test checks *agreement with a second implementation*, not a
// snapshot of our own output. Run test/crossvalidate.ts for the 400-moment fuzz comparison.

import { parseDateInput, prevTerm, nextTerm, lunarOf, TERM_JU } from "../plugin/lib/cal.ts";
import { computeQimen } from "../plugin/lib/qimen.ts";
import { computeBazi } from "../plugin/lib/bazi.ts";

const dt = "1992-11-08 16:45";
const { civil } = parseDateInput(dt);
const lunar = lunarOf(civil);
const bazi = computeBazi(civil, "male");
const q = computeQimen({
  fourPillars: {
    year: bazi.pillars[0].ganZhi, month: bazi.pillars[1].ganZhi,
    day: bazi.pillars[2].ganZhi, hour: bazi.pillars[3].ganZhi,
  },
  term: prevTerm(lunar),
  nextTerm: nextTerm(lunar),
  termTable: TERM_JU,
});

// [地盤, 天盤(+禽寄 centre stem), 九星, 八門, 八神]
const expected: Record<number, string[]> = {
  1: ["乙", "丙壬", "天芮·禽", "死門", "九地"],
  2: ["丙", "丁", "天沖", "傷門", "騰蛇"],
  3: ["丁", "辛", "天心", "開門", "白虎"],
  4: ["癸", "乙", "天蓬", "休門", "六合"],
  5: ["壬", "—", "—", "—", "—"],
  6: ["辛", "戊", "天英", "景門", "九天"],
  7: ["庚", "癸", "天輔", "杜門", "值符"],
  8: ["己", "庚", "天柱", "驚門", "玄武"],
  9: ["戊", "己", "天任", "生門", "太陰"],
};

let fail = 0;
const lines: string[] = [];
lines.push(`四柱: ${bazi.pillars.map((p) => p.ganZhi).join(" ")}`);
lines.push(`節氣: ${q.term.name} ${q.term.time} | ${q.yuan} | ${q.juLabel}`);
lines.push(`值符 ${q.valueStar} 值使 ${q.valueDoor} 旬首 ${q.xunHead}(${q.xunHeadYi}) 空亡 ${q.kong.join("")} 馬 ${q.ma}`);

for (const p of q.palaces) {
  const star = p.star === "—" ? "—" : `${p.star}${p.starExtra ? "·禽" : ""}`;
  const tian = p.tianPan === "—" ? "—" : `${p.tianPan}${p.tianPanExtra ?? ""}`;
  const got = [p.diPan, tian, star, p.door, p.god];
  const exp = expected[p.num];
  const ok = got.every((v, i) => v === exp[i]);
  if (!ok) fail++;
  lines.push(`${ok ? "OK " : "BAD"} ${p.num}: ${got.join(" ")}   expected ${exp.join(" ")}`);
}

lines.push(`大運 ${bazi.yun?.daYun.slice(0, 3).map((d) => d.ganZhi).join(" ") ?? "—"}`);
lines.push(fail === 0 ? "ALL PALACES MATCH" : `${fail} PALACE MISMATCH(ES)`);

console.log(lines.join("\n"));
if (fail) process.exit(1);
