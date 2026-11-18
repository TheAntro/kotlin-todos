import { expect, test } from "@playwright/test";

test.describe("profile", () => {
	test("shows the signed-in user", async ({ page }) => {
		await page.goto("/profile");

		await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
		await expect(page.locator('dt:has-text("User ID") + dd')).not.toBeEmpty();
		await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
	});

	test("calls the backend as the signed-in user", async ({ page }) => {
		await page.goto("/profile");

		// The backend echoes the token's `sub`, which must be the user shown in the app
		const userId = await page
			.locator('dt:has-text("User ID") + dd')
			.innerText();
		const backend = page.locator('h2:has-text("Backend says") + p');
		await expect(backend).toContainText("Hello World!");
		await expect(backend).toContainText(userId);
	});

	test("is reachable by client-side navigation from the home page", async ({
		page,
	}) => {
		await page.goto("/");
		await page.getByRole("link", { name: /check your profile/i }).click();

		await expect(page).toHaveURL("/profile");
		await expect(page.locator('h2:has-text("Backend says") + p')).toContainText(
			"Hello World!",
		);
	});

	test("keeps the session across reloads", async ({ page }) => {
		await page.goto("/profile");
		await page.reload();

		await expect(page).toHaveURL("/profile");
		await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
	});
});
