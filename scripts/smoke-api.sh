#!/usr/bin/env bash
# Smoke test for key API endpoints. Run with dev server: npm run dev
# Usage: ./scripts/smoke-api.sh [base_url]
# Default base_url: http://localhost:3000

BASE="${1:-http://localhost:3000}"
FAIL=0

check() {
  local path="$1"
  local name="$2"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$path")
  if [ "$code" = "200" ]; then
    echo "OK $name ($path)"
  else
    echo "FAIL $name ($path) -> $code"
    FAIL=1
  fi
}

echo "Smoke testing $BASE"
check "/api/schema/bundle?summary=true" "schema bundle summary"
check "/api/metrics" "metrics list"
check "/api/data-dictionary" "data dictionary"

if [ $FAIL -eq 0 ]; then
  echo "All smoke tests passed"
else
  echo "Some smoke tests failed"
  exit 1
fi
