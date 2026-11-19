# Bootstrap

Run once per environment from your laptop, with your own Google credentials. It creates what GitHub Actions needs before it can run Terraform itself:

- the project's APIs
- the Terraform state bucket (`<project_id>-tfstate`)
- Workload Identity Federation for this repository, so GitHub Actions needs no service account keys
- the CI service accounts `terraform@` and `deployer@`, which only jobs in the matching GitHub environment can use
- a monthly billing budget alert

Its own state lives in the same bucket under the `bootstrap` prefix.

## First run (staging)

You need the project created and linked to a billing account (Stage 1 of `docs/deployment/plan.md`).

```sh
cd infra/bootstrap
gcloud auth application-default login
gcloud auth application-default set-quota-project kotlin-todos-staging
export TF_VAR_billing_account_id=$(gcloud billing projects describe kotlin-todos-staging --format='value(billingAccountName)' | cut -d/ -f2)

# Terraform needs these two before it can enable the rest
gcloud services enable cloudresourcemanager.googleapis.com serviceusage.googleapis.com --project kotlin-todos-staging

# The bucket doesn't exist yet, so the first apply uses local state.
# backend_override.tf is gitignored and replaces the gcs backend.
printf 'terraform {\n  backend "local" {}\n}\n' > backend_override.tf
terraform init
terraform apply -var-file=envs/staging.tfvars

# Move the state into the bucket it just created
rm backend_override.tf
terraform init -migrate-state -backend-config="bucket=$(terraform output -raw state_bucket)"
rm terraform.tfstate terraform.tfstate.backup
```

Then copy the outputs into the GitHub `staging` environment's variables:

```sh
terraform output
gh variable set GCP_PROJECT_ID --env staging --body "$(terraform output -raw gcp_project_id)"
gh variable set WIF_PROVIDER   --env staging --body "$(terraform output -raw wif_provider)"
gh variable set TERRAFORM_SA   --env staging --body "$(terraform output -raw terraform_sa)"
gh variable set DEPLOYER_SA    --env staging --body "$(terraform output -raw deployer_sa)"
```

Check it by running the **Deploy** workflow by hand (Actions → Deploy → Run workflow). Its auth jobs sign in as each service account.

## Later changes

```sh
terraform init -backend-config="bucket=kotlin-todos-staging-tfstate"
terraform apply -var-file=envs/staging.tfvars
```
