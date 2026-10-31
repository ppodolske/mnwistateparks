# Atlas Accounts · Stage 2

## Scope
Source-only: Google sign-in shell, signed-in cloud trip listing, explicit browser-trip import, invitations and viewer/editor roles, administrator bootstrap, minimal aggregate-count view. Automatic cloud editing/synchronization of the existing timeline is **not enabled** until Stage 3. Full `/admin` dashboard is Stage 4.

## Production status
Stage 2 source installs into `cloudflare-prep` only. No production deployment or Firebase account activation is performed by the installer. The build creates `dist/atlas-firebase-config.json` with `{ "enabled": false }` until a valid local config file is supplied. Source-only installs must not set Cloudflare environment variables or change Pages bindings.

## Google / Firebase setup, after source acceptance
1. In [Firebase Console](https://console.firebase.google.com/), create a new Firebase project **without Google Analytics** on the free Spark plan. Do not enable paid billing.
2. Add a web app; copy its web app configuration (apiKey, authDomain, projectId, appId).
3. Authentication → Sign-in method → enable **Google**. Configure a public support email and any required OAuth consent settings.
4. Authentication → Settings → Authorized domains: add `parks.preston.run`; add any preview domain only if needed. Do not remove Firebase's default auth domain.
5. Create a LOCAL `config/atlas-firebase-web.json` file from the `config/atlas-firebase-web.json.example` example, populated with public web config values. **Do not paste a Firebase service-account private key, personal API credentials, or OAuth client secret.** This config file is Git-ignored. The generated `dist/atlas-firebase-config.json` is intentionally public.
6. In Cloudflare Pages project `parks`, add the `ATLAS_DB` D1 binding to `atlas-parks-accounts` (`1c91f337-8f5e-4e07-b0db-f25995ed2e6b`) and environment variables `FIREBASE_PROJECT_ID` and `ATLAS_ADMIN_EMAIL` (the Google email you will sign in with). Do not set `ATLAS_ADMIN_UID`: this version binds the first verified matching Google identity automatically.
7. Verify the database contains `atlas_admin` and `trip_imports` (migration 0002). Stage 2 installer does NOT apply remote DB migrations; they require a separate verified operation.
8. Before any production deployment, test on a distinct preview branch using `wrangler pages deploy dist --project-name parks --branch atlas-accounts-stage2-preview`. Local worktree must include a valid config; avoid preview data writes against the production D1 database while testing.
9. Validate on Chrome Mac and Safari iPhone. Google popup sign-in is used because Firebase redirect sign-in has third-party-storage restrictions on browsers such as Safari. If popup sign-in fails in Safari, do not enable production; address this in a contained follow-up.
10. Production cutover requires additional explicit acceptance. Do not deploy on installer success alone.

## Privacy
Google tokens are verified server-side; Cloudflare D1 enforces access based on the verified UID. Admin is bound to the first authenticated UID matching the configured verified Google email, then cannot be claimed by another UID with the same email. Browser imports create **new cloud copies** and never delete browser trips or change reservations. Imports use stable browser trip IDs for idempotency. A user may accept a shared-trip invitation only when signed in with the addressed Google email. Viewer/editor permissions are checked on server. Invitation links are manually shared (no email-sending service in Stage 2).

## Note on automatic synchronization
No sync status or updated website experience should be claimed yet. The signed-in panel lists cloud trips and supports invitation creation and safe import, but editing continues in localStorage until Stage 3 safely replaces the storage adapter. An imported trip is not automatically opened on a different device yet.
