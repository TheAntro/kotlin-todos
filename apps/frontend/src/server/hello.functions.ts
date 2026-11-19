import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { hello } from "#/api/generated";
import { authMiddleware } from "./auth.functions";
import { backendOptions } from "./backend.server";

// Example authenticated backend call; todo server functions follow the same pattern.
export const getHello = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		const { data } = await hello(backendOptions(context.accessToken));
		return data;
	});

export const helloQueryOptions = queryOptions({
	queryKey: ["hello"],
	queryFn: () => getHello(),
});
