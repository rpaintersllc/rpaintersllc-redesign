// Local presentation only. Priority is a workflow order, never lead verification.
export function selectRecords(rows,{kind='opportunities',search='',review='',source='',freshness='',status='',order='priority',now=Date.now()}={}){
 const needle=search.trim().toLowerCase();
 const time=r=>Date.parse(kind==='leads'?r.created_at:r.published_at||r.created_at)||0;
 return rows.filter(r=>{
  if(kind==='leads'&&status&&r.status!==status)return false;
  if(kind!=='leads'&&review&&r.review_status!==review)return false;
  if(kind!=='leads'&&source&&r.opportunity_kind!==source)return false;
  if(freshness&&(!time(r)||time(r)>now+300000||now-time(r)>Number(freshness)*3600000))return false;
  return !needle||[r.full_name,r.title,r.city,r.service,r.details,r.summary,r.source_name].some(v=>typeof v==='string'&&v.toLowerCase().includes(needle));
 }).sort((a,b)=>{
  if(order==='priority'){
   const rank=r=>kind==='leads'?(r.status==='new'?0:1):r.review_status==='dismissed'?3:r.opportunity_kind==='homeowner_request'?(r.review_status==='unreviewed'?0:1):2;
   const diff=rank(a)-rank(b);if(diff)return diff;
  }
  return (order==='oldest'?1:-1)*(time(a)-time(b))||String(a.id).localeCompare(String(b.id));
 });
}
export function contactLinks(row){
 const phone=String(row.phone||'').replace(/[^0-9]/g,'');
 const normalized=phone.length===10?'1'+phone:phone.length===11&&phone[0]==='1'?phone:'';
 const email=String(row.email||'').trim();
 return {phone:normalized?'+'+normalized:'',email:/^[^\s@?#]+@[^\s@?#]+\.[^\s@?#]+$/.test(email)?email:''};
}
