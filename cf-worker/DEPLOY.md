# Deployment Guide — Background Drive Token Refresh Worker

This guide explains how to set up and deploy the Cloudflare Worker that enables 100% silent, popup-free Google Drive token refreshing for **OM PDF**.

---

## Step 1: Create a Google OAuth Client (for Offline Access)

Since standard Firebase Auth popup logins do not return a `refresh_token` (a Google OAuth restriction), we use a separate, secondary Google OAuth flow that requests offline consent.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your Firebase project (e.g., `your-firebase-project-id`).
3. Navigate to **APIs & Services** > **Credentials**.
4. Click **Create Credentials** > **OAuth client ID**.
5. Select **Application type**: `Web application`.
6. Set the **Name** to `OM PDF - Drive Offline Access`.
7. Under **Authorized redirect URIs**, add:
   * `http://localhost:5173/drive-callback` (for local development)
   * `https://om-pdf.netlify.app/drive-callback` (for production Netlify app)
8. Click **Create**.
9. Copy the **Client ID** and **Client Secret**.

---

## Step 2: Configure Environment Variables (.env)

Open the root `.env` file of your project and configure the variables:

```env
# Google OAuth Client ID you just created (from Step 1)
VITE_GOOGLE_DRIVE_OAUTH_CLIENT_ID=your-offline-client-id.apps.googleusercontent.com

# Google OAuth Client Secret (from Step 1)
CF_WORKER_GOOGLE_CLIENT_SECRET=your-offline-client-secret

# Firebase Project ID (typically matches your Firebase console project ID)
CF_WORKER_FIREBASE_PROJECT_ID=your-firebase-project-id

# Generate a random 64-char hex key
# This key is used to encrypt Google refresh tokens inside Cloudflare KV.
CF_WORKER_ENCRYPTION_KEY=your-64-char-hex-key
```

---

## Step 3: Create Cloudflare KV Namespace

The Worker stores encrypted Google refresh tokens in Cloudflare KV.

1. Open your terminal in the `cf-worker` directory:
   ```bash
   cd cf-worker
   ```
2. Run the KV namespace creation command:
   ```bash
   npx wrangler kv:namespace create DRIVE_TOKENS
   ```
3. Copy the returned **ID** (e.g., `38ba2379f82d4957973bcf8527a29e4d`).
4. Open `cf-worker/wrangler.toml` and paste this ID under `id`:
   ```toml
   [[kv_namespaces]]
   binding = "DRIVE_TOKENS"
   id      = "PASTE_THE_DRIVE_TOKENS_ID_HERE"
   ```

*(Optional)* You can also create a preview KV namespace for local testing:
```bash
npx wrangler kv:namespace create DRIVE_TOKENS --preview
```
And paste its ID under `preview_id` in `wrangler.toml`.

---

## Step 4: Push Secrets to Cloudflare Workers

We provide an automated script to read your root `.env` file and push secrets securely to Cloudflare:

1. In the `cf-worker` directory, run:
   ```bash
   npm run secret:set
   ```
2. The script will securely upload the following secrets to Cloudflare:
   * `GOOGLE_CLIENT_ID` (matches `VITE_GOOGLE_DRIVE_OAUTH_CLIENT_ID`)
   * `GOOGLE_CLIENT_SECRET` (matches `CF_WORKER_GOOGLE_CLIENT_SECRET`)
   * `ENCRYPTION_KEY` (matches `CF_WORKER_ENCRYPTION_KEY`)
   * `FIREBASE_PROJECT_ID` (matches `CF_WORKER_FIREBASE_PROJECT_ID`)

---

## Step 5: Deploy the Worker

1. Deploy the worker to Cloudflare:
   ```bash
   npm run deploy
   ```
2. Once deployed successfully, copy the worker URL printed in the terminal (e.g., `https://om-pdf-drive-worker.YOUR-SUBDOMAIN.workers.dev`).

---

## Step 6: Connect Worker to the Frontend

1. Open the root `.env` file again.
2. Update the `VITE_CF_WORKER_URL` with your deployed worker URL (no trailing slash):
   ```env
   VITE_CF_WORKER_URL=https://om-pdf-drive-worker.YOUR-SUBDOMAIN.workers.dev
   ```
3. Re-build and deploy your frontend:
   ```bash
   npm run build
   ```

---

## How It Works in Production

1. **First-time User**: When a signed-in user wants to use Drive (e.g. clicks "Save to Drive"), the frontend detects `driveConnected = false` and redirects them to the Google consent screen.
2. **Authorized Redirect**: After authorization, Google redirects back to `/drive-callback?code=...` with the original tool page path in `state`.
3. **Token Handshake**: The callback page sends the authorization code to the Worker, which exchanges it with Google for access + refresh tokens. The Worker encrypts the `refresh_token` and saves it in Cloudflare KV using the user's Firebase UID as the key.
4. **Subsequent Actions**: The next time a token expires, the frontend calls the Worker's refresh endpoint. The Worker retrieves the refresh token, gets a new access token, and returns it to the client. The user never sees a popup or screen flicker again.
