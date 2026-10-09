# Deploy DB — Push schema changes to production (Render Postgres)

Run this when `src/models/` has changed since the last deploy.

This project uses **declarative `drizzle-kit push`** (no migration files/journal). The
safety of a prod deploy therefore comes entirely from **reviewing the proposed SQL before
applying it**. Never apply blind, and never auto-approve.

Prod is Render Postgres `masters-fit-db` (Oregon, PostgreSQL 17, database `masters_fit_db`).

## Guardrails (do not skip)

- **Always review the diff first** (Step 3) and apply only after explicit approval (Step 4).
- **Never use `--force` against prod.** `--force` auto-approves data-loss statements
  (DROP / TRUNCATE) — exactly what review exists to catch.
- **Stop and ask** if the proposed SQL contains `DROP`, `TRUNCATE`, `RENAME`, or any
  `ALTER COLUMN ... TYPE` that could lose data. Prefer additive changes.
- `push` targets whatever `DATABASE_URL` points to. The `.env` default is **local**, so a
  prod deploy must run through `scripts/with-prod-url.sh` (Step 2), which injects the prod URL
  from the macOS Keychain and prints only the host — confirm it is
  `dpg-db4gi6e7bikc73elosm0-a.oregon-postgres.render.com` before applying.
- **Never handle the connection string yourself** — don't copy it from the Render dashboard or
  `.env`, and never put it on a command line. (Render's Environment tab now shows the
  **internal** URL, which doesn't resolve from a laptop anyway.)

## Steps

1. **Confirm there's a change to deploy.**
   ```bash
   git -C /Users/richpusateri/Projects/MastersFit/backend diff main~1 main -- src/models/
   ```
   If no diff, warn the user and ask if they still want to proceed.

2. **Check the prod URL is in the Keychain.** Every prod command below is prefixed with
   `scripts/with-prod-url.sh` (run from the backend dir). If it says "no prod URL in the
   Keychain", the user copies the **External** Database URL from Render (`masters-fit-db` →
   Connect) and runs `scripts/db-prod-set-url.sh`, which stores it from the clipboard.

3. **Review the proposed SQL — READ-ONLY, applies nothing.** `db:check` feeds EOF to the
   confirmation prompt, so drizzle prints the diff and aborts:
   ```bash
   cd /Users/richpusateri/Projects/MastersFit/backend && scripts/with-prod-url.sh npm run db:check
   ```
   - Confirm the `with-prod-url: DATABASE_URL -> <host>` line names the Render host above.
   - If it prints **"No changes detected"**, prod is already in sync — stop, nothing to do.
   - Otherwise read every statement. Show it to the user. If it contains DROP/TRUNCATE/RENAME
     or a risky type change, **stop and confirm** before continuing — and take a safety copy
     first (there is no Neon-style branching on Render; its point-in-time recovery restores
     into a *new* instance):
     ```bash
     cd /Users/richpusateri/Projects/MastersFit/backend && scripts/with-prod-url.sh sh -c \
       '/opt/homebrew/opt/postgresql@17/bin/pg_dump "$DATABASE_URL" -Fc -f <file>'
     ```
     (Single quotes on purpose: `$DATABASE_URL` must expand inside the wrapper's child, not in
     your shell, where it is unset or local.)
     Use the `postgresql@17` binaries — the default local `pg_dump` is v16 and refuses to dump
     a v17 server.

4. **Apply — only after the user approves the exact SQL from Step 3.**
   ```bash
   cd /Users/richpusateri/Projects/MastersFit/backend && scripts/with-prod-url.sh npm run db:push
   ```
   This is interactive. Confirm the diff it shows **matches what was reviewed in Step 3**, then
   select **"Yes, execute all statements"**. If the diff differs from Step 3, abort and
   re-review. **Do not pass `--force`.**

5. **Verify it applied and prod is now in sync.** Re-run the read-only check — it should report
   no remaining diff:
   ```bash
   cd /Users/richpusateri/Projects/MastersFit/backend && scripts/with-prod-url.sh npm run db:check
   ```
   Expect **"No changes detected"**. Note which model files changed in your summary.
