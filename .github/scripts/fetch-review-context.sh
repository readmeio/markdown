#!/usr/bin/env bash
# Fetch a complete, thread-aware snapshot used by the automated review pass.
#
# Usage: fetch-review-context.sh <owner/repo> <pr_number> <output.json> [expected_head_sha] [expected_base_sha]
#
# Env:
#   GH_TOKEN   read-only GitHub token
#   BOT_LOGIN  GraphQL login for the review bot, without the REST "[bot]" suffix
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# The workflow snapshots retry.sh beside this script before the untrusted checkout.
# shellcheck disable=SC1091
source "$SCRIPT_DIR/retry.sh"

REPO="${1:?owner/repo}"
PR="${2:?pr number}"
OUTPUT="${3:?output path}"
EXPECTED_HEAD_SHA="${4:-}"
EXPECTED_BASE_SHA="${5:-}"
BOT="${BOT_LOGIN:?BOT_LOGIN (app slug) is required}"
OWNER="${REPO%%/*}"
NAME="${REPO##*/}"

tmp_dir="$(mktemp -d)"
output_tmp="$(mktemp "${OUTPUT}.tmp.XXXXXX")"
trap 'rm -rf "$tmp_dir"; rm -f "$output_tmp"' EXIT

thread_pages="$tmp_dir/thread-pages.json"
review_pages="$tmp_dir/review-pages.json"
bot_reviews="$tmp_dir/bot-reviews.json"
context="$tmp_dir/context.json"

# GraphQL variables are intentionally left for GitHub to expand.
# shellcheck disable=SC2016
fetch_thread_pages() {
  gh api graphql --paginate --slurp \
    -f owner="$OWNER" -f name="$NAME" -F number="$PR" \
    -f query='
    query($owner: String!, $name: String!, $number: Int!, $endCursor: String) {
      repository(owner: $owner, name: $name) {
        pullRequest(number: $number) {
          number
          url
          headRefOid
          baseRefOid
          reviewThreads(first: 100, after: $endCursor) {
            totalCount
            pageInfo { hasNextPage endCursor }
            nodes {
              id
              isResolved
              isOutdated
              path
              line
              originalLine
              diffSide
              comments(first: 100) {
                totalCount
                nodes {
                  id
                  databaseId
                  author { login __typename }
                  body
                  url
                  createdAt
                  updatedAt
                  commit { oid }
                  originalCommit { oid }
                  pullRequestReview { databaseId commit { oid } }
                }
              }
            }
          }
        }
      }
    }' > "$thread_pages"
}
if ! retry fetch_thread_pages; then
  echo "ERROR: could not fetch review context for $REPO#$PR" >&2
  exit 1
fi

# Review submissions are separate from review threads. Capture them as well so a later pass knows
# the exact head the bot last reviewed, including clean reviews that created no inline thread.
fetch_review_pages() {
  gh api --paginate --slurp "repos/$REPO/pulls/$PR/reviews?per_page=100" > "$review_pages"
}
if ! retry fetch_review_pages; then
  echo "ERROR: could not fetch review submissions for $REPO#$PR" >&2
  exit 1
fi

if ! jq -e --arg bot "$BOT" '
  def authored_by_bot($login): $login == $bot or $login == ($bot + "[bot]");
  if type != "array" or length == 0 then error("empty reviews response")
  elif any(.[]; type != "array") then error("invalid reviews page")
  else
    [ .[][]
      | select(authored_by_bot(.user.login // ""))
      | select((.submitted_at // "") != "" and (.commit_id // "") != "")
      | {
          database_id: .id,
          node_id: (.node_id // null),
          author_login: .user.login,
          body: (.body // ""),
          state: .state,
          submitted_at: .submitted_at,
          commit_sha: .commit_id,
          url: (.html_url // null)
        }
    ]
    | if (map(.database_id) | unique | length) != length
      then error("duplicate review submissions")
      else sort_by(.submitted_at, .database_id) end
  end
' "$review_pages" > "$bot_reviews"; then
  echo "ERROR: review submissions for $REPO#$PR were incomplete or inconsistent" >&2
  exit 1
fi

# Validate every pagination invariant before trusting the response. A concurrent thread mutation
# can otherwise leave a syntactically valid but incomplete ledger and recreate the inconsistency
# this helper exists to prevent.
if ! jq -e --arg bot "$BOT" --slurpfile bot_reviews "$bot_reviews" '
  def authored_by_bot($login): $login == $bot or $login == ($bot + "[bot]");
  if type != "array" or length == 0 then error("empty GraphQL response")
  elif any(.[]; ((.errors // []) | length) > 0) then error("GraphQL response contains errors")
  elif any(.[]; .data.repository.pullRequest == null) then error("pull request was not found")
  else
    [.[].data.repository.pullRequest] as $prs
    | $prs[0] as $pr
    | [$prs[].reviewThreads.nodes[]] as $threads
    | [ $threads[]
        | select(authored_by_bot(.comments.nodes[0].author.login // ""))
        | .comments.nodes[0].pullRequestReview.databaseId // empty
      ] as $root_review_ids
    | if ($prs | map(.number) | unique | length) != 1
      or ($prs | map(.url) | unique | length) != 1
      or ($prs | map(.headRefOid) | unique | length) != 1
      or ($prs | map(.baseRefOid) | unique | length) != 1
      then error("pull request metadata changed during pagination")
      elif ($prs | map(.reviewThreads.totalCount) | unique | length) != 1
      then error("review thread count changed during pagination")
      elif ($threads | length) != $pr.reviewThreads.totalCount
      then error("review thread pagination was incomplete")
      elif ($threads | map(.id) | unique | length) != ($threads | length)
      then error("review thread pagination returned duplicate ids")
      elif any($threads[];
        .comments.totalCount < 1
        or (.comments.nodes | length) != ([.comments.totalCount, 100] | min))
      then error("review thread has an incomplete initial comment page")
      else {
        schema_version: 2,
        bot_login: $bot,
        pull_request: {
          number: $pr.number,
          url: $pr.url,
          head_sha: $pr.headRefOid,
          base_sha: $pr.baseRefOid
        },
        # A standalone thread reply creates its own submitted GitHub review. Only a non-empty review
        # body or a bot-authored root inline comment proves this was a complete code-review pass.
        bot_reviews: [$bot_reviews[0][]
          | select((.body | length) > 0 or (.database_id as $id | $root_review_ids | index($id) != null))],
        threads: [$threads[]
          | {
              id,
              path,
              line,
              original_line: .originalLine,
              diff_side: .diffSide,
              is_resolved: .isResolved,
              is_outdated: .isOutdated,
              comment_total: .comments.totalCount,
              started_by_bot: authored_by_bot(.comments.nodes[0].author.login // ""),
              comments: .comments.nodes
            }]
      } end
  end
' "$thread_pages" > "$context"; then
  echo "ERROR: review context for $REPO#$PR was incomplete or inconsistent" >&2
  exit 1
fi

actual_head_sha="$(jq -r '.pull_request.head_sha // empty' "$context")"
actual_base_sha="$(jq -r '.pull_request.base_sha // empty' "$context")"
if [ -z "$actual_head_sha" ]; then
  echo "ERROR: review context did not contain the PR head SHA" >&2
  exit 1
fi
if [ -z "$actual_base_sha" ]; then
  echo "ERROR: review context did not contain the PR base SHA" >&2
  exit 1
fi
if [ -n "$EXPECTED_HEAD_SHA" ] && [ "$actual_head_sha" != "$EXPECTED_HEAD_SHA" ]; then
  echo "ERROR: PR head moved before review context was captured (expected $EXPECTED_HEAD_SHA, found $actual_head_sha)" >&2
  exit 1
fi
if [ -n "$EXPECTED_BASE_SHA" ] && [ "$actual_base_sha" != "$EXPECTED_BASE_SHA" ]; then
  echo "ERROR: PR base moved before review context was captured (expected $EXPECTED_BASE_SHA, found $actual_base_sha)" >&2
  exit 1
fi

# The common path gets every comment with the thread query. Only unusually long threads need a
# second paginated query; this keeps normal runs fast without silently truncating a discussion.
while IFS= read -r thread_id; do
  comment_pages="$tmp_dir/comments-$thread_id.json"
  full_comments="$tmp_dir/full-comments-$thread_id.json"
  next_context="$tmp_dir/context-next.json"

  # GraphQL variables are intentionally left for GitHub to expand.
  # shellcheck disable=SC2016
  fetch_comment_pages() {
    gh api graphql --paginate --slurp \
      -f id="$thread_id" \
      -f query='
      query($id: ID!, $endCursor: String) {
        node(id: $id) {
          ... on PullRequestReviewThread {
            id
            comments(first: 100, after: $endCursor) {
              totalCount
              pageInfo { hasNextPage endCursor }
              nodes {
                id
                databaseId
                author { login __typename }
                body
                url
                createdAt
                updatedAt
                commit { oid }
                originalCommit { oid }
                pullRequestReview { databaseId commit { oid } }
              }
            }
          }
        }
      }' > "$comment_pages"
  }
  if ! retry fetch_comment_pages; then
    echo "ERROR: could not fetch the full comment history for thread $thread_id" >&2
    exit 1
  fi

  if ! jq -e --arg id "$thread_id" '
    if type != "array" or length == 0 then error("empty GraphQL response")
    elif any(.[]; ((.errors // []) | length) > 0) then error("GraphQL response contains errors")
    elif any(.[]; .data.node == null or .data.node.id != $id) then error("review thread was not found")
    else
      [.[].data.node] as $nodes
      | [$nodes[].comments.nodes[]] as $comments
      | if ($nodes | map(.comments.totalCount) | unique | length) != 1
        then error("comment count changed during pagination")
        elif ($comments | length) != $nodes[0].comments.totalCount
        then error("comment pagination was incomplete")
        elif ($comments | map(.id) | unique | length) != ($comments | length)
        then error("comment pagination returned duplicate ids")
        else $comments end
    end
  ' "$comment_pages" > "$full_comments"; then
    echo "ERROR: comment history for thread $thread_id was incomplete or inconsistent" >&2
    exit 1
  fi

  jq --arg id "$thread_id" --slurpfile comments "$full_comments" '
    (.threads[] | select(.id == $id) | .comments) = $comments[0]
  ' "$context" > "$next_context"
  mv "$next_context" "$context"
done < <(jq -r '.threads[] | select((.comments | length) < .comment_total) | .id' "$context")

if ! jq -e '
  def comment:
    {
      node_id: .id,
      database_id: .databaseId,
      author_login: (.author.login // null),
      author_type: (.author.__typename // null),
      body,
      url,
      created_at: .createdAt,
      updated_at: .updatedAt,
      commit_sha: (.commit.oid // null),
      original_commit_sha: (.originalCommit.oid // null),
      review_database_id: (.pullRequestReview.databaseId // null),
      review_commit_sha: (.pullRequestReview.commit.oid // null)
    };
  if any(.threads[];
    (.comments | length) != .comment_total
    or (.comments | length) < 1
    or ((.comments | map(.id) | unique | length) != (.comments | length)))
  then error("final review context is incomplete")
  else .threads |= map(.comments |= map(comment) | del(.comment_total)) end
' "$context" > "$output_tmp"; then
  echo "ERROR: final review context for $REPO#$PR was incomplete or inconsistent" >&2
  exit 1
fi

# Recheck both sides after pagination so the snapshot describes one stable PR comparison.
live_refs_file="$tmp_dir/live-refs"
fetch_live_refs() {
  gh api "repos/$REPO/pulls/$PR" --jq '[.head.sha, .base.sha] | @tsv' > "$live_refs_file"
}
if ! retry fetch_live_refs; then
  echo "ERROR: could not verify the PR refs after fetching review context" >&2
  exit 1
fi
live_refs="$(<"$live_refs_file")"
IFS=$'\t' read -r live_head_sha live_base_sha <<<"$live_refs"
if [ -z "$live_head_sha" ] || [ "$live_head_sha" != "$actual_head_sha" ]; then
  echo "ERROR: PR head moved while review context was being captured (started $actual_head_sha, found ${live_head_sha:-empty})" >&2
  exit 1
fi
if [ -z "$live_base_sha" ] || [ "$live_base_sha" != "$actual_base_sha" ]; then
  echo "ERROR: PR base moved while review context was being captured (started $actual_base_sha, found ${live_base_sha:-empty})" >&2
  exit 1
fi

mv "$output_tmp" "$OUTPUT"
