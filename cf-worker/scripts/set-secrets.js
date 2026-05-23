// cf-worker/scripts/set-secrets.js
// Reads .env from root, extracts Worker-related secrets, and pushes them using Wrangler CLI.

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const envPath = path.resolve(__dirname, '../../.env');

if (!fs.existsSync(envPath)) {
  console.error('❌ Root .env file not found at:', envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');

// Parse environment variables
const env = {};
envContent.split(/\r?\n/).forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
  if (match) {
    let value = match[2] || '';
    // Remove wrapping quotes if present
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const mappings = {
  'GOOGLE_CLIENT_ID': env.VITE_GOOGLE_DRIVE_OAUTH_CLIENT_ID,
  'GOOGLE_CLIENT_SECRET': env.CF_WORKER_GOOGLE_CLIENT_SECRET,
  'ENCRYPTION_KEY': env.CF_WORKER_ENCRYPTION_KEY,
  'FIREBASE_PROJECT_ID': env.CF_WORKER_FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID,
};

// Check if any required secret is missing or default
const missing = [];
for (const [key, val] of Object.entries(mappings)) {
  if (!val || val.includes('PASTE_YOUR') || val.includes('REPLACE_WITH')) {
    missing.push(key);
  }
}

if (missing.length > 0) {
  console.warn('⚠️  Warning: The following secrets are missing or not set in root .env file:');
  missing.forEach(k => console.warn(`   - ${k}`));
  console.warn('\nPlease make sure you edit the root .env file first.\n');
}

/** Set a secret in Wrangler via stdin input */
function putSecret(name, value) {
  return new Promise((resolve) => {
    console.log(`🔑 Pushing secret ${name}…`);
    
    // Run npx wrangler secret put <name>
    const child = spawn('npx', ['wrangler', 'secret', 'put', name], {
      stdio: ['pipe', 'inherit', 'inherit'],
      shell: true,
    });

    child.stdin.write(value + '\n');
    child.stdin.end();

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Secret ${name} set successfully!`);
      } else {
        console.error(`❌ Failed to set secret ${name} (exit code ${code})`);
      }
      resolve();
    });
  });
}

async function main() {
  const items = Object.entries(mappings).filter(([_, val]) => val && !val.includes('PASTE_YOUR'));
  if (items.length === 0) {
    console.error('❌ No valid secrets found in .env to upload.');
    return;
  }

  for (const [name, val] of items) {
    await putSecret(name, val);
  }
  console.log('\n🎉 Finished pushing secrets to Cloudflare Workers!');
}

main();
