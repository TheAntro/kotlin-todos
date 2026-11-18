import { LogtoClientError, LogtoRequestError } from "@logto/node";

// Pure helpers for the auth flow, kept free of request context so they can be unit tested.

/** Only allow same-site relative paths as post-sign-in targets (no open redirects). */
export function safeReturnTo(value: string | null | undefined): string {
	// Browsers treat `//host` and `/\host` as links to another site
	if (value?.startsWith("/") && !/^\/[/\\]/.test(value)) {
		return value;
	}
	return "/";
}

/**
 * True when a token refresh failed because the session can't get tokens anymore, as opposed
 * to a temporary failure (Logto down, timeout, rate limit, 5xx) that shouldn't sign anyone out.
 */
export function isSessionDead(error: unknown): boolean {
	if (error instanceof LogtoClientError) {
		// e.g. `not_authenticated`: no ID or refresh token in the session
		return true;
	}
	if (error instanceof LogtoRequestError) {
		// The token endpoint rejected the refresh token (invalid_grant comes back as 400)
		const status = error.cause instanceof Response ? error.cause.status : 0;
		return status === 400 || status === 401;
	}
	return false;
}
