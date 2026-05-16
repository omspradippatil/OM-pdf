// src/services/googleDrive.js
// Client-side Google Drive helpers. 
// Uses Firebase Auth popup to silently refresh tokens when they expire.

const ROOT_FOLDER = 'OM PDF';
// We artificially set this TTL longer, but Google tokens naturally expire in 1 hr.
// We handle expiration gracefully by throwing a specific error which AuthContext catches to pop a new token.
const TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000; 
const STORAGE_TOKEN = 'om_pdf_drive_token';
const STORAGE_EXP = 'om_pdf_drive_token_exp';
const STORAGE_UID = 'om_pdf_drive_uid';

let accessToken = null;
let tokenExpiry = 0;
let activeUid = null;
let rootFolderId = null;
const subFolderCache = {};

function tokenStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function resetFolderCache() {
  rootFolderId = null;
  Object.keys(subFolderCache).forEach((key) => delete subFolderCache[key]);
}

export function isTokenValid() {
  return !!(accessToken && Date.now() < tokenExpiry);
}

export function setDriveAccessToken(token, expiresInMs = TOKEN_TTL_MS, uid = null) {
  accessToken = token || null;
  activeUid = uid || activeUid;
  const ttl = Math.max(60 * 1000, expiresInMs || TOKEN_TTL_MS);
  tokenExpiry = accessToken ? Date.now() + (ttl - 60 * 1000) : 0;
  resetFolderCache();
  if (!activeUid || !accessToken) return;
  try {
    const storage = tokenStorage();
    if (!storage) return;
    storage.setItem(STORAGE_TOKEN, accessToken);
    storage.setItem(STORAGE_EXP, String(tokenExpiry));
    storage.setItem(STORAGE_UID, activeUid);
  } catch {}
}

export function loadStoredDriveToken(uid) {
  try {
    const storage = tokenStorage();
    if (!storage) return false;
    const storedUid = storage.getItem(STORAGE_UID);
    const token = storage.getItem(STORAGE_TOKEN);
    const exp = parseInt(storage.getItem(STORAGE_EXP) || '0', 10);
    if (!uid || storedUid !== uid || !token || !exp) return false;
    if (Date.now() >= exp) {
      clearDriveAccessToken();
      return false;
    }
    activeUid = uid;
    accessToken = token;
    tokenExpiry = exp;
    return true;
  } catch {
    return false;
  }
}

export function clearDriveAccessToken() {
  accessToken = null;
  activeUid = null;
  tokenExpiry = 0;
  resetFolderCache();
  try {
    const storage = tokenStorage();
    if (storage) {
      storage.removeItem(STORAGE_TOKEN);
      storage.removeItem(STORAGE_EXP);
      storage.removeItem(STORAGE_UID);
    }
    window.sessionStorage?.removeItem(STORAGE_TOKEN);
    window.sessionStorage?.removeItem(STORAGE_EXP);
    window.sessionStorage?.removeItem(STORAGE_UID);
  } catch {}
}

export function hasDriveAccess() {
  return isTokenValid();
}

export async function authorize(uid = null) {
  if (isTokenValid()) return accessToken;
  throw new Error('DRIVE_TOKEN_EXPIRED');
}

async function driveRequest(path, _loginHint = null, options = {}) {
  const token = await authorize();
  const response = await fetch(`https://www.googleapis.com/drive/v3${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  if (!response.ok) {
    if (response.status === 401) {
      clearDriveAccessToken();
      throw new Error('DRIVE_TOKEN_EXPIRED');
    }
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Drive API error ${response.status}: ${response.statusText}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

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
  const folder = await driveRequest('/files', loginHint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: ROOT_FOLDER, mimeType: 'application/vnd.google-apps.folder' }),
  });
  rootFolderId = folder.id;
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
  const folder = await driveRequest('/files', loginHint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: toolFolder,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });
  subFolderCache[toolFolder] = folder.id;
  return folder.id;
}

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

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size',
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  if (!response.ok) {
    if (response.status === 401) {
      clearDriveAccessToken();
      throw new Error('DRIVE_TOKEN_EXPIRED');
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error?.message || `Upload failed: ${response.statusText}`);
  }
  return response.json();
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
