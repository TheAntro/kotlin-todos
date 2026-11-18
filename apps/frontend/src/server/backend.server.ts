import { serverEnv } from "./env.server";

export class BackendError extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
		this.name = "BackendError";
	}
}

/** Calls the Kotlin API as the signed-in user. Get `accessToken` from `authMiddleware`. */
export async function backendFetch<T>(
	accessToken: string,
	path: string,
	init: RequestInit = {},
): Promise<T> {
	const headers = new Headers(init.headers);
	headers.set("Authorization", `Bearer ${accessToken}`);
	headers.set("Accept", "application/json");
	if (init.body && !headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}

	const response = await fetch(`${serverEnv().apiBaseUrl}${path}`, {
		...init,
		headers,
	});
	if (!response.ok) {
		throw new BackendError(
			response.status,
			`${init.method ?? "GET"} ${path} failed with ${response.status}`,
		);
	}
	if (response.status === 204) {
		return undefined as T;
	}
	return (await response.json()) as T;
}
