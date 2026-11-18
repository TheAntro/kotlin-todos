import LogtoClient, { UserScope } from "@logto/node";
import {
	getCookie,
	getCookies,
	getRequest,
	setCookie,
} from "@tanstack/react-start/server";
import { getIronSession, type IronSession } from "iron-session";
import { serverEnv } from "./env.server";

// Logto's token storage (ID token, refresh token, access tokens, sign-in state) lives in an
// encrypted iron-session cookie, so tokens never reach browser JavaScript.
type SessionData = {
	logto: Record<string, string>;
	// Where to send the user after the sign-in callback
	returnTo: string;
};

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

export type Logto = {
	client: LogtoClient;
	session: IronSession<SessionData>;
	/** Writes the session cookie if Logto changed anything (e.g. refreshed a token). */
	save: () => Promise<void>;
	/** The URL Logto asked to navigate to during signIn/signOut. */
	navigateUrl: () => string | undefined;
};

// One client per request: parallel server functions in the same request share the session and
// don't each refresh (and rotate) the refresh token on their own.
const perRequest = new WeakMap<Request, Promise<Logto>>();

export function getLogto(): Promise<Logto> {
	const request = getRequest();
	let logto = perRequest.get(request);
	if (!logto) {
		logto = createLogto();
		perRequest.set(request, logto);
	}
	return logto;
}

async function createLogto(): Promise<Logto> {
	const env = serverEnv();
	const secure = env.appBaseUrl.startsWith("https://");

	const session = await getIronSession<SessionData>(
		{
			get: (name) => {
				const value = getCookie(name);
				return value === undefined ? undefined : { name, value };
			},
			getAll: () =>
				Object.entries(getCookies()).map(([name, value]) => ({ name, value })),
			set: (name, value, { expires, ...options }) =>
				setCookie(name, value, {
					...options,
					// The cookie store spec allows epoch millis; TanStack wants a Date
					expires: typeof expires === "number" ? new Date(expires) : expires,
				}),
		},
		{
			cookieName: secure ? "__Host-todos-session" : "todos-session",
			password: env.sessionSecret,
			ttl: SESSION_TTL_SECONDS,
			cookieOptions: { httpOnly: true, secure, sameSite: "lax", path: "/" },
			// Tokens can push the sealed session slightly over the 4 KB cookie limit
			chunk: true,
			onUnsealError: (reason) => {
				if (reason !== "expired") {
					console.warn(`Rejected session cookie: ${reason}`);
				}
			},
		},
	);

	let dirty = false;
	let navigateUrl: string | undefined;

	const client = new LogtoClient(
		{
			endpoint: env.logtoEndpoint,
			appId: env.logtoAppId,
			appSecret: env.logtoAppSecret,
			resources: [env.apiResource],
			// openid, profile and offline_access (for refresh tokens) are always included
			scopes: [UserScope.Email],
		},
		{
			navigate: (url) => {
				navigateUrl = url;
			},
			storage: {
				getItem: async (key) => session.logto?.[key] ?? null,
				setItem: async (key, value) => {
					session.logto = { ...session.logto, [key]: value };
					dirty = true;
				},
				removeItem: async (key) => {
					if (session.logto && key in session.logto) {
						const { [key]: _removed, ...rest } = session.logto;
						session.logto = rest;
						dirty = true;
					}
				},
			},
		},
	);

	return {
		client,
		session,
		save: async () => {
			if (dirty) {
				dirty = false;
				await session.save();
			}
		},
		navigateUrl: () => navigateUrl,
	};
}

/** Redirect response that keeps the Set-Cookie headers queued by setCookie. */
export function redirectTo(location: string): Response {
	return new Response(null, { status: 302, headers: { Location: location } });
}
