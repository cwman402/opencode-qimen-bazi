# 奇門遁甲 · 八字 for OpenCode

Qi Men Dun Jia (時家奇門, 拆補法 · 轉盤) and BaZi (四柱八字) inside OpenCode.
Computes the chart, renders a proper 3×3 洛書 board in the terminal, and writes a
print-ready A4 sheet — **with the reading embedded next to the charts**.

Zero runtime dependencies: the calendar core is vendored, so it loads offline and never
pulls from npm at startup.

```
四柱   壬申  辛亥  戊子  庚申        陰遁九局 · 立冬中元 · 庚申時
日主   戊土（偏弱）                 值符 天輔@兌7 · 值使 杜門@兌7 · 空亡 子丑
```

---

## What you get

| Component | Name | What it does |
|---|---|---|
| Tool | `bazi_chart` | 四柱, 十神, 藏干, 納音, 十二長生, 空亡, 神煞, seasonally weighted 五行, 日主強弱 (得令/得地/得勢), 大運 + 流年 |
| Tool | `qimen_chart` | hour chart: 局/元/節氣, 旬首, 值符/值使, 九星/八門/八神, 空亡, 馬星, 伏吟/反吟/五不遇時, 門宮生克, 取用錨點 |
| Tool | `qimen_bazi_report` | both layers + A4 HTML/PDF/PNG; pass `notes` (markdown) to embed 師傅批註, `open: true` to show the PDF in your browser |
| Command | `/paipan` | 八字＋奇門 合參, with a 議題 × 八字 × 奇門 × 判 table (recommended) |
| Command | `/qimen` | one question, cast at a moment |
| Command | `/bazi` | natal structure, 大運 / 流年 |
| Agent | `qimen-master` | a session-long 術數 persona that always computes before it speaks |
| Skill | `qimen-bazi` | the reading protocol **+ the whole engine**: `scripts/qimen` computes every board with no plugin loaded |
| Skill | `bazi` | same workflow as `/bazi`; hidden from auto-selection — the command loads it by name |
| Skill | `qimen` | same workflow as `/qimen`; hidden from auto-selection |
| Skill | `paipan` | same workflow as `/paipan`; hidden from auto-selection |

The three skills are thin entry points: they pull the parameters out of your message, run the
engine, and load `qimen-bazi` for the reading protocol. All four carry
`metadata: opencode/autoinvoke: false`, so **a bare date in chat does not start a reading** — only
`/bazi`, `/qimen`, `/paipan` do, or an explicit 「用 bazi skill 排」. If someone pastes
`2023-01-01 23:00 男` with no command, the right reply is to point at `/bazi`, not to cast the
chart unasked.

---

## Install

**Requirements:** OpenCode ≥ 2.0. Nothing else is required for the terminal charts.

```bash
# 1. copy this folder to the machine, then:
bash install.sh              # plugin + skill + agent + commands (default)

# 2. restart OpenCode
opencode service restart
```

Pick a subset if you don't want all four:

```bash
bash install.sh --plugin-only   # only plugins/qimen-bazi — the three tools
bash install.sh --skill-only    # only skills/ — protocol + engine + the three entry points, no plugin
```

| Flag | Installs | Slash commands | Needs |
|---|---|---|---|
| (default) | plugin, skills, agent, commands | ✓ | — |
| `--plugin-only` | `plugins/qimen-bazi` | ✗ | — |
| `--skill-only` | `skills/{qimen-bazi,bazi,qimen,paipan}` | ✗ | bun, or node ≥ 22.6 |

`OPENCODE_CONFIG=/path bash install.sh …` targets a different config directory; `--help` prints
usage. The flags are mutually exclusive.

`install.sh` copies four things into `~/.config/opencode/` (override with `OPENCODE_CONFIG=/path`):

```
plugins/qimen-bazi/       the plugin (auto-loaded, optional)
skills/qimen-bazi/        the reading protocol + self-contained engine
skills/{bazi,qimen,paipan}/
                          entry-point skills (load qimen-bazi for the protocol)
agents/qimen-master.md    the master persona
commands/{paipan,qimen,bazi}.md
```

The skill bundles its own copy of the engine (`lib/`, `vendor/`, `scripts/`), so it works even if
the plugin is not installed or fails to load. `install.sh` refreshes that copy from `plugin/`
first — `plugin/` stays the single source of truth (`npm run check:skill` verifies it).

Anything already there is moved to `~/.config/opencode/.backups/` first — nothing is silently overwritten, and no stray copy is left where OpenCode would load it.

### Skills-only (no plugin)

The skill does not need the plugin. Use the installer:

```bash
bash install.sh --skill-only
```

or copy the folder yourself:

```bash
cp -R skill/qimen-bazi skill/bazi skill/qimen skill/paipan ~/.config/opencode/skills/
```

or point a config at the checkout and let OpenCode discover it:

```jsonc
// ~/.config/opencode/opencode.json
{ "skills": ["/path/to/opencode-qimen-bazi/skill"] }
```

In that mode the agent runs `scripts/qimen` through the shell instead of calling
`bazi_chart` / `qimen_chart` / `qimen_bazi_report`. Same engine, same boards, markdown output
instead of tool metadata. Requirements: `bun`, or `node` ≥ 22.6 (type stripping).

### If you publish it to npm

`package.json` is already set up (`exports` → `plugin/index.ts`). After `npm publish`, users can skip
`install.sh` and just add the package name to their config:

```jsonc
// ~/.config/opencode/opencode.json
{ "plugins": ["opencode-qimen-bazi"] }
```

The skill / agent / commands still need to be copied (or shipped as a second package), because
OpenCode only auto-discovers those from the config directory.

### Optional — PDF / PNG export

HTML is always written. PDF needs WeasyPrint, PNG needs PyMuPDF, and the PDF needs a CJK font:

```bash
pip install weasyprint pymupdf
# Debian/Ubuntu CJK font if missing:
sudo apt install fonts-wqy-zenhei
```

Point the plugin at a specific interpreter if yours isn't on `PATH`:

```bash
export QIMEN_WEASYPRINT=/path/to/weasyprint
export QIMEN_PYTHON=/path/to/python
```

Without these the tools still work — they just report that PDF/PNG were skipped.

---

## Verify

The maths has a dependency-free regression test (one fixed chart, nine palaces):

```bash
bun test/validate.ts        # → ALL PALACES MATCH
```

A 400-moment fuzz comparison against an independent implementation is also included:

```bash
bun add @spensercai/qimen-wasm
bun test/crossvalidate.ts   # → checked 400, mismatched 0
```

---

## Use it

Everything starts from a slash command — the skills are hidden from auto-selection:

```
/paipan 1992-11-08 16:45 香港 男 2019轉職 2021搬遷
```
```
/bazi 1995-08-08 21:40 香港 男
```
```
/qimen 這筆錢會不會回來？
```
```
用 bazi skill 排 1995-08-08 21:40 香港 女
```

Plain chat does **not** cast a chart. `2023-01-01 23:00 男` on its own is data, not a request —
the agent answers with the command to run (`/bazi 2023-01-01 23:00 男`) instead of reading it.

**Birth data it can use:** `datetime` (`YYYY-MM-DD HH:mm`, local wall clock), `tz` (IANA),
`longitude` + `trueSolar` for 真太陽時, `gender` (needed for 大運 direction), and `ziShiRule`
for the 23:00–23:59 子時 convention.

### Two-pass export (why the PDF has words, not just charts)

1. `qimen_bazi_report(..., export: false)` → read the chart
2. write the reading as markdown
3. `qimen_bazi_report(..., notes: "<that markdown>", export: true)` → final document

Step 3 can also pass `--open` to launch the finished PDF in your default browser
(`QIMEN_BROWSER=/path/to/browser` overrides the desktop's default web browser). Snap-packaged
browsers get a private `/tmp`, so an export written there is copied to `~/opencode-qimen/`
(`~/Documents/opencode-qimen/` if `Documents` exists) and the `OPEN …` line prints the path that
actually opened.

The document then contains:

```
p1  四柱 · 五行 · 奇門九宮格          (charts)
p2  解讀 · 盤面                      (auto-generated, deterministic — always present)
p3  師傅批註                         (your markdown: headings, tables, quotes)
p4  大運 · 流年
```

### Command line

Two entry points, one engine:

```bash
# from the skill (works on its own, no plugin)
./skill/qimen-bazi/scripts/qimen --name example --date "1992-11-08 16:45" --tz Asia/Hong_Kong \
                                 --gender male --notes-file reading.md --export --open

# from the plugin checkout
bun plugin/cli.ts --name example --date "1992-11-08 16:45" --tz Asia/Hong_Kong \
                  --gender male --notes-file reading.md --export --open
```

---

## Method

**八字** — `lunar-javascript` (寿星天文历) supplies the 24 solar terms to the second, so month
pillars follow the real 節 times and the year pillar switches at 立春. 五行 weights are seasonally
adjusted (旺相休囚死) and 日主 strength uses the classical 得令/得地/得勢 tests. Late-22:00–23:59
defaults to the traditional **子時 換日** (day pillar rolls to the next day); 年/月 pillars and the
節氣 always come from the real instant, so a late-night birth never shifts the solar term.

**奇門** — 時家 **拆補法 · 轉盤**. 三元 from the branch of the last 符頭 (甲/己 day); 地盤 三奇六儀
from the 局數 palace; 值符 = the star on the 旬首儀; 天盤 = a **rigid ring rotation** of the eight
outer stars (天禽 rides 天芮 — 禽寄芮); 值使 flies *n* palaces counted over nine palaces (landing on
5 parks at 坤2) and the remaining doors run clockwise from there; 八神 follow 陽遁順 / 陰遁逆.

**Validation** — geometry is cross-checked against the independent Rust implementation
[`qimen-rs`](https://github.com/SpenserCai/qimen-rs) (拆補法 轉盤): 400 random moments across
1950–2030 match on every palace — 局, 元, 陰陽遁, 天地盤干, 九星, 八門, 八神.

---

## Honest limits

- **Other schools exist.** 置閏法 and 飛盤 produce different boards. This plugin implements the
  mainstream 拆補法 轉盤 and says so in every export.
- **84 神 variants**: 白虎/玄武 are used in both 遁 (some schools use 勾陳/朱雀 under 陰遁).
- **真太陽時** is longitude + equation-of-time (±0.5 min), not a full ephemeris.
- **A birth time is required** for an hour chart. Near a 時辰 boundary, compute both and let the
  person's actual history decide — the plugin's own command flow does exactly that.
- Readings are **symbolic models**, not deterministic forecasts, and not investment, medical or
  legal advice. Two layers agreeing is not proof: they are two aspects of one system, not two
  independent measurements.

---

## Files

```
plugin/index.ts          registers the three tools
plugin/cli.ts            standalone CLI
plugin/lib/cal.ts        solar terms, 干支, time zones, 真太陽時
plugin/lib/bazi.ts       four pillars, 十神, 五行, 大運/流年
plugin/lib/qimen.ts      時家奇門 排盤 (拆補法 · 轉盤)
plugin/lib/text.ts       CJK-width-aware terminal tables
plugin/lib/html.ts       print-ready A4 sheet
plugin/lib/md.ts         minimal markdown → HTML (for the reading)
plugin/lib/narrative.ts  deterministic structural commentary
plugin/lib/export.ts     HTML → PDF (WeasyPrint) → PNG (PyMuPDF) → open in browser
plugin/lib/chart.ts      builds both layers from one moment
plugin/lib/report.ts     markdown assembly
plugin/vendor/lunar.cjs  lunar-javascript 1.7.7 (MIT)
skill/qimen-bazi/        SKILL.md + bundled engine (generated, see scripts/sync-skill.sh)
skill/{bazi,qimen,paipan}/  entry-point skills (thin wrappers over the same workflow)
agent/ commands/         OpenCode persona + slash commands
test/                    regression + cross-validation
scripts/sync-skill.sh    regenerate the skill's engine copy from plugin/
```

## Uninstall

```bash
bash uninstall.sh                 # plugin + skills + agent + commands
bash uninstall.sh --plugin-only   # just the tools; skills/commands keep working via scripts/qimen
```

Moves (does not delete) each installed piece into `~/.config/opencode/.backups/`. Undo by moving
it back without the `.removed.<stamp>` suffix. A live session keeps the `bazi_chart` /
`qimen_chart` / `qimen_bazi_report` tools until it restarts.

## License

MIT — see `LICENSE`. Bundles [lunar-javascript](https://github.com/6tail/lunar-javascript) by
6tail (MIT).
