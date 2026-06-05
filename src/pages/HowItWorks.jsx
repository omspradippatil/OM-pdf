import React from 'react';
import { useExport } from '../context/ExportContext';
import SEO from '../components/SEO';

export default function HowItWorks() {
  return (
    <div className="content-page">
      <SEO
        title="How OM PDF Works"
        description="See how OM PDF processes files locally with fast, private browser-based tools."
        url="https://om-pdf.pages.dev/how-it-works"
      />

      <div className="content-page-inner">
        <h1>How OM PDF Works</h1>
        <p>
          OM PDF runs entirely in your browser using modern Web APIs. That means your files never
          leave your device.
        </p>
        <h2>Step 1: Load the tool</h2>
        <p>
          Choose a tool like Merge, Split, or Compress. The app loads once and works locally.
        </p>
        <h2>Step 2: Add your files</h2>
        <p>
          Drop your PDF or images into the workspace. Files are read locally and never uploaded.
        </p>
        <h2>Step 3: Process and download</h2>
        <p>
          Click the action button and download the result instantly.
        </p>
        <h2>Why this matters</h2>
        <p>
          Local processing is faster, more private, and avoids limits common with cloud tools.
        </p>
      </div>
    </div>
  );
}
