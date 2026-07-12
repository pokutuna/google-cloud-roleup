# Minimal Workload Identity Federation setup so the update-data.yml GitHub
# Actions workflow can authenticate to GCP without a long-lived key.
#
# Apply once locally (see docs/data-update-automation.md), then copy the
# outputs into the repository's GitHub Actions secrets.

terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}

provider "google" {
  project = var.project_id
}

# APIs required by the update-data.yml workflow:
# - iamcredentials: WIF impersonation of the service account
# - iam: roles.list / permissions:queryTestablePermissions (generate-data.ts)
# - serviceusage: `gcloud services list --available` (generate-data.ts)
resource "google_project_service" "required" {
  for_each = toset([
    "iamcredentials.googleapis.com",
    "iam.googleapis.com",
    "serviceusage.googleapis.com",
  ])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_service_account" "data_updater" {
  project      = var.project_id
  account_id   = var.service_account_id
  display_name = "roleup data updater"
  description  = "Used by the update-data.yml GitHub Actions workflow to regenerate public/data/roleup.json."
}

# roles/browser: queryTestablePermissions requires the caller to have some
# permission on the project referenced by fullResourceName (generate-data.ts
# points fullResourceName at this project). roles/browser is the smallest
# predefined role that satisfies this without granting write access.
resource "google_project_iam_member" "browser" {
  project = var.project_id
  role    = "roles/browser"
  member  = "serviceAccount:${google_service_account.data_updater.email}"
}

# roles/serviceusage.serviceUsageViewer: `gcloud services list --available`
# used to resolve service display names.
resource "google_project_iam_member" "service_usage_viewer" {
  project = var.project_id
  role    = "roles/serviceusage.serviceUsageViewer"
  member  = "serviceAccount:${google_service_account.data_updater.email}"
}

module "gh_oidc" {
  source      = "terraform-google-modules/github-actions-runners/google//modules/gh-oidc"
  version     = "5.1.0"
  project_id  = var.project_id
  pool_id     = "roleup-gh-pool"
  provider_id = "roleup-gh-provider"

  depends_on = [google_project_service.required]

  # Restrict the provider so only this repository's OIDC tokens are
  # accepted, regardless of the `attribute` value on any sa_mapping entry.
  attribute_condition = "attribute.repository == \"${var.github_repository}\""

  sa_mapping = {
    (var.service_account_id) = {
      sa_name   = google_service_account.data_updater.name
      attribute = "attribute.repository/${var.github_repository}"
    }
  }
}
