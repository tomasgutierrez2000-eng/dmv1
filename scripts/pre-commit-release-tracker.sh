#!/usr/bin/env bash
# Pre-commit hook: auto-detect data model changes, validate architecture, and update the release tracker.
#
# Install:  npm run hooks:install
# Skip:     git commit --no-verify  (when you intentionally skip)

# Only run if definition files are staged
STAGED=$(git diff --cached --name-only)
DEFS_CHANGED=false

for f in $STAGED; do
  case "$f" in
    scripts/l1/l1-definitions.ts|scripts/l2/l2-definitions.ts|sql/l3/01_DDL_all_tables.sql|data-dictionary.json|sql/gsib-export/*.sql|sql/l3/*.sql|data/*.ts)
      DEFS_CHANGED=true
      ;;
  esac
done

if [ "$DEFS_CHANGED" = false ]; then
  exit 0
fi

# Run architecture compliance checks (Group 9) — prevents recurrence of GSIB audit findings
echo "[validate] Running architecture compliance checks (Group 9)..."
npx tsx scripts/validate-data-model.ts --group=9 2>&1
VALIDATE_EXIT=$?
if [ $VALIDATE_EXIT -ne 0 ]; then
  echo ""
  echo "[validate] Architecture compliance checks FAILED."
  echo "Fix the issues above, then re-commit."
  exit 1
fi
echo "[validate] Architecture compliance checks passed."

echo "[release-tracker] Data model definitions changed — syncing release tracker..."

npx tsx scripts/release-tracker-sync.ts 2>&1

# Check if the sync modified files that aren't staged
TRACKER_MODIFIED=$(git diff --name-only data/release-entries.json scripts/release-tracker-snapshot.json 2>/dev/null)

if [ -n "$TRACKER_MODIFIED" ]; then
  echo ""
  echo "[release-tracker] The following files were updated:"
  echo "$TRACKER_MODIFIED"
  echo ""
  echo "Review the changes, then stage and re-commit:"
  echo "  git add data/release-entries.json scripts/release-tracker-snapshot.json"
  echo "  git commit"
  exit 1
fi
