# ---------- Custom domain (frontend) ----------

module "frontend_domain" {
  source = "./modules/custom-domain"

  domain             = var.domain
  verify_domain      = var.verify_domain
  cloudflare_zone_id = var.cloudflare_zone_id
  project_id         = var.project_id
  region             = var.region
  service_name       = module.frontend.name
}
