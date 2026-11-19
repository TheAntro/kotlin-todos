variable "project_id" {
  description = "GCP project ID of the environment, e.g. kotlin-todos-staging"
  type        = string
}

variable "environment" {
  description = "GitHub environment whose jobs may impersonate the CI service accounts"
  type        = string
}

variable "region" {
  description = "Region for the state bucket"
  type        = string
  default     = "europe-north1"
}

variable "github_repository_id" {
  description = "Numeric GitHub repository ID (gh api repos/{owner}/{repo} --jq .id). Pinning the ID, not the name, means a deleted and recreated repo with the same name gets no access."
  type        = string
}

variable "billing_account_id" {
  description = "Billing account for the budget alert (gcloud billing accounts list). Kept out of the repo: pass it as TF_VAR_billing_account_id."
  type        = string
}

variable "budget_amount" {
  description = "Monthly budget in budget_currency; alerts at 50%, 90% and 100%"
  type        = number
  default     = 5
}

variable "budget_currency" {
  description = "Currency of the budget; must match the billing account's currency"
  type        = string
  default     = "EUR"
}
