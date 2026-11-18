import { queryOptions } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { isSessionDead } from "./auth-utils";
import { serverEnv } from "./env.server";
import { getLogto } from "./logto.server";

export type AuthUser = {
	id: string;
	name: string | null;
	email: string | null;
	picture: string | null;
};

export type AuthState =
	| { isAuthenticated: true; user: AuthUser }
	| { isAuthenticated: false; user: null };

/** Who is signed in, for the UI. Safe to call without a session. */
export const getAuthState = createServerFn({ method: "GET" }).handler(
	async (): Promise<AuthState> => {
		const { client } = await getLogto();
		if (!(await client.isAuthenticated())) {
			return { isAuthenticated: false, user: null };
		}
		const claims = await client.getIdTokenClaims();
		return {
			isAuthenticated: true,
			user: {
				id: claims.sub,
				name: claims.name ?? claims.username ?? null,
				email: claims.email ?? null,
				picture: claims.picture ?? null,
			},
		};
	},
);

export const authQueryOptions = queryOptions({
	queryKey: ["auth"],
	queryFn: () => getAuthState(),
	// Sign-in and sign-out are full page loads, so this only changes when the session expires
	staleTime: 5 * 60 * 1000,
});

/**
 * Requires a signed-in user and provides a valid access token for the backend API.
 * Attach it to every server function that touches user data: route guards alone don't
 * protect server functions, which can be called directly.
 *
 * Without a usable session it throws a redirect to sign-in. Loaders and `useServerFn`
 * follow it; plain `useQuery` callers get it as the query error.
 */
export const authMiddleware = createMiddleware({ type: "function" }).server(
	async ({ next }) => {
		const logto = await getLogto();
		if (!(await logto.client.isAuthenticated())) {
			throw signInRedirect();
		}

		let accessToken: string;
		try {
			// Returns the cached token, or refreshes it with the refresh token
			accessToken = await logto.client.getAccessToken(serverEnv().apiResource);
		} catch (error) {
			if (!isSessionDead(error)) {
				// Logto unreachable, timed out, rate limited or 5xx: keep the session and fail
				// this call only, instead of signing the user out because of a blip.
				throw error;
			}
			// Refresh token expired or revoked: drop the session so the user signs in again
			console.warn("Session expired, signing out", error);
			logto.session.destroy();
			throw signInRedirect();
		}
		await logto.save();

		return next({ context: { accessToken } });
	},
);

function signInRedirect() {
	const returnTo = currentPagePath();
	return redirect({
		href: returnTo
			? `/api/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`
			: "/api/auth/sign-in",
		reloadDocument: true,
	});
}

/** The page the user is on: the request itself during SSR, the Referer for server fn calls. */
function currentPagePath(): string | undefined {
	const request = getRequest();
	const url = new URL(request.url);
	if (!url.pathname.startsWith("/_serverFn")) {
		return url.pathname + url.search;
	}
	const referer = request.headers.get("referer");
	if (!referer) {
		return undefined;
	}
	const refererUrl = new URL(referer);
	return refererUrl.origin === url.origin
		? refererUrl.pathname + refererUrl.search
		: undefined;
}
