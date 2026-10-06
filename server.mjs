import { createServer } from 'node:http';
import { readFileSync,existsSync } from 'node:fs';
import {resolve,extname} from 'node:path';
import { handleApi } from './src/api.mjs';
import { openDatabase } from './src/database.mjs';
const DB=openDatabase(process.env.SYSTEMA_DB||'./data/systema.sqlite');const port=Number(process.env.PORT||4173);
const vite=process.argv.includes('--dev')?await(await import('vite')).createServer({server:{middlewareMode:true},appType:'spa'}):null;
createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://localhost:'+port);let response;
  if(url.pathname.startsWith('/api/')) {const chunks=[];for await(const c of req)chunks.push(c);response=await handleApi(new Request(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})}),{DB,LOCAL:true});}
  else if(vite)return vite.middlewares(req,res);
  else {const root=resolve('dist/client'),file=resolve(root,'.'+decodeURIComponent(url.pathname)),types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};const target=(file===root||file.startsWith(root+'\\'))?(existsSync(file)&&extname(file)?file:!extname(file)?resolve(root,'index.html'):null):null;response=target?new Response(readFileSync(target),{headers:{'Content-Type':types[extname(target)]||'application/octet-stream'}}):new Response('Not found',{status:404});}
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){console.error(e);res.writeHead(500);res.end('Unable to serve request');}
}).listen(port,'127.0.0.1',()=>console.log('Systema ready at http://localhost:'+port));
