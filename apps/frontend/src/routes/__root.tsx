import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { type AuthState, authQueryOptions } from "#/server/auth.functions";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	beforeLoad: async ({ context }) => ({
		auth: await context.queryClient.ensureQueryData(authQueryOptions),
	}),
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Todos",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<Header />
				{children}
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						TanStackQueryDevtools,
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}

function Header() {
	const { auth } = Route.useRouteContext();
	return (
		<header className="flex items-center justify-between border-b px-8 py-4">
			<Link to="/" className="text-xl font-bold">
				Todos
			</Link>
			<AuthControls auth={auth} />
		</header>
	);
}

function AuthControls({ auth }: { auth: AuthState }) {
	if (!auth.isAuthenticated) {
		// Plain links/forms: these are server routes, so they need a full page load
		return (
			<a href="/api/auth/sign-in" className="font-medium underline">
				Sign in
			</a>
		);
	}
	return (
		<div className="flex items-center gap-4">
			<span>{auth.user.name ?? auth.user.email ?? "Signed in"}</span>
			<form method="post" action="/api/auth/sign-out">
				<button type="submit" className="font-medium underline">
					Sign out
				</button>
			</form>
		</div>
	);
}
