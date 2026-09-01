#!/usr/bin/env bash
# Stop-hook gate for the unattended CI review run (wired only in anand-review.yml, never in local
# dev settings). In headless mode end_turn exits the process immediately, so a session that stops
# while dimension-reviewer subagents are still running dies "successfully" with no review.json.
# Exit 2 blocks the stop and feeds stderr back to the model as the next instruction.
set -euo pipefail

MAX_FORCED_CONTINUATIONS=5

# Without a target path there is nothing to gate on; never wedge the session.
if [ -z "${REVIEW_JSON:-}" ]; then
  exit 0
fi

if [ -s "$REVIEW_JSON" ]; then
  exit 0
fi

# Bound forced continuations so a truly stuck session hits the workflow's loud non-empty guard
# instead of spinning the job budget.
counter_file="${REVIEW_JSON}.stop-gate-count"
count=0
if [ -f "$counter_file" ]; then
  count="$(cat "$counter_file")"
  # A corrupted counter must not crash the hook (a non-2 failure silently allows the stop).
  [[ "$count" =~ ^[0-9]+$ ]] || count=0
fi
if [ "$count" -ge "$MAX_FORCED_CONTINUATIONS" ]; then
  exit 0
fi
echo $((count + 1)) > "$counter_file"

echo "review.json is missing or empty at \$REVIEW_JSON. Do not end the turn: wait in the foreground until every outstanding dimension-reviewer subagent has reported, then write the comments to \$REVIEW_JSON exactly per the skill contract." >&2
exit 2
