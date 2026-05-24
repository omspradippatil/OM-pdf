const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file email profile';

export function getDriveOAuthUrl({ email = null, redirectTo = null } = {}) {
  const clientId = import.meta.env.VITE_GOOGLE_DRIVE_OAUTH_CLIENT_ID;
  if (!clientId || clientId.includes('PASTE_YOUR')) {
    throw new Error('Google Drive client ID is not configured. Please add VITE_GOOGLE_DRIVE_OAUTH_CLIENT_ID.');
  }

  const redirectUri = `${window.location.origin}/drive-callback`;
  const state = redirectTo || `${window.location.pathname}${window.location.search}` || '/my-files';

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: DRIVE_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  if (email) params.set('login_hint', email);

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function beginDriveOAuthConnection(options = {}) {
  window.location.href = getDriveOAuthUrl(options);
}
