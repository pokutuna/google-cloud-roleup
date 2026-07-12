variable "project_id" {
  description = "GCP project ID used to run generate-data.ts (queryTestablePermissions + Service Usage)."
  type        = string
}

variable "github_repository" {
  description = "GitHub repository in \"owner/repo\" form allowed to assume the service account via WIF."
  type        = string
  default     = "pokutuna/google-cloud-roleup"
}

variable "service_account_id" {
  description = "Account ID (local part) of the data-updater service account."
  type        = string
  default     = "roleup-data-updater"
}
