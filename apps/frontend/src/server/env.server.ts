// Server-only configuration. Read lazily so a missing var fails the request that needs it
// (with a clear message) instead of crashing the build or unrelated pages.

function required(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} is not set (see .env.example)`);
	}
	return value;
}

export function serverEnv() {
	return {
		appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
		apiBaseUrl: process.env.API_BASE_URL ?? "http://localhost:8080",
		logtoEndpoint: required("LOGTO_ENDPOINT"),
		logtoAppId: required("LOGTO_APP_ID"),
		logtoAppSecret: required("LOGTO_APP_SECRET"),
		// The API resource the backend accepts tokens for (same value as the backend's JWT_AUDIENCE)
		apiResource: process.env.JWT_AUDIENCE ?? "https://api.todos.local",
		sessionSecret: required("SESSION_SECRET"),
	};
}
