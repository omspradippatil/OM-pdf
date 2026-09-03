import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HOST = "om-pdf.netlify.app";
const KEY = "e8b7d4c1a2f3e4d5c6b7a8f9e0d1c2b3";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

async function pingIndexNow() {
  const sitemapPath = path.resolve(__dirname, '../public/sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    console.log("No sitemap.xml found. Skipping IndexNow ping.");
    return;
  }

  const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
  const locRegex = /<loc>(.*?)<\/loc>/g;
  let match;
  const urlList = [];
  while ((match = locRegex.exec(sitemapContent)) !== null) {
    urlList.push(match[1]);
  }

  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urlList
  };

  console.log(`Submitting ${urlList.length} URLs to IndexNow API (Bing, Yandex, Seznam)...`);

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    if (res.ok || res.status === 200 || res.status === 202) {
      console.log(`✅ IndexNow Submission Successful (Status: ${res.status}). URLs queued for immediate search crawler indexing.`);
    } else {
      console.log(`IndexNow response code: ${res.status}`);
    }
  } catch (err) {
    console.log(`IndexNow submission notice: ${err.message}`);
  }
}

pingIndexNow();
