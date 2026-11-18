import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { helloQueryOptions } from "#/server/hello.functions";

export const Route = createFileRoute("/_authenticated/profile")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(helloQueryOptions),
	component: Profile,
});

function Profile() {
	const { user } = Route.useRouteContext();
	const { data: hello } = useSuspenseQuery(helloQueryOptions);

	return (
		<div className="p-8">
			<h1 className="text-3xl font-bold">Profile</h1>
			<dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
				<dt className="font-medium">Name</dt>
				<dd>{user.name ?? "–"}</dd>
				<dt className="font-medium">Email</dt>
				<dd>{user.email ?? "–"}</dd>
				<dt className="font-medium">User ID</dt>
				<dd className="font-mono">{user.id}</dd>
			</dl>
			<h2 className="mt-8 text-xl font-semibold">Backend says</h2>
			<p className="mt-2">
				{hello.message} (subject{" "}
				<span className="font-mono">{hello.subject}</span>)
			</p>
		</div>
	);
}
