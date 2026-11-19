data "google_project" "this" {
  project_id = var.project_id
}

locals {
  apis = toset([
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "siteverification.googleapis.com",
    "billingbudgets.googleapis.com",
    "storage.googleapis.com",
  ])

  # Only jobs that run in the GitHub environment can impersonate the CI service accounts
  # (the provider's attribute_condition already limits this to the one repository).
  github_environment_principal = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.environment/${var.environment}"
}

# ---------- APIs ----------

resource "google_project_service" "apis" {
  for_each = local.apis

  service            = each.value
  disable_on_destroy = false
}

# ---------- Terraform state bucket ----------

resource "google_storage_bucket" "tfstate" {
  name     = "${var.project_id}-tfstate"
  location = var.region

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  soft_delete_policy {
    retention_duration_seconds = 7 * 24 * 60 * 60
  }

  # Keep the last 20 versions of each state file
  lifecycle_rule {
    condition {
      num_newer_versions = 20
      with_state         = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }

  # The state holds secrets (DB password, Logto credentials)
  lifecycle {
    prevent_destroy = true
  }

  depends_on = [google_project_service.apis]
}

# Project owners get access through their project role; terraform@ is the only other principal.
resource "google_storage_bucket_iam_member" "tfstate_terraform" {
  bucket = google_storage_bucket.tfstate.name
  role   = "roles/storage.objectAdmin"
  member = google_service_account.terraform.member
}

# ---------- Workload Identity Federation for GitHub Actions ----------

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github"
  display_name              = "GitHub Actions"

  depends_on = [google_project_service.apis]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-oidc"
  display_name                       = "GitHub OIDC"

  attribute_mapping = {
    "google.subject"          = "assertion.sub"
    "attribute.repository_id" = "assertion.repository_id"
    "attribute.repository"    = "assertion.repository"
    "attribute.environment"   = "assertion.environment"
    "attribute.ref"           = "assertion.ref"
  }

  attribute_condition = "assertion.repository_id == \"${var.github_repository_id}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# ---------- CI service accounts ----------

# Runs `terraform apply` for the main stack: creates service accounts, IAM bindings, secrets and services.
resource "google_service_account" "terraform" {
  account_id   = "terraform"
  display_name = "Terraform (GitHub Actions)"

  depends_on = [google_project_service.apis]
}

# Builds and pushes images, runs migrations and deploys new images. Its narrower bindings on the
# runtime service accounts and the migration secrets live in the main stack, next to those resources.
resource "google_service_account" "deployer" {
  account_id   = "deployer"
  display_name = "Deployer (GitHub Actions)"

  depends_on = [google_project_service.apis]
}

resource "google_service_account_iam_member" "terraform_wif" {
  service_account_id = google_service_account.terraform.name
  role               = "roles/iam.workloadIdentityUser"
  member             = local.github_environment_principal
}

resource "google_service_account_iam_member" "deployer_wif" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = local.github_environment_principal
}

resource "google_project_iam_member" "terraform" {
  for_each = toset([
    "roles/editor",
    "roles/resourcemanager.projectIamAdmin",
    "roles/iam.serviceAccountAdmin",
    "roles/run.admin",
    "roles/secretmanager.admin",
    "roles/artifactregistry.admin",
  ])

  project = var.project_id
  role    = each.value
  member  = google_service_account.terraform.member
}

resource "google_project_iam_member" "deployer" {
  for_each = toset([
    "roles/run.developer",
    "roles/artifactregistry.writer",
  ])

  project = var.project_id
  role    = each.value
  member  = google_service_account.deployer.member
}

# ---------- Billing budget alert ----------

# Emails the billing account's admins; it alerts only and never caps spending.
resource "google_billing_budget" "monthly" {
  billing_account = var.billing_account_id
  display_name    = "${var.project_id} monthly"

  budget_filter {
    projects = ["projects/${data.google_project.this.number}"]
  }

  amount {
    specified_amount {
      currency_code = var.budget_currency
      units         = tostring(var.budget_amount)
    }
  }

  threshold_rules {
    threshold_percent = 0.5
  }
  threshold_rules {
    threshold_percent = 0.9
  }
  threshold_rules {
    threshold_percent = 1.0
  }
  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "FORECASTED_SPEND"
  }

  depends_on = [google_project_service.apis]
}
