<!-- intent-skills:start -->
## Skill Loading

Use the repository’s installed Intent. If it is unavailable, report the missing dependency instead of downloading a replacement.
Before editing files for a substantial task:
- Run `pnpm exec intent list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm exec intent load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

# AGENTS.md – frontend

TanStack Start (React 19) UI for todos, built with Vite and Tailwind CSS v4. Package manager: pnpm.

## Commands

- `pnpm dev` – dev server on :3000
- `pnpm build` – production build
- `pnpm check` – Biome lint + format check (`pnpm biome check --write` to fix)
- `pnpm test` – Vitest unit tests

## Stack

- File-based routing in `src/routes`; `src/routeTree.gen.ts` is generated – don't edit it.
- Data fetching with TanStack Query (`src/integrations/tanstack-query`); use query/mutation hooks and invalidate todo queries after mutations.
- Auth is server-side (BFF): `@logto/node` + iron-session cookie in `src/server/logto.server.ts`; sign-in/out are server routes (`/api/auth/sign-in`, `/api/auth/sign-out`, `/callback`). Tokens never go to the browser.
- Call the backend only from server functions that use `authMiddleware` (`src/server/auth.functions.ts`), passing `context.accessToken` to `backendFetch` (`src/server/backend.server.ts`). See `src/server/hello.functions.ts`.
- Prefetch authenticated data in the route `loader` (`context.queryClient.ensureQueryData(...)`), then read it with `useSuspenseQuery`. A server function that first runs during streaming SSR may refresh the access token after the headers are sent, and the rotated session cookie is then silently lost.
- Backend API: Spring Boot on `API_BASE_URL` (default `http://localhost:8080`), endpoints under `/api/todos`.

## Conventions

- Import from `src` with the `#/` alias (e.g. `#/router`).
- Biome style: tabs, double quotes; keep it passing.
- Style with Tailwind utility classes; keep components small and colocated with their route when only used there.
- Test mostly at the UI level. Unit test (Vitest, `*.test.ts` next to the code) only fragile pure logic, such as `src/server/auth-utils.ts`; keep it free of request context so it can be tested without mocks.
- Protect todo routes by putting them under `src/routes/_authenticated/`, which redirects to sign-in. That's UX only; server functions must still use `authMiddleware`.
