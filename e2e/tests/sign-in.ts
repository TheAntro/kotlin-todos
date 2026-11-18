import { expect, type Page } from "@playwright/test";

function required(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} is not set (see .env.example)`);
	}
	return value;
}

export const testUser = {
	get username() {
		return required("E2E_USERNAME");
	},
	get password() {
		return required("E2E_PASSWORD");
	},
};

/**
 * Completes the Logto sign-in form. Call it once the page is on Logto's sign-in screen.
 * Handles both a single form (identifier + password) and a two-step one (identifier first).
 */
export async function completeLogtoSignIn(page: Page) {
	await page.locator('input[name="identifier"]').fill(testUser.username);

	const password = page.locator('input[name="password"]');
	if (!(await password.isVisible())) {
		await page.locator('button[type="submit"]').click();
	}
	await password.fill(testUser.password);
	await page.locator('button[type="submit"]').click();
}

/** Signs in from the app and waits until Logto has sent the browser back to `returnTo`. */
export async function signIn(page: Page, returnTo = "/profile") {
	await page.goto(`/api/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
	await completeLogtoSignIn(page);
	await expect(page).toHaveURL(returnTo);
}
