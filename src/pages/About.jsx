import React from 'react';
import { useExport } from '../context/ExportContext';
import SEO from '../components/SEO';

export default function About() {
  return (
    <div className="content-page">
      <SEO
        title="About OM PDF"
        description="Learn about OM PDF, a privacy-first suite of browser-based PDF tools."
        url="https://om-pdf.netlify.app/about"
      />

      <div className="content-page-inner">
        <h1>About OM PDF</h1>
        <p>
          OM PDF is a privacy-first PDF toolkit built to keep your files on your device.
          Every tool runs in your browser, which means no uploads, no server storage, and
          no waiting for cloud processing.
        </p>
        <h2>What makes OM PDF different</h2>
        <ul>
          <li>Local processing for better privacy</li>
          <li>Fast results without upload delays</li>
          <li>Free tools with no signup required</li>
        </ul>
        <h2>Our mission</h2>
        <p>
          Make PDF tools simple, fast, and private for everyone.
        </p>
      </div>
    </div>
  );
}
