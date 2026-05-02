// src/services/googleDrive.js
// Google Drive — GIS token model. Supports per-tool subfolders inside "OM PDF".

const CLIENT_ID   = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES      = 'https://www.googleapis.com/auth/drive.file';
const ROOT_FOLDER = 'OM PDF';

let tokenClient  = null;
let accessToken  = null;
let tokenExpiry  = 0;
let cachedHint   = null;
let rootFolderId = null;
const subFolderCache = {}; // { 'Merged': id, 'Split': id, ... }

/* ─── GIS Loader ─── */
function loadGIS() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    if (document.getElementById('gis-script')) {
      const poll = setInterval(() => {
        if (window.google?.accounts?.oauth2) { clearInterval(poll); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(poll); reject(new Error('GIS load timeout')); }, 10000);
      return;
    }
    const s = document.createElement('script');
    s.id = 'gis-script'; s.src = 'https://accounts.google.com/gsi/client';
    s.async = true; s.defer = true;
    s.onload  = () => setTimeout(resolve, 100);
    s.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(s);
  });
}

/* ─── Token ─── */
function isTokenValid() { return !!(accessToken && Date.now() < tokenExpiry); }

function requestToken(loginHint) {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id:      CLIENT_ID,
        scope:          SCOPES,
        callback:       () => {},
        error_callback: (err) => reject(new Error(err?.message || 'Google auth error — allow popups for this site')),
      });
    }
    tokenClient.callback = (resp) => {
      if (resp.error) { reject(new Error(resp.error_description || resp.error)); return; }
      accessToken = resp.access_token;
      tokenExpiry = Date.now() + (parseInt(resp.expires_in, 10) - 60) * 1000;
      rootFolderId = null; // reset on new token
      Object.keys(subFolderCache).forEach(k => delete subFolderCache[k]);
      resolve(accessToken);
    };
    const options = loginHint
      ? { hint: loginHint, prompt: '' }
      : { prompt: 'select_account' };
    tokenClient.requestAccessToken(options);
  });
}

export async function authorize(loginHint = null) {
  if (isTokenValid() && (!loginHint || loginHint === cachedHint)) return accessToken;
  await loadGIS();
  if (loginHint && loginHint !== cachedHint) {
    accessToken = null; tokenExpiry = 0; rootFolderId = null; tokenClient = null;
    Object.keys(subFolderCache).forEach(k => delete subFolderCache[k]);
  }
  const token = await requestToken(loginHint);
  cachedHint = loginHint;
  return token;
}

export function revokeAccess() {
  if (accessToken) window.google?.accounts.oauth2.revoke(accessToken, () => {});
  accessToken = null; tokenExpiry = 0; rootFolderId = null; cachedHint = null; tokenClient = null;
  Object.keys(subFolderCache).forEach(k => delete subFolderCache[k]);
}

export function hasDriveAccess() { return isTokenValid(); }

/* ─── Drive request helper ─── */
async function driveRequest(path, loginHint = null, options = {}) {
  const token = await authorize(loginHint);
  const r = await fetch(`https://www.googleapis.com/drive/v3${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Drive API error ${r.status}: ${r.statusText}`);
  }
  if (r.status === 204) return null;
  return r.json();
}

/* ─── Folder helpers ─── */

/** Find or create the "OM PDF" root folder */
async function ensureRootFolder(loginHint) {
  if (rootFolderId) return rootFolderId;
  const q    = encodeURIComponent(`name='${ROOT_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const data = await driveRequest(`/files?q=${q}&fields=files(id,name)&spaces=drive`, loginHint);
  if (data?.files?.length > 0) { rootFolderId = data.files[0].id; return rootFolderId; }
  const f = await driveRequest('/files', loginHint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: ROOT_FOLDER, mimeType: 'application/vnd.google-apps.folder' }),
  });
  rootFolderId = f.id;
  return rootFolderId;
}

/**
 * Find or create a subfolder inside "OM PDF".
 * e.g. ensureSubFolder('you@gmail.com', 'Merged') → OM PDF/Merged/
 */
async function ensureSubFolder(loginHint, toolFolder) {
  if (subFolderCache[toolFolder]) return subFolderCache[toolFolder];
  const parentId = await ensureRootFolder(loginHint);
  const q = encodeURIComponent(
    `name='${toolFolder}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
  );
  const data = await driveRequest(`/files?q=${q}&fields=files(id,name)&spaces=drive`, loginHint);
  if (data?.files?.length > 0) { subFolderCache[toolFolder] = data.files[0].id; return subFolderCache[toolFolder]; }
  const f = await driveRequest('/files', loginHint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: toolFolder, mimeType: 'application/vnd.google-apps.folder', parents: [parentId],
    }),
  });
  subFolderCache[toolFolder] = f.id;
  return subFolderCache[toolFolder];
}

/* ─── Public API ─── */

/**
 * Upload a file to the correct Drive subfolder.
 *
 * @param {Uint8Array|Blob} bytes
 * @param {string}          filename
 * @param {string|null}     loginHint   - currentUser.email
 * @param {string}          toolFolder  - subfolder name e.g. 'Merged', 'Split'
 * @param {string}          mimeType    - defaults to 'application/pdf'
 */
export async function uploadToDrive(bytes, filename, loginHint = null, toolFolder = null, mimeType = 'application/pdf') {
  const parentId = toolFolder
    ? await ensureSubFolder(loginHint, toolFolder)
    : await ensureRootFolder(loginHint);

  const token    = accessToken;
  const metadata = JSON.stringify({ name: filename, parents: [parentId] });
  const blob     = bytes instanceof Blob ? bytes : new Blob([bytes], { type: mimeType });

  const form = new FormData();
  form.append('metadata', new Blob([metadata], { type: 'application/json' }));
  form.append('file', blob);

  const r = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size',
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Upload failed: ${r.statusText}`);
  }
  return r.json();
}

/** List all files inside OM PDF / [toolFolder] (or root if no folder given) */
export async function listDriveFiles(loginHint = null, toolFolder = null) {
  const parentId = toolFolder
    ? await ensureSubFolder(loginHint, toolFolder)
    : await ensureRootFolder(loginHint);
  const q    = encodeURIComponent(`'${parentId}' in parents and trashed=false`);
  const data = await driveRequest(
    `/files?q=${q}&fields=files(id,name,size,createdTime,webViewLink,webContentLink)&orderBy=createdTime desc`,
    loginHint
  );
  return data?.files || [];
}

/** Delete a file from Drive */
export async function deleteFromDrive(fileId, loginHint = null) {
  await driveRequest(`/files/${fileId}`, loginHint, { method: 'DELETE' });
}
