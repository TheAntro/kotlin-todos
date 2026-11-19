// Google ID tokens for calling the backend on Cloud Run, where only the frontend's runtime
// service account may invoke it. Cloud Run checks the token in `X-Serverless-Authorization` and
// passes `Authorization` (the user's Logto token) through to the backend.
// See docs/deployment/plan.md, "Backend access".

const METADATA_IDENTITY_URL =
	"http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity";

// Fetch a new token this long before the cached one expires (Google's last for an hour)
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/** Expiry of a JWT in epoch milliseconds, from its `exp` claim. */
function expiresAt(token: string): number {
	const payload = token.split(".")[1];
	const exp = payload
		? (
				JSON.parse(Buffer.from(payload, "base64url").toString()) as {
					exp?: unknown;
				}
			).exp
		: undefined;
	if (typeof exp !== "number") {
		throw new Error("ID token from the metadata server has no exp claim");
	}
	return exp * 1000;
}

/**
 * Returns a function that gets an ID token for `audience` from the metadata server and caches it
 * until shortly before it expires. Concurrent callers share one fetch.
 */
export function createIdTokenSource(
	audience: string,
	fetchFn: typeof fetch = fetch,
	now: () => number = Date.now,
): () => Promise<string> {
	let cached: { token: string; expiresAt: number } | undefined;
	let pending: Promise<string> | undefined;

	async function fetchToken(): Promise<string> {
		const url = `${METADATA_IDENTITY_URL}?audience=${encodeURIComponent(audience)}`;
		const response = await fetchFn(url, {
			headers: { "Metadata-Flavor": "Google" },
		});
		if (!response.ok) {
			throw new Error(
				`Metadata server returned ${response.status} for an ID token`,
			);
		}
		const token = (await response.text()).trim();
		cached = { token, expiresAt: expiresAt(token) };
		return token;
	}

	return () => {
		if (cached && now() < cached.expiresAt - REFRESH_MARGIN_MS) {
			return Promise.resolve(cached.token);
		}
		pending ??= fetchToken().finally(() => {
			pending = undefined;
		});
		return pending;
	};
}

let source: { audience: string; get: () => Promise<string> } | undefined;

/** ID token for the backend's custom audience, reused across requests. */
export function backendIdToken(audience: string): Promise<string> {
	if (source?.audience !== audience) {
		source = { audience, get: createIdTokenSource(audience) };
	}
	return source.get();
}
