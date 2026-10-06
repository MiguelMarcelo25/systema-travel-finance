import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { handleApi } from './src/api.mjs';
import { openDatabase } from './src/database.mjs';
const DB=openDatabase(process.env.SYSTEMA_DB||'./data/systema.sqlite');const port=Number(process.env.PORT||4173);
createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://localhost:'+port);let response;
  if(url.pathname.startsWith('/api/')) {const chunks=[];for await(const c of req)chunks.push(c);response=await handleApi(new Request(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})}),{DB,LOCAL:true});}
  else { const names={'/':'index.html','/styles.css':'styles.css','/app.js':'app.js','/favicon.svg':'favicon.svg'};const file=names[url.pathname];const types={'html':'text/html','css':'text/css','js':'text/javascript','svg':'image/svg+xml'};response=file?new Response(readFileSync('./public/'+file),{headers:{'Content-Type':types[file.split('.').pop()]+'; charset=utf-8'}}):new Response('Not found',{status:404});}
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){console.error(e);res.writeHead(500);res.end('Unable to serve request');}
}).listen(port,'127.0.0.1',()=>console.log('Systema ready at http://localhost:'+port));
