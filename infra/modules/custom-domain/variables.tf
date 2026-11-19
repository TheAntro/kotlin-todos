variable "domain" {
  description = "Hostname to map, e.g. staging.todos.antro.dev"
  type        = string
}

variable "verify_domain" {
  description = "Domain verified with Google; covers var.domain and its siblings, e.g. todos.antro.dev"
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone that holds both domains"
  type        = string
}

variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "service_name" {
  description = "Cloud Run service the domain routes to"
  type        = string
}
