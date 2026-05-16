# Google Drive OAuth Backend Setup

OM PDF uses Firebase Auth for login and Firebase Cloud Functions for long-lived Google Drive access.

## Required Secrets

Set these before deploying functions:

```bash
firebase functions:secrets:set GOOGLE_OAUTH_CLIENT_ID
firebase functions:secrets:set GOOGLE_OAUTH_CLIENT_SECRET
firebase functions:secrets:set DRIVE_TOKEN_ENCRYPTION_KEY
```

Generate `DRIVE_TOKEN_ENCRYPTION_KEY` as a base64-encoded 32-byte key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Required Function Params

For Functions v2 params, set these when the Firebase CLI prompts during deploy or configure them in the Firebase console:

- `DRIVE_OAUTH_REDIRECT_URI`
- `APP_RETURN_URL`

The redirect URI must match the deployed `driveOAuthCallback` function URL exactly, for example:

```text
https://us-central1-om-pdf.cloudfunctions.net/driveOAuthCallback
```

Add that exact URL to the Google Cloud OAuth client under **Authorized redirect URIs**.

## Deploy

```bash
firebase deploy --only functions,firestore:rules
```

## Notes

- Browser code never stores Google refresh tokens.
- Refresh tokens are encrypted before being stored in Firestore under server-only collections.
- The browser receives short-lived access tokens from callable functions and uploads files directly to Google Drive.
