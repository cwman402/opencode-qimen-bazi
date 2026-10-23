#!/usr/bin/env bash
# Regenerate skill/qimen-bazi/{lib,vendor,scripts} from plugin/ (single source of truth).
#
#   bash scripts/sync-skill.sh           rewrite the skill's engine copy
#   bash scripts/sync-skill.sh --check   fail if the copy is stale (no writes)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILL="$ROOT/skill/qimen-bazi"
CHECK=0
[ "${1:-}" = "--check" ] && CHECK=1

emit() { # emit <target-dir>
  local out="$1"
  mkdir -p "$out/lib" "$out/vendor" "$out/scripts"
  cp "$ROOT/plugin/lib/"*.ts "$out/lib/"
  cp "$ROOT/plugin/vendor/lunar.cjs" "$out/vendor/"
  # cli.ts sits beside lib/ in plugin/, below scripts/ in the skill
  sed 's#"\./lib/#"../lib/#g' "$ROOT/plugin/cli.ts" > "$out/scripts/chart.ts"
}

if [ "$CHECK" = 1 ]; then
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  emit "$TMP"
  rc=0
  for f in "$TMP"/lib/*.ts "$TMP"/vendor/lunar.cjs "$TMP"/scripts/chart.ts; do
    rel="${f#"$TMP"/}"
    if ! cmp -s "$f" "$SKILL/$rel"; then
      echo "stale: skill/qimen-bazi/$rel" >&2
      rc=1
    fi
  done
  [ "$rc" = 0 ] && echo "skill engine is in sync"
  exit "$rc"
fi

emit "$SKILL"
echo "synced plugin/ → skill/qimen-bazi/{lib,vendor,scripts}"
