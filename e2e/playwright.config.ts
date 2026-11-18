import { defineConfig, devices } from "@playwright/test";

// Runs against an already running app: `mise run dev` locally, the Docker stack in CI.
// Sign-in uses a real Logto test user (E2E_USERNAME / E2E_PASSWORD, see .env.example).

export const STORAGE_STATE = "playwright/.auth/user.json";

export default defineConfig({
	testDir: "./tests",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "html",
	use: {
		baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
		trace: "on-first-retry",
		...devices["Desktop Chrome"],
	},
	projects: [
		// Signs in once and saves the session cookie for the signed-in project
		{ name: "setup", testMatch: /auth\.setup\.ts/ },
		{
			name: "signed-in",
			testMatch: /signed-in\/.*\.spec\.ts/,
			dependencies: ["setup"],
			use: { storageState: STORAGE_STATE },
		},
		// Starts without a session; covers the sign-in and sign-out flows themselves
		{ name: "signed-out", testMatch: /signed-out\/.*\.spec\.ts/ },
	],
});
