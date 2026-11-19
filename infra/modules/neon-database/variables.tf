variable "name" {
  description = "Neon project name"
  type        = string
}

variable "org_id" {
  description = "Neon organization that owns the project (required when the API key belongs to a user)"
  type        = string
}

variable "region_id" {
  description = "Neon region, e.g. aws-eu-central-1. Can't be changed after the project is created."
  type        = string
}

variable "pg_version" {
  description = "Postgres major version"
  type        = number
}

variable "database_name" {
  type = string
}

variable "role_name" {
  type = string
}

variable "history_retention_seconds" {
  description = "Point-in-time restore window. The free plan allows at most 6 hours."
  type        = number
  default     = 6 * 60 * 60
}
