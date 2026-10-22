#!/usr/bin/env bash
# Remove the 奇門遁甲 · 八字 plugin, skill, agent and commands from OpenCode.
# Usage: bash uninstall.sh [--yes]
set -euo pipefail

DEST="${OPENCODE_CONFIG:-$HOME/.config/opencode}"
STAMP="$(date +%Y%m%d%H%M%S)"

if [ "${1:-}" != "--yes" ]; then
  printf 'Remove qimen-bazi from %s ? [y/N] ' "$DEST"
  read -r ans
  [ "$ans" = "y" ] || [ "$ans" = "Y" ] || { echo "cancelled"; exit 0; }
fi

BACKUP="$DEST/.backups"
mkdir -p "$BACKUP"
mv_if() {
  if [ -e "$1" ]; then
    mv "$1" "$BACKUP/$(basename "$1").removed.$STAMP"
    echo "  moved $(basename "$1") → .backups/$(basename "$1").removed.$STAMP"
  fi
}

mv_if "$DEST/plugins/qimen-bazi"
mv_if "$DEST/skills/qimen-bazi"
mv_if "$DEST/agents/qimen-master.md"
for c in paipan qimen bazi; do mv_if "$DEST/commands/$c.md"; done

echo ""
echo "Done. Restart OpenCode:  opencode service restart"
echo "Moved (not deleted) to $BACKUP — restore by copying back without the .removed suffix."
