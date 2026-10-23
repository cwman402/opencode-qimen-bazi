---
name: 奇門起局
description: 奇門遁甲 entry point behind the /qimen command — cast a 時家奇門 時盤 for a moment or a question, give the 用神 reading and 應期, export a 含批註 PDF. Hidden from auto-selection; load it only when the /qimen command runs or the user explicitly names the qimen skill, never on a passing mention of 起局/卜卦/看盤.
metadata:
  # Hidden from the model's auto-invoke list: /qimen loads it by name.
  # Plain chat must NOT trigger it.
  opencode/autoinvoke: false
---

# 奇門起局 — entry point

**Trigger rule.** Only `/qimen` (or an explicit 「用 qimen skill 起局」) starts this workflow. A
question in plain chat — 「這筆錢會不會回來？」 — is not a request to cast: reply with the command
to run instead.

This is the workflow behind the `/qimen` command. The user's message *is* the argument line:
時間 / 地點 / 問什麼事. **No time means now** — do not ask for a timestamp unless the user is
asking about a past or future moment. If it is unclear *what* is being asked, ask that one
thing; a 盤 without a 問題 has no 用神.

**Before writing anything, load the `qimen-bazi` skill** (skill tool, id `qimen-bazi`) unless it
is already in context. It carries the 用神 table (§2), the palace judging order, 應期 methods,
the style rules and the house rules. Never read a board from this file alone.

## 1. Cast

- Board only, no document → `qimen_chart`, with `question` (what is being asked) if given.
  Omit `datetime` for "now". Add `tz` when a place is named; `longitude` + `trueSolar: true`
  for 真太陽時.
- No plugin? `"$SKILL_DIR/scripts/qimen" --qimen --question "這筆錢會不會回來？"`

The engine implements **拆補法 · 轉盤** only — say so if the user expects 置閏法 or 飛盤.

## 2. Write 師傅批註 (繁體中文 markdown)

Quote the board's own anchors before interpreting: 局（陰陽遁＋局數＋元＋節氣）、旬首、值符、
值使、空亡、馬星、伏吟／反吟／五不遇時.

Then, in this order:

- 一句話結論
- 用神取宮表 — `| 用神 | 落宮 | 讀法 |`
- 逐宮解：神 → 星／天盤干 → 門／地盤干 → 門宮生剋（門迫要點名）
- 應期 — say which method you used (用神宮方位／宮數對節氣，或值使門落宮)
- 風險與建議
- 收尾免責聲明：象徵性模型，非確定性預測，非投資／醫療建議

Save to a scratch file (e.g. `/tmp/opencode/qimen-notes.md`). **No ASCII 九宮格 in the notes** —
the export already renders a proper 3×3 board; notes carry tables and prose only.

## 3. Export (second pass — required for a PDF with prose)

Call `qimen_bazi_report` with the **same** parameters — time, `tz`, `longitude`, `trueSolar`,
`question` — plus `notes` (step 2), `export: true` and `open: true` (opens the PDF in the default
browser). Do not re-derive the time; pass the exact same moment so the board in the PDF matches
the board you read.

No plugin: `"$QIMEN" --notes-file notes.md --export --open` with the same arguments. If the
`OPEN …` line points at a staged copy under `~/opencode-qimen/`, quote that path, not the `/tmp` one.

## 4. Reply

結論 + 關鍵宮位表 + 圖檔路徑. Then the disclaimer.

## Notes

- 出生盤的奇門 layer is cast for the birth moment; a 占卜卦 is cast for *now* — keep the two
  apart when the user conflates them.
- When the same question is asked twice, say plainly that a second cast is a second 象, not a
  confirmation.
