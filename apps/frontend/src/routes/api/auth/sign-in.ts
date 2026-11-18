import { createFileRoute } from "@tanstack/react-router";
import { safeReturnTo } from "#/server/auth-utils";
import { serverEnv } from "#/server/env.server";
import { getLogto, redirectTo } from "#/server/logto.server";

// Starts the Logto sign-in flow. `?returnTo=/path` picks where to land afterwards.
export const Route = createFileRoute("/api/auth/sign-in")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const logto = await getLogto();
				const returnTo = new URL(request.url).searchParams.get("returnTo");
				logto.session.returnTo = safeReturnTo(returnTo);

				await logto.client.signIn({
					redirectUri: `${serverEnv().appBaseUrl}/callback`,
				});
				await logto.session.save();

				const url = logto.navigateUrl();
				if (!url) {
					throw new Error("Logto did not return a sign-in URL");
				}
				return redirectTo(url);
			},
		},
	},
});
