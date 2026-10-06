import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { build as viteBuild } from 'vite';
import { build } from 'esbuild';
await viteBuild();
mkdirSync('dist/server', { recursive: true });
const assets = {};
const types = { html: 'text/html', css: 'text/css', js: 'text/javascript', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg' };
function collect(directory, prefix = '') { for (const entry of readdirSync(directory, { withFileTypes: true })) { const path = directory + '/' + entry.name, name = prefix + '/' + entry.name; if (entry.isDirectory()) collect(path, name); else assets[name] = { body: readFileSync(path).toString('base64'), type: types[entry.name.split('.').at(-1)] || 'application/octet-stream' }; } }
collect('dist/client');
const entry = `import {handleApi} from './src/api.mjs';const assets=${JSON.stringify(assets)};export default {async fetch(request,env){const path=new URL(request.url).pathname;if(path.startsWith('/api/'))return handleApi(request,env);if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});const asset=assets[path]||(!path.split('/').at(-1).includes('.')?assets['/index.html']:null);if(!asset)return new Response('Not found',{status:404});const bytes=Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0));return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':asset.type,'X-Content-Type-Options':'nosniff','Cache-Control':path.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache'}});}};`;
await build({ stdin: { contents: entry, resolveDir: process.cwd(), sourcefile: 'worker.mjs' }, bundle: true, format: 'esm', platform: 'browser', target: 'es2022', outfile: 'dist/server/index.js', minify: true });
console.log('Built React + Tailwind frontend and Systema API Worker.');
