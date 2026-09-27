import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT,read,json,compile,serialize,sha} from './lib.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'role-study-rejection-'));
const write=(r,f,t)=>fs.writeFileSync(path.join(r,f),t);
const changeJson=(r,f,change)=>{const v=json(r,f);change(v);write(r,f,JSON.stringify(v,null,2)+'\n');};
const tests=[
  ['missing frontmatter',r=>write(r,'content/posting/live.md',read(r,'content/posting/live.md').replace(/^---/,'BROKEN')),/frontmatter/,false],
  ['illegal class',r=>write(r,'content/posting/diff.md',read(r,'content/posting/diff.md').replace('class: "inference"','class: "official_guess"')),/invalid enum/,true],
  ['inference without lineage',r=>write(r,'content/posting/diff.md',read(r,'content/posting/diff.md').replace(/^inferred_from:.*$/m,'inferred_from: null')),/inferred_from/,true],
  ['posting without source URL',r=>write(r,'content/posting/live.md',read(r,'content/posting/live.md').replace(/^source_url:.*$/m,'source_url: null')),/source_url/,true],
  ['posting replaced by stub',r=>write(r,'content/posting/live.md',read(r,'content/posting/live.md').replace(/(\r?\n---\r?\n)[\s\S]*$/,'$1\nA checklist is not source text.')),/not the retrieved text/,true],
  ['generated content manually changed',r=>write(r,'app/data/content.json',read(r,'app/data/content.json')+' '),/differs from source rebuild/,false],
  ['generated hash changed',r=>write(r,'app/data/content.sha256','0'.repeat(64)),/SHA-256 mismatch/,false],
  ['required tension topic removed',r=>changeJson(r,'content/map/topics.json',x=>{x.topics=x.topics.filter(t=>t.id!=='overview-vs-duties-tension');}),/required topic missing/,true],
  ['too few drills',r=>changeJson(r,'content/drills/index.json',x=>{x.drills=x.drills.slice(0,19);}),/drill count/,true],
  ['candidate source removed',r=>changeJson(r,'content/career/cards.json',x=>{x.sources=[];}),/source missing/,true],
  ['candidate evidence promoted',r=>changeJson(r,'content/career/cards.json',x=>{x.cards[0].facts[0].evidence_class='VERIFIED_EMPLOYER_RESULT';}),/unsupported evidence class/,true],
  ['unretrieved excerpt',r=>changeJson(r,'content/map/topics.json',x=>{x.topics[0].posting_excerpts[0].text='Invented internal leadership policy.';}),/not verbatim/,true]
];
let failures=0;
for(let i=0;i<tests.length;i++) {
  const [name,mutate,reason,rebuild]=tests[i],root=path.join(temp,String(i));
  fs.mkdirSync(root);
  for(const f of ['content','schema','app','README.md','AGENTS.md','LICENSE'])fs.cpSync(path.join(ROOT,f),path.join(root,f),{recursive:true});
  mutate(root);
  if(rebuild){const bytes=serialize(compile(root));write(root,'app/data/content.json',bytes);write(root,'app/data/content.sha256',sha(bytes)+'\n');}
  const result=spawnSync(process.execPath,[path.join(ROOT,'tools/validate.mjs'),'--root',root],{encoding:'utf8'});
  const output=result.stdout+result.stderr;
  const ok=result.status!==0&&reason.test(output);
  console.log(`${ok?'PASS':'FAIL'} rejects ${name}`);
  if(!ok){failures++;console.error(output);}
}
// Temporary rejection fixtures are retained in the OS temp directory; no source
// or user folder is deleted by this test suite.
console.log(`${tests.length-failures}/${tests.length} rejection checks passed`);
process.exitCode=failures?1:0;
