output "mapping_status" {
  description = "Domain mapping conditions and DNS records, for debugging certificate issuance"
  value       = google_cloud_run_domain_mapping.this.status
}
