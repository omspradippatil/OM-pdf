/**
 * src/utils/dataUrl.js — Safe Data URL and Binary Utilities
 * 
 * Avoids window.fetch('data:...') which throws "TypeError: Load failed" in Safari/WebKit and strict CSP environments.
 */

/**
 * Safely converts a Data URL (base64 or encoded) to a Uint8Array in memory.
 * Completely synchronous, 0 network dependency, 0 CSP issues.
 * 
 * @param {string} dataUrl
 * @returns {Uint8Array}
 */
export function dataUrlToBytes(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    throw new Error('Invalid Data URL: must be a non-empty string');
  }

  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) {
    // Attempt decoding raw base64 string
    const binary = atob(dataUrl.trim());
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  const header = dataUrl.slice(0, commaIdx);
  const data = dataUrl.slice(commaIdx + 1);

  if (header.includes(';base64')) {
    const binary = atob(data.trim());
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // URL-encoded plain text data
  const decoded = decodeURIComponent(data);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) {
    bytes[i] = decoded.charCodeAt(i);
  }
  return bytes;
}

/**
 * Normalizes any image source (Data URL, Object URL, etc.) into a clean PNG Data URL.
 * Guarantees compatibility with pdf-lib embedPng() regardless of input format (JPG/PNG/WebP).
 * 
 * @param {string} src
 * @returns {Promise<string>}
 */
export function imageToPngDataUrl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 400;
        canvas.height = img.naturalHeight || img.height || 150;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to decode signature image into canvas.'));
    img.src = src;
  });
}
