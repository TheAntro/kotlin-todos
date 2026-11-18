# AGENTS.md – e2e

Playwright end-to-end tests: the main test suite for the app. They drive Chromium against the running app (`E2E_BASE_URL`, default `http://localhost:3000`) and sign in through the real Logto sign-in page with a test user (`E2E_USERNAME`/`E2E_PASSWORD` from the root `.env`).

## Commands

Run from the repo root, with the app running (`mise run dev` or `mise run stack:up`):

- `mise run e2e:test` – run the tests (`cd e2e && pnpm report` for the HTML report)
- `mise run e2e:ui` – Playwright UI mode
- `mise run e2e:check` – Biome + TypeScript check

## Layout

- `tests/auth.setup.ts` – signs in once and saves the session to `playwright/.auth/user.json`.
- `tests/signed-in/` – start already signed in (the `signed-in` project depends on `setup`).
- `tests/signed-out/` – start without a session; sign-in/sign-out flows.
- `tests/sign-in.ts` – helpers for the Logto sign-in form.

## Conventions

- Test through the UI like a user: prefer `getByRole`/`getByText`, and avoid test IDs and calling the backend directly.
- Never sign out with the shared session: sign-out revokes its refresh token and breaks the other tests. Sign in with `signIn(page)` first, as `signed-out/auth.spec.ts` does.
- All tests share one user and run in parallel. Create your own data with unique values (e.g. include `test.info().testId`) and assert only on that, never on totals or empty lists.
- Biome style: tabs, double quotes.
