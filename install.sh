#!/usr/bin/env bash
# 奇門遁甲 · 八字 — installer for OpenCode
# Usage:  bash install.sh              install into ~/.config/opencode
#         OPENCODE_CONFIG=/path bash install.sh   install elsewhere
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${OPENCODE_CONFIG:-$HOME/.config/opencode}"
STAMP="$(date +%Y%m%d%H%M%S)"

say() { printf '%s\n' "$*"; }
ok()  { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn(){ printf '  \033[33m!\033[0m %s\n' "$*"; }

# Backups go to <config>/.backups/ — never beside the plugin, because OpenCode
# auto-loads every directory under plugins/ that has an index.ts.
BACKUP="$DEST/.backups"

put() {
  local src="$1" dst="$2"
  if [ -e "$dst" ]; then
    mkdir -p "$BACKUP"
    mv "$dst" "$BACKUP/$(basename "$dst").bak.$STAMP"
    warn "backed up → .backups/$(basename "$dst").bak.$STAMP"
  fi
  cp -R "$src" "$dst"
}

say ""
say "奇門遁甲 · 八字  →  $DEST"
say "─────────────────────────────────────────────"

mkdir -p "$DEST/plugins" "$DEST/skills" "$DEST/agents" "$DEST/commands"

put "$SRC/plugin"                 "$DEST/plugins/qimen-bazi"
ok "plugin    $DEST/plugins/qimen-bazi"

mkdir -p "$DEST/skills/qimen-bazi"
put "$SRC/skill/SKILL.md"         "$DEST/skills/qimen-bazi/SKILL.md"
ok "skill     $DEST/skills/qimen-bazi/SKILL.md"

put "$SRC/agent/qimen-master.md"  "$DEST/agents/qimen-master.md"
ok "agent     $DEST/agents/qimen-master.md"

for f in "$SRC"/commands/*.md; do
  put "$f" "$DEST/commands/$(basename "$f")"
  ok "command   /$(basename "$f" .md)"
done

say "─────────────────────────────────────────────"

# ---- environment report -----------------------------------------------------
if command -v bun >/dev/null 2>&1; then
  ok "bun $(bun --version)"
else
  warn "bun not found — OpenCode bundles its own runtime, so this is usually fine"
fi

PDF=0
for c in weasyprint; do command -v "$c" >/dev/null 2>&1 && PDF=1; done
for p in python3 python; do
  command -v "$p" >/dev/null 2>&1 && "$p" -c "import weasyprint" >/dev/null 2>&1 && PDF=1
done
if [ "$PDF" = 1 ]; then
  ok "PDF renderer found (weasyprint)"
else
  warn "no weasyprint — HTML still works, PDF/PNG will be skipped"
  say "     install with:  pip install weasyprint pymupdf"
fi

if fc-list :lang=zh 2>/dev/null | grep -qi .; then
  ok "CJK font present"
else
  warn "no CJK font found — PDF Chinese text may show boxes"
  say "     Debian/Ubuntu: sudo apt install fonts-wqy-zenhei"
fi

say ""
say "Next:"
say "  1. restart the OpenCode service   →  opencode service restart"
say "  2. in the TUI try                →  /paipan 1992-11-08 16:45 香港 男"
say "     or just ask: 「幫我排個八字，1995-08-08 21:40 香港，女」"
say ""
say "Verify the maths (no dependencies needed):"
say "  cd $SRC && bun test/validate.ts"
say ""
