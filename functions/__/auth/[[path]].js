export async function onRequest(context) {
  // Construct the destination URL
  const url = new URL(context.request.url);
  url.hostname = 'om-pdf.firebaseapp.com';
  
  // Proxy the request to Firebase Auth
  const proxyRequest = new Request(url.toString(), context.request);
  return fetch(proxyRequest);
}
