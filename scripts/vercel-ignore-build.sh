#!/bin/bash
# Vercel Ignored Build Step
# Exit 0 = skip build (save costs), Exit 1 = proceed with build
#
# Strategy:
# 1. Only build on 'main' branch (skip all claude/* worktree branches)
# 2. On main, only build if app-relevant files changed

BRANCH="$VERCEL_GIT_COMMIT_REF"

# --- Rule 1: Only build on main ---
if [ "$BRANCH" != "main" ]; then
  echo ">> Skipping build: branch '$BRANCH' is not main"
  exit 0
fi

# --- Rule 2: On main, only build if app files changed ---
CHANGED=$(git diff --name-only HEAD^ HEAD -- \
  app/ \
  components/ \
  lib/ \
  data/ \
  store/ \
  public/ \
  hooks/ \
  types/ \
  utils/ \
  middleware.ts \
  next.config.js \
  tailwind.config.ts \
  tsconfig.json \
  package.json \
  package-lock.json \
  vercel.json \
  2>/dev/null)

if [ -z "$CHANGED" ]; then
  echo ">> Skipping build: no app-relevant files changed"
  echo ">> Only non-app files modified (scripts, docs, sql, scenarios, etc.)"
  exit 0
fi

echo ">> Building: app-relevant files changed on main:"
echo "$CHANGED"
exit 1
