import * as z from "zod";
import { createClient, createConfig } from "#/api/generated/client";
import { serverEnv } from "./env.server";
import { backendIdToken } from "./id-token.server";

/** The backend answered with an error status (problem details are in `body`). */
export class BackendError extends Error {
	constructor(
		readonly status: number,
		message: string,
		readonly body?: unknown,
	) {
		super(message);
		this.name = "BackendError";
	}
}

/** A request or response didn't match the backend's OpenAPI contract (`apps/backend/openapi.json`). */
export class BackendContractError extends Error {
	constructor(message: string, cause: z.ZodError) {
		super(`${message}: ${z.prettifyError(cause)}`, { cause });
		this.name = "BackendContractError";
	}
}

/**
 * Options for calling the Kotlin API as the signed-in user with a generated SDK function
 * from `#/api/generated`. Get `accessToken` from `authMiddleware`:
 *
 *     const { data } = await hello(backendOptions(context.accessToken));
 *
 * Request and response bodies are validated against the OpenAPI schemas. Failures throw
 * `BackendError` (error status) or `BackendContractError` (body doesn't match the contract).
 *
 * On Cloud Run (`BACKEND_AUDIENCE` set) it also sends the frontend's Google ID token in
 * `X-Serverless-Authorization`, since only the frontend's service account may invoke the backend.
 */
export function backendOptions(accessToken: string) {
	const { apiBaseUrl, backendAudience } = serverEnv();
	const client = createClient(
		createConfig({ baseUrl: apiBaseUrl, auth: accessToken }),
	);
	if (backendAudience) {
		client.interceptors.request.use(async (request) => {
			request.headers.set(
				"X-Serverless-Authorization",
				`Bearer ${await backendIdToken(backendAudience)}`,
			);
			return request;
		});
	}
	client.interceptors.error.use((error, response, _request, options) => {
		// The route template (e.g. `/api/todos/{id}`), so messages don't leak the backend host or IDs
		const operation = `${options.method} ${options.url}`;
		if (error instanceof z.ZodError) {
			const part = response ? "response" : "request";
			return new BackendContractError(
				`${operation}: ${part} doesn't match the API contract`,
				error,
			);
		}
		if (response && !response.ok) {
			return new BackendError(
				response.status,
				`${operation} failed with ${response.status}`,
				error,
			);
		}
		return error;
	});
	return { client, throwOnError: true as const };
}
