// cf-worker/src/auth.js
// Verifies Firebase ID tokens using Google's JWKS public keys.
// No Firebase Admin SDK needed — pure fetch + Web Crypto.

const GOOGLE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

let jwksCache = null;
let jwksCacheExpiry = 0;

async function fetchJwks() {
  if (jwksCache && Date.now() < jwksCacheExpiry) return jwksCache;
  const resp = await fetch(GOOGLE_JWKS_URL);
  if (!resp.ok) throw new Error('Failed to fetch Google JWKS');
  // Cache until the HTTP Cache-Control max-age
  const cc = resp.headers.get('cache-control') || '';
  const match = cc.match(/max-age=(\d+)/);
  const maxAge = match ? parseInt(match[1]) * 1000 : 3600_000;
  jwksCache = await resp.json();
  jwksCacheExpiry = Date.now() + maxAge;
  return jwksCache;
}

/** Import a JWK RSA public key for verification */
async function importJwkKey(jwk) {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
}

/** Decode a JWT segment (base64url → JSON) */
function decodeJwtPart(part) {
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

/**
 * Verify a Firebase ID token and return the decoded payload.
 * Throws if invalid or expired.
 * @param {string} idToken
 * @param {string} projectId  — FIREBASE_PROJECT_ID env secret
 */
export async function verifyFirebaseToken(idToken, projectId) {
  const parts = (idToken || '').split('.');
  if (parts.length !== 3) throw new Error('Malformed ID token');

  const header  = decodeJwtPart(parts[0]);
  const payload = decodeJwtPart(parts[1]);

  // Basic claim checks
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now)          throw new Error('ID token expired');
  if (payload.iat > now + 300)    throw new Error('ID token issued in the future');
  if (payload.aud !== projectId)  throw new Error('ID token audience mismatch');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('ID token issuer mismatch');
  }
  if (!payload.sub)               throw new Error('ID token missing subject');

  // Signature verification (JWKS)
  const jwks = await fetchJwks();
  const keys = Array.isArray(jwks?.keys) ? jwks.keys : [];
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('Unknown jwk kid');

  const pubKey = await importJwkKey(jwk);
  const sigB64 = parts[2].replace(/-/g, '+').replace(/_/g, '/');
  const sigPadded = sigB64 + '='.repeat((4 - (sigB64.length % 4)) % 4);
  const sig    = Uint8Array.from(atob(sigPadded), c => c.charCodeAt(0));
  const data   = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);

  const valid = await crypto.subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5' }, pubKey, sig, data,
  );
  if (!valid) throw new Error('ID token signature invalid');

  return payload; // { sub: uid, email, name, ... }
}

/** Extract Bearer token from Authorization header */
export function extractBearerToken(request) {
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}
