# terraform/

Minimal Workload Identity Federation (WIF) setup so the
[`update-data.yml`](../.github/workflows/update-data.yml) workflow can call
Google Cloud APIs without a long-lived key. Creates a WIF pool/provider
restricted to this repository and a `roleup-data-updater` service account
with read-only roles (`roles/browser`, `roles/serviceusage.serviceUsageViewer`).

## Usage

```sh
gcloud auth application-default login   # provider auth via ADC
terraform init
terraform apply -var="project_id=<your-project-id>"
```

`project_id` is the only required variable; pass it with `-var`, a
`terraform.tfvars` file, or `TF_VAR_project_id`. `github_repository` and
`service_account_id` have sensible defaults (see `variables.tf`).

Copy the outputs into the repository's GitHub Actions secrets:

| Output                        | Secret                           |
| ----------------------------- | -------------------------------- |
| `workload_identity_provider`  | `GCP_WORKLOAD_IDENTITY_PROVIDER` |
| `service_account_email`       | `GCP_SERVICE_ACCOUNT`            |
| (the project id you passed)   | `GCP_PROJECT_ID`                 |

See [docs/data-update-automation.md](../docs/data-update-automation.md) for
the rest of the pipeline setup (PAT, repository settings).

## State

No remote backend is configured: state is written locally to
`terraform/terraform.tfstate` (gitignored). That's fine here — this manages
only four small resources, is applied once, and everything can be re-created
or `terraform import`ed if the state file is ever lost.
