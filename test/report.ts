import { buildChart } from "../plugin/lib/chart.ts";
import { fullReport, renderHtmlDoc } from "../plugin/lib/report.ts";
import { exportDocument } from "../plugin/lib/export.ts";

const c = buildChart({
  datetime: process.argv[2] ?? "1992-11-08 16:45",
  tz: process.argv[3] ?? "Asia/Hong_Kong",
  gender: "male",
  name: "Test",
});
const res = exportDocument(renderHtmlDoc(c), process.argv[4] ?? "./out", "chart");
console.log(fullReport(c, { html: res.html, pdf: res.pdf, png: res.png, warnings: res.warnings }));
