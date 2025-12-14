# Auto API generation

- Generator: `@hey-api/openapi-ts` (see `openapi-ts.config.ts`).
- Spec URL: set `OPENAPI_DOCS_URL` (defaults to `http://localhost:5001/api/docs-json`). Keep the backend swagger/docs server running locally before generating.
- Command: `npm run generate:api` (uses `--file openapi-ts.config.ts`; optionally `OPENAPI_DOCS_URL=<url> npm run generate:api`).
- Output: SDK + client types are written to `lib/api/generated/`. The folder is cleaned and rebuilt each run.
- Usage: import the generated client/types from the `lib/api/generated` barrel after running the command.
