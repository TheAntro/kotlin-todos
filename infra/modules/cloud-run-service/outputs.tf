output "name" {
  value = google_cloud_run_v2_service.this.name
}

output "uri" {
  value = google_cloud_run_v2_service.this.uri
}

output "service_account_email" {
  value = google_service_account.runtime.email
}

output "service_account_member" {
  value = google_service_account.runtime.member
}

output "service_account_id" {
  description = "Full resource name, for IAM bindings on the account"
  value       = google_service_account.runtime.name
}

output "secret_ids" {
  description = "Secret Manager secret resource IDs by environment variable name"
  value       = { for env, secret in google_secret_manager_secret.this : env => secret.id }
}
