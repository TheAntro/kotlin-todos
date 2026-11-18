import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

// Layout for pages that need a signed-in user. This is page UX only: server functions
// enforce auth themselves with authMiddleware.
export const Route = createFileRoute("/_authenticated")({
	beforeLoad: ({ context, location }) => {
		if (!context.auth.isAuthenticated) {
			throw redirect({
				href: `/api/auth/sign-in?returnTo=${encodeURIComponent(location.href)}`,
				reloadDocument: true,
			});
		}
		return { user: context.auth.user };
	},
	component: Outlet,
});
