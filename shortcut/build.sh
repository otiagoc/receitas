#!/bin/bash
# Rebuild + sign "Guardar Receita.shortcut" (contains the token: never commit it).
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
CREDS="${CREDS:-$DIR/../.credentials.local}"
OUT="$DIR/Guardar Receita.shortcut"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
python3 "$DIR/gen_shortcut.py" "$CREDS" "$TMP/unsigned.shortcut"
plutil -lint "$TMP/unsigned.shortcut" >/dev/null
shortcuts sign --mode anyone --input "$TMP/unsigned.shortcut" --output "$OUT"
echo "Signed: $OUT"
if [ "${COPY_ICLOUD:-1}" = 1 ]; then
  ICD="$HOME/Library/Mobile Documents/com~apple~CloudDocs/Receitas"
  mkdir -p "$ICD" && cp "$OUT" "$ICD/" && echo "Copied to: $ICD"
fi
