---
name: deploy-ota
description: Use when shipping a JS-only change to users without a store build ("OTA this", "publish an OTA", "push the fix over the air", "ship it OTA", "eas update"), OR when checking which update is live / what a phone should be showing ("which OTA is live?", "what update does my phone have?", "did the OTA go out?"). Covers the eligibility call, what else rides along in the bundle, publishing, and reporting the tag that appears in the app's Settings.
---

# Ship (or check) a production OTA

An OTA replaces the app's **JavaScript bundle** on devices already running a matching native
build. No EAS build, no store review, live in minutes. That also means it reaches **every user on
that runtime**, so treat it as a production deploy.

Run everything from the frontend repo root (`masters-fit-frontend`).

The mechanics live in **`scripts/ota-publish.sh`** — use it rather than calling `eas update` by
hand. It pins the bundle to an explicit commit, publishes from a throwaway worktree, and always
prints the device-comparable tag. This skill is the judgment around it.

---

## The UUID trap — read this before reporting anything

Three UUIDs are in play and **only one appears on a phone**:

| What | Example | In Settings? |
|---|---|---|
| **update id** (per platform) | `01a07d45-6d6e-7bb6-…` | **YES** — first segment: `update 01a07d45` |
| **group id** (one per publish) | `bc28ef51-112f-49c3-…` | **NO — never** |
| EAS project id | `baddaaa3-3d1e-46e5-…` | no |

`eas update:list` prints **group** ids. The app shows an **update** id. They are different UUIDs
and will never match, so telling the user to compare them manufactures a phantom failed rollout.
Never quote a bare 8-hex id as "the tag on your phone" unless you resolved it per-platform.
`./scripts/ota-publish.sh --check` does that resolution for you — prefer it over reading ids out
of any other command's output.

---

## Just checking what's live?

```bash
./scripts/ota-publish.sh --check
```

Prints the per-platform update ids, the `update <tag>` string Settings will show, the publish
timestamp decoded from each id, and the group id clearly labelled as *not* the phone's tag.

Then, on the device: **Settings → Account → very bottom.**
- Tag matches → the phone has it.
- **No `update` line at all** → still on the bundle embedded in the build; no OTA has applied to
  it yet. (Also absent in a dev client / Expo Go.)
- The `v<version> (<build>)` line **never moves on an OTA** — that's the native build. Read it off
  the screen; don't quote a version or build number from memory.
- Tag is older than the newest → have them force-quit and reopen. `fallbackToCacheTimeout: 0`
  means each launch runs the cached bundle and fetches the new one in the background, so a fresh
  update lands on the *next* open. Two launches is normal, not a bug.

---

## Step 1 — Is this actually OTA-eligible?

OTA ships **only JavaScript**. Anything native needs a real build (`deploy-ios` /
`deploy-android`). Check what the release actually touches:

```bash
git diff --name-only <last-shipped-ref>..origin/main
```

Needs a **native build**, not an OTA, if it touches: `package.json` (a new/changed native dep),
`app.json`/`app.config.*` native config, `eas.json`, `ios/`, `android/`, a config plugin, icons/
splash, or permissions. Pure `.ts`/`.tsx`/copy/style changes are OTA-safe.

Publishing a native change as an OTA does not fail loudly — it ships a JS bundle that calls a
native module the installed binary doesn't have, and the app red-boxes or crashes for everyone on
that runtime. When in doubt, build instead.

Also confirm Apple's line: OTA is for bug fixes and minor changes, **not** for materially changing
the app's purpose or features.

## Step 2 — Know what else rides along

The bundle is the **whole app at that commit**, not your diff. Anything merged since the last OTA
ships too:

```bash
./scripts/ota-publish.sh --check                                   # note the publish time
git log --format='%h %ad %s' --date=iso-local origin/main | head -10
```

Every commit newer than that timestamp is in this bundle. If something unexpected is in there,
**say so before publishing, not after** — that is the user's call, not yours.

## Step 3 — Land the work first

The script defaults to `--ref origin/main`, so merge before publishing:

```bash
gh pr list --base main
gh pr merge <number> --squash --delete-branch
```

You do **not** need a clean local tree, and you should **not** `git pull` or stash to get one —
the script publishes from a detached worktree at `origin/main`, so a sibling session's
uncommitted work in the shared checkout cannot leak into the bundle (and yours can't disturb
theirs). This is deliberate: `eas update` otherwise bundles whatever the working tree happens to
contain.

## Step 4 — Confirm, then publish

An OTA hits all users on that runtime. **Confirm with the user before running it** unless they
just told you to ship.

```bash
./scripts/ota-publish.sh -m "Replace exercise: closest matches first instead of alphabetical"
```

Write the message as the user-facing change, not the commit subject. Add `--dry-run` first if you
want to see the resolved commit and target without shipping.

If `eas whoami` isn't logged in the script fails on the update list — have the user run
`eas login` themselves (interactive), then retry.

## Step 5 — Report it the way the user needs it

**Always include the tag block** in your report — this is a standing request. The script prints
it; pass it through, e.g.:

```
Settings → Account will show:  update 01a07d45
  ios      01a07d45-6d6e-7bb6-992f-1b12cfe14902   runtime 1.2.1
  android  01a07d45-6d6e-74d7-8c0b-d9c763681d11   runtime 1.2.1
  group    bc28ef51-112f-49c3-9174-8e67db3c2074   <- not the phone's tag
```

Also report the commit that shipped (the script echoes it, and `eas update` prints a `Commit`
line) and the rollback command.

## ✅ How to know it worked

1. `./scripts/ota-publish.sh --check` shows the new tag as the newest update on `production`.
2. On a device, Settings → Account shows that same `update <tag>` — after a force-quit and reopen.
3. The change itself is visible in the app.

## Rollback

Republish the previous group:

```bash
CI=1 npx eas update:republish --group <previous-group-id>
```

That reverts **everything** in the newer group, including anything that rode along with it.

## Notes

- `--branch production`, **not** `--channel` — `--channel` isn't supported by this eas-cli
  version, though older notes and the docs suggest it. The script already gets this right.
- `runtimeVersion` policy is `appVersion`: an update only reaches builds whose app version
  matches. A fix for users on 1.2.1 must be published while `app.json` version is still `1.2.1`.
- Builds ≤ 1.2.0 (build 106 / vc83) can never receive an OTA — they predate `expo-updates`.
- Backend changes are **not** part of an OTA. If the JS depends on a new API field, merge and
  deploy the backend first, then OTA.
