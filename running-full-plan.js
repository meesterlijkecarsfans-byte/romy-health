// Romy Health: full marathon schedule reader for the Hardlopen tab.
// Checking sessions belongs in Schema; this view is read-only.
(function(){
  const RUN_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="14.5" cy="4.5" r="1.6"/><path d="m10.2 8 3-1.4 2.3 3 3 .8"/><path d="m12.6 8.6-2.1 4 3.4 2.4 1.7 4.5"/><path d="m10.5 12.5-3.1 2.4-2.7 4.2"/></svg>';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=(v,d=1)=>Number.isFinite(Number(v))?Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';

  function isoWeek(date=new Date()){
    const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
    const day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);
    const y0=new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return {year:d.getUTCFullYear(),week:Math.ceil((((d-y0)/86400000)+1)/7)};
  }
  function currentKey(){const x=isoWeek();return `${x.year}-${String(x.week).padStart(2,'0')}`;}
  function isRun(a){const t=`${a?.type||''} ${a?.name||''}`.toLowerCase();return t.includes('run')||t.includes('hardloop');}
  function activityDate(a){return String(a?.date||a?.startTimeLocal||a?.startTime||'').slice(0,10);}
  function weekBounds(year,week){
    const jan4=new Date(Date.UTC(year,0,4)),day=jan4.getUTCDay()||7,mon=new Date(jan4);
    mon.setUTCDate(jan4.getUTCDate()-(day-1)+(week-1)*7);
    const sun=new Date(mon);sun.setUTCDate(mon.getUTCDate()+6);
    return {start:mon.toISOString().slice(0,10),end:sun.toISOString().slice(0,10)};
  }
  function weekKm(plan){
    const b=weekBounds(plan.year,plan.week);
    return (state?.garminActivities||[]).filter(a=>isRun(a)&&activityDate(a)>=b.start&&activityDate(a)<=b.end).reduce((s,a)=>s+(Number(a.distanceKm)||0),0);
  }
  function parseKm(text){const m=String(text||'').match(/(\d+(?:[,.]\d+)?)\s*km/i);return m?Number(m[1].replace(',','.')):0;}
  function plannedKm(plan){return parseKm(plan?.run1)+parseKm(plan?.run2);}
  function short(text){
    const s=String(text||'');
    const parts=s.split('·').map(x=>x.trim()).filter(Boolean);
    return parts.slice(0,2).join(' · ')||s;
  }

  function installStyle(){
    if(document.getElementById('rhFullPlanStyle'))return;
    const s=document.createElement('style');s.id='rhFullPlanStyle';s.textContent=`
      #view-running.rh-clean-view>:not(.rh-full-plan-root){display:none!important}
      .rh-full-plan-root{display:block!important;padding-bottom:10px}.rh-full-plan-root *{box-sizing:border-box}
      .rh-plan-head{background:linear-gradient(145deg,#fff6fa,#ffeaf3);border:1px solid #f6d6e4;border-radius:24px;padding:18px;margin-bottom:14px}
      .rh-plan-head h2{margin:3px 0 5px;font-size:23px}.rh-plan-head p{margin:0;color:var(--rh-muted,#8a828c);font-size:12px;line-height:1.45}
      .rh-plan-weeks{display:grid;gap:10px}.rh-plan-week{background:#fff;border:1px solid var(--rh-line,#eee7ec);border-radius:20px;overflow:hidden}
      .rh-plan-week.current{border-color:#f2b8d0;box-shadow:0 6px 20px rgba(242,91,157,.08)}
      .rh-plan-week-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 15px;border-bottom:1px solid var(--rh-line,#eee7ec)}
      .rh-plan-week-head strong{font-size:16px}.rh-plan-week-head span{font-size:11px;color:var(--rh-muted,#8a828c);text-align:right}.rh-current-pill{display:inline-flex!important;background:var(--rh-soft,#fff0f6);color:var(--rh-pink,#f25b9d)!important;padding:4px 7px;border-radius:999px;margin-left:6px;font-size:9px!important;font-weight:800}
      .rh-plan-session{display:grid;grid-template-columns:38px 1fr;gap:11px;padding:12px 15px;border-top:1px solid #f4eef1}.rh-plan-session:first-of-type{border-top:0}
      .rh-plan-icon{width:38px;height:38px;border-radius:13px;background:var(--rh-soft,#fff0f6);color:var(--rh-pink,#f25b9d);display:grid;place-items:center}.rh-plan-icon svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
      .rh-plan-session strong{display:block;font-size:14px}.rh-plan-session small{display:block;color:var(--rh-muted,#8a828c);font-size:11px;line-height:1.4;margin-top:3px}.rh-plan-session details{margin-top:5px}.rh-plan-session summary{font-size:10px;color:var(--rh-pink,#f25b9d);font-weight:800;cursor:pointer;list-style:none}.rh-plan-session summary::-webkit-details-marker{display:none}.rh-plan-full{font-size:11px;color:#6f6872;line-height:1.5;padding-top:5px}
      .rh-plan-progress{margin-top:12px}.rh-plan-progress-top{display:flex;justify-content:space-between;font-size:11px;color:var(--rh-muted,#8a828c)}.rh-plan-track{height:8px;background:#f3ebef;border-radius:999px;overflow:hidden;margin-top:7px}.rh-plan-track i{display:block;height:100%;background:linear-gradient(90deg,#f47eb3,#f25b9d);border-radius:999px}
    `;document.head.appendChild(s);
  }

  function row(label,text){
    const full=String(text||'');
    return `<div class="rh-plan-session"><span class="rh-plan-icon">${RUN_ICON}</span><div><strong>${esc(label)}</strong><small>${esc(short(full))}</small>${full&&full!==short(full)?`<details><summary>Volledige training</summary><div class="rh-plan-full">${esc(full)}</div></details>`:''}</div></div>`;
  }

  function render(){
    installStyle();
    const view=document.getElementById('view-running');if(!view)return;
    view.classList.add('rh-clean-view');
    let root=view.querySelector(':scope > .rh-full-plan-root');
    if(!root){root=document.createElement('div');root.className='rh-full-plan-root';view.appendChild(root);}
    const plans=typeof marathonPlan!=='undefined'&&Array.isArray(marathonPlan)?marathonPlan:[];
    if(!plans.length){root.innerHTML='<div class="rh-plan-head"><h2>Loopschema</h2><p>Het schema wordt geladen…</p></div>';return;}
    const now=currentKey();
    const current=plans.find(p=>p.key===now) || plans.find(p=>p.key>now) || plans.at(-1);
    const done=current?weekKm(current):0,target=current?plannedKm(current):0,pct=target?Math.min(100,done/target*100):0;
    root.innerHTML=`<section class="rh-plan-head"><p class="rh-kicker" style="margin:0 0 4px">Hardlopen</p><h2>Marathonplan Enschede 2027</h2><p>Je volledige schema op één plek. Afvinken doe je in Schema; hier kijk je alleen wat er gepland staat.</p>${current?`<div class="rh-plan-progress"><div class="rh-plan-progress-top"><span>Deze week gelopen</span><strong>${fmt(done)} / ${fmt(target)} km</strong></div><div class="rh-plan-track"><i style="width:${pct}%"></i></div></div>`:''}</section><div class="rh-plan-weeks">${plans.map(plan=>`<article class="rh-plan-week ${plan.key===current?.key?'current':''}"><header class="rh-plan-week-head"><strong>Week ${plan.week}${plan.key===current?.key?'<span class="rh-current-pill">deze week</span>':''}</strong><span>${esc(plan.range)}</span></header>${row('Tritanium Run',plan.tritanium)}${row('Run 2',plan.run1)}${row('Run 3',plan.run2)}</article>`).join('')}</div>`;
  }

  window.romyRenderFullRunPlan=render;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(render,350));
  else setTimeout(render,80);
  window.addEventListener('load',()=>{setTimeout(render,500);setTimeout(render,1400)});
})();