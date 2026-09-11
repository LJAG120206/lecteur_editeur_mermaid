#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
PORT=47823

echo
echo " Éditeur Mermaid local"
echo " http://localhost:${PORT}"
echo " Ctrl+C pour arrêter le serveur"
echo

if command -v python3 >/dev/null 2>&1; then
  PYTHON=python3
elif command -v python >/dev/null 2>&1; then
  PYTHON=python
else
  echo "Python est introuvable. Installez Python 3 puis relancez start.sh"
  exit 1
fi

"$PYTHON" -m http.server "$PORT"
