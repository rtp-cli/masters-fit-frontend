#!/usr/bin/env bash
#
# kill-metro.sh — stop the Metro bundler listening on ONE port, and nothing else.
#
#   ./scripts/kill-metro.sh 8081
#   ./scripts/kill-metro.sh 8082
#
# WHY THIS EXISTS
#   Sibling Claude/dev sessions often run a second Metro (8082) next to yours (8081).
#   `pkill -f "expo start"` kills every one of them, and `kill <pid>` can't be allowlisted
#   narrowly. This takes a port, finds the process LISTENING on it, and kills it only if
#   it is a Metro/Expo node process. Anything else on that port is reported and left alone.
#
#   Ports are limited to 8081-8089 (Metro's range here), so it can never reach the
#   backend (5000/5001) or Postgres. It is allowlisted in .claude/settings.json.
set -euo pipefail

die() { printf 'error: %s\n' "$1" >&2; exit 1; }

PORT="${1:-}"
[ $# -eq 1 ] || die "usage: kill-metro.sh <port>   (e.g. 8081)"
[[ "$PORT" =~ ^808[1-9]$ ]] || die "port must be 8081-8089 (Metro's range), got '$PORT'"

PIDS="$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | sort -u || true)"
if [ -z "$PIDS" ]; then
  echo "nothing listening on $PORT"
  exit 0
fi

# Check every listener before killing any, so a mixed result kills nothing.
for pid in $PIDS; do
  cmd="$(ps -o command= -p "$pid" 2>/dev/null || true)"
  if [[ "$cmd" != *node* ]] || [[ "$cmd" != *expo* && "$cmd" != *metro* && "$cmd" != *react-native* ]]; then
    die "pid $pid on port $PORT is not Metro, leaving it alone: ${cmd:-<gone>}"
  fi
done

for pid in $PIDS; do
  echo "stopping Metro on $PORT (pid $pid): $(ps -o command= -p "$pid" 2>/dev/null | cut -c1-100)"
  kill -TERM "$pid" 2>/dev/null || true
done

# Give it up to 5s to exit cleanly, then force only these same pids.
for _ in 1 2 3 4 5 6 7 8 9 10; do
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1 || { echo "port $PORT is free"; exit 0; }
  sleep 0.5
done

for pid in $PIDS; do kill -KILL "$pid" 2>/dev/null || true; done
sleep 0.5
if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  die "port $PORT is still in use after SIGKILL"
fi
echo "port $PORT is free (needed SIGKILL)"
