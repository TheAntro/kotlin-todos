# AGENTS.md

Todos app monorepo: users sign in with Logto, then create, list, update and delete their own todos.

## Layout

- `apps/backend` – Kotlin + Spring Boot REST API (Postgres, JWT resource server). See `apps/backend/AGENTS.md`.
- `apps/frontend` – TanStack Start (React) UI. See `apps/frontend/AGENTS.md`.
- `bruno/` – Bruno collection for calling the API by hand; a collection pre-request script fetches an M2M access token using credentials from `bruno/.env` (gitignored, see `bruno/.env.example`).
- `compose.yaml` – local Postgres; `--profile app` runs the full stack from the production Dockerfiles.
- `mise.toml` – pinned toolchain (Java, Node, pnpm) and all dev tasks.

## Commands

Run from the repo root (`mise tasks` lists everything):

- `mise install && mise run setup` – install toolchain and dependencies
- `mise run dev` – Postgres + backend + frontend with hot reload
- `mise run test` – all tests, backend and frontend in parallel (needs Docker)
- `mise run backend:test` – backend tests (needs Docker)
- `mise run backend:check` – backend lint + format check (`mise run backend:format` to fix)
- `mise run frontend:check` – frontend lint + format check
- `mise run frontend:test` – frontend unit tests (Vitest)

## Auth

- Logto is the identity provider. The frontend handles sign-in and sends the access token as `Authorization: Bearer <token>`.
- The backend validates JWTs against `JWT_ISSUER_URI` and scopes all todo data to the token's `sub`.

## Conventions

- Keep tool versions in sync across `mise.toml` and the Dockerfiles.
- When you add, rename or remove a mise task, or change an env var, update `README.md` to match.
- Configuration comes from env vars with local-dev defaults; never commit secrets.
- Keep changes minimal and run the relevant check task before finishing.
