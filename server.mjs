import { remoteMail } from './src/mail.mjs';
import { localMail } from './src/local-mail.mjs';
import { createServer } from 'node:http';
import { readFileSync,existsSync } from 'node:fs';
import {resolve,extname} from 'node:path';
import { handleApi } from './src/api.mjs';
import { openDatabase } from './src/database.mjs';
import { openPostgres } from './src/postgres.mjs';
import { supabaseDocumentStorage } from './src/document-storage.mjs';
import { localDocumentStorage } from './src/local-document-storage.mjs';
const STORAGE=process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY?supabaseDocumentStorage(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY):!process.env.DATABASE_URL?localDocumentStorage(process.env.SYSTEMA_DOCUMENTS_DIR):undefined;
const DB=process.env.DATABASE_URL?openPostgres(process.env.DATABASE_URL,{ca:process.env.DATABASE_CA}):openDatabase(process.env.SYSTEMA_DB||'./data/systema.sqlite');const port=Number(process.env.PORT||4173);
const mailProvider=remoteMail(process.env),MAIL_PREVIEW=!mailProvider&&!process.env.DATABASE_URL;
const MAIL=mailProvider||(MAIL_PREVIEW?localMail():undefined);
const APP_URL=process.env.APP_URL||'http://localhost:'+port;
const vite=process.argv.includes('--dev')?await(await import('vite')).createServer({server:{middlewareMode:true},appType:'spa'}):null;
createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://localhost:'+port);let response;
  if(url.pathname.startsWith('/api/')) {const chunks=[];let received=0;for await(const c of req){received+=c.length;if(received>4*1024*1024+65536){res.writeHead(413,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Files must be 4 MB or smaller.'}));return;}chunks.push(c);}response=await handleApi(new Request(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})}),{DB,STORAGE,MAIL,APP_URL,MAIL_PREVIEW,LOCAL:true,ADMIN_EMAIL:process.env.SYSTEMA_ADMIN_EMAIL,CLIENT_IP:req.socket.remoteAddress});}
  else if(vite)return vite.middlewares(req,res);
  else {const root=resolve('dist/client'),file=resolve(root,'.'+decodeURIComponent(url.pathname)),types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};const target=(file===root||file.startsWith(root+'\\'))?(existsSync(file)&&extname(file)?file:!extname(file)?resolve(root,'index.html'):null):null;response=target?new Response(readFileSync(target),{headers:{'Content-Type':types[extname(target)]||'application/octet-stream'}}):new Response('Not found',{status:404});}
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){console.error(e);res.writeHead(500);res.end('Unable to serve request');}
}).listen(port,'127.0.0.1',()=>console.log('Systema ready at http://localhost:'+port));
