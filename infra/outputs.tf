output "image_repository" {
  description = "Push images as <image_repository>/<service>:<git sha>"
  value       = "${google_artifact_registry_repository.images.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.images.repository_id}"
}

output "backend_service" {
  value = module.backend.name
}

output "frontend_service" {
  value = module.frontend.name
}

output "backend_url" {
  value = module.backend.uri
}

output "frontend_url" {
  value = module.frontend.uri
}

output "app_url" {
  value = "https://${var.domain}"
}

output "migrate_db_url_secret" {
  value = google_secret_manager_secret.db_direct_url.secret_id
}

output "migrate_db_password_secret" {
  value = module.backend.secret_ids["DB_PASSWORD"]
}

output "db_username" {
  value = module.database.username
}
