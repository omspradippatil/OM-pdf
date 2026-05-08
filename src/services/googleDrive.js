// src/services/googleDrive.js
// Google Drive API helpers using the Firebase auth access token.

const ROOT_FOLDER = 'OM PDF';
const TOKEN_TTL_MS = 55 * 60 * 1000;
const STORAGE_TOKEN = 'om_pdf_drive_token';
const STORAGE_EXP = 'om_pdf_drive_token_exp';
const STORAGE_UID = 'om_pdf_drive_uid';

let accessToken = null;
let tokenExpiry = 0;
let rootFolderId = null;
const subFolderCache = {}; // { 'Merged': id, 'Split': id, ... }

function isTokenValid() {
  return !!(accessToken && Date.now() < tokenExpiry);
}

function resetFolderCache() {
  rootFolderId = null;
  Object.keys(subFolderCache).forEach(k => delete subFolderCache[k]);
}

export function setDriveAccessToken(token, expiresInMs = TOKEN_TTL_MS, uid = null) {
  accessToken = token || null;
  const ttl = Math.max(60 * 1000, expiresInMs || TOKEN_TTL_MS);
  tokenExpiry = accessToken ? Date.now() + (ttl - 60 * 1000) : 0;
  resetFolderCache();
  if (!uid || !accessToken) return;
  try {
    sessionStorage.setItem(STORAGE_TOKEN, accessToken);
    sessionStorage.setItem(STORAGE_EXP, String(tokenExpiry));
    sessionStorage.setItem(STORAGE_UID, uid);
  } catch {}
}

export function loadStoredDriveToken(uid) {
  try {
    const storedUid = sessionStorage.getItem(STORAGE_UID);
    const token = sessionStorage.getItem(STORAGE_TOKEN);
    const exp = parseInt(sessionStorage.getItem(STORAGE_EXP) || '0', 10);
    if (!uid || storedUid !== uid || !token || !exp) return false;
    if (Date.now() >= exp) return false;
    accessToken = token;
    tokenExpiry = exp;
    return true;
  } catch {
    return false;
  }
}

export function clearDriveAccessToken() {
  accessToken = null;
  tokenExpiry = 0;
  resetFolderCache();
  try {
    sessionStorage.removeItem(STORAGE_TOKEN);
    sessionStorage.removeItem(STORAGE_EXP);
    sessionStorage.removeItem(STORAGE_UID);
  } catch {}
}

export function hasDriveAccess() {
  return isTokenValid();
}

export async function authorize() {
  if (!isTokenValid()) {
    throw new Error('Drive access expired. Please sign in again.');
  }
  return accessToken;
}

/* Drive request helper */
async function driveRequest(path, _loginHint = null, options = {}) {
  const token = await authorize();
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

/* Folder helpers */
async function ensureRootFolder(loginHint) {
  if (rootFolderId) return rootFolderId;
  const q = encodeURIComponent(
    `name='${ROOT_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const data = await driveRequest(`/files?q=${q}&fields=files(id,name)&spaces=drive`, loginHint);
  if (data?.files?.length > 0) {
    rootFolderId = data.files[0].id;
    return rootFolderId;
  }
  const f = await driveRequest('/files', loginHint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: ROOT_FOLDER, mimeType: 'application/vnd.google-apps.folder' }),
  });
  rootFolderId = f.id;
  return rootFolderId;
}

async function ensureSubFolder(loginHint, toolFolder) {
  if (subFolderCache[toolFolder]) return subFolderCache[toolFolder];
  const parentId = await ensureRootFolder(loginHint);
  const q = encodeURIComponent(
    `name='${toolFolder}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
  );
  const data = await driveRequest(`/files?q=${q}&fields=files(id,name)&spaces=drive`, loginHint);
  if (data?.files?.length > 0) {
    subFolderCache[toolFolder] = data.files[0].id;
    return subFolderCache[toolFolder];
  }
  const f = await driveRequest('/files', loginHint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: toolFolder,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });
  subFolderCache[toolFolder] = f.id;
  return subFolderCache[toolFolder];
}

/* Public API */
export async function uploadToDrive(bytes, filename, loginHint = null, toolFolder = null, mimeType = 'application/pdf') {
  const parentId = toolFolder
    ? await ensureSubFolder(loginHint, toolFolder)
    : await ensureRootFolder(loginHint);

  const token = await authorize();
  const metadata = JSON.stringify({ name: filename, parents: [parentId] });
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes], { type: mimeType });

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

export async function listDriveFiles(loginHint = null, toolFolder = null) {
  const parentId = toolFolder
    ? await ensureSubFolder(loginHint, toolFolder)
    : await ensureRootFolder(loginHint);
  const q = encodeURIComponent(`'${parentId}' in parents and trashed=false`);
  const data = await driveRequest(
    `/files?q=${q}&fields=files(id,name,size,createdTime,webViewLink,webContentLink)&orderBy=createdTime desc`,
    loginHint
  );
  return data?.files || [];
}

export async function deleteFromDrive(fileId, loginHint = null) {
  await driveRequest(`/files/${fileId}`, loginHint, { method: 'DELETE' });
}
