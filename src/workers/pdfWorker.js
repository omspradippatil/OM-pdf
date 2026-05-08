import { PDFDocument } from 'pdf-lib';

self.onmessage = async (e) => {
  const { id, type, payload } = e.data;
  
  try {
    if (type === 'merge') {
      const { files } = payload;
      const merged = await PDFDocument.create();
      const warnings = [];

      merged.setTitle('Merged PDF – OM PDF');
      merged.setCreator('OM PDF (https://om-pdf.netlify.app)');
      merged.setProducer('OM PDF');
      merged.setCreationDate(new Date());
      merged.setModificationDate(new Date());

      const total = files.length;
      for (let i = 0; i < total; i++) {
        const entry = files[i];
        self.postMessage({ id, type: 'progress', progress: 5 + Math.round((i / total) * 85), label: `Merging file ${i + 1} of ${total}…` });
        
        let srcDoc;
        try {
          try {
            srcDoc = await PDFDocument.load(entry.buffer);
          } catch (encErr) {
            if (encErr.message?.includes('encrypted')) {
              srcDoc = await PDFDocument.load(entry.buffer, { ignoreEncryption: true });
              warnings.push(`"${entry.name}" is password-protected — pages may appear blank.`);
            } else { throw encErr; }
          }
        } catch {
          warnings.push(`"${entry.name}" could not be read and was skipped.`);
          continue;
        }

        const totalPages = srcDoc.getPageCount();
        const pageIndices = Array.isArray(entry.pageOrder) && entry.pageOrder.length
          ? entry.pageOrder.filter(idx => idx >= 0 && idx < totalPages)
          : srcDoc.getPageIndices();

        if (Array.isArray(entry.pageOrder) && pageIndices.length === 0) {
          warnings.push(`"${entry.name}" has no selected pages and was skipped.`);
          continue;
        }

        const copiedPages = await merged.copyPages(srcDoc, pageIndices);
        copiedPages.forEach(page => merged.addPage(page));
      }

      if (merged.getPageCount() === 0) {
        throw new Error('No pages could be merged. All files may be corrupted or unreadable.');
      }

      self.postMessage({ id, type: 'progress', progress: 95, label: 'Saving PDF…' });
      const bytes = await merged.save();
      self.postMessage({ id, type: 'success', bytes, warnings }, [bytes.buffer]);

    } else if (type === 'compress_lossless') {
      const { buffer } = payload;
      self.postMessage({ id, type: 'progress', progress: 10, label: 'Loading PDF…' });
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      self.postMessage({ id, type: 'progress', progress: 60, label: 'Optimizing streams…' });
      const bytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
      self.postMessage({ id, type: 'success', bytes }, [bytes.buffer]);

    } else if (type === 'images_to_pdf') {
      const { images } = payload; // Array of { buffer, type }
      const doc = await PDFDocument.create();
      
      for (let i = 0; i < images.length; i++) {
        const imgEntry = images[i];
        let img;
        if (imgEntry.type === 'jpg') {
          img = await doc.embedJpg(imgEntry.buffer);
        } else {
          img = await doc.embedPng(imgEntry.buffer);
        }
        
        const { width, height } = img.scale(1);
        const page = doc.addPage([width, height]);
        page.drawImage(img, { x: 0, y: 0, width, height });
        self.postMessage({ id, type: 'progress', progress: Math.round(((i + 1) / images.length) * 90), label: 'Converting…' });
      }
      
      self.postMessage({ id, type: 'progress', progress: 98, label: 'Saving PDF…' });
      const out = await doc.save();
      self.postMessage({ id, type: 'success', bytes: out }, [out.buffer]);

    } else {
      throw new Error('Unknown worker task type: ' + type);
    }
  } catch (error) {
    self.postMessage({ id, type: 'error', error: error.message || 'Unknown worker error' });
  }
};
