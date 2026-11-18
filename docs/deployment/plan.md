# Deployment plan: Cloud Run + Neon + Cloudflare

Status: **planned, not started**. Target: deploy the frontend and backend to Google Cloud Run, the database to Neon and DNS to Cloudflare. All infra is in Terraform, and infra changes, migrations and deployments run in one GitHub Actions workflow. GitHub Actions reaches GCP through Workload Identity Federation (WIF), so there are no service account keys.

Scope: this increment builds a **staging** environment that deploys on every push to `main` and runs the e2e tests against it. Production and PR previews are later increments (see [Later increments](#later-increments)). The Terraform is written per environment so production can reuse it.

## Architecture

```
browser ──https──▶ Cloudflare DNS ──▶ Cloud Run: frontend (public, staging.<domain>)
                                            │  server-side fetch
                                            │  X-Serverless-Authorization: <Google ID token>
                                            │  Authorization: Bearer <Logto token>
                                            ▼
                                     Cloud Run: backend (no public invoker)
                                            │
                                            ▼
                                     Neon Postgres (pooled endpoint)
```

- Only the **frontend** is public and has a custom domain.
- The **backend** accepts calls only from the frontend's runtime service account (see [Backend access](#backend-access)). It still validates the Logto JWT, so Cloud Run checks which service is calling and the JWT checks which user the call is for.
- **One GCP project and one Neon project per environment** (`kotlin-todos-staging` now, `kotlin-todos-prod` later), so IAM, quotas and billing stay separate and the same Terraform applies to each with different variables.

## Configuration and secrets

Nothing is set by hand in Secret Manager. Values that come from outside live as **GitHub environment secrets**, the workflow passes them to Terraform as `TF_VAR_*`, and Terraform writes them into Secret Manager as secret versions. Terraform generates the rest (Neon role password, `SESSION_SECRET` via `random_password`).

- All secret values end up in Terraform state. The state already holds the Neon password, so the state bucket is protected like a secret store either way (see [Stage 2](#stage-2-bootstrap-infrabootstrap)). Keeping the Logto values out of state is possible with the Google provider's write-only `secret_data_wo`, but every rotation then needs a manual `secret_data_wo_version` bump. Not worth it now.
- Cloud Run references each secret by the **version number Terraform created**, not `latest`. Changing a value in GitHub → the next apply adds a secret version → Cloud Run gets a new revision with the new value and the currently deployed image.
- `LOGTO_ENDPOINT` and `JWT_ISSUER_URI` aren't credentials, but they're stored as secrets so they're masked in logs and never committed.

### GitHub `staging` environment

| Kind | Name | Used by |
|---|---|---|
| Variable | `GCP_PROJECT_ID`, `WIF_PROVIDER`, `TERRAFORM_SA`, `DEPLOYER_SA` | WIF auth (needed before Terraform runs) |
| Secret | `NEON_API_KEY`, `CLOUDFLARE_API_TOKEN` | Terraform providers |
| Secret | `LOGTO_ENDPOINT`, `LOGTO_APP_ID`, `LOGTO_APP_SECRET`, `JWT_ISSUER_URI` | Terraform → Secret Manager |
| Secret | `E2E_USERNAME`, `E2E_PASSWORD` | e2e job |

Other non-secret settings (region, domain, Neon region, Logto API resource) go in `infra/envs/staging.tfvars`. Everything else the workflow needs (Artifact Registry path, service names, staging URL) comes from `terraform output`.

### Runtime env vars

| Service | Variable | Value | Source |
|---|---|---|---|
| backend | `DB_URL` | `jdbc:postgresql://<pooler host>/<db>?sslmode=require` | plain, from Neon resources |
| backend | `DB_USERNAME` / `DB_PASSWORD` | Neon role | plain / secret |
| backend | `DB_POOL_SIZE` | e.g. `5` | plain |
| backend | `JWT_ISSUER_URI` | Logto issuer | secret |
| backend | `JWT_AUDIENCE` | Logto API resource | plain |
| backend | `SPRING_FLYWAY_ENABLED` | `false` (the workflow migrates) | plain |
| backend | `API_DOCS_ENABLED` | `false` | plain |
| frontend | `APP_BASE_URL` | `https://staging.<domain>` (`https` turns on the `__Host-` secure session cookie) | plain |
| frontend | `API_BASE_URL` | backend service `uri` | plain, Terraform reference |
| frontend | `BACKEND_AUDIENCE` | backend custom audience | plain (new) |
| frontend | `JWT_AUDIENCE` | Logto API resource | plain |
| frontend | `LOGTO_ENDPOINT`, `LOGTO_APP_ID`, `LOGTO_APP_SECRET` | Logto app | secret |
| frontend | `SESSION_SECRET` | generated | secret |

Each runtime service account gets `roles/secretmanager.secretAccessor` on its own secrets only.

## Stages

Each stage ends with a check that must pass before the next starts. `deploy.yml` grows stage by stage. Stage 5's app change can be done in parallel with stages 2–4, since it changes nothing locally.

### Stage 1: Accounts and manual setup

| Service | Manual step |
|---|---|
| GCP | Google account, **billing account**, project `kotlin-todos-staging` linked to it. `gcloud auth application-default login` for the bootstrap. |
| Neon | Sign up and create an **org API key** → `NEON_API_KEY`. |
| Cloudflare | Add the domain as a zone (change nameservers at the registrar if it's registered elsewhere). API token scoped to Zone → DNS:Edit on that zone only → `CLOUDFLARE_API_TOKEN`. |
| Logto | Reuse the existing app: add redirect URI `https://staging.<domain>/callback` and post sign-out URI `https://staging.<domain>/`; the API resource; the e2e test user. No official Terraform provider. → `LOGTO_*`, `JWT_ISSUER_URI`, `E2E_*`. **Never commit the issuer URL.** |
| GitHub | Environment `staging`, deployment branches limited to `main`, no required reviewers (staging deploys on every merge). Add the secrets above. |

**Done when:** all secrets are in the `staging` environment and the domain's zone is active in Cloudflare.

### Stage 2: Bootstrap (`infra/bootstrap/`)

Run once from a laptop with local state, then `terraform init -migrate-state` into the bucket it creates.

- Enable APIs: IAM, IAM Credentials, STS, Cloud Run, Artifact Registry, Secret Manager, Cloud Resource Manager, Site Verification, Cloud Billing Budgets.
- **State bucket**: uniform bucket-level access, `public_access_prevention = "enforced"`, versioning, soft delete, IAM limited to the owner and `terraform@`.
- **WIF pool and GitHub OIDC provider**: `attribute_condition` pinned to the repository's numeric ID (`assertion.repository_id == "<id>"`, so a deleted and recreated repo with the same name can't get access), and `attribute.environment = assertion.environment` mapped.
- CI service accounts, both impersonable only by `principalSet://…/attribute.environment/staging`, i.e. only from jobs in the `staging` environment, which only `main` can use:
  - `terraform@`: broad rights on the project (it creates service accounts, IAM bindings, secrets and services).
  - `deployer@`: `roles/run.developer`, `roles/artifactregistry.writer`, `roles/iam.serviceAccountUser` on the runtime service accounts only, and `secretAccessor` on the migration secrets (`db-direct-url`, `db-password`).
- **Billing budget alert**: here rather than in the main stack, because it needs rights on the billing account, which the bootstrap user has and `terraform@` doesn't. With user credentials the provider needs `billing_project` and `user_project_override = true`.

**Done when:** a minimal `deploy.yml` (`workflow_dispatch`, `environment: staging`, `google-github-actions/auth` as each service account) succeeds.

### Stage 3: Main stack (`infra/`)

GCS backend with prefix `staging`, variables from `infra/envs/staging.tfvars`. Added to `deploy.yml` as the `infra` job (see [Workflow](#workflow-deployyml)).

- **Artifact Registry** Docker repo with a cleanup policy (keep the last N images).
- **Runtime service accounts** for `frontend` and `backend`.
- **Neon** (`kislerdm/neon` provider): project in the chosen region. Use the default branch, database and role the project comes with (`default_branch_id` etc.); don't create a second `main` branch. Neon returns `postgresql://` URIs, so Terraform builds the JDBC URLs: pooled host for the app, direct host for migrations (`db-direct-url` secret).
- **Secret Manager**: secrets and versions as in [Configuration and secrets](#configuration-and-secrets).
- **Cloud Run** `backend` and `frontend`:
  - Placeholder image `us-docker.pkg.dev/cloudrun/container/hello` and the ownership split below.
  - Env vars and secret references as in the table.
  - Backend: no `allUsers`; `roles/run.invoker` for the frontend's service account; `custom_audiences`. Startup probe on `/actuator/health/readiness` and liveness probe on `/actuator/health/liveness` (both are open in `SecurityConfig`); startup CPU boost; 1 vCPU / 1 GiB.
  - Frontend: `allUsers` invoker; 512 MiB.
  - Both: min instances 0 (staging; accept cold starts), max instances 2 (caps cost and DB connections).

**Ownership split:** Terraform creates the services with a placeholder image and

```hcl
lifecycle {
  ignore_changes = [template[0].containers[0].image, client, client_version]
}
```

GitHub Actions owns which image is deployed. Without this, `terraform apply` rolls the services back to the placeholder.

**Done when:** the frontend's `run.app` URL serves the placeholder, and the backend's returns 403 without an ID token.

### Stage 4: Custom domain

Chosen: **Cloud Run domain mapping** for the frontend (`staging.<domain>`), because it's free.

- Free. Cloudflare CNAME `staging` → `ghs.googlehosted.com`, **DNS-only (grey cloud)**, or Google's managed certificate won't issue. Cloudflare provider v5 calls the resource `cloudflare_dns_record`.
- Only some regions support it; `europe-north1` is one of them.
- Domain verification in Terraform: `google_site_verification_token` data source → Cloudflare TXT record → `google_site_verification_web_resource`, with `terraform@` as an owner.
- Google labels domain mapping as preview and not recommended for production. Fine for staging; revisit for production.

Alternative if needed later: a global external HTTPS load balancer with a serverless network endpoint group (about $18/month). Works in any region, allows Cloudflare proxying (orange cloud) and Cloud Armor.

**Done when:** `https://staging.<domain>` serves the placeholder with a valid certificate (issuing can take up to an hour).

### Stage 5: App deployment

App change (frontend only; see [Backend access](#backend-access)): the ID-token helper and `BACKEND_AUDIENCE`. The backend needs no change: `SPRING_FLYWAY_ENABLED=false` already turns Flyway off.

`deploy.yml` gets the `build`, `migrate` and `deploy` jobs:

- **Build**: both images, pushed to Artifact Registry tagged with the git SHA.
- **Migrate**: run the just-built backend image in the runner with `SPRING_MAIN_WEB_APPLICATION_TYPE=none`, Flyway on, and `DB_URL`/`DB_PASSWORD` from `db-direct-url`/`db-password` (Neon's **direct**, non-pooler endpoint). This uses exactly the Flyway version and migrations the app ships with, Hibernate's `ddl-auto=validate` checks the entities against the migrated schema, and the app exits once started. Check while implementing that it exits cleanly and doesn't need `JWT_ISSUER_URI` in non-web mode. Fallback: the Flyway CLI image with `apps/backend/src/main/resources/db/migration`, version kept in sync with Spring Boot's.
- Migrations run before the new code is live, so the old revision runs against the new schema for a moment. **Migrations must be backward-compatible** (add first, remove in a later release).
- **Deploy**: `gcloud run services update <service> --image <registry>/<service>:<sha>`, backend first, then frontend. Change only the image; Terraform owns everything else.

**Done when:** signing in on `https://staging.<domain>` works and the signed-in pages load data from the backend.

### Stage 6: e2e against staging

The `e2e` job runs after `deploy`: `E2E_BASE_URL=https://staging.<domain> mise run e2e:test`, with the Playwright report uploaded as in `ci.yml`. The tests create their own uniquely named data, so the data that piles up in staging is harmless.

**Done when:** the e2e job passes in the pipeline.

## Backend access

Chosen: **Cloud Run IAM invoker** (no extra cost, no networking resources).

- Terraform: see the backend bullet in [Stage 3](#stage-3-main-stack-infra). The custom audience (e.g. `https://api.todos.internal`) keeps the ID token audience a fixed value rather than the generated `run.app` URL.
- Frontend (`apps/frontend/src/server/backend.server.ts`): add `X-Serverless-Authorization: Bearer <id-token>` to backend calls. Get the token from the metadata server
  (`http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=<aud>`, header `Metadata-Flavor: Google`) or with `google-auth-library`'s `getIdTokenClient`. Cache it until shortly before it expires. Skip this when `BACKEND_AUDIENCE` is unset, so local dev, Docker Compose and CI are unchanged.
- The Logto token stays in `Authorization`. Cloud Run checks `X-Serverless-Authorization` and passes `Authorization` through to Spring.
- Bruno against the deployed backend: grant your own Google user `run.invoker` and send `gcloud auth print-identity-token --audiences=<aud>` as `X-Serverless-Authorization`.

Optional extra layer (not planned): backend `ingress = internal` and frontend Direct VPC egress. Needs a VPC and subnet, plus Cloud NAT so the frontend can still reach Logto.

## Region

**Cloud Run `europe-north1`** (Finland; supports domain mapping) with **Neon `aws-eu-central-1`** (Frankfurt, the nearest Neon region; Neon has no Nordic region). Every DB round trip pays the Finland–Frankfurt latency (roughly 25–30 ms), so avoid chatty query patterns. The Neon region can't be changed after the project is created, so check `GET /regions` for anything closer right before Stage 3.

## Cost

Target: free or close to it. Everything stays within free tiers at staging traffic:

- Cloud Run: min instances 0, max 2, so idle costs nothing.
- Neon: free plan; compute scales to zero when idle.
- Domain mapping, Cloudflare DNS, WIF: free.
- Artifact Registry: 0.5 GB free; the cleanup policy keeps it under.
- Secret Manager: 6 active secret versions free, then about $0.06 per version per month. Disable old versions on rotation.
- The billing budget alert (Stage 2) catches anything unexpected.

## Workflow: `deploy.yml`

One workflow, on push to `main` and `workflow_dispatch`. Every job runs in the `staging` environment. `concurrency: { group: deploy-staging, cancel-in-progress: false }`, so two runs never overlap and a running deploy is never cut off. Tool versions (Terraform, Java, Node, pnpm) come from `mise.toml` via `jdx/mise-action`.

| Job | Runs as | Does |
|---|---|---|
| `changes` | – | Detects changes under `infra/**` (e.g. `dorny/paths-filter`) |
| `infra` | `terraform@` | Only if `infra/**` changed or on manual dispatch: `terraform init`, `apply -auto-approve -var-file=envs/staging.tfvars` |
| `build` | `deployer@` | After `infra` succeeded or was skipped: build and push both images |
| `migrate` | `deployer@` | Flyway against the direct endpoint |
| `deploy` | `deployer@` | Update the backend image, then the frontend |
| `e2e` | – | Playwright against `https://staging.<domain>` |

- No plan review: `apply` runs unreviewed on merge. Acceptable for staging; production adds plan + approval.
- If an `infra` run fails, the next push won't retry it unless it touches `infra/**`. Re-run it manually (dispatch always applies).
- Building runs third-party build code (Gradle plugins, npm packages), so it runs as `deployer@`, never `terraform@`.

`ci.yml` gets a `terraform` job for PRs: `fmt -check`, `init -backend=false` and `validate` for `infra/` and `infra/bootstrap/`. **No plans on PRs**, because a plan needs the state and the provider tokens.

## Decisions

- [x] Custom domain: Cloud Run domain mapping (free)
- [x] Region: Cloud Run `europe-north1` + Neon `aws-eu-central-1`
- [x] Logto: reuse the existing app, with the staging redirect URIs added
- [x] GitHub environments, variables and secrets: managed by hand in GitHub, not in Terraform

## Later increments

- **Production**: its own GCP project, Neon project and GitHub environment (`production`, required reviewers); the same `infra/` with `envs/prod.tfvars` and its own state prefix; `terraform plan` reviewed before `apply`; promote the image SHA that passed staging e2e instead of rebuilding.
- **PR previews**: Neon branch per PR and tagged no-traffic Cloud Run revisions. Open problem: Logto redirect URIs for per-PR hostnames. The earlier draft is in commit `95a4112`.

## Repo changes when implementing

- Add `infra/bootstrap/`, `infra/`, `infra/envs/staging.tfvars`, `.github/workflows/deploy.yml`, and a `terraform` job in `ci.yml`.
- Frontend: ID-token helper and the `BACKEND_AUDIENCE` env var (also in `.env.example` as unset).
- Pin Terraform in `mise.toml` and add `infra:fmt` and `infra:validate` tasks.
- Update `README.md` for the new env var and mise tasks, and `AGENTS.md` with the `infra/` layout.
