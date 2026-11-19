output "project_id" {
  value = neon_project.this.id
}

output "jdbc_url_pooled" {
  description = "For the app (through Neon's PgBouncer)"
  value       = "jdbc:postgresql://${neon_project.this.database_host_pooler}/${neon_project.this.database_name}?${local.jdbc_params}"
}

output "jdbc_url_direct" {
  description = "For migrations (session-level features that PgBouncer doesn't support)"
  value       = "jdbc:postgresql://${neon_project.this.database_host}/${neon_project.this.database_name}?${local.jdbc_params}"
}

output "username" {
  value = neon_project.this.database_user
}

output "password" {
  value     = neon_project.this.database_password
  sensitive = true
}
