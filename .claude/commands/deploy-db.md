# Deploy DB — Push schema changes to Neon (production)

Run this when `src/models/` has changed since the last deploy.

## Steps

1. Check for schema changes:
   ```bash
   git -C /Users/richpusateri/Projects/MastersFit/backend diff main~1 main -- src/models/
   ```
   If no diff, warn the user and ask if they still want to proceed.

2. Ask the user for their Neon `DATABASE_URL` (find it in the Render dashboard under the backend service's Environment tab). Do not store or echo it beyond the command.

3. Run the push from the backend directory:
   ```bash
   cd /Users/richpusateri/Projects/MastersFit/backend && DATABASE_URL="<url>" npm run db:push
   ```

4. Confirm success and note which model files changed.
