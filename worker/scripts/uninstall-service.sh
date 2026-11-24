#!/bin/bash
# Pára e remove o LaunchAgent do worker.
set -uo pipefail
LABEL=com.receitas.worker
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null && echo "Serviço parado." || echo "Serviço não estava carregado."
rm -f "$PLIST" && echo "Removido: $PLIST"
