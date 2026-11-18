import { createFileRoute } from "@tanstack/react-router";
import { serverEnv } from "#/server/env.server";
import { getLogto, redirectTo } from "#/server/logto.server";

// POST only, so another site can't sign the user out with a link or image.
export const Route = createFileRoute("/api/auth/sign-out")({
	server: {
		handlers: {
			POST: async () => {
				const logto = await getLogto();
				// Revokes the refresh token, clears Logto's storage and asks to go to Logto's end-session URL
				await logto.client.signOut(`${serverEnv().appBaseUrl}/`);
				logto.session.destroy();
				return redirectTo(logto.navigateUrl() ?? "/");
			},
		},
	},
});
