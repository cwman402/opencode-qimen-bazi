// 奇門遁甲 + 八字 plugin for OpenCode.
//
// Registers three tools:
//   bazi_chart          — 四柱, 十神, 藏干, 納音, 五行, 大運/流年
//   qimen_chart         — 時家奇門 時盤 (拆補法), 九宮格 + 取用錨點
//   qimen_bazi_report   — both, plus a styled HTML/PDF/PNG sheet on disk
//
// Zero runtime dependencies (calendar core is vendored), type-only imports from
// @opencode/plugin so nothing has to resolve at load time.

import { buildChart } from "./lib/chart.ts";
import { baziOnly, qimenOnly, fullReport, renderHtmlDoc } from "./lib/report.ts";
import { exportDocument, openInBrowser, slugify } from "./lib/export.ts";

const DATE_DESC =
  "Local wall-clock moment, 'YYYY-MM-DD HH:mm' (e.g. '1992-11-08 16:45'). Omit for now.";
const TZ_DESC =
  "IANA time zone of the place, e.g. Asia/Hong_Kong, America/New_York. Defaults to the system zone.";
const LON_DESC =
  "Longitude in decimal degrees east (Hong Kong 114.17, New York -74.0). Needed only for 真太陽時.";
const GENDER_DESC = "Needed for 大運 direction (陽男陰女順行, 陰男陽女逆行).";

function inputSchema(extra: Record<string, any> = {}, required: string[] = []) {
  return {
    type: "object",
    properties: {
      datetime: { type: "string", description: DATE_DESC },
      tz: { type: "string", description: TZ_DESC },
      longitude: { type: "number", description: LON_DESC },
      trueSolar: {
        type: "boolean",
        description: "Apply 真太陽時 correction (requires longitude). Default false.",
      },
      name: { type: "string", description: "Label for the reading." },
      gender: { type: "string", enum: ["male", "female"], description: GENDER_DESC },
      ...extra,
    },
    required,
  };
}

export default {
  id: "qimen-bazi",

  async setup(ctx: any) {
    await ctx.tool.transform((editor: any) => {
      // ------------------------------------------------------------------
      editor.add({
        name: "bazi_chart",
        description:
          "Compute a 八字 (Four Pillars) chart: 年/月/日/時干支, 十神, 藏干, 納音, 十二長生, 空亡, " +
          "五行 strength with 旺相休囚死 weighting, 日主 strength by 得令/得地/得勢, 神煞, and the full " +
          "大運 + 流年 tables. Month pillars follow the true 節 times (寿星天文历, to the second); " +
          "年柱 switches at 立春. Use this whenever the user gives a birth date and asks about character, " +
          "career, wealth, marriage timing, or a specific year.",
        input: inputSchema({
          ziShiRule: {
            type: "string",
            enum: ["next-day", "same-day"],
            description:
              "23:00–23:59 handling. 'next-day' (default, traditional) rolls 子時 into the following day's " +
              "day pillar; 'same-day' keeps the calendar day.",
          },
          liuNianSpan: {
            type: "number",
            description: "How many years of 流年 to print starting two years back. Default 10.",
          },
        }),
        execute: async (input: any) => {
          try {
            const c = buildChart({
              datetime: input.datetime,
              tz: input.tz,
              longitude: input.longitude,
              trueSolar: input.trueSolar,
              gender: input.gender ?? "male",
              name: input.name,
              ziShiRule: input.ziShiRule,
            });
            const body = baziOnly(c, input.liuNianSpan);
            return {
              content: body,
              metadata: {
                fourPillars: c.bazi.pillars.map((p) => p.ganZhi),
                dayMaster: `${c.bazi.dayMaster.gan}${c.bazi.dayMaster.element}`,
                strength: c.bazi.dayMaster.strength,
                wuxing: c.bazi.wuxing,
                warnings: c.warnings,
              },
            };
          } catch (err: any) {
            return { content: `八字排盤失敗：${err?.message ?? err}` };
          }
        },
      });

      // ------------------------------------------------------------------
      editor.add({
        name: "qimen_chart",
        description:
          "Cast a 時家奇門遁甲 時盤 (hour chart) using the 拆補法: 節氣 + 三元 + 局數, 地盤/天盤 三奇六儀, " +
          "九星, 八門, 八神 on the 洛書 3×3 board, plus 旬首, 值符, 值使, 空亡, 馬星 and the standard 取用錨點 " +
          "(日干 = self, 時干 = the matter, 年命, 值符/值使, 三吉門, 三奇, 六合). Also flags 伏吟/反吟/五不遇時 " +
          "and each 門–宮 relation. Use for a specific question cast at a moment in time, or to read the " +
          "奇門 layer of a birth chart.",
        input: inputSchema({
          question: {
            type: "string",
            description: "Optional: what is being asked (財, 婚, 事業, 出行…). Shown in the output header.",
          },
        }),
        execute: async (input: any) => {
          try {
            const c = buildChart({
              datetime: input.datetime,
              tz: input.tz,
              longitude: input.longitude,
              trueSolar: input.trueSolar,
              gender: input.gender ?? "male",
              name: input.name,
            });
            const head = input.question ? `**問事** ${input.question}\n\n` : "";
            return {
              content: head + qimenOnly(c),
              metadata: {
                ju: c.qimen.juLabel,
                yuan: c.qimen.yuan,
                term: c.qimen.term,
                xunHead: c.qimen.xunHead,
                valueStar: c.qimen.valueStar,
                valueDoor: c.qimen.valueDoor,
                kong: c.qimen.kong,
                ma: c.qimen.ma,
                reading: c.qimen.reading,
                palaces: c.qimen.palaces.map((p) => ({
                  p: `${p.gua}${p.num}`, god: p.god, star: p.star, door: p.door,
                  tian: p.tianPan, di: p.diPan, relation: p.relation,
                })),
              },
            };
          } catch (err: any) {
            return { content: `奇門排盤失敗：${err?.message ?? err}` };
          }
        },
      });

      // ------------------------------------------------------------------
      editor.add({
        name: "qimen_bazi_report",
        description:
          "Full 奇門遁甲 + 八字 reading sheet in one call: computes both layers and renders a styled, " +
          "print-ready A4 document to disk (HTML always; PDF via WeasyPrint and PNG via PyMuPDF when " +
          "available), returning the paths plus the whole chart as markdown. Use when the user wants the " +
          "complete picture, a shareable/printable chart, or says 'plot it' / 'make me the chart'.",
        input: inputSchema({
          notes: {
            type: "string",
            description:
              "The reading itself, in markdown. Rendered into the PDF/HTML as 師傅批註 right after the " +
              "charts, so the document carries the explanation together with the boards. Two-pass flow: " +
              "call once with export=false to get the chart, write the reading, then call again with notes " +
              "and export=true.",
          },
          export: {
            type: "boolean",
            description: "Write HTML/PDF/PNG files. Default true.",
          },
          open: {
            type: "boolean",
            description:
              "After exporting, open the PDF in the user's default browser (falls back to the HTML " +
              "if no PDF renderer ran). Default false.",
          },
          outDir: {
            type: "string",
            description: "Directory for the exported files. Default ~/.local/share/opencode/qimen.",
          },
          ziShiRule: {
            type: "string",
            enum: ["next-day", "same-day"],
            description: "23:00–23:59 子時 rule. Default 'next-day'.",
          },
        }),
        execute: async (input: any) => {
          try {
            const c = buildChart({
              datetime: input.datetime,
              tz: input.tz,
              longitude: input.longitude,
              trueSolar: input.trueSolar,
              gender: input.gender ?? "male",
              name: input.name,
              ziShiRule: input.ziShiRule,
            });

            let files: { html?: string; pdf?: string; png: string[]; warnings: string[] } | undefined;
            if (input.export !== false) {
              const base = `${slugify(input.name || "chart")}-${c.meta.stamp}`;
              const res = exportDocument(renderHtmlDoc(c, input.notes), input.outDir || "", base);
              const opened = input.open ? openInBrowser(res.pdf || res.html || "") : null;
              files = {
                html: res.html, pdf: res.pdf, png: res.png, warnings: res.warnings,
                hasNotes: !!(input.notes && input.notes.trim()),
                ...(input.open ? { opened: opened ?? "failed" } : {}),
              } as any;
            }

            return {
              content: fullReport(c, files),
              metadata: {
                fourPillars: c.bazi.pillars.map((p) => p.ganZhi),
                ju: c.qimen.juLabel,
                files,
                warnings: c.warnings,
              },
            };
          } catch (err: any) {
            return { content: `排盤失敗：${err?.message ?? err}` };
          }
        },
      });
    });
  },
};
