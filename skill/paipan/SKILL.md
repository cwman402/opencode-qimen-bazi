---
name: 八字奇門合參
description: Combined 八字＋奇門 report behind the /paipan command — natal structure first, then the 奇門 layer, with a 議題 × 八字 × 奇門 × 判 table, 應期 by year and month, and a 含批註 PDF. Hidden from auto-selection; load it only when the /paipan command runs or the user explicitly names the paipan skill, never on a bare 命盤 request.
metadata:
  # Hidden from the model's auto-invoke list: /paipan loads it by name.
  # Plain chat must NOT trigger it.
  opencode/autoinvoke: false
---

# 八字奇門合參 — entry point

**Trigger rule.** Only `/paipan` (or an explicit 「用 paipan skill」) starts this workflow. Birth
data pasted without the command is not a request: reply with the command to run and wait.

This is the workflow behind the `/paipan` command: 合参 排盤, **先結構、後定位**. The user's
message *is* the argument line — 出生時間／地點／性別／已發生的重大事件. If the gender is
missing, ask once; 大運 順逆 depends on it.

**Before writing anything, load the `qimen-bazi` skill** (skill tool, id `qimen-bazi`) unless it
is already in context. It carries both reading orders (§1 八字, §2 奇門), the 用神 table, the
fusion rules (§3), the style rules and the house rules. Never read either layer from this file
alone.

## 1. Compute both layers

- `bazi_chart` — `datetime`, `tz`, `gender`, optional `name`; `longitude` + `trueSolar: true`
  for 真太陽時.
- `qimen_bazi_report` with `export: false` — same parameters; this yields the natal 奇門 board.
- 當下問事 → a **second** cast at the question time (`qimen_chart`, no `datetime` = now).
  Keep the two distinct: natal layer = structure, now-cast = this matter.

No plugin? `"$SKILL_DIR/scripts/qimen" --date … --gender …` prints both boards; `--bazi` or
`--qimen` narrows it.

## 2. 時柱查驗 (only when needed)

Time in 23:00–23:59, or within ±30 minutes of a 時辰 boundary → the 時柱 is genuinely ambiguous.
Use the **events the user actually lived through** (轉職、結婚、離婚、搬遷、破財的年份) to test
which 時柱 fits, and say out loud: which chart you chose, which year decided it, and why.
Do not slide past this silently.

## 3. Write 師傅批註 (繁體中文 markdown)

Must include this table:

| 議題 | 八字怎麼說 | 奇門怎麼說 | 合參 |
|---|---|---|---|
| 財 | 財星、比劫、用忌 | 生門、戊、門迫 | … |
| 事業 | 官殺、月令 | 開門、值符 | … |
| 婚戀 | 配偶宮、財官、沖合 | 六合、乙／庚 | … |
| 當下窗口 | 大運＋流年 | 日干宮、值使、空亡 | … |

Then: 一句話結論 → 八字結構 → 奇門定位 → 合參表 → 應期 → 風險 → 免責聲明.
Mark each 合參 row **一致** or **矛盾**.

**應期寫法**：八字定「哪一年」，奇門定「哪個月／哪個方位／該做什麼動作」。
例：「2029 己酉 沖卯（婚姻關口）；奇門 六合在離9，南方、夏月，宜在 2029 上半年把關係定下來。」

Save to `/tmp/opencode/paipan-notes.md`. **No ASCII 九宮格 in the notes.**

## 4. Export

Call `qimen_bazi_report` again with the **same** parameters + `notes` (step 3) + `export: true`
+ `open: true` → HTML / PDF / PNG 含批註, and the PDF opens in the default browser.
No plugin: `"$QIMEN" --notes-file notes.md --export --open`. If `OPEN …` names a staged copy
under `~/opencode-qimen/` (snap browsers cannot see `/tmp`), quote that path.

## 5. Reply

一句話結論 + 合參表 + 3–6 個具體年份 + 圖檔路徑.

## 紀律

- Two boards that disagree → **say they disagree**, and say which layer you trust and why
  (硬結構優先，奇門為象).
- Do not pretend the two are independent evidence; they are two cuts of one symbolic system.
- Only use 干支／局數／宮位 that the engine printed — never from memory.
- 收尾固定聲明：象徵性模型，非確定性預測，非投資／醫療建議.
