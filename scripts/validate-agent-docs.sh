#!/bin/bash
# Validate agent docs reference the correct AuditLogger API.
#
# Checks all agent markdown files in .claude/commands/ for stale audit logger
# method names (log_* prefix) that don't match the actual AuditLogger class API.
#
# Correct API (audit_logger.py):
#   AuditLogger(agent_name, session_id, agent_version, trigger_source)
#   .write_reasoning_step(step_num, thought, decision, confidence)
#   .write_action(action_type, detail)
#   .write_schema_change(change_type, object_schema, object_name, ...)
#   .write_finding(finding_ref, finding_type, severity, domain, ...)
#   .finalize_session(status, output_payload)
#
# Stale patterns (from S0-S7 before S9 fix):
#   log_agent_run(), log_reasoning_step(), log_action(),
#   log_schema_change(), log_session_complete(), log_finding()

set -euo pipefail

AGENT_DIR=".claude/commands"
STALE_PATTERNS=(
  "log_agent_run"
  "log_reasoning_step"
  "log_session_complete"
  "log_finding"
)
# Note: log_action and log_schema_change are ambiguous (could be prose references),
# so we only flag them inside ```python code blocks.

ERRORS=0

echo "Validating agent docs for stale audit logger references..."
echo ""

# Check for unambiguous stale patterns anywhere in agent docs
for pattern in "${STALE_PATTERNS[@]}"; do
  MATCHES=$(grep -rn "$pattern" "$AGENT_DIR" --include="*.md" 2>/dev/null || true)
  if [ -n "$MATCHES" ]; then
    echo "FAIL: Found stale audit logger method '$pattern':"
    echo "$MATCHES" | while read -r line; do echo "  $line"; done
    ERRORS=$((ERRORS + 1))
  fi
done

# Check for log_action/log_schema_change inside python code blocks
# (These are only wrong when used as function calls, not in prose)
for f in $(find "$AGENT_DIR" -name "*.md" -type f); do
  IN_PYTHON=false
  LINE_NUM=0
  while IFS= read -r line; do
    LINE_NUM=$((LINE_NUM + 1))
    if echo "$line" | grep -q '```python'; then
      IN_PYTHON=true
      continue
    fi
    if echo "$line" | grep -q '```' && [ "$IN_PYTHON" = true ]; then
      IN_PYTHON=false
      continue
    fi
    if [ "$IN_PYTHON" = true ]; then
      if echo "$line" | grep -qE '^log_action\(|^log_schema_change\('; then
        echo "FAIL: Stale audit logger call in code block: $f:$LINE_NUM"
        echo "  $line"
        ERRORS=$((ERRORS + 1))
      fi
    fi
  done < "$f"
done

echo ""
if [ "$ERRORS" -eq 0 ]; then
  echo "PASS: All agent docs use correct AuditLogger API (write_*/finalize_session)."
  exit 0
else
  echo "FAIL: $ERRORS stale audit logger reference(s) found."
  echo "  Fix: Replace log_*() calls with AuditLogger constructor + write_*()/finalize_session()"
  exit 1
fi
