#!/usr/bin/env bash
# Remove the 奇門遁甲 · 八字 plugin, skills, agent and commands.
# Usage: bash uninstall.sh [--plugin-only | --claude] [--yes]
set -euo pipefail

DEST="${OPENCODE_CONFIG:-$HOME/.config/opencode}"
CLAUDE_DEST="${CLAUDE_CONFIG:-$HOME/.claude}"
STAMP="$(date +%Y%m%d%H%M%S)"

MODE=all
for arg in "$@"; do
  case "$arg" in
    --plugin-only) MODE=plugin ;;
    --claude)      MODE=claude ;;
    --yes|-y)      YES=1 ;;
    -h|--help)     echo "usage: bash uninstall.sh [--plugin-only | --claude] [--yes]"; exit 0 ;;
    *) echo "uninstall.sh: unknown option: $arg" >&2; exit 2 ;;
  esac
done

[ "$MODE" = claude ] && DEST="$CLAUDE_DEST"

case "$MODE" in
  plugin) WHAT="the qimen-bazi plugin (tools only — skills and commands stay)" ;;
  claude) WHAT="qimen-bazi (Claude Code: skills + commands + agent)" ;;
  *)      WHAT="qimen-bazi (plugin + skills + agent + commands)" ;;
esac

if [ "${YES:-0}" != 1 ]; then
  printf 'Remove %s from %s ? [y/N] ' "$WHAT" "$DEST"
  read -r ans
  [ "$ans" = "y" ] || [ "$ans" = "Y" ] || { echo "cancelled"; exit 0; }
fi

BACKUP="$DEST/.backups"
mkdir -p "$BACKUP"
mv_if() {
  if [ -e "$1" ]; then
    # Prefix with the parent dir: plugins/qimen-bazi and skills/qimen-bazi share a
    # basename, and a plain basename backup would silently overwrite the first one.
    local name
    name="$(basename "$(dirname "$1")")-$(basename "$1")"
    mv "$1" "$BACKUP/$name.removed.$STAMP"
    echo "  moved $name → .backups/$name.removed.$STAMP"
  fi
}

[ "$MODE" = claude ] || mv_if "$DEST/plugins/qimen-bazi"

if [ "$MODE" = all ] || [ "$MODE" = claude ]; then
  mv_if "$DEST/skills/qimen-bazi"
  mv_if "$DEST/skills/bazi"
  mv_if "$DEST/skills/qimen"
  mv_if "$DEST/skills/paipan"
  mv_if "$DEST/agents/qimen-master.md"
  for c in paipan qimen bazi; do mv_if "$DEST/commands/$c.md"; done
fi

echo ""
if [ "$MODE" = plugin ]; then
  echo "Done — plugin removed. The skills still work on their own (scripts/qimen), no restart needed."
  echo "Note: a running session keeps the tools until it is restarted."
elif [ "$MODE" = claude ]; then
  echo "Done. Restart the Claude Code session to unload the skills."
else
  echo "Done. Restart OpenCode:  opencode service restart"
fi
echo "Moved (not deleted) to $BACKUP — restore by copying back without the .removed suffix."
