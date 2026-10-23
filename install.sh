#!/usr/bin/env bash
# 奇門遁甲 · 八字 — installer for OpenCode
#
# Usage:  bash install.sh                 install plugin + skill + agent + commands
#         bash install.sh --plugin-only   only the three tools (plugins/qimen-bazi)
#         bash install.sh --skill-only    only the skill (SKILL.md + bundled engine)
#         OPENCODE_CONFIG=/path bash install.sh   install elsewhere
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${OPENCODE_CONFIG:-$HOME/.config/opencode}"
STAMP="$(date +%Y%m%d%H%M%S)"

say() { printf '%s\n' "$*"; }
ok()  { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn(){ printf '  \033[33m!\033[0m %s\n' "$*"; }
die() { printf 'install.sh: %s\n' "$*" >&2; exit 2; }

usage() {
  cat <<'EOF'
用法: bash install.sh [--plugin-only | --skill-only]

  (no flag)       plugin + skill + agent + commands   ← default
  --plugin-only   only plugins/qimen-bazi (the bazi_chart / qimen_chart /
                  qimen_bazi_report tools)
  --skill-only    only skills/ (reading protocol + self-contained engine;
                  runs scripts/qimen through the shell)

  OPENCODE_CONFIG=/path   install into a different config directory
EOF
}

MODE=all
for arg in "$@"; do
  case "$arg" in
    --plugin-only)
      [ "$MODE" = skill ] && die "--plugin-only and --skill-only are mutually exclusive"
      MODE=plugin ;;
    --skill-only)
      [ "$MODE" = plugin ] && die "--plugin-only and --skill-only are mutually exclusive"
      MODE=skill ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown option: $arg (try --help)" ;;
  esac
done

NEED_PLUGIN=0 NEED_SKILL=0 NEED_EXTRAS=0
case "$MODE" in
  all)    NEED_PLUGIN=1 NEED_SKILL=1 NEED_EXTRAS=1 ;;
  plugin) NEED_PLUGIN=1 ;;
  skill)  NEED_SKILL=1 ;;
esac

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
case "$MODE" in
  all)    say "奇門遁甲 · 八字  (plugin + skill)  →  $DEST" ;;
  plugin) say "奇門遁甲 · 八字  (plugin only)    →  $DEST" ;;
  skill)  say "奇門遁甲 · 八字  (skill only)     →  $DEST" ;;
esac
say "─────────────────────────────────────────────"

if [ "$NEED_PLUGIN" = 1 ]; then
  mkdir -p "$DEST/plugins"
  put "$SRC/plugin"               "$DEST/plugins/qimen-bazi"
  ok "plugin    $DEST/plugins/qimen-bazi"
fi

if [ "$NEED_SKILL" = 1 ]; then
  mkdir -p "$DEST/skills"
  # Refresh the skill's bundled engine from plugin/ before copying, so an installed
  # skill is self-contained and never drifts from the plugin's maths.
  if [ -f "$SRC/scripts/sync-skill.sh" ]; then
    bash "$SRC/scripts/sync-skill.sh" >/dev/null
  fi
  put "$SRC/skill/qimen-bazi"     "$DEST/skills/qimen-bazi"
  ok "skill     $DEST/skills/qimen-bazi/  (SKILL.md + scripts/qimen + engine)"

  # Entry-point skills: bazi / qimen / paipan. They are thin wrappers that load
  # qimen-bazi for the reading protocol, so they ship alongside it.
  for d in "$SRC"/skill/*/; do
    name="$(basename "$d")"
    [ "$name" = "qimen-bazi" ] && continue
    put "$d" "$DEST/skills/$name"
    ok "skill     $DEST/skills/$name/"
  done
fi

if [ "$NEED_EXTRAS" = 1 ]; then
  mkdir -p "$DEST/agents" "$DEST/commands"
  put "$SRC/agent/qimen-master.md" "$DEST/agents/qimen-master.md"
  ok "agent     $DEST/agents/qimen-master.md"

  for f in "$SRC"/commands/*.md; do
    put "$f" "$DEST/commands/$(basename "$f")"
    ok "command   /$(basename "$f" .md)"
  done
fi

say "─────────────────────────────────────────────"

# ---- environment report -----------------------------------------------------
if [ "$NEED_SKILL" = 1 ]; then
  if command -v bun >/dev/null 2>&1; then
    ok "bun $(bun --version)"
  elif command -v node >/dev/null 2>&1; then
    ok "node $(node --version) — skill uses node type-stripping"
  else
    warn "neither bun nor node found — the skill's CLI needs one of them"
    say "     bun: https://bun.sh   ·   node ≥ 22.6 also works"
  fi
fi

if [ "$NEED_PLUGIN" = 1 ] || [ "$NEED_SKILL" = 1 ]; then
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
fi

say ""
say "Next:"
case "$MODE" in
  all)
    say "  1. restart the OpenCode service   →  opencode service restart"
    say "  2. in the TUI try                →  /paipan 1992-11-08 16:45 香港 男"
    say "     also:  /bazi 1995-08-08 21:40 香港 女   ·   /qimen 這筆錢會不會回來？"
    say "     (the skills are hidden from auto-selection — only these commands start a reading)"
    ;;
  plugin)
    say "  1. restart the OpenCode service   →  opencode service restart"
    say "  2. the tools are callable in a new session: bazi_chart / qimen_chart / qimen_bazi_report"
    say "     (tools only — no reading protocol, no slash commands)"
    say "     add those with:  bash $SRC/install.sh"
    ;;
  skill)
    say "  skills hot-reload — no restart usually needed"
    say "  the skills are hidden from auto-selection, so name one explicitly:"
    say "     「用 bazi skill 排 1995-08-08 21:40 香港 女」"
    say "  or run it yourself:  $DEST/skills/qimen-bazi/scripts/qimen --help"
    say "  (skill only — no tools, no slash commands; run install.sh without a flag for /bazi)"
    ;;
esac
say ""
say "Verify the maths (no dependencies needed):"
say "  cd $SRC && bun test/validate.ts"
say ""
