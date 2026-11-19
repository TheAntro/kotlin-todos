import { beforeEach, describe, expect, it, vi } from "vitest";
import { hello } from "#/api/generated";
import {
	BackendContractError,
	BackendError,
	backendOptions,
} from "./backend.server";

function respondWith(status: number, body: unknown) {
	return vi.fn<typeof fetch>(
		async () =>
			new Response(JSON.stringify(body), {
				status,
				headers: { "Content-Type": "application/json" },
			}),
	);
}

describe("backendOptions", () => {
	beforeEach(() => {
		vi.stubEnv("API_BASE_URL", "http://backend.test");
		vi.stubEnv("LOGTO_ENDPOINT", "http://logto.test");
		vi.stubEnv("LOGTO_APP_ID", "app");
		vi.stubEnv("LOGTO_APP_SECRET", "secret");
		vi.stubEnv("SESSION_SECRET", "x".repeat(32));
	});

	it("sends the access token and returns the validated body", async () => {
		const fetch = respondWith(200, { message: "Hello", subject: "user-1" });

		const { data } = await hello({ ...backendOptions("token-1"), fetch });

		expect(data).toEqual({ message: "Hello", subject: "user-1" });
		const request = fetch.mock.calls[0]?.[0] as Request;
		expect(request.url).toBe("http://backend.test/api/v1/hello");
		expect(request.headers.get("Authorization")).toBe("Bearer token-1");
	});

	it("rejects a response that doesn't match the contract", async () => {
		const fetch = respondWith(200, { message: "Hello" });

		await expect(
			hello({ ...backendOptions("token-1"), fetch }),
		).rejects.toBeInstanceOf(BackendContractError);
	});

	it("throws BackendError with the status for error responses", async () => {
		const problem = { status: 404, title: "Not Found" };
		const fetch = respondWith(404, problem);

		const error = await hello({ ...backendOptions("token-1"), fetch }).catch(
			(e: unknown) => e,
		);

		expect(error).toBeInstanceOf(BackendError);
		expect(error).toMatchObject({
			status: 404,
			body: problem,
			message: "GET /api/v1/hello failed with 404",
		});
	});
});
