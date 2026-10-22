// Fuzz-compare the local engine against qimen-rs (拆補法 轉盤) over random moments.
// needs: bun add @spensercai/qimen-wasm
import init, { calculate } from "@spensercai/qimen-wasm";
import { buildChart } from "../plugin/lib/chart.ts";

const STAR: Record<string, string> = {
  tian_peng: "天蓬", tian_rui: "天芮", tian_chong: "天沖", tian_fu: "天輔", tian_qin: "天禽",
  tian_xin: "天心", tian_zhu: "天柱", tian_ren: "天任", tian_ying: "天英",
};
const DOOR: Record<string, string> = {
  xiu: "休門", si: "死門", shang: "傷門", du: "杜門", kai: "開門", jing: "驚門", sheng: "生門", scene: "景門",
};
const DEITY: Record<string, string> = {
  zhi_fu: "值符", teng_she: "騰蛇", tai_yin: "太陰", liu_he: "六合",
  bai_hu: "白虎", xuan_wu: "玄武", jiu_di: "九地", jiu_tian: "九天",
};
const STEM: Record<string, string> = {
  jia: "甲", yi: "乙", bing: "丙", ding: "丁", wu: "戊", ji: "己", geng: "庚", xin: "辛", ren: "壬", gui: "癸",
};

await init();

let seed = 20261022;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

let checked = 0;
let bad = 0;
const failures: string[] = [];

for (let n = 0; n < 400; n++) {
  const y = 1950 + Math.floor(rnd() * 80);
  const mo = 1 + Math.floor(rnd() * 12);
  const d = 1 + Math.floor(rnd() * 28);
  const h = Math.floor(rnd() * 24);
  const mi = Math.floor(rnd() * 60);

  const built = buildChart({
    datetime: `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")} ${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`,
    utcOffset: 8,
    gender: "male",
  });
  const bazi = built.bazi;
  const mine = built.qimen;

  const theirs: any = calculate({ year: y, month: mo, day: d, hour: h, minute: mi, utc_offset_minutes: 480 });

  const diffs: string[] = [];
  if (mine.ju !== theirs.ju) diffs.push(`ju ${mine.ju} vs ${theirs.ju}`);
  if ((mine.dun === "陽遁") !== (theirs.dun === "yang")) diffs.push(`dun ${mine.dun} vs ${theirs.dun}`);
  const YUAN: Record<string,string> = { upper: "上元", middle: "中元", lower: "下元" };
  if (mine.yuan !== YUAN[theirs.yuan]) diffs.push(`yuan ${mine.yuan} vs ${theirs.yuan}`);

  for (const tp of theirs.palaces) {
    const mp = mine.palaces[tp.number - 1];
    if (STEM[tp.earth_stem] !== mp.diPan) diffs.push(`p${tp.number} earth ${mp.diPan}/${STEM[tp.earth_stem]}`);
    const tStar = (tp.stars as string[]).map((s) => STAR[s]).filter((s) => s && s !== "天禽").join("/");
    const mStar = [mp.star].filter((s) => s && s !== "天禽").join("/");
    if ((tStar || "—") !== (mStar || "—")) diffs.push(`p${tp.number} star ${mStar}/${tStar}`);
    const tDoor = tp.door ? DOOR[tp.door] : "—";
    if (tDoor !== mp.door) diffs.push(`p${tp.number} door ${mp.door}/${tDoor}`);
    const tGod = tp.deity ? DEITY[tp.deity] : "—";
    if (tGod !== mp.god) diffs.push(`p${tp.number} god ${mp.god}/${tGod}`);
    const tHeaven = (tp.heaven_stems as any[]).map((x) => STEM[x.stem]).join("");
    const mHeaven = [mp.tianPan, mp.tianPanExtra].filter((x) => x && x !== "—").join("");
    const norm = (s: string) => s.split("").sort().join("");
    if (norm(tHeaven) !== norm(mHeaven) && tp.number !== 5) diffs.push(`p${tp.number} heaven ${mHeaven}/${tHeaven}`);
  }

  checked++;
  if (diffs.length) {
    bad++;
    if (failures.length < 12) failures.push(`${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")} ${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")} ${bazi.pillars.map((p) => p.ganZhi).join(" ")} | ${diffs.join("; ")}`);
  }
}

const out = [`checked ${checked}, mismatched ${bad}`];
out.push(...failures);
console.log(out.join("\n"));
