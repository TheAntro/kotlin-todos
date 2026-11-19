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
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.29"
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

  # The defaults plus Site Verification, for the custom domain's verification token
  scopes = [
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/siteverification",
  ]
}

# Reads the API key from NEON_API_KEY
provider "neon" {}

# Reads the API token from CLOUDFLARE_API_TOKEN (DNS Edit on the zone only)
provider "cloudflare" {}
