---
name: 八字排盤
description: 子平八字 entry point behind the /bazi command — 四柱, 十神, 五行, 大運, 流年, 應期, and a 含批註 PDF. Hidden from auto-selection in OpenCode; load it only when the /bazi command runs or the user explicitly names the bazi skill, never on a bare birth date or a passing mention of 命盤/流年.
metadata:
  # OpenCode-only flag: keeps it out of the model's auto-invoke list. /bazi loads it by name.
  # Plain chat (a bare date, "排個盤") must NOT trigger it.
  opencode/autoinvoke: false
---

# 八字排盤 — entry point

**Trigger rule.** Only `/bazi` (or an explicit 「用 bazi skill 排」) starts this workflow. If a
message carries birth data but no command — e.g. `2023-01-01 23:00 男` — do not cast the chart:
reply with the exact command to run and wait.

This is the workflow behind the `/bazi` command. The user's message *is* the argument line:
pull 出生時間 / 出生地點 / 性別 out of it. If the time or the gender is missing, ask once and
briefly — 大運 順逆 depends on gender, and no chart may be guessed.

**Before writing anything, load the `qimen-bazi` skill** (skill tool, id `qimen-bazi`) unless it
is already in context. It carries the 八字 reading order (§1), the 十神/宮位 logic, the style
rules and the house rules. Never read a chart from this file alone.

## 1. Compute the chart

Prefer the tool when this session has it:

- `bazi_chart` — pass `datetime` (`YYYY-MM-DD HH:mm`), `tz`, `gender`, optional `name`.
- Birth place given → set `tz`; want 真太陽時 → add `longitude` + `trueSolar: true`.
- Time in 23:00–23:59 → state which 子時 rule was used (`next-day` default), and what changes
  under `same-day`.

No plugin (tool absent)? Use the skill's self-contained engine:

```bash
SKILL_DIR="${SKILL_DIR:-$HOME/.config/opencode/skills/qimen-bazi}"
"$SKILL_DIR/scripts/qimen" --bazi --date "1995-08-08 21:40" --tz Asia/Hong_Kong \
  --gender female --true-solar --longitude 114.17
```

Flags are the same by name: `--date --tz --longitude --true-solar --gender --name --zi-shi`.

## 2. Write 師傅批註 (繁體中文 markdown)

Follow the `qimen-bazi` §1 order — 日主 → 月令 → 十神 → 宮位 → 五行 → 神煞 → 大運 → 流年 →
應期. The document must contain:

- 一句話結論（格局 + 用忌）
- 命局結構：日主強弱、月令、十神分布、沖刑合、用神
- 大運表 + 現行這步的重點
- 流年應期：3–6 個具體年份，每個寫出機制（「2029 己酉 沖卯（配偶宮）」不是「2029 不順」）
- 風險與建議
- 收尾免責聲明：象徵性模型，非確定性預測，非投資／醫療建議

Save it to a scratch file (e.g. `/tmp/opencode/bazi-notes.md`). **Never put the ASCII 九宮格 or
box-drawing art inside the notes** — WeasyPrint cannot align it; markdown tables and prose only.

## 3. Export (second pass — this is what puts the prose in the PDF)

Call `qimen_bazi_report` with the **same** parameters plus `notes` (step 2), `export: true` and
`open: true`. It writes HTML / PDF / PNG, attaches the 奇門 board for cross-reference, and opens
the PDF in the default browser.

No plugin: `"$QIMEN" --notes-file notes.md --export --open` with the same arguments.

Quote the printed paths back to the user — and if the `OPEN …` line names a different file
(snap browsers cannot see `/tmp`), quote that one: it is the copy that actually opened.

## 4. Reply

一句話結論 → 流年表 → 圖檔路徑. Then close with the disclaimer.

## 合婚 (two charts)

Two separate `bazi_chart` runs, then compare in this order: 日支（配偶宮）六合/三合/沖/刑/害 →
日主生剋 → 各自配偶星（財/官）是否出現且有根 → 兩張大運的共時壓力年。Write the comparison as
the `notes` and export one combined sheet.
