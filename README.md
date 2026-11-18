# Todos

A todo app: sign in with Logto, then manage your own todos.

- `apps/backend` – Kotlin + Spring Boot REST API with Postgres
- `apps/frontend` – TanStack Start (React) UI
- `e2e` – Playwright end-to-end tests for the whole stack

## Getting started

You need [mise](https://mise.jdx.dev) and Docker. mise installs the right Java, Node and pnpm versions for you.

```sh
mise install       # install Java, Node and pnpm
mise run setup     # install git hooks and frontend packages, download backend dependencies
cp .env.example .env  # then fill in JWT_ISSUER_URI and the LOGTO_* / SESSION_SECRET values (see Sign-in below)
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
| `mise run test` | Run the backend and frontend tests in parallel. Docker must be running for the backend tests. Doesn't include the e2e tests, which need a running app (see [End-to-end tests](#end-to-end-tests-playwright)). |
| `mise run backend:test` | Run the backend tests. Docker must be running, because the tests start their own Postgres. |
| `mise run backend:check` | Check the backend's formatting (ktlint) and run static analysis (detekt). |
| `mise run backend:format` | Fix the backend's formatting. |
| `mise run frontend:check` | Lint and format-check the frontend. To fix problems, run `pnpm biome check --write` in `apps/frontend`. |
| `mise run frontend:typecheck` | Type-check the frontend with TypeScript. |
| `mise run frontend:test` | Run the frontend unit tests (Vitest). |

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
| `mise run e2e:install` | Reinstall only the e2e test packages and the Playwright browser. |
| `mise run hooks:install` | Reinstall only the git hooks. |

### Git hooks

`mise run setup` installs a pre-commit hook ([lefthook](https://lefthook.dev), configured in `lefthook.yml`). When you commit, it formats the staged files and adds the fixes to the commit: Biome for the frontend and e2e tests, ktlint (Spotless) for the backend. Slower checks (detekt, typecheck, tests, Docker builds) run in CI on every pull request. To skip the hook once, use `git commit --no-verify`.

## Sign-in

The frontend signs users in with Logto on its own server (TanStack Start), not in the browser. Tokens live in an encrypted, HttpOnly session cookie ([iron-session](https://github.com/vvo/iron-session)), and the frontend server calls the backend with the user's access token. The browser never sees a token and never calls the backend directly, so the backend needs no CORS setup.

To set it up in the Logto console:

1. Create a **Traditional Web** application.
2. Add `http://localhost:3000/callback` as a redirect URI and `http://localhost:3000/` as a post sign-out redirect URI.
3. Make sure an API resource with the backend's `JWT_AUDIENCE` (default `https://api.todos.local`) exists.
4. Put the endpoint, app ID and app secret in `.env` as `LOGTO_ENDPOINT`, `LOGTO_APP_ID` and `LOGTO_APP_SECRET`, and set `SESSION_SECRET` (`openssl rand -hex 32`).

## End-to-end tests (Playwright)

`e2e/` holds the Playwright tests, the main test suite for the app as a whole. They drive a real browser against the running app and sign in through Logto with a real test user, so they cover the frontend, backend, database and sign-in together.

1. In Logto, create a test user that signs in with a username (or email) and password, with no MFA or captcha. A separate Logto tenant for development and tests keeps test users away from real ones.
2. Put its credentials in `.env` as `E2E_USERNAME` and `E2E_PASSWORD`, next to the sign-in settings above.
3. Start the app with `mise run dev` (or `mise run stack:up`), then run the tests:

| Command | When to use it |
| --- | --- |
| `mise run e2e:test` | Run all e2e tests headless. `cd e2e && pnpm report` opens the HTML report afterwards. |
| `mise run e2e:ui` | Playwright's UI mode: pick tests, watch them run, step through traces. |
| `mise run e2e:check` | Lint, format check and type-check the tests. |

How the tests are organised:

- A `setup` project signs in once and saves the browser session to `e2e/playwright/.auth/` (gitignored). Tests in `tests/signed-in/` start from it, already signed in.
- Tests in `tests/signed-out/` start without a session and cover sign-in and sign-out themselves. A test that signs out must sign in on its own, because signing out revokes the shared session's refresh token.
- Todos belong to the signed-in user and tests run in parallel with the same user, so each test should create its own data (for example with unique titles) and check only that.

CI runs them in the `E2E (Playwright)` job against the Docker stack. It needs these repository secrets: `JWT_ISSUER_URI`, `LOGTO_ENDPOINT`, `LOGTO_APP_ID`, `LOGTO_APP_SECRET`, `SESSION_SECRET`, `E2E_USERNAME` and `E2E_PASSWORD`, and the runner has to be able to reach Logto. Pull requests from forks don't get secrets, so the job fails there. The HTML report is uploaded as the `playwright-report` artifact.

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
| `JWT_AUDIENCE` | API/resource identifier that tokens must be issued for (`aud` claim) (default `https://api.todos.local`). The frontend requests tokens for the same resource. |
| `LOGTO_ENDPOINT`, `LOGTO_APP_ID`, `LOGTO_APP_SECRET` | **Required for sign-in.** The frontend's Logto Traditional Web app. `LOGTO_ENDPOINT` is the issuer without `/oidc`. |
| `SESSION_SECRET` | **Required for sign-in.** At least 32 characters; encrypts the frontend's session cookie. Changing it signs everyone out. |
| `APP_BASE_URL` | Public URL of the frontend (default `http://localhost:3000`). Logto redirects back to `<APP_BASE_URL>/callback`. Use `https://` in production so the cookie is `Secure`. |
| `API_BASE_URL` | Where the frontend server reaches the backend (default `http://localhost:8080`). |
| `E2E_USERNAME`, `E2E_PASSWORD` | Logto test user for the e2e tests. |
| `E2E_BASE_URL` | App URL the e2e tests open (default `http://localhost:3000`). |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Database connection. Defaults to the local Postgres from `compose.yaml`. |
| `PORT` | Backend port (default `8080`). |
| `POSTGRES_PORT` | Host port for local Postgres (default `5432`). Change it if something else already uses 5432, and update `DB_URL` to match. |

For local development, put these in a `.env` file in the repo root (copy `.env.example`). It's gitignored, and both mise and `docker compose` load it automatically.

Never commit secrets.
