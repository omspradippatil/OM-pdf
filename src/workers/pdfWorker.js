import { PDFDocument } from 'pdf-lib';

self.onmessage = async (e) => {
  const { id, type, payload } = e.data;
  
  try {
    if (type === 'merge') {
      const { files } = payload;
      const merged = await PDFDocument.create();
      const warnings = [];

      merged.setTitle('Merged PDF - OM PDF');
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
        
        // Optimizing image using OffscreenCanvas before embedding
        let optimizedBuffer = imgEntry.buffer;
        try {
          const blob = new Blob([imgEntry.buffer], { type: imgEntry.type === 'jpg' ? 'image/jpeg' : 'image/png' });
          const bitmap = await createImageBitmap(blob);
          
          // Max dimensions (e.g. A4 at 300dpi is ~2480x3508, let's limit to 2000 max side)
          const MAX_SIDE = 2000;
          let width = bitmap.width;
          let height = bitmap.height;
          
          if (width > MAX_SIDE || height > MAX_SIDE) {
            const ratio = Math.min(MAX_SIDE / width, MAX_SIDE / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          
          const canvas = new OffscreenCanvas(width, height);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(bitmap, 0, 0, width, height);
          
          const outBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.75 });
          optimizedBuffer = await outBlob.arrayBuffer();
          // Force jpg embedding since we converted to jpeg
          imgEntry.type = 'jpg';
        } catch (err) {
          // Fallback to original buffer if OffscreenCanvas fails
          console.warn('OffscreenCanvas optimization failed, using original', err);
        }

        let img;
        if (imgEntry.type === 'jpg') {
          img = await doc.embedJpg(optimizedBuffer);
        } else {
          img = await doc.embedPng(optimizedBuffer);
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
