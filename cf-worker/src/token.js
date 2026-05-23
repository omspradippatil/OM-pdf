// cf-worker/src/token.js
// Google OAuth token operations: exchange, refresh, revoke.

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';

/**
 * Exchange an authorization code for access + refresh tokens.
 * Called once during the first offline Drive connection.
 */
export async function exchangeCode(code, redirectUri, clientId, clientSecret) {
  const resp = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
    }),
  });

  const data = await resp.json();
  if (!resp.ok || data.error) {
    throw new Error(data.error_description || data.error || 'Code exchange failed');
  }
  if (!data.refresh_token) {
    throw new Error('No refresh_token returned. Ensure access_type=offline and prompt=consent were used.');
  }
  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    expiresIn:    data.expires_in || 3600,
  };
}

/**
 * Use a stored refresh_token to get a new access_token.
 * Called automatically by the Worker whenever the frontend asks.
 */
export async function refreshAccessToken(refreshToken, clientId, clientSecret) {
  const resp = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     clientId,
      client_secret: clientSecret,
      grant_type:    'refresh_token',
    }),
  });

  const data = await resp.json();
  if (!resp.ok || data.error) {
    // refresh_token_expired or revoked — signal the frontend to re-auth
    if (data.error === 'invalid_grant') {
      throw new Error('REFRESH_TOKEN_REVOKED');
    }
    throw new Error(data.error_description || data.error || 'Token refresh failed');
  }
  return {
    accessToken: data.access_token,
    expiresIn:   data.expires_in || 3600,
  };
}

/**
 * Revoke a refresh_token at Google (called on logout / disconnect).
 */
export async function revokeToken(refreshToken) {
  await fetch(`${REVOKE_ENDPOINT}?token=${encodeURIComponent(refreshToken)}`, {
    method: 'POST',
  });
  // Revocation failures are non-fatal — we still clear our KV entry.
}
