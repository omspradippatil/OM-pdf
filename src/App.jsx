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
const PdfToLongImage = lazy(() => import('./pages/PdfToLongImage'));
const ExtractImages = lazy(() => import('./pages/ExtractImages'));
const ImageToPDF = lazy(() => import('./pages/ImageToPDF'));
const OrganizePDF = lazy(() => import('./pages/OrganizePDF'));
const ExtractPages = lazy(() => import('./pages/ExtractPages'));
const InsertBlankPages = lazy(() => import('./pages/InsertBlankPages'));
const RemoveEmptyPages = lazy(() => import('./pages/RemoveEmptyPages'));
const SplitByBookmarks = lazy(() => import('./pages/SplitByBookmarks'));
const MergeWithRanges = lazy(() => import('./pages/MergeWithRanges'));
const AutoRotateDeskew = lazy(() => import('./pages/AutoRotateDeskew'));
const WatermarkPDF = lazy(() => import('./pages/WatermarkPDF'));
const CropPDF = lazy(() => import('./pages/CropPDF'));
const PageNumbers = lazy(() => import('./pages/PageNumbers'));
const GrayscalePDF = lazy(() => import('./pages/GrayscalePDF'));
const ResizePages = lazy(() => import('./pages/ResizePages'));
const AddMargins = lazy(() => import('./pages/AddMargins'));
const MetadataEditor = lazy(() => import('./pages/MetadataEditor'));
const SanitizeMetadata = lazy(() => import('./pages/SanitizeMetadata'));
const FlattenForms = lazy(() => import('./pages/FlattenForms'));
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
const DrawSignPdf = lazy(() => import('./pages/DrawSignPdf'));
const RedactPdf = lazy(() => import('./pages/RedactPdf'));
const ComparePdf = lazy(() => import('./pages/ComparePdf'));
const OverlayPdf = lazy(() => import('./pages/OverlayPdf'));
const HeadersFootersPdf = lazy(() => import('./pages/HeadersFootersPdf'));
const BatesNumberingPdf = lazy(() => import('./pages/BatesNumberingPdf'));
const OcrPdf = lazy(() => import('./pages/OcrPdf'));
const InspectPdf = lazy(() => import('./pages/InspectPdf'));
const LinearizePdf = lazy(() => import('./pages/LinearizePdf'));
const VoiceReaderPdf = lazy(() => import('./pages/VoiceReaderPdf'));
const EditPdf = lazy(() => import('./pages/EditPdf'));

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
              <Route path="/pdf-to-long-image" element={<PdfToLongImage />} />
              <Route path="/extract-images" element={<ExtractImages />} />
              <Route path="/image-to-pdf" element={<ImageToPDF />} />
              <Route path="/organize-pdf" element={<OrganizePDF />} />
              <Route path="/extract-pages" element={<ExtractPages />} />
              <Route path="/insert-blank-pages" element={<InsertBlankPages />} />
              <Route path="/remove-empty-pages" element={<RemoveEmptyPages />} />
              <Route path="/split-by-bookmarks" element={<SplitByBookmarks />} />
              <Route path="/merge-with-ranges" element={<MergeWithRanges />} />
              <Route path="/auto-rotate-deskew" element={<AutoRotateDeskew />} />
              <Route path="/watermark-pdf" element={<WatermarkPDF />} />
              <Route path="/crop-pdf" element={<CropPDF />} />
              <Route path="/page-numbers" element={<PageNumbers />} />
              <Route path="/grayscale-pdf" element={<GrayscalePDF />} />
              <Route path="/resize-pages" element={<ResizePages />} />
              <Route path="/add-margins" element={<AddMargins />} />
              <Route path="/metadata-editor" element={<MetadataEditor />} />
              <Route path="/sanitize-metadata" element={<SanitizeMetadata />} />
              <Route path="/flatten-forms" element={<FlattenForms />} />
              <Route path="/pdf-to-text" element={<PdfToText />} />
              <Route path="/protect-pdf" element={<ProtectPDF />} />
              <Route path="/unlock-pdf" element={<UnlockPDF />} />
              <Route path="/pdf-permissions" element={<PermissionsPDF />} />
              <Route path="/draw-sign-pdf" element={<DrawSignPdf />} />
              <Route path="/redact-pdf" element={<RedactPdf />} />
              <Route path="/compare-pdf" element={<ComparePdf />} />
              <Route path="/overlay-pdf" element={<OverlayPdf />} />
              <Route path="/headers-footers-pdf" element={<HeadersFootersPdf />} />
              <Route path="/bates-numbering-pdf" element={<BatesNumberingPdf />} />
              <Route path="/ocr-pdf" element={<OcrPdf />} />
              <Route path="/inspect-pdf" element={<InspectPdf />} />
              <Route path="/linearize-pdf" element={<LinearizePdf />} />
              <Route path="/voice-reader-pdf" element={<VoiceReaderPdf />} />
              <Route path="/edit-pdf" element={<EditPdf />} />
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


