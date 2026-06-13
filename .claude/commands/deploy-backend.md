# Deploy Backend — Merge PRs and push to Render

Render auto-deploys when `main` is updated. This skill merges any ready backend PRs and confirms the push landed.

## Steps

1. Check for open PRs targeting `main` on the backend repo:
   ```bash
   gh pr list --repo $(git -C /Users/richpusateri/Projects/MastersFit/backend remote get-url origin) --base main
   ```

2. For each open PR, review its title and mergeable status. Ask the user which ones to merge if more than one is open.

3. Merge approved PRs:
   ```bash
   gh pr merge <number> --merge --repo $(git -C /Users/richpusateri/Projects/MastersFit/backend remote get-url origin)
   ```

4. Confirm `main` received the commit:
   ```bash
   git -C /Users/richpusateri/Projects/MastersFit/backend fetch origin && git -C /Users/richpusateri/Projects/MastersFit/backend log --oneline origin/main -3
   ```

5. Remind the user to check Render for deploy status: https://dashboard.render.com

6. Check whether any `src/models/` files changed in the merged commits — if so, suggest running `/deploy-db` next.
