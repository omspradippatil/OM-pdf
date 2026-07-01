// cf-worker/src/index.js
// Main Cloudflare Worker entry point.
// Routes:
//   POST /api/drive/callback   — OAuth code exchange (first-time setup)
//   POST /api/drive/refresh    — Silent token refresh (background)
//   POST /api/drive/revoke     — Logout / disconnect Drive
//   GET  /api/drive/status     — Check if user has a stored refresh token

import { verifyFirebaseToken, extractBearerToken } from './auth.js';
import { encrypt, decrypt } from './crypto.js';
import { exchangeCode, refreshAccessToken, revokeToken } from './token.js';

// ── CORS headers (allow only your Netlify domain + localhost dev) ──────────
function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  let allowOrigin = 'https://om-pdf.netlify.app';

  try {
    const parsed = new URL(origin);
    const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    const isProdApp = parsed.origin === 'https://om-pdf.netlify.app';

    if (isLocalhost || isProdApp) {
      allowOrigin = parsed.origin;
    }
  } catch {
    /* keep default allowOrigin */
  }

  return {
    'Access-Control-Allow-Origin':  allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age':       '86400',
  };
}

function json(data, status = 200, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
  });
}

function err(message, status = 400, request) {
  return json({ error: message }, status, request);
}

// ── Auth helper ───────────────────────────────────────────────────────────
async function authenticate(request, env) {
  const idToken = extractBearerToken(request);
  if (!idToken) throw Object.assign(new Error('Missing Authorization header'), { status: 401 });
  try {
    return await verifyFirebaseToken(idToken, env.FIREBASE_PROJECT_ID);
  } catch (e) {
    throw Object.assign(new Error('Invalid ID token: ' + e.message), { status: 401 });
  }
}

// ── KV helpers ────────────────────────────────────────────────────────────
const KV_TTL = 60 * 60 * 24 * 180; // 180 days (refresh tokens rarely expire)

async function storeRefreshToken(uid, refreshToken, env) {
  const encrypted = await encrypt(refreshToken, env.ENCRYPTION_KEY);
  await env.DRIVE_TOKENS.put(`rt:${uid}`, encrypted, { expirationTtl: KV_TTL });
}

async function loadRefreshToken(uid, env) {
  const encrypted = await env.DRIVE_TOKENS.get(`rt:${uid}`);
  if (!encrypted) return null;
  return decrypt(encrypted, env.ENCRYPTION_KEY);
}

async function deleteRefreshToken(uid, env) {
  await env.DRIVE_TOKENS.delete(`rt:${uid}`);
}

async function keepDriveTokensWarm(env) {
  let cursor;
  let checked = 0;
  let refreshed = 0;
  let revoked = 0;
  let failed = 0;

  do {
    const page = await env.DRIVE_TOKENS.list({ prefix: 'rt:', cursor });
    cursor = page.cursor;

    for (const key of page.keys || []) {
      checked++;
      try {
        const encrypted = await env.DRIVE_TOKENS.get(key.name);
        if (!encrypted) continue;

        const refreshToken = await decrypt(encrypted, env.ENCRYPTION_KEY);
        await refreshAccessToken(refreshToken, env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
        refreshed++;
      } catch (e) {
        if (e.message === 'REFRESH_TOKEN_REVOKED') {
          await env.DRIVE_TOKENS.delete(key.name);
          revoked++;
        } else {
          failed++;
          console.error('[scheduled-refresh]', key.name, e.message);
        }
      }
    }
  } while (cursor);

  console.log('[scheduled-refresh]', { checked, refreshed, revoked, failed });
  return { checked, refreshed, revoked, failed };
}

// ── Route handlers ────────────────────────────────────────────────────────

/**
 * POST /api/drive/callback
 * Body: { code: string, redirectUri: string }
 * Exchanges the OAuth authorization code for access + refresh tokens.
 * Stores the refresh token encrypted in KV.
 * Returns: { access_token, expires_in }
 */
async function handleCallback(request, env) {
  const payload = await authenticate(request, env);
  const { code, redirectUri } = await request.json().catch(() => ({}));

  if (!code)        return err('Missing code', 400, request);
  if (!redirectUri) return err('Missing redirectUri', 400, request);

  try {
    const { accessToken, refreshToken, expiresIn } = await exchangeCode(
      code, redirectUri, env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET,
    );
    await storeRefreshToken(payload.sub, refreshToken, env);
    return json({ access_token: accessToken, expires_in: expiresIn }, 200, request);
  } catch (e) {
    console.error('[callback]', e.message);
    return err(e.message, 502, request);
  }
}

/**
 * POST /api/drive/refresh
 * No body required — uses stored refresh token.
 * Returns: { access_token, expires_in }
 */
async function handleRefresh(request, env) {
  const payload = await authenticate(request, env);

  const refreshToken = await loadRefreshToken(payload.sub, env);
  if (!refreshToken) {
    return json({ needs_reauth: true }, 200, request);
  }

  try {
    const { accessToken, expiresIn } = await refreshAccessToken(
      refreshToken, env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET,
    );
    return json({ access_token: accessToken, expires_in: expiresIn }, 200, request);
  } catch (e) {
    console.error('[refresh]', e.message);
    if (e.message === 'REFRESH_TOKEN_REVOKED') {
      await deleteRefreshToken(payload.sub, env);
      return json({ needs_reauth: true }, 200, request);
    }
    return err(e.message, 502, request);
  }
}

/**
 * POST /api/drive/revoke
 * Revokes the refresh token at Google and deletes it from KV.
 */
async function handleRevoke(request, env) {
  const payload = await authenticate(request, env);
  const refreshToken = await loadRefreshToken(payload.sub, env);

  if (refreshToken) {
    await revokeToken(refreshToken).catch(() => {}); // non-fatal
    await deleteRefreshToken(payload.sub, env);
  }
  return json({ ok: true }, 200, request);
}

/**
 * GET /api/drive/status
 * Returns whether the user has a stored refresh token.
 */
async function handleStatus(request, env) {
  const payload = await authenticate(request, env);
  const exists = !!(await env.DRIVE_TOKENS.get(`rt:${payload.sub}`));
  return json({ connected: exists }, 200, request);
}

// ── Main fetch handler ────────────────────────────────────────────────────
export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(keepDriveTokensWarm(env));
  },

  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const url = new URL(request.url);

    try {
      if (request.method === 'POST' && url.pathname === '/api/drive/callback') {
        return handleCallback(request, env);
      }
      if (request.method === 'POST' && url.pathname === '/api/drive/refresh') {
        return handleRefresh(request, env);
      }
      if (request.method === 'POST' && url.pathname === '/api/drive/revoke') {
        return handleRevoke(request, env);
      }
      if (request.method === 'GET' && url.pathname === '/api/drive/status') {
        return handleStatus(request, env);
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders(request) });
    } catch (e) {
      const status = e.status || 500;
      return err(e.message || 'Internal error', status, request);
    }
  },
};
