// src/workers/workerClient.js
let worker = null;
let callbackMap = new Map();
let nextId = 1;

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./pdfWorker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const { id, type, progress, label, bytes, warnings, error } = e.data;
      const callbacks = callbackMap.get(id);
      if (!callbacks) return;

      if (type === 'progress') {
        callbacks.onProgress?.(progress, label);
      } else if (type === 'success') {
        callbacks.resolve({ bytes, warnings });
        callbackMap.delete(id);
      } else if (type === 'error') {
        callbacks.reject(new Error(error));
        callbackMap.delete(id);
      }
    };
  }
  return worker;
}

export function runPdfWorkerTask(type, payload, transferables = [], onProgress = null) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    callbackMap.set(id, { resolve, reject, onProgress });
    getWorker().postMessage({ id, type, payload }, transferables);
  });
}
