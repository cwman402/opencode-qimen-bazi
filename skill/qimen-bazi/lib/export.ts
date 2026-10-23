// HTML → PDF (WeasyPrint) → PNG (PyMuPDF). All optional: if a renderer is
// missing the HTML is still written and the tool reports what was skipped.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const ENV_PY = process.env.QIMEN_PYTHON;
const ENV_WEASY = process.env.QIMEN_WEASYPRINT;

const PY_CANDIDATES = [
  ...(ENV_PY ? [ENV_PY] : []),
  "python3",
  "python",
];

const WEASY_CANDIDATES = [
  ...(ENV_WEASY ? [ENV_WEASY] : []),
  "weasyprint",
  join(homedir(), "venv/bin/weasyprint"),
  "/usr/local/bin/weasyprint",
  "/usr/bin/weasyprint",
];

function has(cmd: string): boolean {
  if (cmd.includes("/")) return existsSync(cmd);
  const r = spawnSync("bash", ["-lc", `command -v ${cmd}`], { encoding: "utf8" });
  return r.status === 0 && !!(r.stdout || "").trim();
}

function first(cands: string[]): string | null {
  for (const c of cands) if (has(c)) return c;
  return null;
}

export interface ExportResult {
  dir: string;
  html?: string;
  pdf?: string;
  png: string[];
  warnings: string[];
}

export function defaultOutDir(): string {
  return join(homedir(), ".local/share/opencode/qimen");
}

export function slugify(s: string): string {
  return (
    s
      .normalize("NFKD")
      .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "chart"
  );
}

/** Render one HTML document into pdf/png next to it. Never throws. */
export function exportDocument(html: string, outDir: string, basename: string): ExportResult {
  const warnings: string[] = [];
  const dir = outDir || defaultOutDir();
  mkdirSync(dir, { recursive: true });
  const htmlPath = join(dir, `${basename}.html`);
  writeFileSync(htmlPath, html, "utf8");
  const res: ExportResult = { dir, html: htmlPath, png: [], warnings };

  // ---- PDF --------------------------------------------------------------
  const weasy = first(WEASY_CANDIDATES);
  const pdfPath = join(dir, `${basename}.pdf`);
  let pdfOk = false;
  if (weasy) {
    const r = spawnSync(weasy, [htmlPath, pdfPath], { encoding: "utf8", timeout: 90_000 });
    if (r.status === 0 && existsSync(pdfPath)) {
      pdfOk = true;
      res.pdf = pdfPath;
    } else {
      warnings.push(`weasyprint failed: ${(r.stderr || r.error?.message || "").split("\n").slice(-3).join(" ").slice(0, 300)}`);
    }
  } else {
    warnings.push("weasyprint not found — skipped PDF");
  }

  // ---- PNG (rasterise the PDF) -----------------------------------------
  if (pdfOk) {
    const py = first(PY_CANDIDATES);
    if (py) {
      const script = [
        "import sys, fitz",
        "doc = fitz.open(sys.argv[1])",
        "out = sys.argv[2]",
        "for i, page in enumerate(doc):",
        "    pix = page.get_pixmap(dpi=150)",
        "    pix.save(f'{out}-{i+1}.png')",
      ].join("\n");
      const prefix = join(dir, basename);
      // drop pages from a previous, longer render so the set stays in sync
      for (let i = 1; i <= 20; i++) {
        const stale = `${prefix}.p-${i}.png`;
        if (existsSync(stale)) rmSync(stale, { force: true });
      }
      const r = spawnSync(py, ["-c", script, pdfPath, `${prefix}.p`], { encoding: "utf8", timeout: 90_000 });
      if (r.status === 0) {
        for (let i = 1; i <= 6; i++) {
          const p = `${prefix}.p-${i}.png`;
          if (existsSync(p)) res.png.push(p);
          else break;
        }
      } else {
        warnings.push(`PyMuPDF raster failed: ${(r.stderr || r.error?.message || "").split("\n").slice(-2).join(" ").slice(0, 200)}`);
      }
    } else {
      warnings.push("python not found — skipped PNG");
    }
  }

  return res;
}
