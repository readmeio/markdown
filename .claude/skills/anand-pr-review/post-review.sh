#!/usr/bin/env bash
# PART 2 of the anand-review action: take the review.json produced by PART 1 and submit it as a
# review on the PR. This step is deterministic — no LLM — so posting is reliable and re-runnable.
#
# Usage:  ./post-review.sh <owner/repo> <pr_number> <review.json> <verified-review-context.json>
#
# Env:
#   GH_TOKEN      auth for gh — the workflow sets the AI_DEPLOY App installation token, so the
#                 review is authored and submitted by the App bot
#   REVIEW_EVENT  COMMENT (default) | REQUEST_CHANGES | APPROVE — the workflow always uses COMMENT
#   ANALYZED_HEAD_SHA  immutable PR head SHA that Part 1 reviewed
#   ANALYZED_BASE_SHA  immutable PR base SHA captured with the reviewed diff
#   REVIEW_BASELINE_JSON  trusted, model-inaccessible copy of the captured review baseline
#   BOT_LOGIN      the App slug used to identify the workflow's existing review threads
#   FETCH_REVIEW_CONTEXT_SCRIPT  trusted fetch-review-context.sh snapshot
#   VERIFY_REVIEW_CONTEXT_SCRIPT trusted verify-review-context.sh snapshot
#   GITHUB_OUTPUT  when set, receives blocking_count after a successfully verified review post
#
# review.json shape — "severity" (BLOCKER | SHOULD-FIX) and "origin"
# (CURRENT_DIFF | PRIOR_MISS) are REQUIRED on every comment. The NIT tier is retired: the script
# accepts "NIT" from stale plans but suppresses every NIT-severity comment instead of posting it.
# It also identifies follow-up provenance and prepends severity before removing both internal fields.
# Omit "event" in the JSON; the submit mode comes from REVIEW_EVENT above, not the file.
# The "**SEVERITY:** " prefix is the human-visible severity marker on every posted thread; the
# handoff decision uses the blocking_count output below, not the rendered label.
#
# Inline-only policy: findings are posted as inline comments with NO summary body. "body" is used
# ONLY when "comments" is empty — a short note that the review found no issues. The deterministic
# payload adds an invisible marker to every formal review so reply-only GitHub review records cannot
# become incremental-review baselines.
#   { "body": "<no-issues note — used only when comments is empty>",
#     "comments": [ { "path": "src/x.ts", "line": 42, "side": "RIGHT", "severity": "BLOCKER",
#                     "origin": "CURRENT_DIFF", "body": "..." } ] }
#
# Output: human status on stderr; one machine-readable line on stdout:
#   RESULT_JSON: {"review_id":N,"review_html_url":"...","state":"COMMENTED|...","posted":[...],"dropped":[...]}
set -uo pipefail
FORMAL_REVIEW_MARKER='<!-- anand-review:code-review -->'
REPO="${1:?owner/repo}"; PR="${2:?pr number}"; JSON="${3:?review.json}"
CONTEXT="${4:?verified-review-context.json}"
EVENT="${REVIEW_EVENT:-COMMENT}"
ANALYZED_HEAD_SHA="${ANALYZED_HEAD_SHA:?ANALYZED_HEAD_SHA is required}"
ANALYZED_BASE_SHA="${ANALYZED_BASE_SHA:?ANALYZED_BASE_SHA is required}"
BASELINE="${REVIEW_BASELINE_JSON:?REVIEW_BASELINE_JSON is required}"
BOT="${BOT_LOGIN:?BOT_LOGIN (app slug) is required}"
FETCH_CONTEXT="${FETCH_REVIEW_CONTEXT_SCRIPT:?FETCH_REVIEW_CONTEXT_SCRIPT is required}"
VERIFY_CONTEXT="${VERIFY_REVIEW_CONTEXT_SCRIPT:?VERIFY_REVIEW_CONTEXT_SCRIPT is required}"
err() { echo "$@" >&2; }
fail_json() { # usage: fail_json <error message> [dropped json array] — every error exit emits this one shape
  echo "RESULT_JSON: $(jq -cn --arg err "$1" --argjson dropped "${2:-[]}" \
    '{review_id: null, review_html_url: null, state: null, posted: [], dropped: $dropped, error: $err}')"
}

if [ ! -s "$JSON" ]; then
  err "no review.json (or it is empty) at: $JSON — nothing to post"
  fail_json "missing review.json"
  exit 1
fi
if [ ! -s "$CONTEXT" ]; then
  err "no verified review context (or it is empty) at: $CONTEXT — refusing to post"
  fail_json "missing verified review context"
  exit 1
fi
if [ ! -s "$BASELINE" ]; then
  err "no trusted review baseline (or it is empty) at: $BASELINE — refusing to post"
  fail_json "missing review baseline"
  exit 1
fi
if ! review_state="$(jq -cen --slurpfile context "$CONTEXT" --slurpfile baseline_doc "$BASELINE" '
  $context[0] as $context_doc
  | $baseline_doc[0] as $baseline
  | ($context_doc.bot_reviews // []) as $reviews
  | (($reviews | last | .commit_sha) // null) as $latest_reviewed_head
  | if ($reviews | type) != "array" then error("bot_reviews must be an array")
    elif ($baseline | type) != "object" then error("review_baseline must be an object")
    elif ($baseline.mode != "INITIAL" and $baseline.mode != "INCREMENTAL" and $baseline.mode != "RESET")
      then error("invalid review baseline mode")
    elif (($baseline.previous_review_sha // null) != $latest_reviewed_head)
      then error("review baseline does not match review context")
    elif ($baseline.mode == "INITIAL" and ($reviews | length) != 0)
      then error("initial baseline has prior reviews")
    elif ($baseline.mode != "INITIAL" and ($reviews | length) == 0)
      then error("follow-up baseline has no prior review")
    elif ($baseline.delta_empty | type) != "boolean"
      then error("review baseline must record whether the delta is empty")
    else {
      mode: $baseline.mode,
      allow_prior_miss: ($baseline.mode == "INCREMENTAL"),
      label_provenance: ($baseline.mode == "INCREMENTAL"),
      prior_miss_only: ($baseline.mode == "INCREMENTAL" and $baseline.delta_empty)
    } end
' 2>/dev/null)"; then
  err "ERROR: $CONTEXT and $BASELINE do not describe one valid review baseline"
  fail_json "malformed review baseline"
  exit 1
fi
allow_prior_miss="$(jq -r '.allow_prior_miss' <<<"$review_state")"
label_provenance="$(jq -r '.label_provenance' <<<"$review_state")"
prior_miss_only="$(jq -r '.prior_miss_only' <<<"$review_state")"

# Shape preflight validates the complete plan before anything can mutate GitHub. A "responses"
# key is rejected like "event": thread replies were removed from this pipeline, so a plan that
# still carries them was written against a stale contract and silently ignoring the entries would
# post a review while dropping decisions it implies. The plan's "resolve" entries are NOT dropped —
# resolve-threads.sh applies them in the next step, against the same verified ledger.
if ! jq -e --argjson allow_prior_miss "$allow_prior_miss" --argjson prior_miss_only "$prior_miss_only" '
  type == "object" and (has("event") | not) and (has("responses") | not)
  and (.comments | type == "array")
  and ($allow_prior_miss or (.comments | all(.origin == "CURRENT_DIFF")))
  and (($prior_miss_only | not) or (.comments | all(.origin == "PRIOR_MISS")))
  and (.comments | all(type == "object"
        and (.path | type == "string" and length > 0)
        and (.line | type == "number" and . > 0 and floor == .)
        and (.body | type == "string" and length > 0)
        and (.origin == "CURRENT_DIFF" or .origin == "PRIOR_MISS")
        and ((.side // "RIGHT") == "LEFT" or (.side // "RIGHT") == "RIGHT")
        and (.start_line == null or (.start_line | type == "number" and . > 0 and floor == .))
        and (.start_side == null or .start_side == "LEFT" or .start_side == "RIGHT")))
  and (.body | type == "string")
  and (if (.comments | length) == 0 then (.body | length) > 0 else .body == "" end)
' "$JSON" >/dev/null 2>&1; then
  err "ERROR: $JSON is not a valid review plan — need an explicit .comments array with valid comment fields (including severity and origin), no .event, no .responses, and a body only for a zero-findings review"
  fail_json "malformed review.json"
  exit 1
fi

case "$EVENT" in
  COMMENT|REQUEST_CHANGES|APPROVE) ;;
  *) err "ERROR: REVIEW_EVENT must be one of COMMENT | REQUEST_CHANGES | APPROVE (got: $EVENT)"; exit 2 ;;
esac

# 0. Apply publication policy and prepare GitHub-safe comments in one pass before any mutation.
prep="$(jq -c --argjson label_provenance "$label_provenance" '
  def canon: (. // "") | tostring | ascii_upcase | gsub("[ _]"; "-") | if . == "SHOULDFIX" then "SHOULD-FIX" else . end;
  def valid: . == "BLOCKER" or . == "SHOULD-FIX" or . == "NIT";
  (.comments // []) as $comments
  | [ $comments[] | .severity = (.severity | canon) ] as $classified
  | [ $classified[] | select(.severity == "NIT") ] as $suppressed
  | [ $classified[]
      | select(.severity != "NIT")
      | .body |= sub("^[*]{0,2}(blocker|should-?fix|nit)([:][*]{0,2}|[*]{0,2}[:])\\s*"; ""; "i")
      | if $label_provenance then
          .body = (if .origin == "PRIOR_MISS" then "missed in the prior review: " else "current changes: " end) + .body
        else . end
      | .body = "**\(.severity):** " + .body
      | del(.origin) ] as $published
  | { bad: [ $classified[] | select(.severity | valid | not) | {path, line, severity} ],
    suppressed: [ $suppressed[]
      | {path, line, severity, origin, body,
         reason: "the NIT tier is retired — nit-severity findings are never posted"} ],
    doc: (.comments = $published
      | if ($comments | length) > 0 and (.comments | length) == 0
        then .body = "reviewed current changes — no substantive new issues found."
        else . end) }
' "$JSON")"
bad="$(jq -c '.bad' <<<"$prep")"
nbad="$(jq 'length' <<<"$bad")"
if [ "$nbad" -gt 0 ]; then
  err "ERROR: every comment needs \"severity\": BLOCKER | SHOULD-FIX (NIT is accepted but suppressed) — refusing to post. Offending comment(s):"
  err "$bad"
  fail_json "missing/invalid severity on $nbad comment(s)" "$bad"
  exit 1
fi
suppressed="$(jq -c '.suppressed' <<<"$prep")"
nsuppressed="$(jq 'length' <<<"$suppressed")"
[ "$nsuppressed" -gt 0 ] && err "suppressed $nsuppressed nit(s) — the NIT tier is retired"
norm="$(mktemp)"
jq '.doc' <<<"$prep" > "$norm"
JSON="$norm"

err "submitting review (event: $EVENT)"

# 1. Build the payload. Findings post as inline comments with only the invisible baseline marker in
#    the review body; a zero-findings run also includes its visible no-issues note.
files_json="$(mktemp)"; payload="$(mktemp)"
dropped="$suppressed"
ntotal="$(jq '(.comments // []) | length' "$JSON")"
nblocking=0
if [ "$ntotal" -eq 0 ]; then
  jq -n --slurpfile R "$JSON" --arg event "$EVENT" --arg commit "$ANALYZED_HEAD_SHA" \
    --arg marker "$FORMAL_REVIEW_MARKER" \
    '{ body: (($R[0].body // "") + "\n\n" + $marker), event: $event, commit_id: $commit }' > "$payload"
else
  # Validate comment lines against the diff hunks; drop any not on a changed line (else GitHub
  # 422s the ENTIRE review). Dropped comments are reported so they can be anchored manually.
  if ! gh api --paginate "repos/$REPO/pulls/$PR/files" --jq '[.[] | {filename, patch: (.patch // "")}]' > "$files_json"; then
    err "ERROR: could not fetch the PR file list for anchor validation"
    fail_json "failed to fetch PR files"
    exit 1
  fi

  # $F | add: gh api --paginate --jq emits ONE array per page — merge them so files on later
  # pages are validated instead of silently dropped.
  part="$(jq -n --slurpfile F "$files_json" --slurpfile R "$JSON" '
    (reduce (($F | add) // [])[] as $f ({}; . + { ($f.filename): {
        hasPatch: ($f.patch != ""),
        R: [ $f.patch | scan("@@ -[0-9]+(?:,[0-9]+)? \\+([0-9]+)(?:,([0-9]+))? @@")
               | {s:(.[0]|tonumber), l:(if .[1] then (.[1]|tonumber) else 1 end)} ],
        L: [ $f.patch | scan("@@ -([0-9]+)(?:,([0-9]+))? \\+[0-9]+(?:,[0-9]+)? @@")
               | {s:(.[0]|tonumber), l:(if .[1] then (.[1]|tonumber) else 1 end)} ]
      }})) as $rng
    | def hunkok($p; $side; $a; $b):
        ($rng[$p]) as $r
        | ($r != null) and $r.hasPatch
          and ( (if $side=="LEFT" then $r.L else $r.R end)
                | any(.s <= $a and $b <= (.s + .l - 1)) );
      # Multi-line anchors validate as ONE range: numeric start_line strictly before line, and a
      # same-side range must fit inside a single hunk (a cross-side range validates each endpoint
      # on its own side). Single-line comments are the degenerate range.
      def anchored:
        (.side // "RIGHT") as $side | (.start_side // $side) as $sside
        | if .start_line == null then hunkok(.path; $side; .line; .line)
          elif (.start_line | type) != "number" or .start_line >= .line then false
          elif $sside == $side then hunkok(.path; $side; .start_line; .line)
          else hunkok(.path; $sside; .start_line; .start_line) and hunkok(.path; $side; .line; .line)
          end;
      ($R[0].comments // []) as $C
      | { good: [ $C[] | select(anchored)
                  # GitHub 422s a multi-line comment without start_side, so default it to side.
                  | if .start_line != null then .start_side = ((.start_side // .side) // "RIGHT") else . end ],
          dropped: [ $C[] | select(anchored | not)
                            | {path, line, start_line: (.start_line // null), side: (.side // "RIGHT"), severity, body,
                               reason: "line/start_line is not a changed-diff-line range in one hunk (or file has no inline patch)"} ] }
  ')"

  anchor_dropped="$(jq -c '.dropped' <<<"$part")"
  dropped="$(jq -cn --argjson suppressed "$suppressed" --argjson anchors "$anchor_dropped" '$suppressed + $anchors')"
  ndrop="$(jq '.dropped | length' <<<"$part")"
  [ "$ndrop" -gt 0 ] && err "WARNING: dropping $ndrop comment(s) not anchored to a changed line (reported in RESULT_JSON.dropped)"

  ndropped_blocking="$(jq '[.dropped[] | select(.severity == "BLOCKER" or .severity == "SHOULD-FIX")] | length' <<<"$part")"
  if [ "$ndropped_blocking" -gt 0 ]; then
    err "ERROR: $ndropped_blocking blocking comment(s) failed anchor validation — refusing to publish an incomplete review"
    fail_json "$ndropped_blocking blocking comment(s) failed anchor validation" "$dropped"
    exit 1
  fi

  # Findings exist but nothing survived anchor validation: fail loudly. Posting nothing would hide
  # the findings, and posting a summary body would violate the inline-only policy.
  if [ "$(jq '.good | length' <<<"$part")" -eq 0 ]; then
    err "ERROR: all $ntotal inline comment(s) failed anchor validation — nothing posted"
    fail_json "all $ntotal comment(s) failed anchor validation" "$dropped"
    exit 1
  fi

  nblocking="$(jq '[.good[] | select(.severity == "BLOCKER" or .severity == "SHOULD-FIX")] | length' <<<"$part")"
  jq -n --argjson good "$(jq '[.good[] | del(.severity)]' <<<"$part")" --arg event "$EVENT" \
    --arg commit "$ANALYZED_HEAD_SHA" --arg marker "$FORMAL_REVIEW_MARKER" \
    '{ body: $marker, comments: $good, event: $event, commit_id: $commit }' > "$payload"
fi

# The analysis can take tens of minutes. Refuse to publish if a push already made it stale;
# commit_id ensures GitHub attaches any accepted review to exactly what was read.
if ! live_refs="$(gh api "repos/$REPO/pulls/$PR" --jq '[.head.sha, .base.sha] | @tsv' 2>&1)"; then
  err "ERROR: could not verify the live PR refs before posting: $live_refs"
  fail_json "failed to verify live PR refs" "$dropped"
  exit 1
fi
IFS=$'\t' read -r live_head_sha live_base_sha <<<"$live_refs"
if [ -z "$live_head_sha" ] || [ -z "$live_base_sha" ]; then
  err "ERROR: GitHub returned empty PR refs — refusing to post"
  fail_json "empty live PR refs" "$dropped"
  exit 1
fi
if [ "$live_head_sha" != "$ANALYZED_HEAD_SHA" ] || [ "$live_base_sha" != "$ANALYZED_BASE_SHA" ]; then
  err "ERROR: PR refs moved during review (analyzed $ANALYZED_BASE_SHA...$ANALYZED_HEAD_SHA, now $live_base_sha...$live_head_sha) — refusing to post"
  fail_json "PR refs moved during review" "$dropped"
  exit 1
fi

# A thread can change while anchors are being validated without moving either ref. Refresh the
# complete ledger immediately before the review mutation so fresh findings never land after a
# prior decision became stale.
pre_post_context="$(mktemp)"
if ! bash "$FETCH_CONTEXT" "$REPO" "$PR" "$pre_post_context" "$ANALYZED_HEAD_SHA" "$ANALYZED_BASE_SHA"; then
  err "ERROR: could not refresh the review-thread ledger before posting"
  fail_json "failed to refresh review context before posting" "$dropped"
  exit 1
fi
if ! BOT_LOGIN="$BOT" bash "$VERIFY_CONTEXT" unchanged "$CONTEXT" "$pre_post_context"; then
  err "ERROR: a prior bot review thread changed before the fresh review was posted"
  fail_json "review context changed before posting" "$dropped"
  exit 1
fi

post() { gh api "repos/$REPO/pulls/$PR/reviews" --input "$1" 2>&1; }
resp="$(post "$payload")"
rid="$(jq -r '.id // empty' <<<"$resp" 2>/dev/null)"

# Any post failure is a hard error — there is no body-only fallback, because a summary comment is
# not allowed when findings exist. Unposted comments are reported in RESULT_JSON.dropped.
if [ -z "$rid" ]; then
  err "review post failed:"; err "$resp"
  if [ "$ntotal" -gt 0 ]; then
    unposted="$(jq -c '.good | map({path, line, side: (.side // "RIGHT"), severity, body, reason: "review post failed"})' <<<"$part")"
    dropped="$(jq -cn --argjson unposted "$unposted" --argjson dropped "$dropped" '$unposted + $dropped')"
  fi
  fail_json "$resp" "$dropped"
  exit 1
fi

rurl="$(jq -r '.html_url' <<<"$resp")"
state="$(jq -r '.state // ""' <<<"$resp")"
err "created review $rid ($state) -> $rurl"

# A ref or prior thread can win the narrow race between the final preflight and POST. The review is
# safely anchored to the analyzed commit, but fail the step so the workflow cannot hand off stale
# state. Newly created bot threads from this review are allowed by the preserved-ledger check.
post_state_error=''
if ! live_refs_after_post="$(gh api "repos/$REPO/pulls/$PR" --jq '[.head.sha, .base.sha] | @tsv' 2>&1)"; then
  post_state_error="could not verify the live PR refs after posting: $live_refs_after_post"
else
  IFS=$'\t' read -r live_head_after_post live_base_after_post <<<"$live_refs_after_post"
  if [ -z "$live_head_after_post" ] || [ -z "$live_base_after_post" ]; then
    post_state_error='GitHub returned empty PR refs after posting'
  elif [ "$live_head_after_post" != "$ANALYZED_HEAD_SHA" ] || [ "$live_base_after_post" != "$ANALYZED_BASE_SHA" ]; then
    post_state_error="PR refs moved while the review was being posted (analyzed $ANALYZED_BASE_SHA...$ANALYZED_HEAD_SHA, now $live_base_after_post...$live_head_after_post)"
  fi
fi
post_post_context="$(mktemp)"
if [ -z "$post_state_error" ] && ! bash "$FETCH_CONTEXT" "$REPO" "$PR" "$post_post_context" "$ANALYZED_HEAD_SHA" "$ANALYZED_BASE_SHA"; then
  post_state_error="could not refresh the review-thread ledger after posting"
elif [ -z "$post_state_error" ] && ! BOT_LOGIN="$BOT" bash "$VERIFY_CONTEXT" preserved \
  "$pre_post_context" "$post_post_context" "$rid"; then
  post_state_error="a prior bot review thread changed or the fresh review was not visible after posting"
fi
if [ -n "$post_state_error" ]; then
  err "ERROR: $post_state_error — refusing to hand off this PR"
  echo "RESULT_JSON: $(jq -cn --argjson id "$rid" --arg url "$rurl" --arg state "$state" --arg err "$post_state_error" --argjson dropped "$dropped" \
    '{review_id: $id, review_html_url: $url, state: $state, posted: [], dropped: $dropped, error: $err}')"
  exit 1
fi

# 3. Fetch the posted comments to get each one's html_url. Best-effort: the review already exists,
#    so a failure here is surfaced on stderr instead of silently reporting posted:[] as truth.
posted="$(gh api --paginate "repos/$REPO/pulls/$PR/reviews/$rid/comments" \
  --jq '[.[] | {path, html_url, body}]' 2>/dev/null)" \
  || { err "WARNING: review $rid was created but fetching its comment URLs failed; posted list is incomplete"; posted='[]'; }
err "posted $(jq 'length' <<<"$posted") inline comment(s); review state: $state"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  printf 'blocking_count=%s\n' "$nblocking" >> "$GITHUB_OUTPUT" || {
    err "ERROR: review was posted but its handoff gate could not be recorded"
    exit 1
  }
fi

rm -f "$files_json" "$payload" "$norm" "$pre_post_context" "$post_post_context"
echo "RESULT_JSON: {\"review_id\":$rid,\"review_html_url\":$(jq -Rn --arg u "$rurl" '$u'),\"state\":$(jq -Rn --arg s "$state" '$s'),\"posted\":$posted,\"dropped\":$dropped}"
