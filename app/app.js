/* Role Studio renders generated content. Career assertions and study material belong in content/. */
'use strict';
const $ = (selector, root = document) => root.querySelector(selector);
const main = $('#main');
const STORAGE_KEY = 'role-studio-progress-v1';
const CLASS_LABELS = {posting:'Posting',employer_public:'Employer / public',industry:'Industry practice',inference:'Inference',unknown:'Not established',prep_drill:'Practice drill',workspace_meta:'Workspace reference',candidate_material:'Career material',candidate_fact:'Candidate fact'};
let corpus = null;
let postingOnly = false;
let practiceTime = 'all';
let searchText = '';
let installPrompt = null;
let storageAvailable = true;
let progress = loadProgress();
let timer = {key:null,seconds:180,remaining:180,running:false,endsAt:0};
let timerInterval = null;

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined && text !== null) element.textContent = String(text);
  if (className) element.className = className;
  return element;
}
function append(parent, ...children) { children.flat().filter(Boolean).forEach(child => parent.append(child)); return parent; }
function link(text, href, className) { const a=node('a',text,className); a.href=href; return a; }
function button(text, action, className='secondary-button') { const b=node('button',text,className); b.type='button'; b.addEventListener('click',action); return b; }
function announce(message) { $('#announcement').textContent=''; setTimeout(()=>{$('#announcement').textContent=message;},30); }
function safeUrl(value) { try { const url=new URL(value); return ['https:','http:'].includes(url.protocol)?url.href:null; } catch { return null; } }
function label(value) { return CLASS_LABELS[value] || String(value || 'Source note').replaceAll('_',' '); }
function badge(value) { return node('span',label(value),`badge ${String(value||'').replace(/[^a-z_]/g,'')}`); }
function textOf(record) { if(typeof record==='string')return record; return record?.text || record?.body || record?.excerpt || record?.quote || record?.description || ''; }
function visible(record) { return !postingOnly || record?.class==='posting'; }
function records(items) { return (Array.isArray(items)?items:[]).filter(visible); }
function sourceLine(record) {
  const line=node('div',null,'source-line');
  const url=safeUrl(record?.source_url);
  if(url){const a=link('Open source ↗',url);a.target='_blank';a.rel='noopener noreferrer';line.append(a);}
  if(record?.locator)line.append(node('span',record.locator));
  if(record?.retrieved_date)line.append(node('span',`Retrieved ${record.retrieved_date}`));
  if(record?.source_label)line.append(node('span',record.source_label));
  if(record?.source_locator)line.append(node('span',record.source_locator));
  return line.childNodes.length?line:null;
}
function inlineText(element,text) {
  const pattern=/\[([^\]]+)\]\(([^\s)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
  let index=0;let match;
  while((match=pattern.exec(text))){
    element.append(document.createTextNode(text.slice(index,match.index)));
    if(match[1]){const url=safeUrl(match[2]);if(url){const a=link(match[1],url);a.target='_blank';a.rel='noopener noreferrer';element.append(a);}else element.append(document.createTextNode(match[1]));}
    else element.append(node(match[3]?'strong':'code',match[3]||match[4]));
    index=pattern.lastIndex;
  }
  element.append(document.createTextNode(text.slice(index)));
}
function markdown(text) {
  const container=node('div',null,'markdown');
  const lines=String(text||'').replace(/\r\n/g,'\n').split('\n');
  let paragraph=[],list=null,fence=null,code=[],table=null;
  const flush=()=>{if(paragraph.length){const p=node('p');inlineText(p,paragraph.join(' '));container.append(p);paragraph=[];}list=null;table=null;};
  for(const raw of lines){
    const line=raw.trimEnd();
    if(line.startsWith('```')){flush();if(fence!==null){container.append(node('pre',code.join('\n')));fence=null;code=[];}else fence=line;continue;}
    if(fence!==null){code.push(raw);continue;}
    if(/^\s*<!--.*-->\s*$/.test(line))continue;
    if(!line.trim()){flush();continue;}
    const heading=line.match(/^(#{1,6})\s+(.+)$/);
    if(heading){flush();const h=node(`h${Math.min(heading[1].length+1,4)}`);inlineText(h,heading[2]);container.append(h);continue;}
    if(/^[-*_]{3,}$/.test(line)){flush();container.append(node('hr'));continue;}
    if(line.startsWith('|')&&line.endsWith('|')){
      if(/^\|[\s:|-]+\|$/.test(line))continue;
      if(paragraph.length){flush();}
      if(!table){table=node('table');container.append(table);}
      const row=node('tr');const first=!table.children.length;
      line.slice(1,-1).split('|').forEach(cell=>{const item=node(first?'th':'td');inlineText(item,cell.trim());row.append(item);});
      table.append(row);continue;
    }
    const bullet=line.match(/^\s*(?:[-*]|\d+[.)])\s+(.+)$/);
    if(bullet){if(paragraph.length)flush();if(!list){list=node(/^\s*\d/.test(line)?'ol':'ul');container.append(list);}const li=node('li');inlineText(li,bullet[1]);list.append(li);continue;}
    if(line.startsWith('>')){flush();const quote=node('blockquote');inlineText(quote,line.replace(/^>\s?/,''));container.append(quote);continue;}
    if(list||table){list=null;table=null;}
    paragraph.push(line);
  }
  flush();if(fence!==null)container.append(node('pre',code.join('\n')));
  return container;
}
function recordCard(record,{quote=false}={}) {
  const r=typeof record==='string'?{text:record,class:'unknown'}:record;
  const card=node('article',null,'record');card.append(badge(r.class));
  if(r.title)card.append(node('h4',r.title));
  card.append(quote?node('blockquote',textOf(r)):markdown(textOf(r)));
  if(r.class==='inference'&&r.inferred_from)card.append(node('p',`Based on: ${r.inferred_from}`,'microcopy'));
  if(r.source_note)card.append(node('p',r.source_note,'microcopy'));
  append(card,sourceLine(r));return card;
}
function intro(eyebrow,title,description) { return append(node('header',null,'page-intro'),node('span',eyebrow,'eyebrow'),node('h1',title),description?node('p',description):null); }
function empty(title,message,clearFilter=false) {
  const box=append(node('div',null,'empty-state'),node('h2',title),node('p',message));
  if(clearFilter)box.append(button('Show all study material',()=>{$('#posting-only').checked=false;setPostingOnly(false);},'primary-button'));
  return box;
}
function sectionHeading(title,href,actionLabel) { const section=node('div',null,'section-heading');section.append(node('h2',title));if(href)section.append(link(actionLabel||'View all →',href,'text-button'));return section; }
function topicDrills(topic){return(corpus.drills||[]).filter(drill=>(drill.topic_ids||[]).includes(topic.id)||(topic.drills||[]).includes(drill.id));}
function completeCount(){return(corpus.drills||[]).filter(d=>progress.completed[d.id]).length;}
function studiedTopicCount(){return(corpus.topics||[]).filter(t=>topicDrills(t).some(d=>progress.completed[d.id])).length;}
function nextDrill(){const all=corpus.drills||[];return all.find(d=>d.timebox===3&&!progress.completed[d.id])||all.find(d=>!progress.completed[d.id])||all[0];}
function topicCard(topic,index,compact=false){
  const card=link('',`#topics/${encodeURIComponent(topic.id)}`,'card card-link');
  const count=(topic.posting_excerpts||[]).length;
  append(card,append(node('div',null,'card-top'),node('span',String(index+1).padStart(2,'0'),'card-index'),node('span',`${count} excerpts`,'card-count')),node('h3',topic.title));
  if(!compact)card.append(node('p',`${topicDrills(topic).length} practice drills · ${records(topic.unknowns).length} open questions`));
  card.append(node('span','↗','arrow'));return card;
}
function drillCard(drill){
  const card=link('',`#practice/${encodeURIComponent(drill.id)}`,'drill-card');
  const minutes=append(node('span',String(drill.timebox||3),'minutes'),node('small','MIN'));
  const done=Boolean(progress.completed[drill.id]);
  append(card,minutes,append(node('div',null,'drill-info'),node('h3',drill.title),node('p',`${String(drill.type||'Practice').replaceAll('-',' ')} · Model answer included${done?' · Practiced':''}`)),node('span',done?'✓':'↗','done-mark'));
  return card;
}
function drillDisplayBody(drill){
  const lines=String(drill.body||drill.prompt||textOf(drill)).replace(/\r\n/g,'\n').split('\n');
  const clean=[];let inSources=false;
  for(const line of lines){
    if(/^##\s+Motivating posting excerpts\s*$/i.test(line)){inSources=true;continue;}
    if(inSources&&/^#{1,2}\s/.test(line))inSources=false;
    if(inSources||/^#\s/.test(line)||/^This is not an official interview question\.?\s*$/i.test(line)||/^Class:\s*prep_drill\./i.test(line))continue;
    clean.push(line);
  }
  return clean.join('\n').trim();
}
function renderHome(){
  if(postingOnly){main.append(intro('The role, in its own words','Start with the posting.','Only records classified as retrieved posting text are visible. Switch off the filter to return to study notes, drills and career practice.'));}
  else{
    const next=nextDrill();
    const hero=node('section',null,'hero');
    append(hero,node('span','YOUR NEXT SMALL STEP','eyebrow'),node('h1',!next||next.timebox===3?'Make the next three minutes count.':'A little focus goes a long way.'),node('p',next?next.title:'Explore the role, then practice one idea at a time.'));
    if(next)hero.append(link(`Start a ${next.timebox||3}-minute practice  →`,`#practice/${encodeURIComponent(next.id)}`,'primary-button'));
    hero.append(node('p','Read a source. Think it through. Say it simply.','subline'));main.append(hero);
    const stats=node('div',null,'stats-row');
    for(const [value,text] of [[`${completeCount()}/${corpus.drills.length}`,'drills practiced'],[`${studiedTopicCount()}/${corpus.topics.length}`,'topics explored'],[(corpus.career||[]).length,'career connections']])stats.append(append(node('div',null,'stat'),node('strong',value),node('span',text)));
    main.append(stats);
  }
  main.append(sectionHeading('Know the terrain','#topics','All topics →'));
  const grid=node('div',null,'cards-grid compact');
  (corpus.topics||[]).slice(0,6).forEach((topic,index)=>grid.append(topicCard(topic,index,true)));main.append(grid);
  if(!postingOnly){
    main.append(sectionHeading('Bring your experience into focus','#career','Your career →'));
    const card=append(node('section',null,'quiet-panel'),node('h3','Practice what you can support.'),node('p','Career connections keep your experience, its evidence status, and its limits together. Choose one, explain your contribution, and answer a follow-up.'),link('Open career practice →','#career','text-button'));main.append(card);
    main.append(progressPanel());
  }
  const sourceNote=append(node('section',null,'quiet-panel'),node('h3','A source-led study space'),node('p','The live posting, saved posting, public employer context, general methods and unresolved questions stay distinct. A study suggestion is never treated as a candidate fact.'),link('Browse the source library →','#library','text-button'));main.append(sourceNote);
}
function renderTopics(id){
  const topic=corpus.topics.find(t=>t.id===id);
  if(id&&!topic){main.append(empty('Topic not found','Choose a topic from the map.'));return;}
  if(!topic){
    main.append(intro('THE ROLE MAP','See how the work connects.','Move from talent and performance systems to the program work that supports them. Open any topic to see its source evidence and boundaries.'));
    const grid=node('div',null,'cards-grid');corpus.topics.forEach((t,i)=>grid.append(topicCard(t,i)));main.append(grid);return;
  }
  const container=node('div',null,'topic-detail');
  append(container,link('← All topics','#topics','back-link'),intro('TOPIC STUDY',topic.title));
  for(const [field,title,quote] of [['posting_excerpts','In the posting',true],['must_know','What the sources establish',false],['study_notes','Study notes',false],['unknowns','What is still unknown',false]]){
    const items=records(topic[field]);if(!items.length)continue;
    const section=append(node('section',null,'content-section'),node('h2',title));items.forEach(r=>section.append(recordCard(r,{quote})));container.append(section);
  }
  if(!postingOnly){const drills=topicDrills(topic);if(drills.length){container.append(sectionHeading('Put it into practice'));const list=node('div',null,'list-stack');drills.forEach(d=>list.append(drillCard(d)));container.append(list);}}
  if(!container.querySelector('.content-section'))container.append(empty('No posting excerpt for this topic','This topic contains study material or open questions. Turn off posting-only mode to read it.',true));
  main.append(container);
}
function renderPractice(id){
  if(postingOnly){main.append(intro('POSTING ONLY','Practice is hidden.'),empty('Drills are preparation material','Practice prompts are authored study exercises, not text from the employer’s posting.',true));return;}
  const drill=corpus.drills.find(d=>d.id===id);
  if(id&&!drill){main.append(empty('Drill not found','Choose another drill from the practice library.'));return;}
  if(!drill){
    main.append(intro('A LITTLE PRACTICE, OFTEN','Choose your next session.','Recall a concept, work through a decision, or name what the public sources cannot tell you. These are study exercises, not official interview questions.'));
    const chips=node('div',null,'chip-row');for(const duration of ['all',3,10,25]){const chip=button(duration==='all'?'All sessions':`${duration} minutes`,()=>{practiceTime=duration;render();document.querySelector(`[data-timefilter="${duration}"]`)?.focus();},'chip');chip.dataset.timefilter=String(duration);chip.setAttribute('aria-pressed',String(practiceTime===duration));chips.append(chip);}main.append(chips);
    const filtered=corpus.drills.filter(d=>practiceTime==='all'||d.timebox===practiceTime);
    main.append(node('p',`${filtered.length} sessions · ${completeCount()} practiced on this device`,'search-summary'));
    const list=node('div',null,'list-stack');filtered.forEach(d=>list.append(drillCard(d)));main.append(filtered.length?list:empty('No sessions in this timebox','Choose another practice duration.'));return;
  }
  append(main,link('← All practice','#practice','back-link'),intro('PRACTICE SESSION',drill.title),node('div','This is not an official interview question.','notice'));
  const layout=node('div',null,'study-layout');const content=node('div',null,'study-content');
  append(content,badge(drill.class||'prep_drill'),markdown(drillDisplayBody(drill)));
  if(drill.answer){const details=node('details',null,'card document-card answer-guide');append(details,append(node('summary'),badge('inference'),node('h3','Show the model answer')),recordCard(drill.answer));content.append(details);}
  const excerpts=drill.motivating_excerpts||[];
  if(excerpts.length){const sources=node('details',null,'card document-card');append(sources,append(node('summary'),badge('posting'),node('h3','Why this is relevant')));excerpts.forEach(r=>sources.append(recordCard(r,{quote:true})));content.append(sources);}
  content.append(completionPanel(drill.id));append(layout,timerPanel(drill.id,drill.timebox||3),content);main.append(layout);
}
function renderCareer(id){
  if(postingOnly){main.append(intro('POSTING ONLY','Career material is hidden.'),empty('Your experience has a separate source','A candidate statement or career document is not part of the job posting.',true));return;}
  const cards=corpus.career||[];const selected=cards.find(c=>c.id===id);
  if(id&&!selected){main.append(empty('Career card not found','Choose a card from career practice.'));return;}
  if(selected){
    append(main,link('← Career connections','#career','back-link'),intro('SPEAK IT THROUGH',selected.title),node('div','Practice prompts are not official interview questions. Keep every answer within the evidence and boundaries shown.','notice'));
    const layout=node('div',null,'study-layout');const content=node('div',null,'study-content');
    if(selected.practice_prompt)append(content,append(node('section',null,'quiet-panel'),badge('prep_drill'),node('h2','Your practice prompt'),markdown(textOf(selected.practice_prompt))));
    if(selected.follow_up){content.append(sectionHeading('Go one level deeper'));const followUps=Array.isArray(selected.follow_up)?selected.follow_up:[selected.follow_up];followUps.forEach(followUp=>content.append(markdown(textOf(followUp))));}
    if(selected.answer_guide){const guide=selected.answer_guide;const details=node('details',null,'card document-card answer-guide');append(details,append(node('summary'),badge('prep_drill'),node('h3','Show your answer guide')),node('p','The opening below is supported by the bounded facts on this card. Finish the story only with a real example you can defend.','microcopy'));
      for(const [heading,response] of [['What you can say now',guide.supported_opening],['The example to add',guide.example_to_supply],['Answer to the follow-up',guide.follow_up_response]])append(details,node('h4',heading),markdown(response));content.append(details);}
    content.append(careerCard(selected,false,false));
    content.append(completionPanel(`career:${selected.id}`));append(layout,timerPanel(`career:${selected.id}`,3),content);main.append(layout);return;
  }
  main.append(intro('EXPERIENCE, WITH ITS BOUNDARIES','Make your story defensible.','Connect relevant career material to the role. Evidence status stays visible, and a practice suggestion never becomes a fact about your experience.'));
  if(!cards.length){main.append(empty('No career material is loaded','Only reviewed career records supplied with this edition appear here.'));return;}
  const list=node('div',null,'list-stack');cards.forEach(c=>list.append(careerCard(c,true)));main.append(list);
}
function careerCard(card,showLink,showPrompt=true){
  const item=append(node('article',null,'card career-card'),badge('candidate_material'),node('h3',card.title));
  append(item,node('p',[card.kind,card.evidence_class].filter(Boolean).join(' · ').replaceAll('_',' '),'microcopy'));
  if(Array.isArray(card.facts)&&card.facts.length){
    card.facts.forEach(fact=>{const factNode=node('div',null,'record');append(factNode,badge(fact.class||'candidate_fact'),markdown(textOf(fact)),node('p',[fact.evidence_class,fact.period,fact.source_id].filter(Boolean).join(' · '),'microcopy'));if(fact.boundary)factNode.append(node('p',fact.boundary,'guardrail'));item.append(factNode);});
  }else item.append(markdown(textOf(card)));
  append(item,sourceLine(card));
  if(card.guardrail)item.append(node('div',card.guardrail,'guardrail'));
  if(showPrompt&&card.practice_prompt){const prompt=node('p',null,'practice-prompt');append(prompt,node('strong','Practice prompt'),document.createTextNode(textOf(card.practice_prompt)||String(card.practice_prompt)));item.append(prompt);}
  if(showLink)append(item,node('p','This is not an official interview question.','microcopy'),link('Practice this connection →',`#career/${encodeURIComponent(card.id)}`,'text-button'));
  return item;
}
function renderLibrary(){
  main.append(intro('THE SOURCE LIBRARY','Find the source. Keep the context.','Search the retrieved postings, study notes and career connections. Open any record to see its classification, locator and source.'));
  const search=node('div',null,'search-field');const input=node('input');input.type='search';input.id='library-search';input.placeholder='Try “calibration”, “Power BI”, or a career topic';input.value=searchText;
  const searchLabel=node('label','Search all study content');searchLabel.htmlFor=input.id;append(search,searchLabel,input);main.append(search);
  const results=node('section');results.id='library-results';results.setAttribute('aria-label','Search results');main.append(results);
  input.addEventListener('input',()=>{searchText=input.value;renderLibraryResults(results);});renderLibraryResults(results);
}
function renderLibraryResults(results){
  results.replaceChildren();const term=searchText.trim().toLowerCase();
  const documents=(corpus.documents||[]).filter(visible).filter(d=>!term||`${d.title} ${d.body} ${d.class} ${d.path}`.toLowerCase().includes(term));
  const career=postingOnly?[]:(corpus.career||[]).filter(c=>!term||JSON.stringify(c).toLowerCase().includes(term));
  const topics=corpus.topics.flatMap(t=>['posting_excerpts','must_know','study_notes','unknowns'].flatMap(field=>records(t[field]).map(record=>({topic:t,record})))).filter(({record})=>term&&`${record.title||''} ${textOf(record)}`.toLowerCase().includes(term));
  const total=documents.length+career.length+topics.length;
  results.append(node('p',`${total} ${total===1?'result':'results'}${postingOnly?' · posting text only':''}`,'search-summary'));
  const list=node('div',null,'list-stack');
  documents.forEach(doc=>{const detail=node('details',null,'card document-card');const summary=append(node('summary'),badge(doc.class),node('h3',doc.title||doc.id),node('div',doc.path||doc.locator||'','source-line'));append(detail,summary,sourceLine(doc),doc.source_note?node('p',doc.source_note,'microcopy'):null,markdown(doc.body));list.append(detail);});
  topics.forEach(({topic,record})=>{const card=node('article',null,'card');append(card,node('h3',topic.title),recordCard(record),link('Open topic →',`#topics/${encodeURIComponent(topic.id)}`,'text-button'));list.append(card);});
  career.forEach(card=>list.append(careerCard(card,true)));
  results.append(total?list:empty('No matching records','Try a shorter phrase or a different topic.'));
}
function timerPanel(key,minutes){
  if(timer.key!==key){stopTimer();timer={key,seconds:minutes*60,remaining:minutes*60,running:false,endsAt:0};}
  const panel=node('aside',null,'timer-panel');panel.setAttribute('aria-label','Practice timer');
  const display=node('div',formatTime(timer.remaining),'timer-display');display.id='timer-display';display.setAttribute('role','timer');display.setAttribute('aria-live','off');display.setAttribute('aria-label',`Time remaining: ${formatTime(timer.remaining)}`);
  append(panel,node('h2','YOUR PRACTICE WINDOW'),display);
  const choices=node('div',null,'chip-row');
  for(const mins of [3,10,25]){const b=button(`${mins} min`,()=>{stopTimer();timer.seconds=mins*60;timer.remaining=timer.seconds;timer.running=false;updateTimerUI();announce(`Timer set to ${mins} minutes.`);},'chip');b.dataset.duration=String(mins);b.setAttribute('aria-pressed',String(timer.seconds===mins*60));choices.append(b);}
  panel.append(choices);
  const start=button(timer.running?'Pause timer':'Start timer',toggleTimer,'primary-button');start.id='timer-toggle';start.setAttribute('aria-controls','timer-display');start.setAttribute('aria-pressed',String(timer.running));
  const reset=button('Reset',()=>{stopTimer();timer.remaining=timer.seconds;timer.running=false;updateTimerUI();announce('Timer reset.');},'text-button');reset.id='timer-reset';
  append(panel,start,reset,node('p','Read silently or speak aloud. Nothing is recorded.','microcopy'));return panel;
}
function formatTime(seconds){const safe=Math.max(0,Math.ceil(seconds));return `${String(Math.floor(safe/60)).padStart(2,'0')}:${String(safe%60).padStart(2,'0')}`;}
function stopTimer(){if(timerInterval)clearInterval(timerInterval);timerInterval=null;}
function toggleTimer(){
  if(timer.running){timer.remaining=Math.max(0,Math.ceil((timer.endsAt-Date.now())/1000));timer.running=false;stopTimer();announce('Timer paused.');}
  else{if(timer.remaining<=0)timer.remaining=timer.seconds;timer.running=true;timer.endsAt=Date.now()+timer.remaining*1000;timerInterval=setInterval(tickTimer,250);announce('Timer started.');}
  updateTimerUI();
}
function tickTimer(){if(!timer.running)return;timer.remaining=Math.max(0,Math.ceil((timer.endsAt-Date.now())/1000));if(timer.remaining<=0){stopTimer();timer.running=false;announce('Time is up. Finish your thought, then mark this session practiced.');}updateTimerUI();}
function updateTimerUI(){const display=$('#timer-display');if(display){display.textContent=formatTime(timer.remaining);display.setAttribute('aria-label',`Time remaining: ${formatTime(timer.remaining)}`);}const toggle=$('#timer-toggle');if(toggle){toggle.textContent=timer.running?'Pause timer':timer.remaining<=0?'Start again':'Start timer';toggle.setAttribute('aria-pressed',String(timer.running));}document.querySelectorAll('[data-duration]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.duration)*60===timer.seconds)));}
function completionPanel(key){
  const done=progress.completed[key];const box=node('section',null,'completion-box');
  append(box,node('h3',done?'Practiced. Keep building.':'Finish with a quick reflection.'),node('p','Can you explain the idea clearly, identify its source, and say what remains unknown? Completion tracks practice, not mastery.'));
  const b=button(done?'Practice again ✓':'Mark as practiced',()=>{const existing=progress.completed[key];progress.completed[key]={count:Math.min(100000,(existing?.count||0)+1),lastCompleted:new Date().toISOString()};saveProgress();stopTimer();timer.running=false;render();$('#mark-practiced')?.focus({preventScroll:true});announce('Session marked as practiced on this device.');},'primary-button');b.id='mark-practiced';box.append(b);return box;
}
function plainRecord(value){return Boolean(value)&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));}
function cleanCompletionEntries(value,known){
  const clean=Object.create(null);
  if(!plainRecord(value))return clean;
  for(const [key,entry] of Object.entries(value)){
    if(!/^[a-zA-Z0-9:_-]{1,160}$/.test(key)||['__proto__','prototype','constructor'].includes(key)||(known&&!known.has(key))||!plainRecord(entry))continue;
    if(!Number.isSafeInteger(entry.count)||entry.count<1||entry.count>100000||typeof entry.lastCompleted!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(entry.lastCompleted))continue;
    const date=new Date(entry.lastCompleted);
    if(!Number.isFinite(date.getTime())||date.toISOString()!==entry.lastCompleted)continue;
    clean[key]={count:entry.count,lastCompleted:entry.lastCompleted};
  }
  return clean;
}
function emptyProgress(){return{version:1,completed:Object.create(null)};}
function loadProgress(){let raw=null;try{raw=localStorage.getItem(STORAGE_KEY);}catch{storageAvailable=false;}try{const parsed=JSON.parse(raw||'null');if(plainRecord(parsed)&&parsed.version===1&&plainRecord(parsed.completed))return{version:1,completed:cleanCompletionEntries(parsed.completed)};}catch{}return emptyProgress();}
function updateStorageStatus(){$('#footer-status').textContent=storageAvailable?'Progress stays in this browser. Export it to move between devices.':'Browser storage is unavailable. Export progress before closing.';}
function saveProgress(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(progress));storageAvailable=true;}catch{storageAvailable=false;announce('This browser cannot save progress. Export it before closing.');}updateStorageStatus();}
function progressPanel(){
  const panel=append(node('section',null,'quiet-panel'),node('h3','Small steps, visible progress'),node('p','Your checkmarks stay on this device. Export a progress file and import it on another device to continue there. Automatic cross-device sync is not enabled.'));
  const track=node('div',null,'progress-track');const fill=node('div',null,'progress-fill');fill.style.width=`${corpus.drills.length?completeCount()/corpus.drills.length*100:0}%`;track.append(fill);panel.append(track);
  panel.append(node('p',`${completeCount()} of ${corpus.drills.length} drills practiced. Revisit any session as often as you like.`,'microcopy'));
  const tools=node('div',null,'export-tools');
  const confirmation=node('section',null,'quiet-panel');confirmation.id='reset-progress-confirmation';confirmation.hidden=true;confirmation.setAttribute('role','group');confirmation.setAttribute('aria-labelledby','reset-progress-question');
  const question=node('p','Reset the practice checkmarks saved in this browser? Export a copy first if you want to keep them.');question.id='reset-progress-question';
  const reset=button('Reset progress',()=>{confirmation.hidden=false;reset.setAttribute('aria-expanded','true');cancel.focus();},'small-button');reset.id='reset-progress';reset.setAttribute('aria-controls',confirmation.id);reset.setAttribute('aria-expanded','false');
  const cancel=button('Cancel',()=>{confirmation.hidden=true;reset.setAttribute('aria-expanded','false');reset.focus();},'small-button');
  const confirm=button('Confirm reset',()=>{progress=emptyProgress();saveProgress();render();$('#reset-progress')?.focus({preventScroll:true});announce('Local progress reset.');},'small-button');
  append(confirmation,question,append(node('div',null,'button-row'),cancel,confirm));
  append(tools,button('Export progress',exportProgress,'small-button'),button('Import progress',()=>$('#import-file').click(),'small-button'),reset);append(panel,tools,confirmation);return panel;
}
function exportProgress(){const file={version:1,app:'role-studio',exportedAt:new Date().toISOString(),contentVersion:corpus.version,completed:progress.completed};const blob=new Blob([JSON.stringify(file,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=link('Download',url);a.download=`role-studio-progress-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('Progress exported.');}
async function importProgress(event){
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  try{
    if(file.size>1000000)throw new Error('Choose a Role Studio progress file smaller than 1 MB.');
    const parsed=JSON.parse(await file.text());if(!plainRecord(parsed)||parsed.version!==1||parsed.app!=='role-studio'||!plainRecord(parsed.completed))throw new Error('This is not a supported Role Studio progress file.');
    const known=new Set([...corpus.drills.map(d=>d.id),...(corpus.career||[]).map(c=>`career:${c.id}`)]);let imported=0;
    for(const [key,value] of Object.entries(cleanCompletionEntries(parsed.completed,known))){const old=progress.completed[key];progress.completed[key]={count:Math.max(old?.count||0,value.count),lastCompleted:old?.lastCompleted>value.lastCompleted?old.lastCompleted:value.lastCompleted};imported++;}
    saveProgress();render();main.focus({preventScroll:true});announce(`Imported progress for ${imported} sessions.`);
  }catch(error){window.alert(error.message||'The progress file could not be imported.');}
}
function setPostingOnly(value){postingOnly=value;$('#filter-description').textContent=value?'Only retrieved posting text':'Sources, study notes & career practice';render();announce(value?'Posting-only filter on. Study notes, practice prompts and career material are hidden.':'All study material is visible.');}
function route(){const parts=location.hash.replace(/^#/,'').split('/');let id='';try{id=decodeURIComponent(parts[1]||'');}catch{}return {page:['home','topics','practice','career','library'].includes(parts[0])?parts[0]:'home',id};}
function render({focus=false}={}){
  if(!corpus)return;const {page,id}=route();main.replaceChildren();
  document.querySelectorAll('[data-nav]').forEach(a=>{if(a.dataset.nav===page)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  document.title=`${{home:'Today',topics:'Topic map',practice:'Practice',career:'Career connections',library:'Source library'}[page]} · Role Studio`;
  if(page==='home')renderHome();else if(page==='topics')renderTopics(id);else if(page==='practice')renderPractice(id);else if(page==='career')renderCareer(id);else renderLibrary();
  if(focus){main.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
}
function updateConnection(){const status=$('#connection');const offline=!navigator.onLine;status.classList.toggle('offline',offline);status.textContent=offline?'Offline':navigator.serviceWorker?.controller?'Offline ready':'Online';status.title=offline?'Using saved content when available':navigator.serviceWorker?.controller?'The app shell and study content are cached for offline use':'Open the app online once to prepare offline content';}
async function start(){
  $('#posting-only').addEventListener('change',event=>setPostingOnly(event.target.checked));
  $('#import-file').addEventListener('change',importProgress);
  window.addEventListener('hashchange',()=>render({focus:true}));
  window.addEventListener('online',updateConnection);window.addEventListener('offline',updateConnection);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)tickTimer();});
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;$('#install').hidden=false;});
  $('#install').addEventListener('click',async()=>{if(!installPrompt)return;await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('#install').hidden=true;});
  try{
    const response=await fetch('./data/content.json');if(!response.ok)throw new Error(`Content returned HTTP ${response.status}`);
    corpus=await response.json();if(!Array.isArray(corpus.topics)||!Array.isArray(corpus.drills)||!Array.isArray(corpus.documents))throw new Error('The generated content has an unsupported format.');
    render();
    if('serviceWorker'in navigator){navigator.serviceWorker.addEventListener('controllerchange',updateConnection);navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type==='CACHE_READY')updateConnection();});try{await navigator.serviceWorker.register('./service-worker.js',{scope:'./'});await navigator.serviceWorker.ready;updateConnection();}catch{const status=$('#connection');status.textContent='Online · cache unavailable';status.title='This browser could not prepare offline content. The study material is still available online.';}}
  }catch(error){main.replaceChildren(append(node('div',null,'empty-state error-card'),node('span','SOURCE LIBRARY UNAVAILABLE','eyebrow'),node('h1','Let’s get the content back.'),node('p',navigator.onLine?'The generated study content could not be loaded. Try reloading once.':'This device does not have a usable offline copy yet. Open the app once while connected.'),node('p',error.message,'microcopy'),button('Reload',()=>location.reload(),'primary-button')));}
  updateConnection();updateStorageStatus();
}
start();
