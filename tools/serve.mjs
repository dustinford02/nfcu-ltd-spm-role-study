import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {ROOT} from './lib.mjs';
const port=Number(process.env.PORT||8766);
const base=path.join(ROOT,'app');
const prefix='/nfcu-ltd-spm-role-study/';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.sha256':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{
  try {
    let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(url.startsWith(prefix))url=url.slice(prefix.length);
    const file=path.resolve(base,'.'+(url.startsWith('/')?url:'/'+url));
    if(file!==base&&!file.startsWith(base+path.sep)){res.writeHead(403);res.end();return;}
    const target=fs.statSync(file).isDirectory()?path.join(file,'index.html'):file;
    res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    fs.createReadStream(target).pipe(res);
  }catch {res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Study app: http://127.0.0.1:${port}${prefix}`));
