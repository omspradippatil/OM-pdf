// src/workers/workerClient.js
let workers = [];
let callbackMap = new Map();
let nextTaskId = 1;
let nextWorkerIndex = 0;

// Limit pool size to prevent OOM crashes on low-end devices, max 4.
const getPoolSize = () => {
  return Math.max(1, Math.min(navigator.hardwareConcurrency || 4, 4));
};

function getNextWorker() {
  const poolSize = getPoolSize();
  
  // Lazily instantiate workers up to the pool size
  if (workers.length < poolSize) {
    const worker = new Worker(new URL('./pdfWorker.js', import.meta.url), { type: 'module' });
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
    workers.push(worker);
    return worker;
  }
  
  // Round-robin selection
  const worker = workers[nextWorkerIndex];
  nextWorkerIndex = (nextWorkerIndex + 1) % poolSize;
  return worker;
}

export function runPdfWorkerTask(type, payload, transferables = [], onProgress = null) {
  return new Promise((resolve, reject) => {
    const id = nextTaskId++;
    callbackMap.set(id, { resolve, reject, onProgress });
    const worker = getNextWorker();
    worker.postMessage({ id, type, payload }, transferables);
  });
}
