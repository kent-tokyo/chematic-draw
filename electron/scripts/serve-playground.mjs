import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../site', import.meta.url)));
const port = Number(process.env.PLAYGROUND_PORT ?? 4174);
const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' };

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`).pathname;
  const relativePath = pathname.replace(/^\/chematic-draw\/playground\/?/, '')
    ? pathname.replace(/^\/chematic-draw\/playground\/?/, '')
    : 'playground/index.html';
  const candidate = pathname.startsWith('/chematic-draw/assets/')
    ? join(root, 'assets', pathname.slice('/chematic-draw/assets/'.length))
    : join(root, relativePath);
  const filePath = normalize(candidate);
  if (!filePath.startsWith(root)) { response.writeHead(403); response.end('Forbidden'); return; }
  try {
    const body = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': contentTypes[extname(filePath)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404); response.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => console.log(`Playground preview: http://127.0.0.1:${port}/chematic-draw/playground/`));
