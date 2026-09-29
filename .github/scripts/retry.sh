# shellcheck shell=bash
# Shared 3-attempt retry with linear backoff, sourced (never executed) by the auto-fix-build jobs
# and scripts.
# Fetched from the default branch into $RUNNER_TEMP by every job that needs it — never sourced
# from a checkout (see the AUTH note in auto-fix-build.yml).
retry() {
  local n
  for n in 1 2 3; do
    if "$@"; then return 0; fi
    echo "attempt $n/3 failed: $*" >&2
    if [ "$n" -lt 3 ]; then sleep $((n * 10)); fi
  done
  return 1
}
