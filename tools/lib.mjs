import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CLASSES = ['posting','employer_public','industry','inference','unknown','prep_drill','workspace_meta','candidate_material','candidate_fact'];
export const FIELDS = ['id','class','title','source_url','source_note','retrieved_date','locator','inferred_from'];
export const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export const read = (root, file) => fs.readFileSync(path.join(root,file),'utf8').replace(/^\uFEFF/,'');
export const json = (root, file) => JSON.parse(read(root,file));
export function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en')).flatMap(x=>x.isDirectory()?walk(path.join(dir,x.name)):[path.join(dir,x.name)]);
}
export const relative = (root,file) => path.relative(root,file).split(path.sep).join('/');
export function parseMarkdown(text, file='document') {
  const match=text.replace(/\r\n/g,'\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if(!match) throw new Error(`${file}: missing flat YAML frontmatter`);
  const out={};
  for(const line of match[1].split('\n')) {
    if(!line.trim()) continue;
    const m=line.match(/^([a-z_]+):\s*(.*)$/);
    if(!m || Object.hasOwn(out,m[1])) throw new Error(`${file}: illegal or duplicate frontmatter field`);
    let value=m[2].trim();
    if(value==='null') value=null;
    else if(value.startsWith('"')) value=JSON.parse(value);
    else if(value.startsWith("'")) value=value.slice(1,-1).replace(/''/g,"'");
    out[m[1]]=value;
  }
  return {...out,body:match[2].trim(),path:file};
}
export function compile(root=ROOT) {
  // The validator's own transcript is derived output, not a learning-source input.
  const inputs=[...walk(path.join(root,'content')),...walk(path.join(root,'schema'))]
    .filter(f=>relative(root,f)!=='content/gaps/validation-log.md');
  const source_manifest=inputs.map(f=>({path:relative(root,f),sha256:sha(fs.readFileSync(f))})).sort((a,b)=>a.path.localeCompare(b.path,'en'));
  const documents=inputs.filter(f=>f.endsWith('.md')).map(f=>parseMarkdown(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''),relative(root,f)));
  const t=json(root,'content/map/topics.json');
  const d=json(root,'content/drills/index.json');
  const c=json(root,'content/career/cards.json');
  const guides=json(root,'content/answers/guides.json');
  const roleGuides=new Map(guides.role.map(guide=>[guide.id,guide]));
  const careerGuides=new Map(guides.career.map(guide=>[guide.id,guide]));
  const drills=(Array.isArray(d)?d:d.drills).map(drill=>{
    const file=drill.file.startsWith('content/')?drill.file:`content/drills/${drill.file}`;
    const document=documents.find(x=>x.path===file);
    if(!document) throw new Error(`Drill ${drill.id}: missing ${file}`);
    const guide=roleGuides.get(drill.id);
    const answer=guide?{
      id:`answer-${drill.id}`,class:'inference',title:'Worked study response',
      text:guide.response,source_url:null,
      source_note:'Editorial answer guide. Posting facts remain attributed to the cited excerpts; general methods and hypothetical choices are not employer policy.',
      retrieved_date:'2026-09-27',locator:`Answer guide for ${drill.id}`,
      inferred_from:drill.motivating_excerpts.map(excerpt=>excerpt.id).join(', ')
    }:undefined;
    return {...drill,class:'prep_drill',body:document.body,source_path:file,...(answer?{answer}:{})};
  });
  return {version:1,source_digest:sha(JSON.stringify(source_manifest)),source_manifest,
    meta:json(root,'content/posting/meta.json'),documents,topics:Array.isArray(t)?t:t.topics,drills,
    career:c.cards.map(card=>({...card,...(careerGuides.has(card.id)?{answer_guide:careerGuides.get(card.id)}:{})})),career_sources:c.sources};
}
export const serialize = data => JSON.stringify(data,null,2)+'\n';

// Dependency-free validator for the JSON Schema keywords used by this repository.
// Unsupported keywords cannot silently pass: schemas are fixed and reviewed here.
export function schemaCheck(value,schema,root,where,errors) {
  if(schema.$ref) return schemaCheck(value,json(root,'schema/'+schema.$ref),root,where,errors);
  if(schema.anyOf) {
    const matches=schema.anyOf.some(s=>{const e=[];schemaCheck(value,s,root,where,e);return !e.length;});
    if(!matches) errors.push(`${where}: no allowed schema variant`);
  }
  if(schema.allOf) schema.allOf.forEach(s=>schemaCheck(value,s,root,where,errors));
  if(schema.if) {const e=[];schemaCheck(value,schema.if,root,where,e);if(!e.length&&schema.then)schemaCheck(value,schema.then,root,where,errors);}
  if(schema.const!==undefined&&value!==schema.const) errors.push(`${where}: expected ${schema.const}`);
  if(schema.enum&&!schema.enum.includes(value)) errors.push(`${where}: invalid enum ${value}`);
  const types=Array.isArray(schema.type)?schema.type:[schema.type];
  if(schema.type&&!types.some(t=>t==='null'?value===null:t==='array'?Array.isArray(value):t==='object'?value!==null&&typeof value==='object'&&!Array.isArray(value):t==='integer'?Number.isInteger(value):typeof value===t)) {errors.push(`${where}: expected ${types.join('|')}`);return;}
  if(typeof value==='string') {
    if(schema.minLength&&value.length<schema.minLength) errors.push(`${where}: too short`);
    if(schema.pattern&&!new RegExp(schema.pattern).test(value)) errors.push(`${where}: invalid format`);
  }
  if(Array.isArray(value)) {
    if(schema.minItems&&value.length<schema.minItems) errors.push(`${where}: too few items`);
    if(schema.items)value.forEach((x,i)=>schemaCheck(x,schema.items,root,`${where}[${i}]`,errors));
  }
  if(value&&typeof value==='object'&&!Array.isArray(value)) {
    for(const k of schema.required??[]) if(!Object.hasOwn(value,k)) errors.push(`${where}: missing ${k}`);
    for(const [k,v] of Object.entries(value)) {
      if(schema.properties?.[k]) schemaCheck(v,schema.properties[k],root,`${where}.${k}`,errors);
      else if(schema.additionalProperties===false) errors.push(`${where}: unexpected ${k}`);
    }
  }
}
