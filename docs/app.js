(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('canvas'), details = $('details'), search = $('search');
  const themeFilter = $('themeFilter'), caseFilter = $('caseFilter');
  let data, view = 'graph', selection = null, asOf = '';
  let themes = [], cases = [], teams = [], people = [], pubs = [], keywords = [], quarters = [];
  const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const by = (list, key, id) => list.find(item => item[key] === id);
  const name = (list, key, label, id) => by(list, key, id)?.[label] || id;
  const tn = id => name(themes, 'theme_id', 'theme_name', id);
  const cn = id => name(cases, 'case_id', 'case_name', id);
  const pn = id => name(people, 'person_id', 'full_name', id);
  const inside = x => (!x.start_date || x.start_date <= asOf) && (!x.end_date || x.end_date > asOf);
  const visible = x => inside(x);
  const link = key => data.links[key].filter(inside);
  const caseThemes = id => link('themeCase').filter(x => x.case_id === id).map(x => x.theme_id);
  const themeCases = id => link('themeCase').filter(x => x.theme_id === id && visible(by(cases,'case_id',x.case_id))).map(x => x.case_id);
  const personCases = id => link('personCase').filter(x => x.person_id === id && visible(by(cases,'case_id',x.case_id))).map(x => x.case_id);
  const publicationCases = id => link('publicationCase').filter(x => x.publication_id === id && visible(by(cases,'case_id',x.case_id))).map(x => x.case_id);
  const pubAuthors = id => link('publicationAuthor').filter(x => x.publication_id === id).sort((a,b)=>(a.author_order||999)-(b.author_order||999)).map(x => x.person_id);
  const pubKeywords = id => link('publicationKeyword').filter(x => x.publication_id === id).map(x => x.keyword_id);
  const personThemes = p => [...new Set([
    ...link('personTheme').filter(x=>x.person_id===p.person_id).map(x=>x.theme_id),
    ...link('teamTheme').filter(x=>x.team_id===p.team_id).map(x=>x.theme_id),
    ...personCases(p.person_id).flatMap(caseThemes)
  ])];
  const publicationThemes = p => [...new Set([
    ...link('publicationTheme').filter(x=>x.publication_id===p.publication_id).map(x=>x.theme_id),
    ...publicationCases(p.publication_id).flatMap(caseThemes)
  ])];
  const activePeople = () => people.filter(visible);
  const activePubs = () => pubs.filter(p => !p.first_visible_date || p.first_visible_date <= asOf);
  const q = () => search.value.trim().toLocaleLowerCase();
  const match = (...values) => !q() || values.flat().join(' ').toLocaleLowerCase().includes(q());
  const status = id => data.publicationStatus.filter(x => x.publication_id === id && x.effective_date <= asOf).sort((a,b) => b.effective_date.localeCompare(a.effective_date))[0]?.status || 'Publication';
  function filteredCases() { return cases.filter(c => visible(c) && (!caseFilter.value || c.case_id === caseFilter.value) && (!themeFilter.value || caseThemes(c.case_id).includes(themeFilter.value)) && match(c.case_name,...caseThemes(c.case_id).map(tn),...activePeople().filter(p=>personCases(p.person_id).includes(c.case_id)).map(p=>p.full_name))); }
  function filteredPeople() { return activePeople().filter(p => (!caseFilter.value || personCases(p.person_id).includes(caseFilter.value)) && (!themeFilter.value || personThemes(p).includes(themeFilter.value)) && match(p.full_name,name(teams,'team_id','team_name',p.team_id),...personCases(p.person_id).map(cn))); }
  function filteredPubs() { return activePubs().filter(p => (!caseFilter.value || publicationCases(p.publication_id).includes(caseFilter.value)) && (!themeFilter.value || publicationThemes(p).includes(themeFilter.value)) && match(p.title,pubKeywords(p.publication_id).map(k=>name(keywords,'keyword_id','keyword_label',k)),pubAuthors(p.publication_id).map(pn))); }
  function chips(items) { return items.length ? items.map(x=>`<span class="chip">${e(x)}</span>`).join('') : '<p>No recorded connection at this date.</p>'; }
  function showDetail(kind,id) {
    selection={kind,id}; let title='',meta='', sections=[];
    if(kind==='theme') { const t=by(themes,'theme_id',id), cs=themeCases(id); title=t.theme_name;meta=t.RAP+' · Theme';sections=[['Case studies',cs.map(cn)],['Teams',link('teamTheme').filter(x=>x.theme_id===id).map(x=>name(teams,'team_id','team_name',x.team_id))],['People connected to this theme',activePeople().filter(p=>personThemes(p).includes(id)).map(p=>p.full_name)],['Publications',activePubs().filter(p=>publicationThemes(p).includes(id)).map(p=>p.title)]]; }
    if(kind==='team') {const t=by(teams,'team_id',id);title=t.team_name;meta='Team';sections=[['Institution',[t.institution]],['Discipline',[t.discipline]],['Members',activePeople().filter(p=>p.team_id===id).map(p=>p.full_name)],['Current case stages',data.collaborationStages.filter(x=>x.team_id===id&&inside(x)).map(x=>cn(x.case_id)+': '+x.state)]];}
    if(kind==='case') {title=cn(id);meta='Case study';sections=[['Themes',caseThemes(id).map(tn)],['Teams',link('teamCase').filter(x=>x.case_id===id).map(x=>name(teams,'team_id','team_name',x.team_id))],['People',activePeople().filter(p=>personCases(p.person_id).includes(id)).map(p=>p.full_name)],['Publications',activePubs().filter(p=>publicationCases(p.publication_id).includes(id)).map(p=>p.title)]];}
    if(kind==='person') {const p=by(people,'person_id',id);title=p.full_name;meta='Person · '+name(teams,'team_id','team_name',p.team_id);sections=[['Cases through team involvement',[...new Set(personCases(id))].map(cn)],['Themes including team and case links',personThemes(p).map(tn)],['Publications',activePubs().filter(x=>pubAuthors(x.publication_id).includes(id)).map(x=>x.title)],['Contact',p.email?[p.email]:['Email not displayed']]];}
    if(kind==='publication') {const p=by(pubs,'publication_id',id);title=p.title;meta=status(id)+(p.year?' · '+p.year:'');sections=[['Authors',pubAuthors(id).map(pn)],['Keywords',pubKeywords(id).map(k=>name(keywords,'keyword_id','keyword_label',k))],['Case studies',publicationCases(id).map(cn)]];}
    if(kind==='keyword') {title=name(keywords,'keyword_id','keyword_label',id);meta='Keyword';const matches=activePubs().filter(p=>pubKeywords(p.publication_id).includes(id));sections=[['Publications',matches.map(p=>p.title)],['Authors',[...new Set(matches.flatMap(p=>pubAuthors(p.publication_id)))].map(pn)]];}
    details.innerHTML=`<h2>Selection</h2><div class="detail-type">${e(meta)}</div><div class="detail-title">${e(title)}</div>${sections.map(([label,values])=>`<div class="detail-section"><strong>${e(label)}</strong>${chips(values)}</div>`).join('')}<p class="muted" style="margin-top:22px">Showing records active in ${e($('year').textContent)}.</p>`;
    render();
  }
  function item(kind,id,title,sub,color,dim=false) {return `<button class="item ${selection?.id===id?'active':''} ${dim?'dim':''}" data-kind="${kind}" data-id="${e(id)}"><span class="swatch" style="background:${e(color||'#687a7c')}"></span><span><span class="name">${e(title)}</span><span class="small" style="display:block">${e(sub)}</span></span></button>`;}
  const layers = new Set(['theme','case','team','person','publication','keyword']);
  function graph() {
    const nodes=[], edges=[];
    const add=(kind,id,label,color)=>nodes.push({kind,id,label,color,key:kind+':'+id});
    const edge=(a,aid,b,bid,label)=>edges.push({a:a+':'+aid,b:b+':'+bid,label});
    const cs=filteredCases(), caseIds=new Set(cs.map(c=>c.case_id));
    const stages=data.collaborationStages.filter(x=>inside(x)&&caseIds.has(x.case_id));
    const teamIds=new Set(stages.map(x=>x.team_id));
    const ps=filteredPubs();
    themes.filter(t=>cs.some(c=>caseThemes(c.case_id).includes(t.theme_id))).forEach(t=>add('theme',t.theme_id,t.theme_name,t.color_hex));
    cs.forEach(c=>{add('case',c.case_id,c.case_name,'#687a7c');caseThemes(c.case_id).forEach(t=>edge('theme',t,'case',c.case_id,'Theme–case'));});
    teams.filter(t=>visible(t)&&teamIds.has(t.team_id)).forEach(t=>add('team',t.team_id,t.team_name,'#6760a5'));
    stages.forEach(x=>edge('team',x.team_id,'case',x.case_id,x.state+' · '+x.start_date+' → '+(x.end_date||'ongoing')));
    const authorIds=new Set(ps.flatMap(p=>pubAuthors(p.publication_id)));
    activePeople().filter(p=>teamIds.has(p.team_id)||authorIds.has(p.person_id)).forEach(p=>{add('person',p.person_id,p.full_name,'#a36c4c');edge('team',p.team_id,'person',p.person_id,'Team membership');});
    const keywordIds=new Set(ps.flatMap(p=>pubKeywords(p.publication_id)));
    keywords.filter(k=>keywordIds.has(k.keyword_id)).forEach(k=>add('keyword',k.keyword_id,k.keyword_label,'#b7822c'));
    ps.forEach(p=>{add('publication',p.publication_id,p.title,'#386d9c');publicationCases(p.publication_id).forEach(c=>edge('case',c,'publication',p.publication_id,'Publication case'));pubAuthors(p.publication_id).forEach(a=>edge('person',a,'publication',p.publication_id,'Authorship'));pubKeywords(p.publication_id).forEach(k=>edge('publication',p.publication_id,'keyword',k,'Keyword'));});
    const kinds=['theme','case','team','person','publication','keyword'].filter(k=>layers.has(k));
    const ns=nodes.filter(n=>layers.has(n.kind)), map=new Map(ns.map(n=>[n.key,n]));
    const height=Math.max(520,...kinds.map(k=>ns.filter(n=>n.kind===k).length*72+100));
    kinds.forEach((k,col)=>ns.filter(n=>n.kind===k).forEach((n,row,all)=>{n.x=80+col*170;n.y=75+(row+.5)*(height-110)/Math.max(1,all.length);}));
    const es=edges.filter(x=>map.has(x.a)&&map.has(x.b));
    const selected=selection?selection.kind+':'+selection.id:null;
    const neighbors=new Set([selected]);es.forEach(x=>{if(x.a===selected)neighbors.add(x.b);if(x.b===selected)neighbors.add(x.a);});
    canvas.innerHTML=`<div class="rowhead"><div><h2>Network map</h2><p class="muted">Drag nodes to arrange. Select a node to explore its connections. Hover a line for its relationship.</p></div></div><div class="graph-layers">${['theme','case','team','person','publication','keyword'].map((k,i)=>`<label><input type="checkbox" data-layer="${k}" ${layers.has(k)?'checked':''}>${['Rs','Cs','Teams','Members','Publications','Keywords'][i]}</label>`).join('')}</div><p class="muted">Solid: theme–case / membership · Dashed: team stage · Blue: publication links. ${pubs.length?'':'No publications or keywords have been supplied yet.'}</p><div style="overflow:auto;border:1px solid #e1e8e6;border-radius:12px"><svg id="network-svg" role="img" aria-label="REC² relationship network" viewBox="0 0 ${Math.max(360,kinds.length*170)} ${height}" style="display:block;min-width:${Math.max(360,kinds.length*170)}px;width:100%;background:#fafcfb;touch-action:none">${kinds.map((k,i)=>`<text x="${80+i*170}" y="28" text-anchor="middle" font-size="12" fill="#637378">${e(k)}</text>`).join('')}${es.map((x,i)=>{const a=map.get(x.a),b=map.get(x.b);return `<line data-edge="${i}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${x.label.startsWith('Publication')||x.label==='Authorship'||x.label==='Keyword'?'#386d9c':'#8b9a9b'}" stroke-width="${selected&&(x.a===selected||x.b===selected)?3:1.4}" opacity="${selected&&x.a!==selected&&x.b!==selected?.15:.65}" ${x.label.startsWith('Collaboration')?'stroke-dasharray="6 4"':''}><title>${e(x.label)}</title></line>`;}).join('')}${ns.map(n=>`<g data-node="${e(n.key)}" data-kind="${n.kind}" data-id="${e(n.id)}" transform="translate(${n.x} ${n.y})" tabindex="0" role="button" aria-label="${e(n.id+' '+n.label)}" style="cursor:grab;opacity:${selected&&!neighbors.has(n.key)?.25:1}"><title>${e(n.id+' · '+n.label)}</title><circle r="${n.kind==='theme'?21:16}" fill="${e(n.color)}" stroke="${selected===n.key?'#172b32':'white'}" stroke-width="3"/><text y="4" text-anchor="middle" fill="white" font-size="9">${e(n.id)}</text><text y="36" text-anchor="middle" fill="#26383d" font-size="10">${e(n.label.length>23?n.label.slice(0,21)+'…':n.label)}</text></g>`).join('')}</svg></div>`;
    canvas.querySelectorAll('[data-layer]').forEach(c=>c.onchange=()=>{c.checked?layers.add(c.dataset.layer):layers.delete(c.dataset.layer);render();});
    const svg=$('network-svg');let drag=null,moved=false;
    svg.onpointerdown=event=>{const el=event.target.closest('[data-node]');if(!el)return;drag={el,n:map.get(el.dataset.node),x:event.clientX,y:event.clientY};moved=false;svg.setPointerCapture(event.pointerId);};
    svg.onpointermove=event=>{if(!drag)return;if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>4)moved=true;if(!moved)return;const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse());drag.n.x=point.x;drag.n.y=point.y;drag.el.setAttribute('transform',`translate(${point.x} ${point.y})`);es.forEach((x,i)=>{const line=svg.querySelector(`[data-edge="${i}"]`),a=map.get(x.a),b=map.get(x.b);for(const [key,value]of Object.entries({x1:a.x,y1:a.y,x2:b.x,y2:b.y}))line.setAttribute(key,value);});};
    svg.onpointerup=()=>{if(drag&&!moved)showDetail(drag.n.kind,drag.n.id);drag=null;};
    svg.onpointercancel=()=>{drag=null;};
    svg.querySelectorAll('[data-node]').forEach(el=>el.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();showDetail(el.dataset.kind,el.dataset.id);}});
  }
  function render() {
    document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.view===view)));
    const visibleCases=new Set(filteredCases().map(x=>x.case_id));
    if(view==='graph') {graph();return;}
    if(view==='overview') {const ts=themes.filter(t=>!themeFilter.value||t.theme_id===themeFilter.value);
      canvas.innerHTML=`<div class="rowhead"><div><h2>Project overview</h2><span class="muted">Case studies and RAP themes can have many-to-many links.</span></div><span class="muted">${themes.length} themes · ${cases.length} cases</span></div><div class="map"><div><div class="column-head">RAP themes</div><div class="stack">${ts.map(t=>item('theme',t.theme_id,t.theme_name,`${t.RAP} · ${themeCases(t.theme_id).map(cn).join(', ')||'No case link entered'}`,t.color_hex,!!(q()&&!match(t.theme_name,t.RAP,...themeCases(t.theme_id).map(cn)))||!!(caseFilter.value&&!themeCases(t.theme_id).includes(caseFilter.value)))).join('')}</div></div><div><div class="column-head">Case studies</div><div class="stack">${cases.filter(visible).map(c=>item('case',c.case_id,c.case_name,caseThemes(c.case_id).map(tn).join(' · ')||'No theme link entered','#687a7c',!visibleCases.has(c.case_id))).join('')}</div></div></div>`;
    } else if(view==='network') {const ps=filteredPeople();const co=filteredPubs().filter(p=>pubAuthors(p.publication_id).length>1); const stages=data.collaborationStages.filter(x=>inside(x)&&(!caseFilter.value||x.case_id===caseFilter.value)&&(!themeFilter.value||caseThemes(x.case_id).includes(themeFilter.value))&&match(name(teams,'team_id','team_name',x.team_id),cn(x.case_id),x.state)); const stageCards=stages.map(x=>`<button class="card" data-kind="team" data-id="${e(x.team_id)}"><strong>${e(name(teams,'team_id','team_name',x.team_id))}</strong><p>${e(cn(x.case_id))}<br>${e(x.state)}<br>From ${e(x.start_date)}</p></button>`).join('');
      canvas.innerHTML=`<div class="rowhead"><div><h2>Collaboration</h2><span class="muted">Team stages come from Collaboration stages. Coauthor connections come from publication authors.</span></div></div><h3 style="font-size:13px">Current team involvement</h3><div class="cards">${stageCards||'<div class="empty">No active stages for this quarter.</div>'}</div><h3 style="font-size:13px;margin-top:20px">Members</h3><div class="cards">${ps.map(p=>`<button class="card" data-kind="person" data-id="${e(p.person_id)}"><strong>${e(p.full_name)}</strong><p>${e(name(teams,'team_id','team_name',p.team_id))}<br>${personCases(p.person_id).map(cn).map(e).join(' · ')}</p></button>`).join('')||'<div class="empty">No people match these filters or this quarter.</div>'}</div><h3 style="font-size:13px;margin-top:25px">Coauthor connections</h3>${co.map(p=>`<div class="edge">${pubAuthors(p.publication_id).map(pn).map(e).join(' ↔ ')}<br><strong>${e(p.title)}</strong> · ${e(status(p.publication_id))}</div>`).join('')||'<div class="empty">No coauthored publications recorded for this quarter.</div>'}`;
    } else {const ps=filteredPubs();
      canvas.innerHTML=`<div class="rowhead"><div><h2>Publications and keywords</h2><span class="muted">Browse outputs and recurring keywords.</span></div></div><div class="cards">${ps.map(p=>`<button class="card" data-kind="publication" data-id="${e(p.publication_id)}"><strong>${e(p.title)}</strong><p>${e(status(p.publication_id))}<br>${pubAuthors(p.publication_id).map(pn).map(e).join(', ')}</p></button>`).join('')||'<div class="empty">No publications match these filters or this quarter.</div>'}</div><h3 style="font-size:13px;margin-top:25px">Keywords</h3><div>${[...new Set(ps.flatMap(p=>pubKeywords(p.publication_id)))].map(k=>`<button class="chip" data-kind="keyword" data-id="${e(k)}" style="border:0">${e(name(keywords,'keyword_id','keyword_label',k))}</button>`).join('')||'<span class="muted">No keywords recorded.</span>'}</div>`;
    }
    canvas.querySelectorAll('[data-kind]').forEach(b=>b.addEventListener('click',()=>showDetail(b.dataset.kind,b.dataset.id)));
  }
  function timeline() {
    const now=new Date(), years=[now.getUTCFullYear()];
    for(const set of [cases,teams,people,pubs,...Object.values(data.links),data.publicationStatus]) for(const x of set) for(const k of ['start_date','end_date','first_visible_date','effective_date']) if(x[k]) years.push(Number(String(x[k]).slice(0,4)));
    const start=Math.min(...years), end=Math.max(...years);
    for(let y=start;y<=Math.min(end,start+20);y++)for(let q=1;q<=4;q++){const d=new Date(Date.UTC(y,q*3,0)).toISOString().slice(0,10);quarters.push({label:`${y} Q${q}`,date:d});}
    const current=quarters.findIndex(x=>x.label===`${now.getUTCFullYear()} Q${Math.ceil((now.getUTCMonth()+1)/3)}`);
    const control=$('time');control.min=0;control.max=quarters.length-1;control.value=current>=0?current:quarters.length-1;
    setQuarter(Number(control.value));
  }
  function setQuarter(index) {asOf=quarters[index].date;$('year').textContent=quarters[index].label;if(selection)showDetail(selection.kind,selection.id);render();}
  async function start() {
    try {const response=await fetch('./data.json',{cache:'no-store'});if(!response.ok)throw Error('data.json could not be loaded');data=await response.json();if(data.schemaVersion!==1)throw Error('Unsupported data format');
      themes=data.themes;cases=data.cases;teams=data.teams;people=data.people;pubs=data.publications;keywords=data.keywords;
      themes.forEach(t=>themeFilter.insertAdjacentHTML('beforeend',`<option value="${e(t.theme_id)}">${e(t.RAP)} ${e(t.theme_name)}</option>`));
      cases.forEach(c=>caseFilter.insertAdjacentHTML('beforeend',`<option value="${e(c.case_id)}">${e(c.case_name)}</option>`));
      timeline();
    } catch(error) {canvas.innerHTML=`<div class="empty"><strong>Data unavailable.</strong> Run the spreadsheet converter and serve this folder through a local web server or the published site. ${e(error.message)}</div>`;}
  }
  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;render();}));
  [search,themeFilter,caseFilter].forEach(x=>x.addEventListener(x===search?'input':'change',render));
  $('reset').addEventListener('click',()=>{search.value='';themeFilter.value='';caseFilter.value='';render();});
  $('time').addEventListener('input',event=>setQuarter(Number(event.target.value)));
  start();
})();
