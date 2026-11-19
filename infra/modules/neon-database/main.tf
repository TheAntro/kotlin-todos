# A Neon project with its default branch, database and role. The app connects through the
# pooled endpoint; migrations use the direct one (PgBouncer runs in transaction mode).

terraform {
  required_providers {
    neon = {
      source = "kislerdm/neon"
    }
  }
}

resource "neon_project" "this" {
  name                      = var.name
  org_id                    = var.org_id
  region_id                 = var.region_id
  pg_version                = var.pg_version
  history_retention_seconds = var.history_retention_seconds

  # Names the default branch's database and role (no second branch is created)
  branch {
    name          = "main"
    database_name = var.database_name
    role_name     = var.role_name
  }

  # The region can't be changed later, and destroying the project deletes all data
  lifecycle {
    prevent_destroy = true
  }
}

locals {
  jdbc_params = "sslmode=require"
}
