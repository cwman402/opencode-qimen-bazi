// HTML → PDF (WeasyPrint) → PNG (PyMuPDF). All optional: if a renderer is
// missing the HTML is still written and the tool reports what was skipped.

import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

/** Detached so a browser window never keeps the CLI process alive. */
function spawnDetached(cmd: string, argv: string[]): boolean {
  try {
    const child = spawn(cmd, argv, { detached: true, stdio: "ignore" });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

/** Resolve the desktop's default web browser to an executable name, if we can. */
function defaultWebBrowser(): string | null {
  const r = spawnSync("xdg-settings", ["get", "default-web-browser"], { encoding: "utf8" });
  const id = (r.stdout || "").trim();
  if (r.status !== 0 || !id) return null;
  // firefox_firefox.desktop / firefox.desktop / google-chrome.desktop
  const base = id.replace(/\.desktop$/, "").split("_")[0].replace(/-stable$/, "");
  return has(base) ? base : null;
}

/** Resolve a bare command name to the file that will actually run. */
function resolveCmd(cmd: string): string | null {
  const r = spawnSync("bash", ["-lc", `command -v ${cmd}`], { encoding: "utf8" });
  const p = (r.stdout || "").trim();
  return r.status === 0 && p ? p : cmd.includes("/") ? cmd : null;
}

/**
 * Snap-confined apps cannot see /tmp or any dot-directory under $HOME.
 * Ubuntu's /usr/bin/firefox is a shim around the snap, so check the target too.
 */
function isSnapApp(cmd: string): boolean {
  const resolved = resolveCmd(cmd);
  if (!resolved) return false;
  const real = spawnSync("readlink", ["-f", resolved], { encoding: "utf8" }).stdout?.trim() || "";
  if (resolved.includes("/snap/") || real.includes("/snap/")) return true;
  try {
    const head = readFileSync(resolved, "utf8").slice(0, 400);
    return /\/snap\/bin\//.test(head) || /SNAP=/i.test(head);
  } catch {
    return false;
  }
}

/**
 * Snap-confined browsers cannot see /tmp (private tmpfs), so a file written there is
 * invisible to them even though it exists on disk. Stage a copy under $HOME, which the
 * home interface does expose. Paths already under $HOME are used as-is.
 */
function stageForBrowser(path: string): string {
  if (path.startsWith(homedir() + "/")) return path;
  const docs = join(homedir(), "Documents");
  const dir = existsSync(docs) ? join(docs, "opencode-qimen") : join(homedir(), "opencode-qimen");
  try {
    mkdirSync(dir, { recursive: true });
    const staged = join(dir, path.split("/").pop() || "chart.pdf");
    copyFileSync(path, staged);
    return staged;
  } catch {
    return path;
  }
}

/**
 * Open a rendered document in the user's default browser.
 * Order: $QIMEN_BROWSER → default web browser → xdg-open / open / start.
 * Returns `"<browser> → <file actually opened>"`, or null if none worked.
 */
export function openInBrowser(path: string): string | null {
  if (process.platform === "darwin") return spawnDetached("open", [path]) ? `open → ${path}` : null;
  if (process.platform === "win32") return spawnDetached("cmd", ["/c", "start", "", path]) ? `start → ${path}` : null;

  const env = (process.env.QIMEN_BROWSER || "").trim();
  const browser = (env && has(env) ? env : defaultWebBrowser()) || first(["firefox", "google-chrome", "chromium", "brave-browser", "microsoft-edge"]);
  if (browser) {
    // Snap browsers need a copy outside dot-dirs; a normal browser takes the path as-is.
    const target = isSnapApp(browser) ? stageForBrowser(path) : path;
    if (spawnDetached(browser, [target])) return `${browser} → ${target}`;
  }

  // Last resort: the desktop's own handler for the file type.
  const staged = stageForBrowser(path);
  if (has("xdg-open") && spawnDetached("xdg-open", [staged])) return `xdg-open → ${staged}`;
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
