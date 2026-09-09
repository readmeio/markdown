#!/usr/bin/env bash
# ASSIGN GATE of the anand-review action: hand the PR to $ASSIGNEE for the human pass.
# Deterministic — no LLM — and safe to re-run any number of times.
#
# Readiness is decided upstream by the FRESH review alone: the workflow runs this only when
# post-review.sh reported blocking_count == 0, i.e. this run posted no BLOCKER/SHOULD-FIX finding.
# Older unresolved bot threads do NOT withhold the handoff — the bot never resolves its own threads,
# so an author who answers a finding without resolving it would otherwise leave
# the PR unassigned forever, with nothing on the PR saying so. Anything still open is a judgment
# call, which is exactly what the human pass is for.
#
# This script's own check is narrower and still fail-closed: refuse to hand off if the PR head or
# base moved after the analyzed commit, so a stale run cannot assign a newer, unreviewed head.
#
# Usage:  ./check-and-assign.sh <owner/repo> <pr_number>
#
# Env:
#   GH_TOKEN   auth for gh — needs pull-requests read + write (assignees go through the issues
#              API but always target a PR here, which the pull-requests permission covers)
#   ASSIGNEE   user to assign (default: anandkumarpatel)
#   ANALYZED_HEAD_SHA  immutable head SHA reviewed before this handoff
#   ANALYZED_BASE_SHA  immutable base SHA used for the reviewed diff
#
# Output: human status on stderr; one machine-readable line on stdout:
#   RESULT_JSON: {"assigned":bool}  (plus "error" on every failure exit)
set -uo pipefail
REPO="${1:?owner/repo}"; PR="${2:?pr number}"
ASSIGNEE="${ASSIGNEE:-anandkumarpatel}"
ANALYZED_HEAD_SHA="${ANALYZED_HEAD_SHA:?ANALYZED_HEAD_SHA is required}"
ANALYZED_BASE_SHA="${ANALYZED_BASE_SHA:?ANALYZED_BASE_SHA is required}"
err() { echo "$@" >&2; }
fail_json() { # usage: fail_json <error message> — every error exit emits this one shape
  echo "RESULT_JSON: $(jq -cn --arg err "$1" '{assigned: false, error: $err}')"
}

# fd 3 is a copy of the script's real stderr for retry progress notes: callers below capture gh
# output with `2>&1` inside command substitutions, so anything the helper wrote to plain stderr
# mid-retry would corrupt the captured value of an eventually-successful call.
exec 3>&2

# Retry an idempotent gh call: up to 3 attempts with 2s/4s backoff. Emits ONLY the final
# attempt's stdout/stderr, so callers see exactly what a single call would have produced — on
# exhausted retries the last failure's stderr surfaces as before. A single transient GitHub
# empty-body response ("unexpected end of JSON input") killed the handoff in run 31710605832
# after the review had already posted. Safe here because every wrapped call is idempotent
# (the ref read, plus the add-assignee POST — re-adding a present assignee is a no-op); the
# review-creating mutations in post-review.sh stay unwrapped, where a lost response + retry
# could double-post.
gh_retry() {
  local attempt rc=0 out_file err_file
  out_file="$(mktemp)"; err_file="$(mktemp)"
  for attempt in 1 2 3; do
    rc=0
    "$@" >"$out_file" 2>"$err_file" || rc=$?
    if [ "$rc" -eq 0 ]; then break; fi
    if [ "$attempt" -lt 3 ]; then
      echo "gh call failed (attempt $attempt/3, exit $rc): ${*:1:4} … — retrying in $((2 ** attempt))s" >&3
      cat "$err_file" >&3
      sleep $((2 ** attempt))
    fi
  done
  cat "$out_file"
  cat "$err_file" >&2
  rm -f "$out_file" "$err_file"
  return "$rc"
}

# Check immediately before the assignment mutation so a push during the review cannot hand off code
# no one reviewed.
if ! live_refs="$(gh_retry gh api "repos/$REPO/pulls/$PR" --jq '[.head.sha, .base.sha] | @tsv' 2>&1)"; then
  err "ERROR: could not verify the live PR refs before assigning: $live_refs"
  fail_json "failed to verify live PR refs"
  exit 1
fi
IFS=$'\t' read -r live_head_sha live_base_sha <<<"$live_refs"
if [ -z "$live_head_sha" ] || [ -z "$live_base_sha" ] ||
  [ "$live_head_sha" != "$ANALYZED_HEAD_SHA" ] || [ "$live_base_sha" != "$ANALYZED_BASE_SHA" ]; then
  err "not ready: PR refs moved after analysis (analyzed $ANALYZED_BASE_SHA...$ANALYZED_HEAD_SHA, now ${live_base_sha:-empty}...${live_head_sha:-empty}) — not assigning $ASSIGNEE"
  fail_json "PR refs moved after analysis"
  exit 1
fi

err "ready: the fresh review posted no blocking findings — assigning $ASSIGNEE"
resp="$(gh_retry gh api -X POST "repos/$REPO/issues/$PR/assignees" -f "assignees[]=$ASSIGNEE" 2>&1)" || {
  err "ERROR: assign API call failed: $resp"
  fail_json "assign API call failed"
  exit 1
}

# GitHub silently ignores assignees without repo access (still returns 201), so verify.
if ! jq -e --arg a "$ASSIGNEE" '.assignees // [] | any(.login == $a)' <<<"$resp" >/dev/null 2>&1; then
  err "ERROR: API accepted the call but $ASSIGNEE is not on the PR — is $ASSIGNEE a collaborator?"
  fail_json "assignee not applied"
  exit 1
fi

err "assigned $ASSIGNEE"
echo 'RESULT_JSON: {"assigned":true}'
