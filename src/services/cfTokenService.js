// src/services/cfTokenService.js
// Thin client for the Cloudflare Worker Drive token API.
// The Worker URL is set via VITE_CF_WORKER_URL env variable.

const WORKER_URL = import.meta.env.VITE_CF_WORKER_URL || '';

function workerAvailable() {
  return !!WORKER_URL;
}

async function workerPost(path, idToken, body = null) {
  if (!workerAvailable()) return null;
  try {
    const resp = await fetch(`${WORKER_URL}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type':  'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.error || `Worker ${resp.status}`);
    }
    return resp.json();
  } catch (err) {
    console.warn('[CFWorker]', path, err.message);
    return null;
  }
}

/**
 * Exchange a Google OAuth authorization code for tokens.
 * Called once from the /drive-callback page.
 * Returns: { access_token, expires_in } or null on failure.
 */
export async function cfExchangeCode(idToken, code, redirectUri) {
  return workerPost('/api/drive/callback', idToken, { code, redirectUri });
}

/**
 * Silently get a fresh Drive access token using the stored refresh token.
 * Returns: { access_token, expires_in } | { needs_reauth: true } | null
 */
export async function cfRefreshToken(idToken) {
  return workerPost('/api/drive/refresh', idToken);
}

/**
 * Revoke and delete the stored refresh token (call on logout).
 */
export async function cfRevokeToken(idToken) {
  return workerPost('/api/drive/revoke', idToken);
}

/**
 * Check if the user has a stored refresh token in the Worker KV.
 * Returns: { connected: boolean } or null if Worker unavailable.
 */
export async function cfDriveStatus(idToken) {
  if (!workerAvailable()) return null;
  try {
    const resp = await fetch(`${WORKER_URL}/api/drive/status`, {
      headers: { 'Authorization': `Bearer ${idToken}` },
    });
    return resp.ok ? resp.json() : null;
  } catch {
    return null;
  }
}

export { workerAvailable };
