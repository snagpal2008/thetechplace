#!/usr/bin/env bash
# One-time Google Cloud setup for the Dílis portal.
# Run in Google Cloud Shell (gcloud is already signed in):
#
#   PROJECT_ID=dilis-prod GITHUB_REPO=snagpal2008/thetechplace bash infra/gcp-setup.sh
#
# Safe to re-run: existing resources are left as they are.
# Creates: APIs, Artifact Registry, Cloud SQL (Postgres 16), database + app user,
# Secret Manager secrets, runtime + deploy service accounts, and keyless GitHub
# auth (Workload Identity Federation). Prints the values to add to GitHub.
set -euo pipefail

: "${PROJECT_ID:?Set PROJECT_ID (an existing project with billing enabled)}"
: "${GITHUB_REPO:?Set GITHUB_REPO, e.g. snagpal2008/thetechplace}"
REGION="${REGION:-europe-west1}"            # Belgium. London = europe-west2
SQL_INSTANCE="${SQL_INSTANCE:-dilis-pg}"
SQL_TIER="${SQL_TIER:-db-g1-small}"         # 1.7 GB shared core, ~€25/mo. Demo: db-f1-micro (~€9/mo)
DB_NAME="dilis"
DB_USER="dilis_app"
AR_REPO="dilis"
RUN_SA="dilis-run"
DEPLOY_SA="dilis-deploy"
WIF_POOL="github"
WIF_PROVIDER="github-oidc"

say() { printf '\n\033[1;32m▸ %s\033[0m\n' "$*"; }
exists() { "$@" >/dev/null 2>&1; }
rand() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c "${1:-40}"; }

gcloud config set project "$PROJECT_ID" >/dev/null
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
RUN_SA_EMAIL="$RUN_SA@$PROJECT_ID.iam.gserviceaccount.com"
DEPLOY_SA_EMAIL="$DEPLOY_SA@$PROJECT_ID.iam.gserviceaccount.com"
CONN="$PROJECT_ID:$REGION:$SQL_INSTANCE"

say "Enabling APIs (takes a minute the first time)"
gcloud services enable run.googleapis.com sqladmin.googleapis.com artifactregistry.googleapis.com \
  secretmanager.googleapis.com iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
  cloudresourcemanager.googleapis.com

say "Artifact Registry repository: $AR_REPO"
exists gcloud artifacts repositories describe "$AR_REPO" --location "$REGION" ||
  gcloud artifacts repositories create "$AR_REPO" --repository-format=docker --location "$REGION" \
    --description="Dílis portal images"

say "Cloud SQL instance: $SQL_INSTANCE ($SQL_TIER, $REGION) — first creation takes ~10 minutes"
if ! exists gcloud sql instances describe "$SQL_INSTANCE"; then
  gcloud sql instances create "$SQL_INSTANCE" \
    --database-version=POSTGRES_16 --edition=ENTERPRISE --tier="$SQL_TIER" --region="$REGION" \
    --availability-type=zonal --storage-type=SSD --storage-size=10 --storage-auto-increase \
    --backup-start-time=02:00 --enable-point-in-time-recovery --retained-backups-count=14 \
    --maintenance-window-day=SUN --maintenance-window-hour=3
fi
exists gcloud sql databases describe "$DB_NAME" --instance "$SQL_INSTANCE" ||
  gcloud sql databases create "$DB_NAME" --instance "$SQL_INSTANCE"

say "Secrets"
put_secret() { # name value — creates the secret, or adds a version only if it doesn't exist yet
  if ! exists gcloud secrets describe "$1"; then
    printf '%s' "$2" | gcloud secrets create "$1" --replication-policy=automatic --data-file=-
    echo "  created $1"
  else
    echo "  $1 already exists — kept"
  fi
}
if ! exists gcloud secrets describe DATABASE_URL; then
  DB_PASS=$(rand 32)
  if exists gcloud sql users describe "$DB_USER" --instance "$SQL_INSTANCE"; then
    gcloud sql users set-password "$DB_USER" --instance "$SQL_INSTANCE" --password "$DB_PASS"
  else
    gcloud sql users create "$DB_USER" --instance "$SQL_INSTANCE" --password "$DB_PASS"
  fi
  put_secret DATABASE_URL "postgres://$DB_USER:$DB_PASS@/$DB_NAME?host=/cloudsql/$CONN"
fi
put_secret AUTH_SECRET "$(rand 48)"
NEW_SETUP_TOKEN=$(rand 12)
if ! exists gcloud secrets describe SETUP_TOKEN; then put_secret SETUP_TOKEN "$NEW_SETUP_TOKEN"; SETUP_TOKEN_SHOWN="$NEW_SETUP_TOKEN"; fi

say "Service accounts"
exists gcloud iam service-accounts describe "$RUN_SA_EMAIL" ||
  gcloud iam service-accounts create "$RUN_SA" --display-name "Dílis portal runtime"
exists gcloud iam service-accounts describe "$DEPLOY_SA_EMAIL" ||
  gcloud iam service-accounts create "$DEPLOY_SA" --display-name "Dílis GitHub deployer"

bind() { gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:$1" --role "$2" --condition=None >/dev/null; }
# Runtime: connect to Cloud SQL, read secrets
bind "$RUN_SA_EMAIL" roles/cloudsql.client
bind "$RUN_SA_EMAIL" roles/secretmanager.secretAccessor
# Deployer: deploy Cloud Run services/jobs, push images, act as the runtime SA
bind "$DEPLOY_SA_EMAIL" roles/run.admin
bind "$DEPLOY_SA_EMAIL" roles/artifactregistry.writer
gcloud iam service-accounts add-iam-policy-binding "$RUN_SA_EMAIL" \
  --member "serviceAccount:$DEPLOY_SA_EMAIL" --role roles/iam.serviceAccountUser >/dev/null

say "Keyless GitHub → Google auth (Workload Identity Federation) for $GITHUB_REPO"
exists gcloud iam workload-identity-pools describe "$WIF_POOL" --location global ||
  gcloud iam workload-identity-pools create "$WIF_POOL" --location global --display-name "GitHub Actions"
exists gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER" --location global --workload-identity-pool "$WIF_POOL" ||
  gcloud iam workload-identity-pools providers create-oidc "$WIF_PROVIDER" --location global \
    --workload-identity-pool "$WIF_POOL" --display-name "GitHub OIDC" \
    --issuer-uri "https://token.actions.githubusercontent.com" \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition "assertion.repository == '$GITHUB_REPO'"
gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SA_EMAIL" --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$WIF_POOL/attribute.repository/$GITHUB_REPO" >/dev/null

WIF_NAME="projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$WIF_POOL/providers/$WIF_PROVIDER"

cat <<OUT

════════════════════════════════════════════════════════════════════
 Done. In GitHub: $GITHUB_REPO → Settings → Secrets and variables
 → Actions → *Variables* tab → add these repository variables:

   GCP_PROJECT_ID     $PROJECT_ID
   GCP_REGION         $REGION
   GCP_WIF_PROVIDER   $WIF_NAME
   GCP_DEPLOY_SA      $DEPLOY_SA_EMAIL
   GCP_SQL_INSTANCE   $SQL_INSTANCE

 Then push to dilis-portal-postgres (or Actions → Deploy to Google Cloud → Run).
OUT
if [ -n "${SETUP_TOKEN_SHOWN:-}" ]; then
  echo
  echo " Setup code for https://<site>/setup :  $SETUP_TOKEN_SHOWN"
  echo " (also stored in Secret Manager as SETUP_TOKEN)"
fi
echo "════════════════════════════════════════════════════════════════════"
