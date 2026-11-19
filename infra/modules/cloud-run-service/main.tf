# One Cloud Run service with its own runtime service account and secrets.
#
# Terraform creates the service with a placeholder image; the deploy workflow owns which image
# runs (`gcloud run services update --image`), so Terraform ignores the image afterwards.

resource "google_service_account" "runtime" {
  account_id   = var.name
  display_name = "Cloud Run runtime: ${var.name}"
}

# ---------- Secrets (readable only by this service's account) ----------

locals {
  # e.g. DB_PASSWORD -> backend-db-password
  secret_ids = { for env in nonsensitive(toset(keys(var.secret_env))) : env => "${var.name}-${lower(replace(env, "_", "-"))}" }
}

resource "google_secret_manager_secret" "this" {
  for_each = local.secret_ids

  secret_id = each.value

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}

# Changing a value adds a new version, and the service is pinned to it, so it rolls out a new revision
resource "google_secret_manager_secret_version" "this" {
  for_each = local.secret_ids

  secret      = google_secret_manager_secret.this[each.key].id
  secret_data = var.secret_env[each.key]
}

resource "google_secret_manager_secret_iam_member" "runtime" {
  for_each = local.secret_ids

  secret_id = google_secret_manager_secret.this[each.key].id
  role      = "roles/secretmanager.secretAccessor"
  member    = google_service_account.runtime.member
}

# ---------- Service ----------

resource "google_cloud_run_v2_service" "this" {
  name                = var.name
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  custom_audiences    = var.custom_audiences
  deletion_protection = var.deletion_protection

  template {
    service_account = google_service_account.runtime.email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      ports {
        container_port = var.container_port
      }

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
        cpu_idle          = true
        startup_cpu_boost = var.startup_cpu_boost
      }

      dynamic "env" {
        for_each = var.env
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = local.secret_ids
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.this[env.key].secret_id
              version = google_secret_manager_secret_version.this[env.key].version
            }
          }
        }
      }

      dynamic "startup_probe" {
        for_each = var.startup_probe_path == null ? [] : [var.startup_probe_path]
        content {
          http_get {
            path = startup_probe.value
          }
          period_seconds    = 3
          failure_threshold = 40 # up to 2 minutes for the JVM to start
          timeout_seconds   = 2
        }
      }

      dynamic "liveness_probe" {
        for_each = var.liveness_probe_path == null ? [] : [var.liveness_probe_path]
        content {
          http_get {
            path = liveness_probe.value
          }
          period_seconds    = 30
          failure_threshold = 3
          timeout_seconds   = 5
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      client,
      client_version,
    ]
  }

  # The runtime account must be able to read the secrets before the first revision starts
  depends_on = [google_secret_manager_secret_iam_member.runtime]
}

resource "google_cloud_run_v2_service_iam_member" "invoker" {
  for_each = toset(var.public ? ["allUsers"] : var.invokers)

  name     = google_cloud_run_v2_service.this.name
  location = google_cloud_run_v2_service.this.location
  role     = "roles/run.invoker"
  member   = each.value
}
