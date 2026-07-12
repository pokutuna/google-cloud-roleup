output "workload_identity_provider" {
  description = "Full resource name of the Workload Identity Pool Provider (GCP_WORKLOAD_IDENTITY_PROVIDER secret)."
  value       = module.gh_oidc.provider_name
}

output "service_account_email" {
  description = "Email of the data-updater service account (GCP_SERVICE_ACCOUNT secret)."
  value       = google_service_account.data_updater.email
}
