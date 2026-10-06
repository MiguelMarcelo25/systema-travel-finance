import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
mkdirSync('dist/server',{recursive:true});
const assets={};for(const f of ['index.html','styles.css','app.js','favicon.svg'])assets['/'+(f==='index.html'?'':f)]={body:readFileSync('public/'+f,'utf8'),type:({'index.html':'text/html','styles.css':'text/css','app.js':'text/javascript','favicon.svg':'image/svg+xml'})[f]};
const api=readFileSync('src/api.mjs','utf8').replace('export async function handleApi','async function handleApi');
writeFileSync('dist/server/index.js',api+'\nconst assets='+JSON.stringify(assets)+';\nexport default {async fetch(request,env){if(new URL(request.url).pathname.startsWith("/api/"))return handleApi(request,env);const a=assets[new URL(request.url).pathname];return a?new Response(a.body,{headers:{"Content-Type":a.type+"; charset=utf-8","X-Content-Type-Options":"nosniff"}}):new Response("Not found",{status:404});}};');
console.log('Built Systema Worker with embedded website assets.');
