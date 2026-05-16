import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import InstallPWA from './components/InstallPWA';
import { getVariantRoutes } from './constants/seoVariants';

const Home = lazy(() => import('./pages/Home'));
const MergePDF = lazy(() => import('./pages/MergePDF'));
const SplitPDF = lazy(() => import('./pages/SplitPDF'));
const RotatePDF = lazy(() => import('./pages/RotatePDF'));
const CompressPDF = lazy(() => import('./pages/CompressPDF'));
const ConvertPDF = lazy(() => import('./pages/ConvertPDF'));
const PdfToJpg = lazy(() => import('./pages/PdfToJpg'));
const ExtractImages = lazy(() => import('./pages/ExtractImages'));
const ImageToPDF = lazy(() => import('./pages/ImageToPDF'));
const OrganizePDF = lazy(() => import('./pages/OrganizePDF'));
const ExtractPages = lazy(() => import('./pages/ExtractPages'));
const InsertBlankPages = lazy(() => import('./pages/InsertBlankPages'));
const WatermarkPDF = lazy(() => import('./pages/WatermarkPDF'));
const CropPDF = lazy(() => import('./pages/CropPDF'));
const PageNumbers = lazy(() => import('./pages/PageNumbers'));
const MetadataEditor = lazy(() => import('./pages/MetadataEditor'));
const PdfToText = lazy(() => import('./pages/PdfToText'));
const ProtectPDF = lazy(() => import('./pages/ProtectPDF'));
const UnlockPDF = lazy(() => import('./pages/UnlockPDF'));
const PermissionsPDF = lazy(() => import('./pages/PermissionsPDF'));
const MyFiles = lazy(() => import('./pages/MyFiles'));
const About = lazy(() => import('./pages/About'));
const Privacy = lazy(() => import('./pages/Privacy'));
const HowItWorks = lazy(() => import('./pages/HowItWorks'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const Feedback = lazy(() => import('./pages/Feedback'));

export default function App() {
  const variantRoutes = getVariantRoutes();
  const toolComponents = {
    merge: <MergePDF />,
    split: <SplitPDF />,
    compress: <CompressPDF />,
    rotate: <RotatePDF />,
    convert: <ConvertPDF />,
    pageNumbers: <PageNumbers />,
  };

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
              <Route path="/pdf-to-jpg" element={<PdfToJpg />} />
              <Route path="/extract-images" element={<ExtractImages />} />
              <Route path="/image-to-pdf" element={<ImageToPDF />} />
              <Route path="/organize-pdf" element={<OrganizePDF />} />
              <Route path="/extract-pages" element={<ExtractPages />} />
              <Route path="/insert-blank-pages" element={<InsertBlankPages />} />
              <Route path="/watermark-pdf" element={<WatermarkPDF />} />
              <Route path="/crop-pdf" element={<CropPDF />} />
              <Route path="/page-numbers" element={<PageNumbers />} />
              <Route path="/metadata-editor" element={<MetadataEditor />} />
              <Route path="/pdf-to-text" element={<PdfToText />} />
              <Route path="/protect-pdf" element={<ProtectPDF />} />
              <Route path="/unlock-pdf" element={<UnlockPDF />} />
              <Route path="/pdf-permissions" element={<PermissionsPDF />} />
              <Route path="/my-files"     element={<MyFiles />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/feedback" element={<Feedback />} />
              {variantRoutes.map((route) => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={toolComponents[route.toolKey]}
                />
              ))}
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}


