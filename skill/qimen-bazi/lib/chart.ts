// Builds the full chart (八字 + 奇門) from a single moment.

import {
  parseDateInput, tzOffsetMinutes, toTrueSolar, lunarOf, prevTerm, nextTerm,
  fmtCivil, TERM_JU, type CivilTime,
} from "./cal.ts";
import { computeBazi, type BaziChart } from "./bazi.ts";
import { computeQimen, type QimenChart } from "./qimen.ts";

export interface ChartOptions {
  datetime?: string;
  tz?: string;
  longitude?: number;
  trueSolar?: boolean;
  gender?: "male" | "female";
  name?: string;
  ziShiRule?: "next-day" | "same-day";
  /** Explicit UTC offset in hours, overriding tz lookup (e.g. 8 for UTC+8). */
  utcOffset?: number;
}

export interface BuiltChart {
  bazi: BaziChart;
  qimen: QimenChart;
  civil: CivilTime;
  meta: {
    title: string;
    datetime: string;
    tzLabel: string;
    location?: string;
    trueSolar?: string;
    generatedAt: string;
    stamp: string;
    gender?: string;
    name?: string;
    explicitTime: boolean;
  };
  warnings: string[];
}

const GENDER_LABEL = { male: "男命", female: "女命" } as const;

export function buildChart(opts: ChartOptions): BuiltChart {
  const warnings: string[] = [];
  const { civil: rawCivil, explicit } = parseDateInput(opts.datetime);
  const tz = opts.tz || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  // resolve the UTC offset at that wall-clock time
  let offsetMin: number;
  if (typeof opts.utcOffset === "number") {
    offsetMin = Math.round(opts.utcOffset * 60);
  } else {
    const guess = Date.UTC(rawCivil.y, rawCivil.mo - 1, rawCivil.d, rawCivil.h, rawCivil.mi);
    offsetMin = tzOffsetMinutes(tz, guess - tzOffsetMinutes(tz, guess) * 60000);
  }

  let civil = { ...rawCivil };
  let tstLabel: string | undefined;
  if (opts.trueSolar) {
    if (typeof opts.longitude !== "number") {
      warnings.push("trueSolar requested without longitude — skipped 真太陽時 correction.");
    } else {
      const { civil: shifted, deltaMin } = toTrueSolar(rawCivil, offsetMin, opts.longitude);
      civil = shifted;
      const sign = deltaMin >= 0 ? "+" : "";
      tstLabel = `${fmtCivil(shifted)} (${sign}${deltaMin.toFixed(1)} 分)`;
    }
  } else if (typeof opts.longitude === "number") {
    warnings.push("longitude given but trueSolar is off — using the standard clock time.");
  }
  if (!explicit) warnings.push("No datetime supplied — used the current moment.");

  const ziShifted = civil.h === 23 && opts.ziShiRule !== "same-day";
  if (ziShifted) {
    warnings.push("23:00–23:59 依傳統「子時換日」：日柱與時柱用次日，年柱/月柱/節氣仍取當時真實時刻。如需保留當日，改用 ziShiRule='same-day'。");
  }

  const bazi = computeBazi(civil, opts.gender ?? "male", { sameDayZi: opts.ziShiRule === "same-day" });
  const lunar = lunarOf(civil);
  const qimen = computeQimen({
    fourPillars: {
      year: bazi.pillars[0].ganZhi,
      month: bazi.pillars[1].ganZhi,
      day: bazi.pillars[2].ganZhi,
      hour: bazi.pillars[3].ganZhi,
    },
    term: prevTerm(lunar),
    nextTerm: nextTerm(lunar),
    termTable: TERM_JU,
  });

  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const tzLabel = `${tz} (UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")})`;

  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const titleParts = [opts.name ? `${opts.name} — ` : "", "奇門遁甲 · 八字"];
  return {
    bazi,
    qimen,
    civil,
    meta: {
      title: titleParts.join(""),
      datetime: ziShifted ? `${fmtCivil(civil)}（晚子時 → 次日日柱）` : fmtCivil(civil),
      stamp: fmtCivil(civil).replace(" ", "-").replace(/:/g, ""),
      tzLabel,
      trueSolar: tstLabel,
      generatedAt: stamp,
      gender: opts.gender ? GENDER_LABEL[opts.gender] : undefined,
      name: opts.name,
      explicitTime: explicit,
    },
    warnings,
  };
}

/** Current solar year, used to highlight the active 大運 / 流年. */
export function currentYear(): number {
  return new Date().getFullYear();
}
