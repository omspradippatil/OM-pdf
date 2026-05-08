/* 
  PDF Security Utility using QPDF WASM.
  Engine is loaded dynamically to avoid build-time analysis conflicts.
*/

let qpdfInstance = null;

// Helper to load a script dynamically
const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      // Small delay to ensure global is registered
      setTimeout(resolve, 50);
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

async function getQpdf() {
  if (qpdfInstance) return qpdfInstance;
  
  // The engine might be named 'Module' or 'createModule' depending on the build
  let engineFactory = window.createModule || window.Module;

  // Load the engine loader if not present
  if (typeof engineFactory !== 'function') {
    await loadScript('/qpdf.js');
    engineFactory = window.createModule || window.Module;
  }

  // Double check
  if (typeof engineFactory !== 'function') {
    throw new Error('PDF security engine failed to initialize. Please refresh.');
  }

  // Initialize the engine
  qpdfInstance = await engineFactory({
    locateFile: (filePath) => {
      if (filePath.endsWith('.wasm')) return '/qpdf.wasm';
      return filePath;
    }
  });
  
  return qpdfInstance;
}

/**
 * Runs a QPDF command on an input PDF.
 */
async function runQpdf(inputBytes, args) {
  const qpdf = await getQpdf();
  
  const inputName = `input_${Date.now()}.pdf`;
  const outputName = `output_${Date.now()}.pdf`;
  
  try {
    // Write to virtual filesystem
    qpdf.FS.writeFile(inputName, inputBytes);
    
    // Execute command
    const result = qpdf.callMain([...args, inputName, outputName]);
    
    if (result !== 0) {
      throw new Error(`QPDF error: ${result}`);
    }
    
    // Read output
    const outputBytes = qpdf.FS.readFile(outputName);
    
    // Cleanup
    qpdf.FS.unlink(inputName);
    qpdf.FS.unlink(outputName);
    
    return new Uint8Array(outputBytes);
  } catch (err) {
    console.error('QPDF Error:', err);
    try { qpdf.FS.unlink(inputName); } catch (e) {}
    try { qpdf.FS.unlink(outputName); } catch (e) {}
    throw err;
  }
}

export async function protectPdf(bytes, { userPassword = '', ownerPassword = '' }) {
  try {
    const args = ['--encrypt', userPassword, ownerPassword || userPassword, '256', '--'];
    return await runQpdf(bytes, args);
  } catch (err) {
    console.error('Encryption Error:', err);
    throw new Error('Failed to protect PDF. ' + err.message);
  }
}

export async function unlockPdf(bytes, password = '') {
  try {
    const args = [`--password=${password}`, '--decrypt'];
    return await runQpdf(bytes, args);
  } catch (err) {
    console.error('Decryption Error:', err);
    if (err.message.toLowerCase().includes('password')) {
      throw new Error('Incorrect password. Please try again.');
    }
    throw new Error('Failed to unlock PDF. Ensure the file is encrypted and password is correct.');
  }
}

export async function applyPermissions(bytes, { ownerPassword, permissions }) {
  try {
    const args = [
      '--encrypt', '', ownerPassword, '256',
      `--print=${permissions.printing || 'none'}`,
      `--modify=${permissions.modifying || 'none'}`,
      `--extract=${permissions.copying ? 'y' : 'n'}`,
      '--'
    ];
    return await runQpdf(bytes, args);
  } catch (err) {
    console.error('Permissions Error:', err);
    throw new Error('Failed to apply permissions. ' + err.message);
  }
}
