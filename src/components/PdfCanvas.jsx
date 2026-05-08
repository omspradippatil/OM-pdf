import React, { useEffect, useRef, useState } from 'react';
import { pdfjsLib } from '../utils/pdfjs';

export default function PdfCanvas({
  file,
  pageNumber = 1,
  width = 420,
  rotate = 0,
  className,
  onRender,
  onError,
}) {
  const canvasRef = useRef(null);
  const [buffer, setBuffer] = useState(null);
  const [doc, setDoc] = useState(null);

  useEffect(() => {
    let active = true;
    setDoc(null);
    setBuffer(null);

    if (!file) return () => { active = false; };

    file.arrayBuffer()
      .then((buf) => {
        if (!active) return;
        // Keep a stable copy to avoid detached buffer errors in dev strict mode.
        setBuffer(buf.slice(0));
      })
      .catch((err) => {
        if (!active) return;
        onError?.(err);
      });

    return () => { active = false; };
  }, [file, onError]);

  useEffect(() => {
    let active = true;
    let task;

    if (!buffer) return () => { active = false; };

    // Use a fresh copy so pdfjs can transfer without detaching our stored buffer.
    const dataCopy = buffer.slice(0);
    task = pdfjsLib.getDocument({ data: dataCopy, verbosity: 0 });
    task.promise
      .then((pdf) => {
        if (!active) return;
        setDoc(pdf);
      })
      .catch((err) => {
        if (!active) return;
        onError?.(err);
      });

    return () => {
      active = false;
      task?.destroy?.();
    };
  }, [buffer, onError]);

  useEffect(() => {
    let active = true;
    let renderTask;

    const render = async () => {
      if (!doc || !canvasRef.current) return;
      try {
        const page = await doc.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1, rotation: rotate });
        const scale = width / baseViewport.width;
        const viewport = page.getViewport({ scale, rotation: rotate });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        renderTask = page.render({ canvasContext: ctx, viewport });
        await renderTask.promise;

        if (!active) return;
        onRender?.({ width: canvas.width, height: canvas.height, scale, viewport });
      } catch (err) {
        if (!active) return;
        onError?.(err);
      }
    };

    render();

    return () => {
      active = false;
      renderTask?.cancel?.();
    };
  }, [doc, pageNumber, width, rotate, onRender, onError]);

  return <canvas ref={canvasRef} className={className} />;
}
