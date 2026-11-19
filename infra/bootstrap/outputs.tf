# Copy these into the GitHub environment's variables (see README.md):
# GCP_PROJECT_ID, WIF_PROVIDER, TERRAFORM_SA, DEPLOYER_SA.

output "gcp_project_id" {
  value = var.project_id
}

output "wif_provider" {
  value = google_iam_workload_identity_pool_provider.github.name
}

output "terraform_sa" {
  value = google_service_account.terraform.email
}

output "deployer_sa" {
  value = google_service_account.deployer.email
}

output "state_bucket" {
  value = google_storage_bucket.tfstate.name
}
