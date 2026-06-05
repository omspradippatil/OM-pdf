import React from 'react';
import { useExport } from '../context/ExportContext';
import SEO from '../components/SEO';

export default function Privacy() {
  return (
    <div className="content-page">
      <SEO
        title="Privacy Policy"
        description="OM PDF processes files locally in your browser. Learn how we protect your privacy."
        url="https://om-pdf.pages.dev/privacy"
      />

      <div className="content-page-inner">
        <h1>Privacy Policy</h1>
        <p>
          OM PDF is built for privacy. Your files are processed locally in your browser and are
          never uploaded to our servers.
        </p>
        <h2>What we do not collect</h2>
        <ul>
          <li>We do not upload your PDF files</li>
          <li>We do not store your documents on our servers</li>
          <li>We do not sell your data</li>
        </ul>
        <h2>What we may collect</h2>
        <p>
          Basic analytics may be used to understand traffic and improve the experience. This data
          is aggregated and does not include your documents.
        </p>
        <h2>Contact</h2>
        <p>
          If you have questions about privacy, contact us through the support channel listed on the site.
        </p>
      </div>
    </div>
  );
}
