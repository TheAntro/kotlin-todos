import { test as setup } from "@playwright/test";
import { STORAGE_STATE } from "../playwright.config";
import { signIn } from "./sign-in";

// Signs in once per run. The saved state holds the app's encrypted session cookie, which
// includes a refresh token, so expired access tokens get refreshed during long runs.
// Tests that sign out must sign in on their own: signing out revokes this refresh token.
setup("sign in", async ({ page }) => {
	await signIn(page);
	await page.context().storageState({ path: STORAGE_STATE });
});
