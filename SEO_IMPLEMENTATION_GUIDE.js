/**
 * IMPLEMENTATION GUIDE: Using seoMetadata.js in Tool Pages
 * 
 * Each tool page should import and use the SEO metadata config to ensure
 * all pages have optimized, unique titles, descriptions, and keywords.
 * 
 * Current Status:
 * - MergePDF.jsx: ✅ Already has custom SEO metadata
 * - Home.jsx: ✅ Already has custom SEO metadata
 * - Other pages: Should follow the same pattern
 * 
 * PATTERN TO FOLLOW:
 */

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 1: Simple Pattern (Most Tool Pages)
// ═══════════════════════════════════════════════════════════════

// src/pages/SplitPDF.jsx (CURRENT - good but can use config)
import React, { useState } from 'react';
import SEO from '../components/SEO';
import { getSeoMetadata } from '../constants/seoMetadata'; // ← ADD THIS

export default function SplitPDF() {
  // ... rest of component
  
  return (
    <ToolPageLayout /* ... */>
      {/* ← OPTION 1: Hardcoded (current pattern in MergePDF - works fine) */}
      <SEO 
        title="Split PDF Online Free — Extract Pages & Ranges | OM PDF"
        description="Extract specific pages or split PDF into individual files. Works offline, no upload needed, completely free and instant."
        url="https://om-pdf.netlify.app/split-pdf" 
      />
      
      {/* OR ← OPTION 2: Use getSeoMetadata helper (cleaner, DRY) */}
      {/* 
      <SEO {...getSeoMetadata('split')} />
      */}
      
      {/* ... rest of page */}
    </ToolPageLayout>
  );
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 2: Advanced Pattern (Dynamic Tool Routing - if needed)
// ═══════════════════════════════════════════════════════════════

// If you ever create a dynamic route like <Route path="/tool/:id" />
// You can use getSeoMetadata with the dynamic ID:

import { useParams } from 'react-router-dom';

export default function DynamicToolPage() {
  const { toolId } = useParams();
  const metadata = getSeoMetadata(toolId);
  
  return (
    <div>
      <SEO {...metadata} />
      {/* page content */}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// seoMetadata.js STRUCTURE 
// ═══════════════════════════════════════════════════════════════

/*
export const SEO_METADATA = {
  merge: {
    title: "Merge PDF Online Free — OM PDF | No Upload Required",
    description: "Combine multiple PDF files into one. Drag to reorder pages, then merge instantly in your browser. 100% free, private, no upload.",
    keywords: "merge pdf, merge pdf online, combine pdf files, pdf merger tool, join pdf files, merge multiple pdf online free",
    url: "https://om-pdf.netlify.app/merge-pdf",
  },
  // ... more tools
};
*/

// ═══════════════════════════════════════════════════════════════
// WHAT TO UPDATE WHEN ADDING NEW TOOLS
// ═══════════════════════════════════════════════════════════════

/*
When you add a new tool (e.g., "PDF Splitter Pro"):

1. Add entry to src/constants/tools.js
   {
     key: 'splitter_pro',
     title: 'Splitter Pro',
     path: '/splitter-pro',
     ...
   }

2. Add entry to src/constants/seoMetadata.js
   splitterPro: {
     title: "Advanced PDF Splitter Online Free | OM PDF",
     description: "Professional PDF splitting with advanced options...",
     keywords: "pdf splitter, advanced split, batch pdf splitting...",
     url: "https://om-pdf.netlify.app/splitter-pro",
   }

3. Update getSeoMetadata keyMap to map tool key to metadata key
   'splitterpro': 'splitterPro',

4. In your tool page component:
   <SEO {...getSeoMetadata('splitter-pro')} />
   OR
   <SEO 
     title="Advanced PDF Splitter Online Free | OM PDF"
     description="Professional PDF splitting with advanced options..."
     url="https://om-pdf.netlify.app/splitter-pro" 
   />

5. Update public/sitemap.xml to include new route
   <url>
     <loc>https://om-pdf.netlify.app/splitter-pro</loc>
     ...
   </url>
*/

// ═══════════════════════════════════════════════════════════════
// KEY PRINCIPLES (SEO Rules We Follow)
// ═══════════════════════════════════════════════════════════════

/*
✅ DO:
- Include primary keyword in title (e.g., "Merge PDF" in title for merge page)
- Keep description under 160 characters (Google truncates beyond this)
- Include 3-5 related keywords, not stuffed
- Use "Online Free" / "No Upload" modifiers to attract budget-conscious users
- Make each page unique (don't copy-paste descriptions)
- Use natural language; describe the benefit to users

❌ DON'T:
- Keyword stuff: "merge pdf merge pdf merge" ← bad
- Generic titles: "OM PDF Tools" ← every page looks identical
- Misleading claims: "Fastest PDF Tool Ever" ← unverifiable
- Hidden keywords: white text on white background ← Google penalizes
- Duplicate descriptions across tools ← loses ranking opportunity

🎯 TARGET USER INTENT:
- "How do I merge PDF?" → Solution-focused content wins
- "Free PDF merger online" → Budget-conscious users
- "Merge PDF without upload" → Privacy-conscious users
- "Offline PDF tools" → Power users, bulk jobs

SEO wins when you understand INTENT and match it perfectly in title/description.
*/

// ═══════════════════════════════════════════════════════════════
// CHECKING: What Should Each Page Have?
// ═══════════════════════════════════════════════════════════════

/*
Every tool page needs (in order of importance to SEO):

1. ✅ Unique, keyword-rich title (50-60 chars max, no brand if not needed)
2. ✅ Unique meta description (150-160 chars, compelling, CTA hint)
3. ✅ Keywords (3-5 natural keywords, comma-separated)
4. ✅ Canonical URL (tool-specific, absolute path)
5. ✅ Structured data (schema.org JSON-LD, if available)
6. ✅ Sitemap entry with priority/frequency
7. ✅ robots.txt allows crawling (not in Disallow list)
8. ⭐ Quality content (not just a tool; has guide/FAQ/comparison)

Currently: 1-7 are ✅ Done
Missing: 8 (quality content sections on tool pages)
*/

export default `IMPLEMENTATION GUIDE — DO NOT EXECUTE THIS FILE`;
