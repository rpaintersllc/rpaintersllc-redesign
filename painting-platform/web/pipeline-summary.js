// Operational snapshot of loaded requests, not a traffic or acquisition report.
export function isTestProject(project){return /^(BUZZIE TEST\b|PLATFORM SYSTEM TEST\b)/i.test((project.lead?.full_name||'').trim())}
export function pipelineSummary(projects){
 const real=projects.filter(p=>!isTestProject(p));
 const groups=new Map();for(const p of real){const source=(p.lead?.utm_source||p.lead?.source||'Unattributed').trim().slice(0,200)||'Unattributed';const row=groups.get(source)||{source,requests:0,qualified:0,quoted:0,won:0,lost:0};row.requests++;if(p.review?.qualification==='qualified'&&['two_way','authority','scope','coverage','timing'].every(k=>p.review?.qualification_checks?.[k]===true))row.qualified++;if(p.events?.some(e=>e.status==='quoted')||p.lead?.status==='quoted')row.quoted++;if(p.lead?.status==='won')row.won++;if(p.lead?.status==='lost')row.lost++;groups.set(source,row)}
 return {excluded:projects.length-real.length,projects:real,rows:[...groups.values()].sort((a,b)=>b.requests-a.requests||a.source.localeCompare(b.source))};
}
export function renderPipeline(target,projects,el){
 target.replaceChildren();el('h3','Request sources & outcomes',target);const summary=pipelineSummary(projects);el('p','Snapshot of the latest '+projects.length+' loaded projects. '+summary.excluded+' labelled test requests excluded. Sources come from submitted tracking tags and are not independently verified. This is not a visitor conversion rate or a full business report.',target,'small');
 if(!summary.rows.length){el('p','No non-test requests in this snapshot yet.',target,'small');return}
 const wrap=el('div',undefined,target);wrap.style.overflowX='auto';const table=el('table',undefined,wrap);table.setAttribute('aria-label','Loaded request sources and outcomes');const head=el('tr',undefined,el('thead',undefined,table));for(const label of ['Source','Requests','Confirmed qualified','Ever quoted','Booked now','Closed now'])el('th',label,head);const body=el('tbody',undefined,table);for(const row of summary.rows){const tr=el('tr',undefined,body);for(const value of Object.values(row))el('td',String(value),tr)}
}
