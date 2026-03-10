#!/usr/bin/env bash
set -euo pipefail

# Deploy the Python calc engine to Google Cloud Run.
#
# Prerequisites:
#   1. gcloud CLI installed and authenticated: gcloud auth login
#   2. Project set: gcloud config set project YOUR_PROJECT_ID
#   3. Cloud Run API enabled: gcloud services enable run.googleapis.com
#   4. Artifact Registry API enabled: gcloud services enable artifactregistry.googleapis.com
#
# Usage:
#   ./scripts/deploy-calc-engine.sh                    # deploy with defaults
#   REGION=europe-west1 ./scripts/deploy-calc-engine.sh  # custom region

SERVICE_NAME="${SERVICE_NAME:-calc-engine}"
REGION="${REGION:-us-central1}"
MEMORY="${MEMORY:-512Mi}"
MIN_INSTANCES="${MIN_INSTANCES:-0}"
MAX_INSTANCES="${MAX_INSTANCES:-2}"

echo "=== Deploying $SERVICE_NAME to Cloud Run ($REGION) ==="

# gcloud doesn't support --dockerfile, so copy to Dockerfile temporarily
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cleanup() { rm -f "$SCRIPT_DIR/Dockerfile"; }
trap cleanup EXIT
cp "$SCRIPT_DIR/Dockerfile.calc-engine" "$SCRIPT_DIR/Dockerfile"

# Build and deploy in one step using Cloud Build
gcloud run deploy "$SERVICE_NAME" \
  --source "$SCRIPT_DIR" \
  --region "$REGION" \
  --memory "$MEMORY" \
  --min-instances "$MIN_INSTANCES" \
  --max-instances "$MAX_INSTANCES" \
  --concurrency 80 \
  --timeout 60 \
  --allow-unauthenticated \
  --set-env-vars "PYTHONPATH=/app" \
  --quiet

# Get the service URL
URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format="value(status.url)")

echo ""
echo "=== Deployed ==="
echo "URL: $URL"
echo ""
echo "Add to your .env:"
echo "  CALC_ENGINE_URL=$URL"
echo ""
echo "Test:"
echo "  curl $URL/health"
echo "  curl -X POST $URL/run -H 'Content-Type: application/json' -d '{\"metric_id\":\"DSCR\",\"dimension\":\"facility\"}'"
