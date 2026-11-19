variable "name" {
  description = "Service name; also the runtime service account's ID and the secrets' prefix"
  type        = string
}

variable "region" {
  type = string
}

variable "container_port" {
  type = number
}

variable "cpu" {
  type    = string
  default = "1"
}

variable "memory" {
  type    = string
  default = "512Mi"
}

variable "startup_cpu_boost" {
  type    = bool
  default = false
}

variable "min_instances" {
  type    = number
  default = 0
}

variable "max_instances" {
  description = "Caps cost and the number of DB connections"
  type        = number
  default     = 2
}

variable "env" {
  description = "Plain environment variables"
  type        = map(string)
  default     = {}
}

variable "secret_env" {
  description = "Environment variables stored in Secret Manager, as name => value. Each becomes a secret only this service can read."
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "startup_probe_path" {
  description = "HTTP startup probe path; null for Cloud Run's default TCP probe"
  type        = string
  default     = null
}

variable "liveness_probe_path" {
  description = "HTTP liveness probe path; null for none"
  type        = string
  default     = null
}

variable "public" {
  description = "Let anyone call the service (allUsers invoker)"
  type        = bool
  default     = false
}

variable "invokers" {
  description = "Members allowed to call a non-public service, e.g. serviceAccount:x@y.iam.gserviceaccount.com"
  type        = list(string)
  default     = []
}

variable "custom_audiences" {
  description = "Extra audiences Cloud Run accepts in callers' ID tokens"
  type        = list(string)
  default     = []
}

variable "deletion_protection" {
  type    = bool
  default = true
}
