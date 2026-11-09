#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  export PATH="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
fi
if [ ! -d node_modules/next ]; then
  pnpm install --frozen-lockfile
fi
( for i in {1..25}; do
    if curl -fsS --max-time 1 http://127.0.0.1:3028/ >/dev/null; then open http://127.0.0.1:3028/; break; fi
    sleep 1
  done ) &
exec node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3028
