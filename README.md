# Todos

A todo app: sign in with Logto, then manage your own todos.

- `apps/backend` – Kotlin + Spring Boot REST API with Postgres
- `apps/frontend` – TanStack Start (React) UI

## Getting started

You need [mise](https://mise.jdx.dev) and Docker. mise installs the right Java, Node and pnpm versions for you.

```sh
mise install       # install Java, Node and pnpm
mise run setup     # install git hooks and frontend packages, download backend dependencies
cp .env.example .env  # then set JWT_ISSUER_URI to your OIDC issuer
mise run dev       # start everything with hot reload
```

Then open http://localhost:3000. The API runs on http://localhost:8080, and its docs are at http://localhost:8080/swagger-ui.html.

## Commands

Run these from the repo root. `mise tasks` lists them all.

### Day to day

| Command | When to use it |
| --- | --- |
| `mise run dev` | Normal development. Starts Postgres, the backend and the frontend, and reloads them when you change code. |
| `mise run backend:dev` | Work on the backend only (also starts Postgres). |
| `mise run frontend:dev` | Work on the frontend only. |

### Checks

Run these before you push.

| Command | When to use it |
| --- | --- |
| `mise run backend:test` | Run the backend tests. Docker must be running, because the tests start their own Postgres. |
| `mise run backend:check` | Check the backend's formatting (ktlint) and run static analysis (detekt). |
| `mise run backend:format` | Fix the backend's formatting. |
| `mise run frontend:check` | Lint and format-check the frontend. To fix problems, run `pnpm biome check --write` in `apps/frontend`. |
| `mise run frontend:typecheck` | Type-check the frontend with TypeScript. |

### Database

| Command | When to use it |
| --- | --- |
| `mise run db:up` | Start Postgres on its own, e.g. if you run the backend from your IDE. |
| `mise run db:down` | Stop Postgres. Your data is kept. |
| `mise run db:psql` | Open a SQL shell in the local database. |
| `mise run db:reset` | Delete all local data and start a fresh database. Use it when your local data or migrations get into a bad state. |

### Production-like stack

| Command | When to use it |
| --- | --- |
| `mise run stack:up` | Build and run the whole app in Docker from the production Dockerfiles. Use it to check that the images build and work together. No hot reload. |
| `mise run stack:down` | Stop that stack. |

### Setup

| Command | When to use it |
| --- | --- |
| `mise run setup` | First time, and after pulling changes that add dependencies. |
| `mise run frontend:install` | Reinstall only the frontend packages. |
| `mise run hooks:install` | Reinstall only the git hooks. |

### Git hooks

`mise run setup` installs a pre-commit hook ([lefthook](https://lefthook.dev), configured in `lefthook.yml`). When you commit, it formats the staged files and adds the fixes to the commit: Biome for the frontend, ktlint (Spotless) for the backend. Slower checks (detekt, typecheck, tests, Docker builds) run in CI on every pull request. To skip the hook once, use `git commit --no-verify`.

## API requests (Bruno)

`bruno/` is a [Bruno](https://www.usebruno.com) collection for calling the API by hand. A collection pre-request script gets an access token from a machine-to-machine app at your identity provider (client credentials grant), and requests whose auth is set to inherit send it as a bearer token.

1. Copy `bruno/.env.example` to `bruno/.env` and fill in the token URL and the M2M app's client ID and secret.
2. In Bruno, choose **Open Collection** and select the `bruno` folder.
3. Pick the `local` environment and run a request.

If Bruno can't load `axios` in the pre-request script, switch the collection to Developer Mode.

## Configuration

Settings come from environment variables, with defaults that work for local development. The ones you're most likely to need:

| Variable | What it does |
| --- | --- |
| `JWT_ISSUER_URI` | **Required.** OpenID Connect issuer that the backend trusts for access tokens (must match the tokens' `iss` claim). It has no default, so it stays out of the repo. Tests don't need it. |
| `JWT_AUDIENCE` | API/resource identifier that tokens must be issued for (`aud` claim) (default `https://api.todos.local`). |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Database connection. Defaults to the local Postgres from `compose.yaml`. |
| `PORT` | Backend port (default `8080`). |
| `POSTGRES_PORT` | Host port for local Postgres (default `5432`). Change it if something else already uses 5432, and update `DB_URL` to match. |

For local development, put these in a `.env` file in the repo root (copy `.env.example`). It's gitignored, and both mise and `docker compose` load it automatically.

Never commit secrets.
