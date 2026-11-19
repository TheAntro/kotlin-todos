terraform {
  required_version = ">= 1.14"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.12"
    }
  }

  # The bucket is created by this stack, so the first apply runs with local state
  # (see README.md), then `terraform init -migrate-state` moves the state here.
  # Pass the bucket name with `-backend-config="bucket=<project_id>-tfstate"`.
  backend "gcs" {
    prefix = "bootstrap"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region

  # The bootstrap runs with your own user credentials (application default credentials).
  # The Billing Budgets API needs a quota project for user credentials.
  billing_project       = var.project_id
  user_project_override = true
}
