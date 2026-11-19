# ---------- From envs/<env>.tfvars ----------

variable "project_id" {
  description = "GCP project of the environment (created by hand, set up by infra/bootstrap)"
  type        = string
}

variable "region" {
  description = "Cloud Run and Artifact Registry region"
  type        = string
}

variable "domain" {
  description = "Public hostname of the frontend, e.g. staging.todos.antro.dev"
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone that holds var.domain (used by the custom domain, Stage 4)"
  type        = string
}

variable "neon_region" {
  description = "Neon region; can't be changed after the project is created"
  type        = string
}

variable "neon_org_id" {
  description = "Neon organization ID (org-...), from Organization settings"
  type        = string
}

variable "jwt_audience" {
  description = "Logto API resource the backend accepts tokens for"
  type        = string
}

# ---------- Secrets: TF_VAR_* from the GitHub environment ----------

variable "jwt_issuer_uri" {
  description = "Logto OIDC issuer; never commit it"
  type        = string
  sensitive   = true
}

variable "logto_endpoint" {
  type      = string
  sensitive = true
}

variable "logto_app_id" {
  type      = string
  sensitive = true
}

variable "logto_app_secret" {
  type      = string
  sensitive = true
}
