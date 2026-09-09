// Vite turns the worker source into a packaged asset and returns its URL.
// Keeping this import in a tiny module lets Jest map the Vite query to a
// harmless fixture without parsing import.meta in its CommonJS transformer.
import workerUrl from '../workers/analysisWorker.ts?worker&url';

export default workerUrl;
