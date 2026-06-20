# Deploy DB — Push schema changes to Neon (production)

Run this when `src/models/` has changed since the last deploy.

This project uses **declarative `drizzle-kit push`** (no migration files/journal). The
safety of a prod deploy therefore comes entirely from **reviewing the proposed SQL before
applying it**. Never apply blind, and never auto-approve.

## Guardrails (do not skip)

- **Always review the diff first** (Step 3) and apply only after explicit approval (Step 4).
- **Never use `--force` against prod.** `--force` auto-approves data-loss statements
  (DROP / TRUNCATE) — exactly what review exists to catch.
- **Stop and ask** if the proposed SQL contains `DROP`, `TRUNCATE`, `RENAME`, or any
  `ALTER COLUMN ... TYPE` that could lose data. Prefer additive changes.
- `push` targets whatever `DATABASE_URL` points to. The `.env` default is **local**, so a
  prod deploy must pass the Neon URL explicitly on the command line (Step 2) — confirm the
  host looks like `*.neon.tech` before applying.

## Steps

1. **Confirm there's a change to deploy.**
   ```bash
   git -C /Users/richpusateri/Projects/MastersFit/backend diff main~1 main -- src/models/
   ```
   If no diff, warn the user and ask if they still want to proceed.

2. **Get the Neon `DATABASE_URL`** (Render dashboard → backend service → Environment tab, or
   the commented line in `backend/.env`). Do not store or echo it beyond the commands below.

3. **Review the proposed SQL — READ-ONLY, applies nothing.** `db:check` feeds EOF to the
   confirmation prompt, so drizzle prints the diff and aborts:
   ```bash
   cd /Users/richpusateri/Projects/MastersFit/backend && DATABASE_URL="<neon-url>" npm run db:check
   ```
   - If it prints **"No changes detected"**, prod is already in sync — stop, nothing to do.
   - Otherwise read every statement. Show it to the user. If it contains DROP/TRUNCATE/RENAME
     or a risky type change, **stop and confirm** before continuing.

4. **Apply — only after the user approves the exact SQL from Step 3.**
   ```bash
   cd /Users/richpusateri/Projects/MastersFit/backend && DATABASE_URL="<neon-url>" npm run db:push
   ```
   This is interactive. Confirm the diff it shows **matches what was reviewed in Step 3**, then
   select **"Yes, execute all statements"**. If the diff differs from Step 3, abort and
   re-review. **Do not pass `--force`.**

5. **Verify it applied and prod is now in sync.** Re-run the read-only check — it should report
   no remaining diff:
   ```bash
   cd /Users/richpusateri/Projects/MastersFit/backend && DATABASE_URL="<neon-url>" npm run db:check
   ```
   Expect **"No changes detected"**. Note which model files changed in your summary.
