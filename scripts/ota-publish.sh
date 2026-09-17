#!/usr/bin/env bash
#
# ota-publish.sh — publish a production OTA (or just report what's live), always
# printing the short update-id tag that the app shows in Settings → Account.
#
#   ./scripts/ota-publish.sh --check
#   ./scripts/ota-publish.sh -m "Replace exercise: closest matches first"
#   ./scripts/ota-publish.sh -m "…" --ref <sha|branch>   # default: origin/main
#   ./scripts/ota-publish.sh -m "…" --dry-run            # everything except the publish
#
# WHY THIS EXISTS
#   1. Three different UUIDs are in play and only one appears on a phone:
#        update id  01a07d45-6d6e-7bb6-…  -> Settings shows "update 01a07d45"   <-- this one
#        group id   bc28ef51-112f-49c3-…  -> what `eas update:list` prints, NEVER in Settings
#        project id baddaaa3-3d1e-46e5-…
#      Comparing a group id to the phone's line can never match, which reads as a failed
#      rollout. This script always resolves and prints the per-platform tag.
#   2. `eas update` bundles the WORKING TREE. Sibling Claude/dev sessions share this checkout,
#      so a dirty tree (or a local main behind origin) silently ships the wrong code. This
#      publishes from a throwaway worktree pinned to an explicit commit instead of touching
#      whatever state the shared tree happens to be in.
#
# It deliberately does NOT decide whether the change is OTA-eligible (JS-only) or review what
# else rides along in the bundle — that is judgment, and it lives in the deploy-ota skill.
set -euo pipefail

EAS_BRANCH="production"
MODE="publish"
MESSAGE=""
REF="origin/main"
DRY=0

die() { printf 'error: %s\n' "$1" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --check)          MODE="check" ;;
    -m|--message)     MESSAGE="${2:-}"; shift ;;
    --ref)            REF="${2:-}"; shift ;;
    --branch)         EAS_BRANCH="${2:-}"; shift ;;
    --dry-run)        DRY=1 ;;
    -h|--help)        sed -n '3,18p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *)                die "unknown argument: $1 (try --help)" ;;
  esac
  shift
done

cd "$(git rev-parse --show-toplevel)" || die "not inside a git repo"
command -v python3 >/dev/null || die "python3 is required"

TMPJSON="$(mktemp -t ota-publish)"
WORKTREE=""
cleanup() {
  rm -f "$TMPJSON"
  if [ -n "$WORKTREE" ] && [ -d "$WORKTREE" ]; then
    rm -f "$WORKTREE/node_modules"
    git worktree remove "$WORKTREE" --force >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

# Newest update group on the branch (a GROUP id — not what the phone shows).
latest_group() {
  CI=1 npx eas update:list --branch "$EAS_BRANCH" --limit 1 --json --non-interactive \
    2>/dev/null >"$TMPJSON" || die "could not list updates (is 'eas whoami' logged in?)"
  python3 - "$TMPJSON" <<'PY'
import json, sys
page = json.load(open(sys.argv[1])).get("currentPage") or []
if not page:
    sys.exit("no updates published on this branch yet")
print(page[0]["group"])
PY
}

# Resolve a group id to the per-platform update ids and the 8-char Settings tag.
# `update:view` rejects --non-interactive, unlike update:list.
report_tag() {
  local group="$1"
  CI=1 npx eas update:view "$group" --json 2>/dev/null >"$TMPJSON" \
    || die "could not read update group $group"
  python3 - "$TMPJSON" "$group" <<'PY'
import json, sys, datetime

def walk(o):
    if isinstance(o, dict):
        if "id" in o and "platform" in o:
            yield o
        for v in o.values():
            yield from walk(v)
    elif isinstance(o, list):
        for v in o:
            yield from walk(v)

data, group = json.load(open(sys.argv[1])), sys.argv[2]
rows = {}
for u in walk(data):
    rows.setdefault((u["platform"], u["id"]), u)
if not rows:
    sys.exit(f"no per-platform updates found in group {group}")

tags = sorted({uid.split("-")[0] for _, uid in rows})
print()
print("  Settings → Account will show:  update " + "  /  ".join(tags))
print()
for (platform, uid), u in sorted(rows.items()):
    # UUIDv7: the first 48 bits are the publish time in Unix milliseconds.
    when = ""
    try:
        ms = int(uid.replace("-", "")[:12], 16)
        when = datetime.datetime.fromtimestamp(ms / 1000).strftime("  published %Y-%m-%d %H:%M:%S")
    except ValueError:
        pass
    print(f"    {platform:<8} {uid}   runtime {u.get('runtimeVersion','?')}{when}")
print()
print(f"    group    {group}   <- what update:list prints; NEVER appears in Settings")
print()
PY
}

if [ "$MODE" = "check" ]; then
  echo "Latest OTA on branch '$EAS_BRANCH':"
  report_tag "$(latest_group)"
  echo "  A phone with no 'update' line at all is still on its embedded bundle (no OTA applied)."
  echo "  The v<version> (<build>) line never changes on an OTA — only the tag above does."
  exit 0
fi

[ -n "$MESSAGE" ] || die "a publish needs a message: -m \"what changed\" (or use --check)"

git fetch -q origin || die "git fetch failed"
SHA="$(git rev-parse --verify "$REF^{commit}" 2>/dev/null)" || die "cannot resolve ref: $REF"
SUBJECT="$(git log -1 --format=%s "$SHA")"

echo "Publishing an OTA to branch '$EAS_BRANCH'"
echo "  ref      $REF"
echo "  commit   ${SHA:0:9}  $SUBJECT"
echo "  message  $MESSAGE"

# Publish from a throwaway worktree pinned to $SHA, so the shared checkout's state
# (someone else's uncommitted work, a local main behind origin) cannot leak into the bundle.
WORKTREE=".claude/worktrees/ota-$$"
mkdir -p .claude/worktrees
git worktree add "$WORKTREE" "$SHA" --detach >/dev/null 2>&1 \
  || die "could not create worktree at $WORKTREE"
ln -s ../../../node_modules "$WORKTREE/node_modules"
echo "  tree     $WORKTREE (detached at ${SHA:0:9}, removed afterwards)"

if [ "$DRY" -eq 1 ]; then
  echo
  echo "--dry-run: everything is staged; skipping the publish itself."
  echo "would run: CI=1 npx eas update --branch $EAS_BRANCH --environment production \\"
  echo "             --non-interactive -m \"$MESSAGE\"   (in $WORKTREE)"
  echo
  echo "Tag that the CURRENTLY live update shows (for comparison):"
  report_tag "$(latest_group)"
  exit 0
fi

# --branch, not --channel: --channel is not supported by this eas-cli version.
# --environment production pulls env vars from EAS, so the worktree needs no .env.
( cd "$WORKTREE" && CI=1 npx eas update \
    --branch "$EAS_BRANCH" \
    --environment production \
    --non-interactive \
    -m "$MESSAGE" ) || die "eas update failed — nothing was published"

echo
echo "Published. Verify against a device with the tag below."
report_tag "$(latest_group)"
echo "  Note: fallbackToCacheTimeout is 0, so the FIRST app open after this still runs the"
echo "  old bundle and downloads this one in the background; the NEXT open runs it."
echo "  Rollback: CI=1 npx eas update:republish --group <previous-group-id>"
