import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import MergePDF from './pages/MergePDF';
import SplitPDF from './pages/SplitPDF';
import RotatePDF from './pages/RotatePDF';
import CompressPDF from './pages/CompressPDF';
import ConvertPDF from './pages/ConvertPDF';
import PageNumbers from './pages/PageNumbers';
import MyFiles from './pages/MyFiles';
import ScrollToTop from './components/ScrollToTop';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/merge-pdf"    element={<MergePDF />} />
          <Route path="/split-pdf"    element={<SplitPDF />} />
          <Route path="/rotate-pdf"   element={<RotatePDF />} />
          <Route path="/compress-pdf" element={<CompressPDF />} />
          <Route path="/convert-pdf"  element={<ConvertPDF />} />
          <Route path="/page-numbers" element={<PageNumbers />} />
          <Route path="/my-files"     element={<MyFiles />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}
