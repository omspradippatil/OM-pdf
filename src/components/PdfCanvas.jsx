import React, { useEffect, useRef, useState } from 'react';
import { pdfjsLib } from '../utils/pdfjs';

/**
 * PdfCanvas component renders a specific page of a PDF file to a canvas.
 * It uses offscreen rendering to prevent blinking during updates.
 */
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

  // Use refs for callbacks to prevent effect re-runs when parent passes anonymous functions
  const onRenderRef = useRef(onRender);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onRenderRef.current = onRender;
    onErrorRef.current = onError;
  }, [onRender, onError]);

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
        onErrorRef.current?.(err);
      });

    return () => { active = false; };
  }, [file]);

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
        onErrorRef.current?.(err);
      });

    return () => {
      active = false;
      task?.destroy?.();
    };
  }, [buffer]);

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
        
        // Render to an offscreen canvas first to prevent blinking
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = Math.floor(viewport.width);
        offscreenCanvas.height = Math.floor(viewport.height);
        const offscreenCtx = offscreenCanvas.getContext('2d');

        renderTask = page.render({ canvasContext: offscreenCtx, viewport });
        await renderTask.promise;

        if (!active) return;

        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          
          // Only update dimensions if they changed, setting width/height clears the canvas
          const nextWidth = Math.floor(viewport.width);
          const nextHeight = Math.floor(viewport.height);
          
          if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
            canvas.width = nextWidth;
            canvas.height = nextHeight;
          }
          
          ctx.drawImage(offscreenCanvas, 0, 0);
          onRenderRef.current?.({ width: canvas.width, height: canvas.height, scale, viewport });
        }
      } catch (err) {
        if (!active) return;
        // Don't report cancellation errors
        if (err.name === 'RenderingCancelledException') return;
        onErrorRef.current?.(err);
      }
    };

    render();

    return () => {
      active = false;
      renderTask?.cancel?.();
    };
  }, [doc, pageNumber, width, rotate]);

  return <canvas ref={canvasRef} className={className} />;
}

