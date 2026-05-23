// cf-worker/src/crypto.js
// AES-256-GCM encryption/decryption for refresh tokens stored in KV.
// The ENCRYPTION_KEY secret must be a 64-char hex string (32 bytes).

const ENC = 'AES-GCM';
const IV_BYTES = 12; // 96-bit IV — GCM standard

/** Import the raw hex key from env into a CryptoKey */
async function importKey(hexKey) {
  const raw = hexToBytes(hexKey);
  return crypto.subtle.importKey('raw', raw, { name: ENC }, false, ['encrypt', 'decrypt']);
}

/** Encrypt plaintext string → base64 ciphertext (iv:tag:data) */
export async function encrypt(plaintext, hexKey) {
  const key = await importKey(hexKey);
  const iv  = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const enc = new TextEncoder();
  const ct  = await crypto.subtle.encrypt({ name: ENC, iv }, key, enc.encode(plaintext));
  // Prefix IV so we can decrypt later
  const buf = new Uint8Array(IV_BYTES + ct.byteLength);
  buf.set(iv, 0);
  buf.set(new Uint8Array(ct), IV_BYTES);
  return bytesToBase64(buf);
}

/** Decrypt base64 ciphertext → plaintext string */
export async function decrypt(b64, hexKey) {
  const key  = await importKey(hexKey);
  const buf  = base64ToBytes(b64);
  const iv   = buf.slice(0, IV_BYTES);
  const data = buf.slice(IV_BYTES);
  const pt   = await crypto.subtle.decrypt({ name: ENC, iv }, key, data);
  return new TextDecoder().decode(pt);
}

// ── Helpers ────────────────────────────────────────────────────────────────
function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return arr.buffer;
}

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}
