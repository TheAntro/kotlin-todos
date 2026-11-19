terraform {
  required_version = ">= 1.14"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.12"
    }
    neon = {
      source  = "kislerdm/neon"
      version = "~> 0.18.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.7"
    }
  }

  # Bucket from infra/bootstrap; pass it with -backend-config="bucket=<project_id>-tfstate".
  # One state per environment.
  backend "gcs" {
    prefix = "staging"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Reads the API key from NEON_API_KEY
provider "neon" {}
