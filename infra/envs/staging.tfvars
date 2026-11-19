# Non-secret settings for the staging environment. Secrets come from the GitHub `staging`
# environment as TF_VAR_* (see docs/deployment/plan.md).

project_id         = "kotlin-todos-staging"
region             = "europe-north1"
domain             = "staging.todos.antro.dev"
cloudflare_zone_id = "09d7c16d678a2d94066bb618918e241e" # antro.dev
neon_region        = "aws-eu-central-1"
neon_org_id        = "org-ancient-art-22557950"
jwt_audience       = "https://api.todos.local" # Logto API resource
