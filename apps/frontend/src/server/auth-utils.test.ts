import { LogtoClientError, LogtoRequestError } from "@logto/node";
import { describe, expect, it } from "vitest";
import { isSessionDead, publicCallbackUrl, safeReturnTo } from "./auth-utils";

describe("safeReturnTo", () => {
	it.each([
		["/profile", "/profile"],
		["/todos?filter=done#top", "/todos?filter=done#top"],
		["/", "/"],
	])("keeps same-site path %s", (input, expected) => {
		expect(safeReturnTo(input)).toBe(expected);
	});

	it.each([
		["protocol-relative URL", "//evil.example"],
		["backslash variant", "/\\evil.example"],
		["absolute URL", "https://evil.example/profile"],
		["javascript URL", "javascript:alert(1)"],
		["relative path", "profile"],
		["empty string", ""],
		["null", null],
		["undefined", undefined],
	])("falls back to / for %s", (_, input) => {
		expect(safeReturnTo(input)).toBe("/");
	});
});

describe("publicCallbackUrl", () => {
	it("puts the request's path and query on the public base URL", () => {
		expect(
			publicCallbackUrl(
				"http://internal:8080/callback?code=a%2Bb&state=s",
				"https://app.example.com",
			),
		).toBe("https://app.example.com/callback?code=a%2Bb&state=s");
	});
});

describe("isSessionDead", () => {
	// The shape Logto's requester throws for a JSON error response from the token endpoint
	const tokenEndpointError = (status: number) =>
		new LogtoRequestError(
			status === 400 ? "oidc.invalid_grant" : "some_error",
			"Token request failed",
			new Response(null, { status }),
		);

	it("is dead when the session has no tokens", () => {
		expect(isSessionDead(new LogtoClientError("not_authenticated"))).toBe(true);
	});

	it.each([
		400, 401,
	])("is dead when the token endpoint rejects the refresh token (%i)", (status) => {
		expect(isSessionDead(tokenEndpointError(status))).toBe(true);
	});

	it.each([
		429, 500, 502, 503,
	])("keeps the session when the token endpoint answers %i", (status) => {
		expect(isSessionDead(tokenEndpointError(status))).toBe(false);
	});

	it("keeps the session on network errors and timeouts", () => {
		expect(isSessionDead(new TypeError("fetch failed"))).toBe(false);
		expect(
			isSessionDead(
				new DOMException("The operation timed out", "TimeoutError"),
			),
		).toBe(false);
	});
});
