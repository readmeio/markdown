#!/usr/bin/env bash
# PART 2.5 of the anand-review action: settle the prior bot threads this pass judged done —
# addressed in the code, or answered by a reply that holds. Deterministic — no LLM — and safe to
# re-run (resolveReviewThread on an already-resolved thread is a no-op).
#
# Authors routinely fix a finding, or rebut it, without touching the resolve button, and the bot
# never replies to its own threads. Without this step those threads stay open forever and bury the
# findings that do still matter.
#
# The review plan proposes targets; this script is the guardrail. Every `.resolve` entry is checked
# against the captured ledger BEFORE anything is mutated, and a target must be a thread THIS bot
# started that was still unresolved at capture time. post-review.sh has just verified that ledger
# `preserved` against live GitHub, so the snapshot is seconds old. A human's thread is never
# resolvable here, whatever the plan says.
#
# Usage:  ./resolve-threads.sh [--validate-only] <review.json> <verified-review-context.json>
#
# --validate-only runs the plan checks and exits without touching GitHub. The workflow runs it that
# way before post-review.sh, so a plan this script would reject rejects the run while it is still
# mutation-free — otherwise the comments land and the failure here withholds the handoff over
# thread hygiene. Same checks, same ledger, so a validated plan can only fail later on the
# mutations themselves.
#
# Env (mutating runs only — --validate-only makes no GitHub calls and needs neither):
#   GH_TOKEN      auth for gh — needs pull-requests write for the resolveReviewThread mutation
#   RETRY_SCRIPT  trusted retry.sh snapshot, sourced for the shared 3-attempt retry
#
# Output: human status on stderr; one machine-readable line on stdout:
#   RESULT_JSON: {"resolved":[{"thread_id":"...","verdict":"..."}],"failed":[...]}
#   RESULT_JSON: {"validated":<count>}  under --validate-only
set -uo pipefail
VALIDATE_ONLY=0
if [ "${1:-}" = "--validate-only" ]; then
  VALIDATE_ONLY=1
  shift
fi
JSON="${1:?review.json}"
CONTEXT="${2:?verified-review-context.json}"
err() { echo "$@" >&2; }
fail_json() { # usage: fail_json <error message> [resolved json array] [failed json array]
  echo "RESULT_JSON: $(jq -cn --arg err "$1" --argjson resolved "${2:-[]}" --argjson failed "${3:-[]}" \
    '{resolved: $resolved, failed: $failed, error: $err}')"
}

for input in "$JSON" "$CONTEXT"; do
  if [ ! -s "$input" ]; then
    err "ERROR: missing or empty input: $input — refusing to resolve anything"
    fail_json "missing input: $input"
    exit 1
  fi
done

# Validate the whole plan against the ledger before the first mutation, so a bad plan cannot leave
# half the threads settled.
if ! targets="$(jq -ce --slurpfile ctx "$CONTEXT" '
  (reduce ($ctx[0].threads[] | select(.started_by_bot == true and (.is_resolved | not))) as $thread
    ({}; .[$thread.id] = $thread)) as $open_bot_threads
  | (.resolve // null) as $resolve
  | ([$resolve[]? | select((.thread_id | type) == "string") | .thread_id
      | select($open_bot_threads[.] == null)]) as $ineligible
  | if ($resolve | type) != "array"
      then error("review plan needs a .resolve array (use [] to settle nothing)")
    elif any($resolve[]; (.thread_id | type) != "string" or (.thread_id | length) == 0)
      then error("every .resolve entry needs a non-empty thread_id")
    elif any($resolve[]; .verdict != "ADDRESSED" and .verdict != "AUTHOR_JUSTIFIED")
      then error("every .resolve entry needs verdict ADDRESSED or AUTHOR_JUSTIFIED")
    elif any($resolve[]; (.reason | type) != "string" or (.reason | length) == 0)
      then error("every .resolve entry needs a non-empty reason")
    elif ($resolve | map(.thread_id) | unique | length) != ($resolve | length)
      then error("duplicate thread_id in .resolve")
    elif ($ineligible | length) > 0
      then error("not an unresolved thread this bot started: " + ($ineligible | join(", ")))
    else [ $resolve[] | {thread_id, verdict, reason, path: $open_bot_threads[.thread_id].path} ]
    end
' "$JSON" 2>&1)"; then
  err "ERROR: $targets"
  fail_json "invalid resolve plan"
  exit 1
fi

ntargets="$(jq 'length' <<<"$targets")"
if [ "$VALIDATE_ONLY" -eq 1 ]; then
  err "resolve plan is valid: $ntargets thread(s) to settle after the review posts"
  echo "RESULT_JSON: $(jq -cn --argjson validated "$ntargets" '{validated: $validated}')"
  exit 0
fi

RETRY="${RETRY_SCRIPT:?RETRY_SCRIPT is required}"
# shellcheck disable=SC1090 # snapshotted path, resolved at run time
source "$RETRY"

if [ "$ntargets" -eq 0 ]; then
  err "no prior bot threads to settle"
  echo 'RESULT_JSON: {"resolved":[],"failed":[]}'
  exit 0
fi
err "settling $ntargets prior bot thread(s)"

response="$(mktemp)"
trap 'rm -f "$response"' EXIT
# GraphQL variables in the query string are intentionally left for GitHub to expand.
# shellcheck disable=SC2016
resolve_thread() {
  gh api graphql -f threadId="$1" -f query='
    mutation($threadId: ID!) {
      resolveReviewThread(input: {threadId: $threadId}) {
        thread { id isResolved }
      }
    }' > "$response"
}

resolved='[]'
failed='[]'
# gh reports a failed mutation on stderr, which retry passes straight through to the job log, so
# the per-thread record here only needs to name what did not happen.
while IFS=$'\t' read -r thread_id verdict path reason; do
  if retry resolve_thread "$thread_id" &&
    jq -e --arg id "$thread_id" \
      '.data.resolveReviewThread.thread | .id == $id and .isResolved == true' "$response" >/dev/null 2>&1; then
    err "resolved $path as $verdict — $reason ($thread_id)"
    # The reason is this action's only audit record: nothing is posted to the thread itself.
    resolved="$(jq -c --arg id "$thread_id" --arg verdict "$verdict" --arg path "$path" --arg reason "$reason" \
      '. + [{thread_id: $id, verdict: $verdict, path: $path, reason: $reason}]' <<<"$resolved")"
    continue
  fi
  err "ERROR: could not resolve $path ($thread_id) — the mutation did not report the thread resolved"
  failed="$(jq -c --arg id "$thread_id" --arg path "$path" \
    '. + [{thread_id: $id, path: $path, error: "mutation did not report the thread resolved"}]' <<<"$failed")"
done < <(jq -r '.[] | [.thread_id, .verdict, .path, .reason] | @tsv' <<<"$targets")

nfailed="$(jq 'length' <<<"$failed")"
if [ "$nfailed" -gt 0 ]; then
  err "ERROR: $nfailed of $ntargets thread(s) could not be resolved"
  fail_json "$nfailed of $ntargets thread(s) could not be resolved" "$resolved" "$failed"
  exit 1
fi

err "settled $ntargets thread(s)"
echo "RESULT_JSON: $(jq -cn --argjson resolved "$resolved" '{resolved: $resolved, failed: []}')"
