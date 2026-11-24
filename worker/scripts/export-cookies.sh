#!/bin/bash
# Exporta os cookies do Instagram do Safari para worker/cookies.txt (usado pelo worker quando
# o Instagram bloqueia downloads anónimos). Corre no Terminal (precisa de acesso aos cookies do Safari;
# se falhar com "Operation not permitted", dá "Acesso total ao disco" ao Terminal).
set -euo pipefail
WORKER_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$WORKER_DIR/cookies.txt"
TMPD="$(mktemp -d)"; TMP="$TMPD/cookies.txt"
yt-dlp --cookies-from-browser safari --cookies "$TMP" --skip-download --no-warnings \
  "https://www.instagram.com/reel/Cu4vQzLt_3L/" >/dev/null 2>&1 || true
# keep only instagram cookies
{ echo "# Netscape HTTP Cookie File"; grep -E '^\S*\.?instagram\.com\s' "$TMP" || true; } > "$OUT"
rm -rf "$TMPD"
chmod 600 "$OUT"
N=$(grep -c instagram "$OUT" || true)
if grep -q sessionid "$OUT"; then echo "OK: $N cookies do Instagram exportados (com sessão) para $OUT"
else echo "Exportados $N cookies, mas sem 'sessionid' — inicia sessão no instagram.com no Safari e volta a correr."; fi
