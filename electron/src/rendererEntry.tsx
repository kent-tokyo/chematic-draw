// Keep the TypeScript entry explicit: a legacy renderer.js helper exists next
// to renderer.tsx and Vite otherwise resolves that stale file first.
import { mountApp } from './renderer.tsx';

mountApp();
