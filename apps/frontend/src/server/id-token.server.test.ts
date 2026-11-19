import { describe, expect, it, vi } from "vitest";
import { createIdTokenSource } from "./id-token.server";

function jwt(exp: number) {
	const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
	return `header.${payload}.signature`;
}

describe("createIdTokenSource", () => {
	it("asks the metadata server for the audience and caches the token", async () => {
		const token = jwt(3600);
		const fetch = vi.fn<typeof globalThis.fetch>(
			async () => new Response(token),
		);
		const get = createIdTokenSource("https://backend.test", fetch, () => 0);

		await expect(get()).resolves.toBe(token);
		await expect(get()).resolves.toBe(token);

		expect(fetch).toHaveBeenCalledTimes(1);
		const [url, init] = fetch.mock.calls[0] ?? [];
		expect(url).toContain("audience=https%3A%2F%2Fbackend.test");
		expect(init?.headers).toEqual({ "Metadata-Flavor": "Google" });
	});

	it("fetches a new token shortly before the cached one expires", async () => {
		const fetch = vi.fn<typeof globalThis.fetch>(
			async () => new Response(jwt(3600)),
		);
		let now = 0;
		const get = createIdTokenSource("aud", fetch, () => now);

		await get();
		now = 3000 * 1000; // 10 minutes left
		await get();
		expect(fetch).toHaveBeenCalledTimes(1);

		now = 3400 * 1000; // under 5 minutes left
		await get();
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	it("shares one fetch between concurrent callers and retries after a failure", async () => {
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockResolvedValueOnce(new Response("", { status: 500 }))
			.mockResolvedValue(new Response(jwt(3600)));
		const get = createIdTokenSource("aud", fetch, () => 0);

		const results = await Promise.allSettled([get(), get()]);
		expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
		expect(fetch).toHaveBeenCalledTimes(1);

		await expect(get()).resolves.toBe(jwt(3600));
	});
});
