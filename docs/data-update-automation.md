# Data Update Automation

How `public/data/roleup.json` stays current without a manual `gcloud login` + `npm run generate-data` + commit cycle.

## Overview

```
cron (weekly) / workflow_dispatch
  -> auth to GCP via Workload Identity Federation (no long-lived key)
  -> npm run generate-data          (scripts/generate-data.ts, anomaly check aborts on >10% drop)
  -> diff public/data/roleup.json   (skip the rest if nothing changed)
  -> npm test                       (app/lib/roleup-data.test.ts validates the new data's shape)
  -> peter-evans/create-pull-request (branch: data-update)
  -> gh pr merge --auto --squash    (waits for the Test workflow's required check)
  -> merge to main -> deploy-pages.yml redeploys GitHub Pages
```

The workflow (`.github/workflows/update-data.yml`) fails outright — without opening a PR — if `npm run generate-data` hits the anomaly check or `npm test` fails on the freshly generated data. That's intentional: a large drop in roles/permissions or a structurally broken JSON should get a human's attention rather than an auto-merged PR.

## terraform: one-time GCP setup

`terraform/` provisions:

- A service account (`roleup-data-updater`) with `roles/browser` (required so `permissions:queryTestablePermissions` can reference the project) and `roles/serviceusage.serviceUsageViewer` (`gcloud services list --available`).
- A Workload Identity Pool + Provider via the official `terraform-google-modules/github-actions-runners/google//modules/gh-oidc` module, restricted to this repository via `attribute_condition`.

Apply steps (local state, no backend configured):

```bash
gcloud auth application-default login

cd terraform
terraform init
terraform apply -var="project_id=<your-project-id>"
```

Take the two outputs and store them as GitHub Actions secrets (Settings -> Secrets and variables -> Actions):

| Terraform output | GitHub secret |
|---|---|
| `workload_identity_provider` | `GCP_WORKLOAD_IDENTITY_PROVIDER` |
| `service_account_email` | `GCP_SERVICE_ACCOUNT` |

Re-running `terraform apply` after changing `github_repository` or other variables is safe (idempotent); nothing here manages billing-sensitive or destructive resources.

## Required GitHub Secrets

| Secret | Purpose |
|---|---|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | terraform output, used by `google-github-actions/auth` |
| `GCP_SERVICE_ACCOUNT` | terraform output, used by `google-github-actions/auth` |
| `GCP_PROJECT_ID` | Project used by `setup-gcloud` and as the `queryTestablePermissions` reference project |
| `DATA_UPDATE_PAT` | Fine-grained PAT with **Contents: Read and write** + **Pull requests: Read and write** on this repository |

`DATA_UPDATE_PAT` is required, not optional: a PR opened with the default `GITHUB_TOKEN` does not trigger other workflows (GitHub's anti-recursion rule), so the Test workflow would never run on the data-update PR and the required status check would never appear. A PAT-authored PR is treated like any external push and triggers `test.yaml` normally.

## Required repository settings

- **Settings -> General -> Pull Requests -> Allow auto-merge** must be enabled, or `gh pr merge --auto` in the workflow fails.
- **Settings -> Branches -> Branch protection rules (main) -> Require status checks to pass** must include the Test workflow's job (the `test` job defined in `.github/workflows/test.yaml`, shown in the UI as `Test / test`). Without this, `--auto` has nothing to wait for and the PR merges immediately, before `npm test`/`typecheck`/build even run on it.

## Notes

- The cron schedule is `17 3 * * 1` (Mondays 03:17 UTC) — an arbitrary off-peak time, not tied to any upstream IAM release cadence.
- `workflow_dispatch` is available for on-demand runs (e.g. after a known IAM API change) without waiting for the schedule.
