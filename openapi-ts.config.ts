import { defineConfig } from "@hey-api/openapi-ts";

const OPENAPI_DOCS_URL = "http://localhost:5001/api/docs-json";

export default defineConfig({
  input: OPENAPI_DOCS_URL,
  output: {
    // Generated SDK + types will land under this folder
    path: "generated/api",
    format: "prettier",
  },
});
