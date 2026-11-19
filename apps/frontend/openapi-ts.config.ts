import { defineConfig } from "@hey-api/openapi-ts";

// Generates the backend API client from the backend's committed OpenAPI spec.
// Run `pnpm generate:api` (or `mise run api:generate` from the repo root) after the API changes.
export default defineConfig({
	input: "../backend/openapi.json",
	output: { path: "src/api/generated" },
	plugins: [
		"@hey-api/client-fetch",
		"@hey-api/typescript",
		"zod",
		// Validate request and response bodies with the generated Zod schemas
		{ name: "@hey-api/sdk", validator: true },
	],
});
