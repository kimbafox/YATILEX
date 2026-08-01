#!/usr/bin/env bash
set -euo pipefail

# APP_TARGET controls which app to run from this monorepo.
# Values: backend | frontend
APP_TARGET="${APP_TARGET:-backend}"

if [ "$APP_TARGET" = "frontend" ]; then
  cd lex-bolivia-frontend
  npm install
  npm start
else
  cd lex-bolivia-backend
  npm install
  npm start
fi
