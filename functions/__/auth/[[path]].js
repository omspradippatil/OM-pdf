export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const referer = context.request.headers.get('Referer') || '';
    
    // Check if the request or referer is coming from the old Netlify app
    if (url.hostname.includes('netlify.app') || referer.includes('netlify.app')) {
      return new Response('Redirecting to new URL...', {
        status: 301,
        headers: { Location: 'https://om-pdf.pages.dev' + url.pathname + url.search }
      });
    }

    // Only proceed with the proxy if it's coming from Pages (or localhost for dev)
    if (url.hostname.includes('pages.dev') || url.hostname.includes('localhost') || url.hostname === '127.0.0.1') {
      url.hostname = 'om-pdf.firebaseapp.com';
      const proxyRequest = new Request(url.toString(), context.request);
      return fetch(proxyRequest);
    }

    // Fallback block
    return new Response('Unauthorized Host', { status: 403 });
  } catch (error) {
    return new Response('Proxy Error: ' + error.message, { status: 500 });
  }
}
