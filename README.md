# KidsChurchLog

KidsChurchLog is a Spark-first children’s-ministry operations platform. The product blueprint is in [`docs/PRD.md`](docs/PRD.md).

## Current development phase

This repository currently contains the shared foundation and two independent applications:

- `apps/ministry-lead` — oversight, access governance, configuration, attendance history, and reporting.
- `apps/admin-volunteer` — assisted family registration, ordinary record maintenance, and Family Pass issue/reissue.
- `packages/firebase` — Firebase client initialization, access state, queries, and audited transactions.
- `packages/ui` — shared brand and presentation primitives.
- `packages/types`, `packages/validation`, and `packages/utils` — framework-neutral shared code.

The Kids Church Volunteer application has not been scaffolded yet.

### Source organization

- `apps/ministry-lead/components/screens.tsx` is only the navigation-screen registry.
- `apps/ministry-lead/components/screens/` contains one module per Ministry Lead feature, with shared table, loading, error, and metric primitives in `shared.tsx`.
- `packages/firebase/src/client.ts` owns Firebase initialization.
- Firebase authentication, access state, collection subscriptions, membership governance, and ministry-document writes live in separate focused modules and are re-exported through `packages/firebase/src/index.tsx`.

Keep route files thin, keep Firestore writes in the shared Firebase package, and colocate private modal components only with the feature that owns them.

## Local setup

1. Use Node.js 20 (`nvm use` reads the repository’s `.nvmrc`).
2. Run `npm install`.
3. Copy the Firebase web configuration into the application-specific `.env.local`, using that app’s `.env.example` as the key list.
4. Set `NEXT_PUBLIC_MINISTRY_ID` to the Firestore ministry document ID. Local development defaults to `kidschurch` when it is omitted.
5. Run `npm run dev:lead` for Ministry Lead on port 3000, or `npm run dev:admin` for Admin Volunteer on port 3001.

Root `.env.local` is retained only as a migration source from the earlier prototype. Application-specific environment files are authoritative going forward.

## Account and access behavior

- **Sign in** accepts existing email/password accounts only; it never creates an account silently.
- **Continue with Google** creates or reuses the Firebase identity, then leaves new users Pending.
- **Create account and request access** collects full name, email, ministry responsibility, and an access reason; requires a non-obvious password of at least 12 characters, password confirmation, and email verification; and still grants no ministry role automatically.
- If account creation succeeds but the request write is interrupted, the verified user is shown **Complete access request** after signing in. They supply the missing ministry details without creating another Firebase account.
- The application never creates an empty request automatically. **Pending** means a complete request document exists and is ready for review.
- A Ministry Lead reviews the supplied context and explicitly assigns roles and an expiry through Team Access.

## First Ministry Lead bootstrap

There is intentionally no “first user becomes admin” rule. The first Lead uses a guided one-time custodian flow:

1. Deploy the new Firestore rules.
2. The first Lead signs in and copies the Setup ID shown on the pending screen.
3. The Lead gives only that Setup ID to a technical custodian.
4. The custodian runs `npm run bootstrap:lead`, pastes the ID, signs in with their authorized Google Cloud account when prompted, and confirms the detected identity.
5. The Lead chooses **Refresh status** and then approves the second Lead through Team Access.

The custodian needs Google Cloud CLI for temporary Application Default Credentials. The utility creates the ministry, first membership, governance settings, access-request decision, and audit event atomically. It refuses to run when a Ministry Lead already exists and cannot perform emergency recovery.

```bash
npm run bootstrap:lead
gcloud auth application-default revoke
```

The Admin SDK is a local development dependency for this custodian utility only. It is not imported by an application, included in the static export, or deployed as a backend.

### Install Google Cloud CLI locally on macOS

Cloud Shell and billing are not required. The bootstrap utility uses the local Google Cloud CLI only to obtain temporary credentials for the named technical custodian.

With Homebrew installed:

```bash
brew update
brew install --cask gcloud-cli
gcloud --version
```

If `gcloud` is not found after installation, add the Homebrew Google Cloud SDK directory to the current shell:

```bash
export PATH="$(brew --prefix)/share/google-cloud-sdk/bin:$PATH"
gcloud --version
```

The utility runs `gcloud auth application-default login` when credentials are needed; there is no need to use Cloud Shell, enable billing, or run a billing command. After the first Lead is created, remove the temporary local credentials:

```bash
gcloud auth application-default revoke
```

Official references: [Google Cloud CLI with Homebrew](https://docs.cloud.google.com/sdk/docs/downloads-homebrew) and [local Application Default Credentials](https://docs.cloud.google.com/docs/authentication/set-up-adc-local-dev-environment).

## Quality and deployment

```bash
npm run lint
npm run typecheck
npm test
npm run build:lead
npm run build:admin
npm run deploy:lead
npm run deploy:admin
```

Firebase Hosting uses two independently deployable targets:

- `lead` → `kidschurchlog-app` → `apps/ministry-lead/out`
- `admin` → `kidschurchlog-register` → `apps/admin-volunteer/out`

The Admin Volunteer site’s default URL is `https://kidschurchlog-register.web.app`. Firestore rules and indexes remain shared by both applications. No Cloud Functions, Admin SDK runtime, Cloud Run, App Hosting, or Blaze-only service is used.
