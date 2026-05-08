import * as pdfjsLib from 'pdfjs-dist';

let workerInitialized = false;

if (!workerInitialized) {
	const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url);
	// Use workerSrc only to avoid shared workerPort teardown across renders.
	pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.toString();
	workerInitialized = true;
}

export { pdfjsLib };
