import { expect, test } from "@playwright/test";
import { completeLogtoSignIn, signIn } from "../sign-in";

test.describe("signed out", () => {
	test("home page offers sign-in", async ({ page }) => {
		await page.goto("/");

		await expect(
			page.getByRole("link", { name: "Sign in" }).first(),
		).toBeVisible();
		await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
	});

	test("profile redirects to sign-in and comes back after signing in", async ({
		page,
		baseURL,
	}) => {
		await page.goto("/profile");

		// Now on Logto's sign-in page, outside the app
		await expect(page).not.toHaveURL(new RegExp(`^${baseURL}`));

		await completeLogtoSignIn(page);
		await expect(page).toHaveURL("/profile");
		await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
	});
});

test.describe("sign out", () => {
	test("ends the session", async ({ page }) => {
		// Own sign-in: signing out revokes the refresh token, so the shared session must not be used
		await signIn(page);

		await page.getByRole("button", { name: "Sign out" }).click();

		// Logto's end-session page sends the browser back to the app's home page
		await expect(page).toHaveURL("/");
		await expect(
			page.getByRole("link", { name: "Sign in" }).first(),
		).toBeVisible();

		// The session is gone on the server too, not just hidden in the UI
		await page.goto("/profile");
		await expect(page).not.toHaveURL(/\/profile$/);
	});
});
