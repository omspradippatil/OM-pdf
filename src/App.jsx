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
const PageNumbers = lazy(() => import('./pages/PageNumbers'));
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
              <Route path="/page-numbers" element={<PageNumbers />} />
              <Route path="/my-files"     element={<MyFiles />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}
