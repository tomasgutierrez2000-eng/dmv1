#!/usr/bin/env bash
# Start Cloud SQL Auth Proxy for local development.
# Instance: project-b30e6016-c02c-40ad-be9:us-central1:free-trial-first-project
# Port: 5433 (matches DATABASE_URL in .env)
set -euo pipefail

INSTANCE="project-b30e6016-c02c-40ad-be9:us-central1:free-trial-first-project"
PORT="${CLOUD_SQL_PORT:-5433}"

# Use legacy ADC if standard ADC not found
if [[ -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]]; then
  LEGACY_ADC=$(find ~/.config/gcloud/legacy_credentials -name "adc.json" 2>/dev/null | head -1)
  if [[ -n "$LEGACY_ADC" ]]; then
    export GOOGLE_APPLICATION_CREDENTIALS="$LEGACY_ADC"
  fi
fi

echo "Starting Cloud SQL Auth Proxy on port $PORT..."
echo "Instance: $INSTANCE"
echo ""

cloud-sql-proxy "$INSTANCE" --port="$PORT"
