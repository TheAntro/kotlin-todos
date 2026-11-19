# Maps a custom domain to a Cloud Run service: verifies the parent domain with Google through a
# Cloudflare TXT record, creates the Cloud Run domain mapping and points a DNS-only CNAME at it.
# Google issues and renews the certificate.

terraform {
  required_providers {
    cloudflare = {
      source = "cloudflare/cloudflare"
    }
  }
}

# ---------- Domain verification ----------

data "google_site_verification_token" "this" {
  type                = "INET_DOMAIN"
  identifier          = var.verify_domain
  verification_method = "DNS_TXT"
}

# Keep it after verification; Google re-checks it
resource "cloudflare_dns_record" "verification" {
  zone_id = var.cloudflare_zone_id
  name    = var.verify_domain
  type    = "TXT"
  content = "\"${data.google_site_verification_token.this.token}\""
  ttl     = 1 # automatic
  proxied = false
}

# The caller (terraform@ in CI) becomes the owner, which the domain mapping requires
resource "google_site_verification_web_resource" "this" {
  site {
    type       = "INET_DOMAIN"
    identifier = var.verify_domain
  }
  verification_method = "DNS_TXT"

  depends_on = [cloudflare_dns_record.verification]
}

# ---------- Domain mapping ----------

resource "google_cloud_run_domain_mapping" "this" {
  name     = var.domain
  location = var.region

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = var.service_name
  }

  depends_on = [google_site_verification_web_resource.this]
}

# DNS-only (grey cloud), or Google's managed certificate won't issue
resource "cloudflare_dns_record" "cname" {
  zone_id = var.cloudflare_zone_id
  name    = var.domain
  type    = "CNAME"
  content = "ghs.googlehosted.com"
  ttl     = 1 # automatic
  proxied = false
}
