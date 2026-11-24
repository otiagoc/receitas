#!/bin/bash
# Instala e arranca o worker como LaunchAgent (arranca no login, reinicia se cair).
set -euo pipefail
LABEL=com.receitas.worker
WORKER_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
NODE_BIN="$(command -v node)"
CLAUDE_BIN="$(command -v claude)"
[ -x "$NODE_BIN" ] || { echo "node não encontrado no PATH"; exit 1; }
[ -x "$CLAUDE_BIN" ] || { echo "claude não encontrado no PATH"; exit 1; }
SVC_PATH="$(dirname "$NODE_BIN"):$(dirname "$CLAUDE_BIN"):/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
mkdir -p "$WORKER_DIR/logs" "$HOME/Library/LaunchAgents"
[ -d "$WORKER_DIR/node_modules" ] || (cd "$WORKER_DIR" && npm install --omit=dev)

cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$WORKER_DIR/src/index.js</string>
  </array>
  <key>WorkingDirectory</key><string>$WORKER_DIR</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>$SVC_PATH</string>
    <key>HOME</key><string>$HOME</string>
    <key>CLAUDE_BIN</key><string>$CLAUDE_BIN</string>
    <key>LANG</key><string>pt_PT.UTF-8</string>
    <key>LC_ALL</key><string>pt_PT.UTF-8</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>30</integer>
  <key>ProcessType</key><string>Background</string>
  <key>StandardOutPath</key><string>$WORKER_DIR/logs/worker.log</string>
  <key>StandardErrorPath</key><string>$WORKER_DIR/logs/worker.err.log</string>
</dict>
</plist>
PL

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl enable "gui/$(id -u)/$LABEL"
echo "Instalado: $PLIST"
echo "Logs: tail -f $WORKER_DIR/logs/worker.log"
