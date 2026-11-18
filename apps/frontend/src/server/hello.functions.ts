import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./auth.functions";
import { backendFetch } from "./backend.server";

type HelloResponse = { message: string; subject: string };

// Example authenticated backend call; todo server functions follow the same pattern.
export const getHello = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		backendFetch<HelloResponse>(context.accessToken, "/api/v1/hello"),
	);

export const helloQueryOptions = queryOptions({
	queryKey: ["hello"],
	queryFn: () => getHello(),
});
