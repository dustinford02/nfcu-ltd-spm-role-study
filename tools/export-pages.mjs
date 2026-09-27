import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT,walk,relative,sha} from './lib.mjs';
const app=path.join(ROOT,'app'),docs=path.join(ROOT,'docs');
fs.mkdirSync(docs,{recursive:true});
for(const file of walk(app)) {
  const target=path.join(docs,path.relative(app,file));
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file,target);
}
fs.writeFileSync(path.join(docs,'.nojekyll'),'');
const manifest=walk(app).map(f=>({path:relative(app,f),sha256:sha(fs.readFileSync(f))}));
fs.writeFileSync(path.join(ROOT,'PAGES_MANIFEST.json'),JSON.stringify({source:'app/',destination:'docs/',files:manifest},null,2)+'\n');
const result=spawnSync(process.execPath,[path.join(ROOT,'tools/validate.mjs')],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status??1);
console.log(`Exported ${manifest.length} verified app files to docs/ for Pages.`);
