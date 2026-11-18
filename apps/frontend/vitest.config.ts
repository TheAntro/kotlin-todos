import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts so unit tests don't load the Start, Nitro and devtools plugins
export default defineConfig({
	test: {
		include: ["src/**/*.test.{ts,tsx}"],
	},
});
