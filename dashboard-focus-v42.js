// Romy Health v42 — focused Today + simple Insights.
// Today: readiness, nutrition advice, running progress.
// Insights: 7-day sleep, 7-day load, all-sport HR intensity, running volume.
(function(){
  'use strict';
  if(window.__romyDashboardFocusV42)return;
  window.__romyDashboardFocusV42=true;
  const DAY=86400000;
  const TREDICT_FALLBACK={
    date:'2026-10-30',fitness:1258,fatigue:822,performance:444,
    effort7:649,effortPrev7:617,
    hrv:84,hrvBaseline:85,
    sleep7:8.1,sleepBaseline:7.7,
    allIntensity:{low:27422,medium:2036,high:342},
    note:'Tredict all-sport snapshot 30-10-2026'
  };
  const fmt=(v,d=0)=>v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d});
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function localKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function snapshot(){
    const s=(typeof state!=='undefined'&&state?.tredictSnapshot)||{};
    const newer=String(s.date||'')>TREDICT_FALLBACK.date;
    const base=newer?s:TREDICT_FALLBACK;
    return {...TREDICT_FALLBACK,...base,...s,
      allIntensity:s.allIntensity||TREDICT_FALLBACK.allIntensity,
      sleep7:Number.isFinite(Number(s.sleep7))?Number(s.sleep7):TREDICT_FALLBACK.sleep7,
      sleepBaseline:Number.isFinite(Number(s.sleepBaseline))?Number(s.sleepBaseline):TREDICT_FALLBACK.sleepBaseline,
      hrv:Number.isFinite(Number(s.hrv))?Number(s.hrv):TREDICT_FALLBACK.hrv,
      hrvBaseline:Number.isFinite(Number(s.hrvBaseline))?Number(s.hrvBaseline):TREDICT_FALLBACK.hrvBaseline
    };
  }
  function persistFreshSnapshot(){
    try{
      if(typeof state==='undefined')return;
      if(String(state?.tredictSnapshot?.date||'')>=TREDICT_FALLBACK.date)return;
      state.tredictSnapshot={...(state.tredictSnapshot||{}),...TREDICT_FALLBACK};
      localStorage.setItem('romy-health-local-v1',JSON.stringify(state));
    }catch{}
  }
  function garminSleep7(){
    try{
      const rows=Object.entries(state?.garminDaily||{}).map(([date,v])=>({date,h:Number(v?.sleepHours)})).filter(x=>Number.isFinite(x.h)&&x.h>0).sort((a,b)=>a.date.localeCompare(b.date)).slice(-7);
      return rows.length>=4?rows.reduce((s,x)=>s+x.h,0)/rows.length:null;
    }catch{return null;}
  }
  function sleep7(){return garminSleep7()??snapshot().sleep7;}
  function readiness(){
    const s=snapshot(),sl=sleep7(),sleepBase=Number(s.sleepBaseline)||7.7,hrv=Number(s.hrv),hrvBase=Number(s.hrvBaseline),loadRatio=Number(s.effortPrev7)>0?Number(s.effort7)/Number(s.effortPrev7):1;
    let score=0;
    if(sl>=sleepBase-.25)score++; else if(sl<sleepBase-.75)score--;
    if(hrvBase>0&&hrv>=hrvBase*.93)score++; else if(hrvBase>0&&hrv<hrvBase*.85)score--;
    if(loadRatio<=1.15)score++; else if(loadRatio>1.30)score--;
    if(score>=2)return {label:'Goed',copy:'Je herstel en recente belasting geven geen duidelijke reden om af te remmen.',tone:'good',loadRatio};
    if(score<=-1)return {label:'Rustiger aan',copy:'Herstel en belasting vragen vandaag wat extra aandacht.',tone:'watch',loadRatio};
    return {label:'Op gevoel',copy:'Je signalen zijn gemengd. Train normaal, maar houd ruimte om bij te sturen.',tone:'neutral',loadRatio};
  }
  function nutritionAdvice(){
    const r=readiness(),today=state?.nutrition?.[localKey()]||null;
    let main='Eet normaal verdeeld over de dag. Rond een training zijn koolhydraten vooraf en 25–35 g eiwit erna een goede basis.';
    if(r.loadRatio>1.15)main='Je trainingsbelasting ligt wat hoger: wees vandaag niet zuinig met koolhydraten en neem na training 25–35 g eiwit.';
    if(r.label==='Rustiger aan')main='Focus vandaag op herstel: voldoende energie, vocht en eiwit; probeer niet bewust laag in koolhydraten te eten.';
    const logged=today?`${fmt(today.calories)} kcal · ${fmt(today.protein)} g eiwit gelogd`:'Nog geen voeding voor vandaag gelogd.';
    return {main,logged};
  }
  function isRun(a){const t=`${a?.type||''} ${a?.name||''}`.toLowerCase();return t.includes('run')||t.includes('hardloop');}
  function activityDate(a){return String(a?.date||a?.startTimeLocal||a?.startTime||'').slice(0,10);}
  function weekBounds(offset=0){const n=new Date();n.setHours(12,0,0,0);const dow=n.getDay()||7;const mon=new Date(n);mon.setDate(n.getDate()-(dow-1)+offset*7);const sun=new Date(mon);sun.setDate(mon.getDate()+6);return {start:localKey(mon),end:localKey(sun)};}
  function weekKm(offset=0){const b=weekBounds(offset);return (state?.garminActivities||[]).filter(a=>isRun(a)&&activityDate(a)>=b.start&&activityDate(a)<=b.end).reduce((s,a)=>s+(Number(a.distanceKm)||0),0);}
  function parseKm(text){const m=String(text||'').match(/(\d+(?:[,.]\d+)?)\s*km/i);return m?Number(m[1].replace(',','.')):0;}
  function currentPlan(){
    try{const iw=typeof currentIsoWeek==='function'?currentIsoWeek():null;const list=Array.isArray(marathonPlan)?marathonPlan:[];return iw?list.find(p=>p.year===iw.year&&p.week===iw.week)||null:null;}catch{return null;}
  }
  function plannedKm(){const p=currentPlan();return p?parseKm(p.tritanium)+parseKm(p.run1)+parseKm(p.run2):0;}
  function intensity(){
    const d=snapshot().allIntensity||{};const total=Number(d.low||0)+Number(d.medium||0)+Number(d.high||0);
    return total?{low:Number(d.low)/total*100,medium:Number(d.medium)/total*100,high:Number(d.high)/total*100,total}: {low:0,medium:0,high:0,total:0};
  }
  function installStyle(){
    if(document.getElementById('r42style'))return;
    const s=document.createElement('style');s.id='r42style';s.textContent=`
      .r42-root{padding-bottom:8px}.r42-card{background:#fff;border:1px solid var(--r38line,#eee7ec);border-radius:24px;padding:18px;margin-bottom:12px;box-shadow:0 7px 24px rgba(48,28,40,.035)}
      .r42-soft{background:linear-gradient(145deg,#fff7fa,#ffeef6);border-color:#f7d7e5}.r42-kicker{margin:0 0 6px;font-size:10px;text-transform:uppercase;letter-spacing:.13em;font-weight:850;color:#8a828c}.r42-title{font-size:22px;margin:0 0 5px}.r42-copy{font-size:12px;line-height:1.5;color:#8a828c;margin:0}.r42-badge{display:inline-flex;border-radius:999px;background:#fff;padding:7px 11px;color:#f05d9d;font-size:11px;font-weight:850}.r42-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.r42-mini{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}.r42-mini div{border:1px solid #f5dce6;border-radius:17px;padding:10px;background:rgba(255,255,255,.78)}.r42-mini small{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#8a828c;font-weight:800}.r42-mini strong{display:block;margin-top:4px;font-size:15px}.r42-progress{height:10px;background:#f2ebef;border-radius:999px;overflow:hidden;margin-top:11px}.r42-progress i{display:block;height:100%;background:linear-gradient(90deg,#f58ab8,#f05d9d);border-radius:999px}.r42-zonebar{display:flex;height:15px;border-radius:999px;overflow:hidden;background:#f2edf0;margin:14px 0 10px}.r42-zonebar i:nth-child(1){background:#efb8cf}.r42-zonebar i:nth-child(2){background:#f28ab6}.r42-zonebar i:nth-child(3){background:#d94e86}.r42-zones{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.r42-zones div{font-size:10px;color:#8a828c}.r42-zones b{display:block;font-size:17px;color:#242129;margin-bottom:2px}.r42-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}.r42-stat{background:#fff;border:1px solid var(--r38line,#eee7ec);border-radius:19px;padding:13px 10px}.r42-stat small{display:block;color:#8a828c;font-size:9px;text-transform:uppercase;letter-spacing:.07em}.r42-stat strong{display:block;font-size:18px;margin-top:5px}.r42-bars{display:flex;align-items:end;gap:10px;height:105px;margin:12px 0 20px}.r42-barcol{flex:1;height:100%;display:flex;align-items:end;position:relative}.r42-barcol i{width:100%;min-height:3px;border-radius:8px 8px 3px 3px;background:#f4d4e2}.r42-barcol.current i{background:linear-gradient(#f58ab8,#f05d9d)}.r42-barcol span{position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);font-size:9px;color:#8a828c}.r42-note{font-size:11px;color:#8a828c;line-height:1.45;margin:9px 0 0}
    `;document.head.appendChild(s);
  }
  function renderToday(){
    const view=document.getElementById('view-today');if(!view)return;
    const r=readiness(),s=snapshot(),sl=sleep7(),food=nutritionAdvice(),km=weekKm(),goal=plannedKm(),pct=goal?clamp(km/goal*100,0,100):0;
    const loadDelta=Number(s.effortPrev7)>0?(Number(s.effort7)/Number(s.effortPrev7)-1)*100:null;
    view.innerHTML=`<div class="r42-root">
      <section class="r42-card r42-soft"><div class="r42-top"><div><p class="r42-kicker">Training readiness</p><h2 class="r42-title">${r.label}</h2><p class="r42-copy">${r.copy}</p></div><span class="r42-badge">Vandaag</span></div><div class="r42-mini"><div><small>Slaap · 7d</small><strong>${fmt(sl,1)} u</strong></div><div><small>HRV</small><strong>${fmt(s.hrv)} / ${fmt(s.hrvBaseline)}</strong></div><div><small>Belasting</small><strong>${loadDelta==null?'—':`${loadDelta>=0?'+':''}${fmt(loadDelta)}%`}</strong></div></div></section>
      <section class="r42-card"><p class="r42-kicker">Eetadvies</p><h3 style="margin:0 0 7px;font-size:17px">Voed je training en herstel</h3><p class="r42-copy" style="color:#242129">${food.main}</p><p class="r42-note">${food.logged}</p></section>
      <section class="r42-card"><div class="r42-top"><div><p class="r42-kicker">Hardloopprogressie</p><h3 style="margin:0;font-size:18px">${fmt(km,1)} / ${goal?fmt(goal,1):'—'} km</h3></div><span class="r42-badge">Deze week</span></div><div class="r42-progress"><i style="width:${pct}%"></i></div><p class="r42-note">Alle geregistreerde hardloopkilometers van deze week.</p></section>
    </div>`;
  }
  function renderInsights(){
    const view=document.getElementById('view-progress');if(!view)return;
    const s=snapshot(),sl=sleep7(),z=intensity(),delta=Number(s.effortPrev7)>0?(Number(s.effort7)/Number(s.effortPrev7)-1)*100:null,series=[-4,-3,-2,-1,0].map(o=>weekKm(o)),mx=Math.max(...series,1);
    const loadLabel=delta==null?'Wordt opgebouwd':Math.abs(delta)<=10?'Vrij stabiel':delta>10?'Hoger':'Lager';
    view.innerHTML=`<div class="r42-root"><div style="margin-bottom:16px"><p class="r42-kicker">Overzicht</p><h2 class="r42-title">Inzichten</h2><p class="r42-copy">Alleen de trends die helpen om je training bij te sturen.</p></div>
      <div class="r42-stats"><div class="r42-stat"><small>Slaap · 7d</small><strong>${fmt(sl,1)} u</strong></div><div class="r42-stat"><small>Belasting</small><strong>${delta==null?'—':`${delta>=0?'+':''}${fmt(delta)}%`}</strong></div><div class="r42-stat"><small>Hardlopen</small><strong>${fmt(weekKm(),1)} km</strong></div></div>
      <section class="r42-card"><p class="r42-kicker">Intensity distribution · alle sporten</p><h3 style="margin:0;font-size:18px">Laag / midden / hoog</h3><div class="r42-zonebar"><i style="width:${z.low}%"></i><i style="width:${z.medium}%"></i><i style="width:${z.high}%"></i></div><div class="r42-zones"><div><b>${fmt(z.low)}%</b>Laag</div><div><b>${fmt(z.medium)}%</b>Midden</div><div><b>${fmt(z.high)}%</b>Hoog</div></div><p class="r42-note">Opgeteld over al je trainingen in Tredict, op basis van hartslag. Zo tellen hardlopen, volleybal, zwemmen en andere sporten samen mee.</p></section>
      <section class="r42-card"><div class="r42-top"><div><p class="r42-kicker">Trainingsbelasting · 7 dagen</p><h3 style="margin:0;font-size:18px">${loadLabel}</h3></div><span class="r42-badge">${delta==null?'—':`${delta>=0?'+':''}${fmt(delta)}%`}</span></div><p class="r42-copy" style="margin-top:8px">Tredict effort ${fmt(s.effort7)} tegenover ${fmt(s.effortPrev7)} in de 7 dagen ervoor.</p></section>
      <section class="r42-card"><p class="r42-kicker">Hardloopvolume</p><h3 style="margin:0;font-size:18px">Kilometers per week</h3><div class="r42-bars">${series.map((v,i)=>`<div class="r42-barcol ${i===series.length-1?'current':''}"><i style="height:${Math.max(3,v/mx*100)}%"></i><span>${i===series.length-1?'Nu':`-${series.length-1-i}`}</span></div>`).join('')}</div></section>
    </div>`;
  }
  function apply(){installStyle();persistFreshSnapshot();renderToday();renderInsights();}
  function hook(){
    const base=window.romyV38Refresh;
    if(typeof base==='function'&&!base._r42){
      const wrapped=function(){const out=base.apply(this,arguments);setTimeout(apply,0);return out;};wrapped._r42=true;window.romyV38Refresh=wrapped;
    }
    document.querySelectorAll('.bottom-nav .nav-item').forEach(btn=>{if(btn.dataset.r42)return;btn.dataset.r42='1';btn.addEventListener('click',()=>setTimeout(apply,20));});
  }
  function init(){hook();apply();setTimeout(()=>{hook();apply();},500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  window.addEventListener('pageshow',()=>setTimeout(apply,0));
})();