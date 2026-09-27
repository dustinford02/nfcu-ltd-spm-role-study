import fs from 'node:fs';
import path from 'node:path';
import {ROOT,CLASSES,FIELDS,sha,read,json,walk,relative,parseMarkdown,compile,serialize,schemaCheck} from './lib.mjs';
const flag=process.argv.indexOf('--root');
const root=flag>=0?path.resolve(process.argv[flag+1]):ROOT;
const errors=[];
const assert=(ok,msg)=>{if(!ok)errors.push(msg);};
const norm=s=>s.replace(/\s+/g,' ').trim();
let data;
try {
  for(const file of walk(path.join(root,'content')).filter(f=>f.endsWith('.md'))) {
    const doc=parseMarkdown(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''),relative(root,file));
    for(const field of FIELDS)assert(Object.hasOwn(doc,field),`${doc.path}: missing ${field}`);
    schemaCheck({...doc,text:doc.body},json(root,'schema/record.schema.json'),root,doc.path,errors);
    assert(doc.body.length>0,`${doc.path}: empty body`);
  }
  data=compile(root);
  const expected=serialize(data), generated=read(root,'app/data/content.json');
  assert(expected===generated,'generated content differs from source rebuild (manual edit or stale build)');
  assert(read(root,'app/data/content.sha256').trim()===sha(generated),'generated content SHA-256 mismatch');
  assert(!/hand[- ]?(edited|marked)/i.test(json(root,'app/data/content.json').generator??''),'hand-marked generated content');
  const capture=json(root,'content/posting/capture-manifest.json');
  assert(capture.captures.length===3,'three real capture records required');
  for(const c of capture.captures) {
    const bytes=fs.readFileSync(path.join(root,c.file));
    assert(sha(bytes)===c.sha256,`${c.id}: capture hash changed`);
    assert(bytes.length===c.bytes,`${c.id}: capture length changed`);
    const md=parseMarkdown(read(root,c.markdown),c.markdown);
    assert(norm(md.body)===norm(bytes.toString('utf8')),`${c.id}: markdown is not the retrieved text`);
    assert(bytes.length>6000,`${c.id}: incomplete/stub posting capture`);
  }
  const live=read(root,'content/posting/captures/official.txt');
  assert(/Job Identification\s+32372/.test(live),'official capture does not establish 32372');
  assert(data.meta.workspace_req.confirmed_on_official_site===true,'requisition confirmation does not match capture');
  for(const term of ['Responsible for leading','Talent Philosophy','Leadership Model','Responsibilities','Qualifications','Job Info','96,900','141,600']) assert(live.includes(term),`live capture missing ${term}`);
  assert(fs.existsSync(path.join(root,'content/posting/saved.md')),'saved.md is required');
  const topics=['talent-performance-systems','performance-cycle-calibration','overview-vs-duties-tension','program-execution-governance','investment-business-case-outcomes','change-adoption-mentoring','qualifications-methods-tools','public-employer-context','open-questions'];
  for(const id of topics)assert(data.topics.some(t=>t.id===id),`required topic missing: ${id}`);
  const ids=new Set();
  const checkRecord=(r,where)=>{schemaCheck(r,json(root,'schema/record.schema.json'),root,where,errors);};
  for(const topic of data.topics) {
    schemaCheck(topic,json(root,'schema/topic.schema.json'),root,topic.id,errors);
    assert(!ids.has(topic.id),`duplicate topic ${topic.id}`);ids.add(topic.id);
    for(const key of ['posting_excerpts','must_know','study_notes','unknowns']) for(const r of topic[key]) {
      checkRecord(r,`${topic.id}.${key}.${r.id}`);
      if(key==='must_know')assert(['posting','employer_public'].includes(r.class),`${r.id}: must_know cannot contain analysis`);
      if(key==='study_notes')assert(['industry','inference'].includes(r.class),`${r.id}: study note class`);
      if(key==='unknowns')assert(r.class==='unknown',`${r.id}: unknown promoted`);
      if(key==='posting_excerpts')assert(r.class==='posting'&&norm(live).includes(norm(r.text)),`${r.id}: excerpt not verbatim in official capture`);
    }
  }
  assert(data.drills.length>=20&&data.drills.length<=30,'drill count must be 20–30');
  const drillIds=new Set();
  for(const d of data.drills) {
    schemaCheck(d,json(root,'schema/drill.schema.json'),root,d.id,errors);
    assert(!drillIds.has(d.id),`duplicate drill ${d.id}`);drillIds.add(d.id);
    assert(d.body.includes('This is not an official interview question'),`${d.id}: disclaimer missing`);
    for(const id of d.topic_ids)assert(ids.has(id),`${d.id}: unknown topic ${id}`);
    for(const e of d.motivating_excerpts)assert(e.class==='posting'&&norm(live).includes(norm(e.text)),`${d.id}: motivating excerpt not retrieved`);
    if(d.answer)assert(['industry','inference'].includes(d.answer.class),`${d.id}: answer must be industry or inference`);
  }
  for(const t of data.topics)for(const id of t.drills)assert(drillIds.has(id),`${t.id}: missing drill ${id}`);
  const unknowns=read(root,'content/unknowns.md');
  for(const re of [/32372/,/Talent Philosophy/i,/Leadership Model/i,/calibration/i,/(operat|program.manage)/i,/interview format/i,/system of record/i,/(reporting seat|reporting location)/i,/org(anization|anizational)?[ -]?(design|chart|structure)/i])assert(re.test(unknowns),`unknowns section missing ${re}`);
  const careerIds=new Set();
  assert(data.career.length>=6,'personal career material required by user amendment');
  const sources=new Map(data.career_sources.map(s=>[s.id,s]));
  for(const card of data.career) {
    assert(card.class==='candidate_material'&&card.disclosure_status==='PUBLIC_USER_AUTHORIZED',`${card.id}: career publication boundary`);
    assert(card.practice_prompt&&card.guardrail&&card.source_label,`${card.id}: missing personal-practice context`);
    assert(Array.isArray(card.facts)&&card.facts.length>0,`${card.id}: no supported facts`);
    for(const fact of card.facts??[]) {
      assert(fact.class==='candidate_fact',`${fact.id}: personal fact misclassified`);
      assert(['USER_STATEMENT','ISSUER_RECORD_COPY'].includes(fact.evidence_class),`${fact.id}: unsupported evidence class`);
      assert(sources.has(fact.source_id),`${fact.id}: source missing`);
      assert(fact.boundary&&fact.period&&fact.text,`${fact.id}: incomplete scope`);
      assert(!careerIds.has(fact.id),`${fact.id}: duplicate candidate fact`);careerIds.add(fact.id);
    }
  }
  const beat=data.career.find(c=>c.id==='career-09');
  assert(beat?.facts.some(f=>/never been actualized or piloted/.test(f.text)),'Operating BEAT lifecycle correction must remain explicit');
  const scanFiles=walk(root).filter(f=>!relative(root,f).startsWith('.git/')&&!relative(root,f).startsWith('tools/')&&!relative(root,f).startsWith('schema/')&&/\.(md|json|txt|html|js|css|yml)$/.test(f));
  for(const file of scanFiles) {
    const rel=relative(root,file),body=fs.readFileSync(file,'utf8');
    assert(!/C:[\\/]+Users[\\/]|file:\/\/|sk-proj-[A-Za-z0-9]|gh[pousr]_[A-Za-z0-9]{20}/i.test(body),`${rel}: private path or credential pattern`);
    // First-person candidate quotations belong only in explicitly classified career records.
    if(!rel.startsWith('content/career/')&&rel!=='app/data/content.json'&&rel!=='docs/data/content.json')assert(!/\bI\s+(?:managed|led|developed|supervised|achieved|delivered|implemented)\b/i.test(body),`${rel}: unlabeled first-person employment narrative`);
  }
  const app=read(root,'app/app.js')+read(root,'app/index.html')+read(root,'app/styles.css');
  assert(!/fonts\.googleapis|google-analytics|googletagmanager|supabase|firebase/i.test(app),'unapproved remote service');
  assert(read(root,'app/service-worker.js').includes('content.json'),'offline data cache missing');
  if(fs.existsSync(path.join(root,'PAGES_MANIFEST.json'))) {
    const pages=json(root,'PAGES_MANIFEST.json');
    const appFiles=walk(path.join(root,'app')).map(f=>relative(path.join(root,'app'),f)).sort();
    assert(JSON.stringify(pages.files.map(x=>x.path).sort())===JSON.stringify(appFiles),'Pages manifest does not cover the entire app');
    for(const item of pages.files) {
      assert(sha(fs.readFileSync(path.join(root,'app',item.path)))===item.sha256,`${item.path}: Pages export is stale`);
      assert(sha(fs.readFileSync(path.join(root,'docs',item.path)))===item.sha256,`${item.path}: Pages bytes differ from app`);
    }
    const docsFiles=walk(path.join(root,'docs')).map(f=>relative(path.join(root,'docs'),f)).filter(f=>f!=='.nojekyll').sort();
    assert(JSON.stringify(docsFiles)===JSON.stringify(appFiles),'Pages output contains unexpected files');
  }
  assert(fs.existsSync(path.join(root,'README.md'))&&fs.existsSync(path.join(root,'AGENTS.md'))&&fs.existsSync(path.join(root,'LICENSE')),'release documentation missing');
} catch(error) { errors.push(error.message); }
if(errors.length) { console.error(`FAIL — ${errors.length} validation error(s)\n`+errors.map(e=>' - '+e).join('\n'));process.exitCode=1; }
else console.log(`PASS — source boundaries, schemas, captures, generated bytes, personal provenance, drills and privacy checks\nTopics: ${data.topics.length}\nRole drills: ${data.drills.length}\nCareer practice cards: ${data.career.length}\nContent files: ${walk(path.join(root,'content')).length}\nSHA256 ${sha(read(root,'app/data/content.json'))}`);
