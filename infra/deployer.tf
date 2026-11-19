# What deployer@ (created by infra/bootstrap) needs beyond its project roles, bound here next to
# the resources it applies to.

# Deploying a revision runs it as the service's runtime account
resource "google_service_account_iam_member" "deployer_acts_as" {
  for_each = {
    backend  = module.backend.service_account_id
    frontend = module.frontend.service_account_id
  }

  service_account_id = each.value
  role               = "roles/iam.serviceAccountUser"
  member             = local.deployer_member
}

# ---------- Migrations ----------
# The deploy workflow runs Flyway against Neon's direct (non-pooler) endpoint. The URL isn't
# a credential, but deployer@ can't read Terraform outputs, so it's handed over here.

resource "google_secret_manager_secret" "db_direct_url" {
  secret_id = "migrate-db-url"

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}

resource "google_secret_manager_secret_version" "db_direct_url" {
  secret      = google_secret_manager_secret.db_direct_url.id
  secret_data = module.database.jdbc_url_direct
}

resource "google_secret_manager_secret_iam_member" "deployer_migrate" {
  for_each = {
    db_url      = google_secret_manager_secret.db_direct_url.id
    db_password = module.backend.secret_ids["DB_PASSWORD"]
  }

  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = local.deployer_member
}
