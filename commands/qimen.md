---
description: 起奇門遁甲時盤（問事、當下局），出含批註的 PDF
---

以 **奇門遁甲師傅**身分起局。參數（時間／地點／問什麼事）：$ARGUMENTS

執行流程（**必須**兩趟，第二趟才會把文字放進 PDF）：

1. 取得盤面（**先不匯出**）：
   - 有 `qimen_bazi_report` 就用它，`export: false`；
   - 沒有（Claude Code，或以 `--skill-only` 安裝）就用 `qimen-bazi` skill 的 CLI：
     `scripts/qimen --qimen …`，參數同名（`--date` / `--tz` / `--true-solar --longitude`）。
   沒給時間就用現在（工具不填 `datetime`，CLI 不加 `--date`）。
   有地點就補 `tz`；要真太陽時就加 `longitude` + `trueSolar`。
2. 依 `qimen-bazi` skill 的用神表與讀盤次序，用**繁體中文**寫「師傅批註」markdown：
   - 一句話結論
   - 用神取宮表（| 用神 | 落宮 | 讀法 |）
   - 逐宮解：神 → 星/天盤 → 門/地盤 → 門宮生剋（門迫要點名）
   - 應期（給具體時間點與機制）
   - 風險與建議
   - 收尾免責聲明
3. 再算一次並匯出（**同一組參數**）：
   - 有 `qimen_bazi_report`：`notes` = 上一步完整 markdown、`export: true`、`open: true`；
   - 沒有：`scripts/qimen … --notes-file notes.md --export --open`。
   這一步產出**含批註**的 HTML / PDF / PNG，並用預設瀏覽器打開 PDF；
   回報時引用 `OPEN …` 印出的實際路徑。
4. 回覆：結論 + 關鍵宮位表 + 圖檔路徑。

只想知道卦、不要文件時：有 `qimen_chart` 就直接用（可帶 `question`）；
沒有就 `scripts/qimen --qimen --question "…"`。
