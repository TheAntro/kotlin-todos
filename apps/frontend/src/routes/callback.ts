import { createFileRoute } from "@tanstack/react-router";
import { publicCallbackUrl, safeReturnTo } from "#/server/auth-utils";
import { serverEnv } from "#/server/env.server";
import { getLogto, redirectTo } from "#/server/logto.server";

// Logto redirects here after sign-in; exchange the code for tokens and store them in the session.
export const Route = createFileRoute("/callback")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const logto = await getLogto();
				try {
					await logto.client.handleSignInCallback(
						publicCallbackUrl(request.url, serverEnv().appBaseUrl),
					);
				} catch (error) {
					console.error("Sign-in callback failed", error);
					return new Response("Sign-in failed. Please try again.", {
						status: 400,
					});
				}

				const returnTo = safeReturnTo(logto.session.returnTo);
				delete logto.session.returnTo;
				await logto.session.save();
				return redirectTo(returnTo);
			},
		},
	},
});
