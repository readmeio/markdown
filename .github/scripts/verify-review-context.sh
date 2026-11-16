#!/usr/bin/env bash
# Verify that a normalized review-thread ledger stayed unchanged during analysis, or that a posted
# review became visible without disturbing the prior bot threads.
#
# Usage:
#   verify-review-context.sh unchanged <before.json> <after.json>
#   verify-review-context.sh preserved <before.json> <after.json> <posted_review_id>
set -euo pipefail

MODE="${1:?unchanged|preserved}"
BEFORE="${2:?before context}"
AFTER="${3:?after context}"

for input in "$BEFORE" "$AFTER"; do
  if [ ! -s "$input" ]; then
    echo "ERROR: missing or empty review context: $input" >&2
    exit 1
  fi
done

case "$MODE" in
  unchanged)
    if ! jq -en --slurpfile before "$BEFORE" --slurpfile after "$AFTER" '
      def decision_state: {
        head_sha: .pull_request.head_sha,
        base_sha: .pull_request.base_sha,
        bot_reviews: ((.bot_reviews // []) | sort_by(.database_id)),
        bot_threads: ([.threads[] | select(.started_by_bot == true)] | sort_by(.id))
      };
      ($before[0] | decision_state) == ($after[0] | decision_state)
    ' >/dev/null; then
      echo "ERROR: PR refs or bot review threads changed during analysis" >&2
      exit 1
    fi
    ;;
  preserved)
    POSTED_REVIEW_ID="${4:?posted review ID}"
    if ! jq -en --arg posted_review_id "$POSTED_REVIEW_ID" \
      --slurpfile before "$BEFORE" --slurpfile after "$AFTER" '
      def refs: {head_sha: .pull_request.head_sha, base_sha: .pull_request.base_sha};

      $before[0] as $before_doc
      | $after[0] as $after_doc
      | (reduce ($after_doc.threads[] | select(.started_by_bot == true)) as $thread
          ({}; .[$thread.id] = $thread)) as $after_by_id
      | (reduce (($after_doc.bot_reviews // [])[]) as $review
          ({}; .[($review.database_id | tostring)] = $review)) as $after_reviews_by_id
      | (($before_doc | refs) == ($after_doc | refs))
        and ($after_reviews_by_id[$posted_review_id] != null)
        and all(($before_doc.bot_reviews // [])[];
          $after_reviews_by_id[(.database_id | tostring)] == .)
        and all($before_doc.threads[] | select(.started_by_bot == true);
          $after_by_id[.id] == .)
    ' >/dev/null; then
      echo "ERROR: PR refs, review visibility, or an existing bot review thread changed while the review was posted" >&2
      exit 1
    fi
    ;;
  *)
    echo "ERROR: mode must be 'unchanged' or 'preserved' (got: $MODE)" >&2
    exit 2
    ;;
esac
