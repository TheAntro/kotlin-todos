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

## Stack

- File-based routing in `src/routes`; `src/routeTree.gen.ts` is generated – don't edit it.
- Data fetching with TanStack Query (`src/integrations/tanstack-query`); use query/mutation hooks and invalidate todo queries after mutations.
- Logto handles sign-in; attach the access token as `Authorization: Bearer <token>` on backend API calls.
- Backend API: Spring Boot on `http://localhost:8080`, endpoints under `/api/todos`.

## Conventions

- Import from `src` with the `#/` alias (e.g. `#/router`).
- Biome style: tabs, double quotes; keep it passing.
- Style with Tailwind utility classes; keep components small and colocated with their route when only used there.
- Protect todo routes: redirect unauthenticated users to sign-in.
