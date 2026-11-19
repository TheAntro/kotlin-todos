# Staging/production stack: one GCP project and one Neon project per environment.
# See docs/deployment/plan.md.

locals {
  # Created by infra/bootstrap
  deployer_member = "serviceAccount:deployer@${var.project_id}.iam.gserviceaccount.com"

  # Audience of the Google ID tokens the frontend sends to the backend. A fixed value instead of
  # the generated run.app URL; the IAM invoker binding decides who may call.
  backend_audience = "https://backend.todos.internal"
}

# ---------- Container images ----------

resource "google_artifact_registry_repository" "images" {
  repository_id = "images"
  location      = var.region
  format        = "DOCKER"

  # Keep the 5 newest versions of each image and delete the rest (KEEP wins over DELETE)
  cleanup_policy_dry_run = false
  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions {
      keep_count = 5
    }
  }
  cleanup_policies {
    id     = "delete-rest"
    action = "DELETE"
    condition {
      tag_state = "ANY"
    }
  }
}

# ---------- Database ----------

module "database" {
  source = "./modules/neon-database"

  name          = var.project_id
  org_id        = var.neon_org_id
  region_id     = var.neon_region
  pg_version    = 18
  database_name = "todos"
  role_name     = "todos"
}

# ---------- Services ----------

module "backend" {
  source = "./modules/cloud-run-service"

  name              = "backend"
  region            = var.region
  container_port    = 8080
  cpu               = "1"
  memory            = "1Gi"
  startup_cpu_boost = true

  env = {
    DB_URL                = module.database.jdbc_url_pooled
    DB_USERNAME           = module.database.username
    DB_POOL_SIZE          = "5"
    JWT_AUDIENCE          = var.jwt_audience
    SPRING_FLYWAY_ENABLED = "false" # the deploy workflow migrates
    API_DOCS_ENABLED      = "false"
  }
  secret_env = {
    DB_PASSWORD    = module.database.password
    JWT_ISSUER_URI = var.jwt_issuer_uri
  }

  startup_probe_path  = "/actuator/health/readiness"
  liveness_probe_path = "/actuator/health/liveness"

  # Only the frontend may call it; the backend still checks the user's Logto token
  invokers         = [module.frontend.service_account_member]
  custom_audiences = [local.backend_audience]
}

resource "random_password" "session_secret" {
  length  = 64
  special = false
}

module "frontend" {
  source = "./modules/cloud-run-service"

  name           = "frontend"
  region         = var.region
  container_port = 3000
  memory         = "512Mi"
  public         = true

  env = {
    APP_BASE_URL     = "https://${var.domain}"
    API_BASE_URL     = module.backend.uri
    BACKEND_AUDIENCE = local.backend_audience
    JWT_AUDIENCE     = var.jwt_audience
  }
  secret_env = {
    LOGTO_ENDPOINT   = var.logto_endpoint
    LOGTO_APP_ID     = var.logto_app_id
    LOGTO_APP_SECRET = var.logto_app_secret
    SESSION_SECRET   = random_password.session_secret.result
  }
}
