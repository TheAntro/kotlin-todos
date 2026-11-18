import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const { auth } = Route.useRouteContext();

	return (
		<div className="p-8">
			<h1 className="text-4xl font-bold">Todos</h1>
			{auth.isAuthenticated ? (
				<p className="mt-4 text-lg">
					Signed in.{" "}
					<Link to="/profile" className="underline">
						Check your profile and the backend connection
					</Link>
					.
				</p>
			) : (
				<p className="mt-4 text-lg">
					<a href="/api/auth/sign-in" className="underline">
						Sign in
					</a>{" "}
					to manage your todos.
				</p>
			)}
		</div>
	);
}
