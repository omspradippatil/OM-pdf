import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import InstallPWA from './components/InstallPWA';

const Home = lazy(() => import('./pages/Home'));
const MergePDF = lazy(() => import('./pages/MergePDF'));
const SplitPDF = lazy(() => import('./pages/SplitPDF'));
const RotatePDF = lazy(() => import('./pages/RotatePDF'));
const CompressPDF = lazy(() => import('./pages/CompressPDF'));
const ConvertPDF = lazy(() => import('./pages/ConvertPDF'));
const ImageToPDF = lazy(() => import('./pages/ImageToPDF'));
const OrganizePDF = lazy(() => import('./pages/OrganizePDF'));
const WatermarkPDF = lazy(() => import('./pages/WatermarkPDF'));
const CropPDF = lazy(() => import('./pages/CropPDF'));
const PageNumbers = lazy(() => import('./pages/PageNumbers'));
const MetadataEditor = lazy(() => import('./pages/MetadataEditor'));
const PdfToText = lazy(() => import('./pages/PdfToText'));
const ProtectPDF = lazy(() => import('./pages/ProtectPDF'));
const UnlockPDF = lazy(() => import('./pages/UnlockPDF'));
const PermissionsPDF = lazy(() => import('./pages/PermissionsPDF'));
const MyFiles = lazy(() => import('./pages/MyFiles'));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <InstallPWA />
        <Navbar />
        <main className="main-content">
          <Suspense fallback={<div className="page-loader">Loading...</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/merge-pdf"    element={<MergePDF />} />
              <Route path="/split-pdf"    element={<SplitPDF />} />
              <Route path="/rotate-pdf"   element={<RotatePDF />} />
              <Route path="/compress-pdf" element={<CompressPDF />} />
              <Route path="/convert-pdf"  element={<ConvertPDF />} />
              <Route path="/image-to-pdf" element={<ImageToPDF />} />
              <Route path="/organize-pdf" element={<OrganizePDF />} />
              <Route path="/watermark-pdf" element={<WatermarkPDF />} />
              <Route path="/crop-pdf" element={<CropPDF />} />
              <Route path="/page-numbers" element={<PageNumbers />} />
              <Route path="/metadata-editor" element={<MetadataEditor />} />
              <Route path="/pdf-to-text" element={<PdfToText />} />
              <Route path="/protect-pdf" element={<ProtectPDF />} />
              <Route path="/unlock-pdf" element={<UnlockPDF />} />
              <Route path="/pdf-permissions" element={<PermissionsPDF />} />
              <Route path="/my-files"     element={<MyFiles />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}


