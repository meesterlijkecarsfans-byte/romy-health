// Romy Health v2 cockpit: useful Today dashboard + focused Insights.
// Keeps the calm layout, while restoring readiness, fueling, load and intensity information.
(function(){
  const DAY=86400000;
  let applying=false;

  const META={
    kracht1:{name:'Gym 1',icon:'🏋︎',sub:'Krachttraining'},
    tweeslag:{name:'Beachvolleybal',icon:'♡',sub:'Beachvolleybal'},
    zwemmen:{name:'Zwemmen',icon:'≈',sub:'Techniek / herstel'},
    donitas1:{name:'Volleybal 1',icon:'♡',sub:'Volleybaltraining'},
    tritanium:{name:'Tritanium',icon:'⌁',sub:'Kwaliteitstraining'},
    kracht2:{name:'Gym 2',icon:'🏋︎',sub:'Krachttraining'},
    donitas2:{name:'Volleybal 2',icon:'♡',sub:'Volleybaltraining'},
    run1:{name:'Run 1',icon:'⌁',sub:'Rustige loop'},
    run2:{name:'Run 2',icon:'⌁',sub:'Lange duurloop'}
  };

  const FALLBACK_ROUTINE={
    1:{items:['kracht1','tweeslag']},2:{items:['zwemmen','donitas1']},3:{items:['tritanium']},
    4:{items:['kracht2','donitas2']},5:{items:['run1']},6:{items:[]},0:{items:['run2']}
  };

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const fmt=(v,d=0)=>v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d});
  function localKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function shift(d,n){const x=new Date(d);x.setHours(12,0,0,0);x.setDate(x.getDate()+n);return x;}
  function avg(arr){const a=arr.map(Number).filter(Number.isFinite);return a.length?a.reduce((s,x)=>s+x,0)/a.length:null;}
  function isoWeek(date=new Date()){
    const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
    const day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);
    const y0=new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return {year:d.getUTCFullYear(),week:Math.ceil((((d-y0)/DAY)+1)/7)};
  }
  function isoMonday(year,week){const jan4=new Date(Date.UTC(year,0,4)),day=jan4.getUTCDay()||7,d=new Date(jan4);d.setUTCDate(jan4.getUTCDate()-(day-1)+(week-1)*7);return d;}
  function currentPlan(){
    try{const iw=isoWeek();return (window.marathonPlan||marathonPlan||[]).find(p=>p.year===iw.year&&p.week===iw.week)||null;}catch{return null;}
  }
  function routine(){return window.ROMY_WEEKLY_ROUTINE||FALLBACK_ROUTINE;}
  function todayIds(){
    const k=localKey();
    if(Array.isArray(state?.dailyPlans?.[k])) return state.dailyPlans[k];
    return [...(routine()[new Date().getDay()]?.items||[])];
  }
  function detailFor(id,plan=currentPlan()){
    if(!plan)return META[id]?.sub||'';
    if(id==='tritanium')return plan.tritanium||META[id]?.sub||'';
    if(id==='run1')return plan.run1||META[id]?.sub||'';
    if(id==='run2')return plan.run2||META[id]?.sub||'';
    return META[id]?.sub||'';
  }
  function shortDetail(text){
    const s=String(text||'');
    const parts=s.split('·').map(x=>x.trim()).filter(Boolean);
    return parts.slice(0,2).join(' · ')||s;
  }
  function activityDate(a){return String(a?.date||a?.startTimeLocal||a?.startTime||'').slice(0,10);}
  function isRun(a){const t=`${a?.type||''} ${a?.name||''}`.toLowerCase();return t.includes('run')||t.includes('hardloop');}
  function weekBounds(){const iw=isoWeek(),mon=isoMonday(iw.year,iw.week);return {start:mon.toISOString().slice(0,10),end:new Date(mon.getTime()+6*DAY).toISOString().slice(0,10)};}
  function weekRuns(){const b=weekBounds();return (state?.garminActivities||[]).filter(a=>isRun(a)&&activityDate(a)>=b.start&&activityDate(a)<=b.end);}
  function weekKm(){return weekRuns().reduce((s,a)=>s+(Number(a.distanceKm)||0),0);}
  function parseKm(text){const m=String(text||'').match(/(\d+(?:[,.]\d+)?)\s*km/i);return m?Number(m[1].replace(',','.')):0;}
  function plannedRunKm(plan=currentPlan()){
    if(!plan)return 0;
    let total=0;
    if(String(plan.run1||'').toLowerCase().includes('km'))total+=parseKm(plan.run1);
    if(String(plan.run2||'').toLowerCase().includes('km'))total+=parseKm(plan.run2);
    return total;
  }

  function dailyValues(field,start,end){
    return Object.entries(state?.garminDaily||{}).filter(([k])=>k>=start&&k<=end).map(([,v])=>Number(v?.[field])).filter(Number.isFinite);
  }
  function recovery(){
    const now=new Date(),curStart=localKey(shift(now,-6)),curEnd=localKey(now),baseStart=localKey(shift(now,-27)),baseEnd=localKey(shift(now,-7));
    const curSleep=avg(dailyValues('sleepHours',curStart,curEnd)),baseSleep=avg(dailyValues('sleepHours',baseStart,baseEnd));
    const curHrv=avg(dailyValues('hrv',curStart,curEnd)),baseHrv=avg(dailyValues('hrv',baseStart,baseEnd));
    const curRhr=avg(dailyValues('restingHeartRate',curStart,curEnd)),baseRhr=avg(dailyValues('restingHeartRate',baseStart,baseEnd));
    let available=0,flags=0;
    if(curSleep!=null&&baseSleep>0){available++;if(curSleep<baseSleep*.94)flags++;}
    if(curHrv!=null&&baseHrv>0){available++;if(curHrv<baseHrv*.90)flags++;}
    if(curRhr!=null&&baseRhr>0){available++;if(curRhr>baseRhr*1.05)flags++;}
    const latest=Object.entries(state?.garminDaily||{}).map(([date,v])=>({date,h:Number(v?.sleepHours)})).filter(x=>Number.isFinite(x.h)&&x.h>0).sort((a,b)=>a.date.localeCompare(b.date)).at(-1)?.h??null;
    if(available<2)return {label:'Wordt opgebouwd',tone:'neutral',latest,avg7:curSleep,flags};
    if(flags>=2)return {label:'Rustiger aan',tone:'watch',latest,avg7:curSleep,flags};
    if(flags===1)return {label:'Even volgen',tone:'watch',latest,avg7:curSleep,flags};
    return {label:'Goed',tone:'good',latest,avg7:curSleep,flags};
  }
  function load(){
    const s=state?.tredictSnapshot;
    if(s&&Number(s.effortPrev7)>0&&Number.isFinite(Number(s.effort7))){
      const ratio=Number(s.effort7)/Number(s.effortPrev7),delta=(ratio-1)*100;
      const label=ratio>=1.30?'Hoog':ratio>=1.05?'Iets hoger':ratio<=.80?'Rustig':'Prima';
      return {label,ratio,delta,current:Number(s.effort7),previous:Number(s.effortPrev7),source:'Tredict'};
    }
    const b=weekBounds(),rows=(state?.trainingCheckins||[]).filter(x=>String(x.date||'')>=b.start&&String(x.date||'')<=b.end);
    const cur=rows.reduce((s,x)=>s+(Number(x.minutes)||0)*(Number(x.rpe)||0),0);
    return {label:cur?'Opgebouwd':'Wordt opgebouwd',ratio:null,delta:null,current:cur||null,previous:null,source:'sRPE'};
  }
  function readiness(){
    const r=recovery(),l=load(),ids=todayIds();
    let title='Klaar voor training',copy='Je herstel en belasting geven geen duidelijke reden om vooraf af te remmen.';
    if(r.tone==='watch'&&['Hoog','Iets hoger'].includes(l.label)){title='Train gecontroleerd';copy='Herstel en belasting vragen vandaag allebei wat aandacht.';}
    else if(r.tone==='watch'){title='Train op gevoel';copy='Eén of meer herstelsignalen wijken af van je recente patroon.';}
    else if(l.label==='Hoog'){title='Geen extra volume';copy='Je trainingsbelasting ligt duidelijk hoger dan je recente week.';}
    else if(!ids.length){title='Hersteldag';copy='Geen vaste training gepland. Herstel telt ook mee.';}
    return {title,copy,recovery:r,load:l};
  }

  function nutritionAdvice(){
    const ids=todayIds(),key=localKey(),n=state?.nutrition?.[key],hard=ids.includes('tritanium')||ids.includes('run2')||ids.some(x=>/donitas|tweeslag/.test(x)),strength=ids.some(x=>x==='kracht1'||x==='kracht2'),double=ids.length>=2;
    let main='Eet normaal verdeeld over de dag en zorg dat elke hoofdmaaltijd eiwit bevat.';
    let sub='Hydratatie en regelmaat zijn vandaag belangrijker dan extra sportvoeding.';
    if(double){main='Dubbele trainingsdag: geef koolhydraten prioriteit tussen je sessies.';sub='Neem na de eerste training ook 25–35 g eiwit en drink voldoende.';}
    else if(hard){main='Voor je training: kies een koolhydraatrijke maaltijd of snack die je goed verdraagt.';sub='Na afloop: 25–35 g eiwit + koolhydraten voor herstel.';}
    else if(ids.includes('run1')){main='Voor deze rustige run hoef je niet speciaal te laden.';sub='Een normale maaltijd of kleine koolhydraatsnack is genoeg; neem later weer eiwit.';}
    else if(strength){main='Rond je krachttraining: normale koolhydraten en 25–35 g eiwit erna.';sub='Je totale daginname is belangrijker dan perfecte timing.';}
    if(!ids.length){main='Rustdag: houd je voeding gewoon regelmatig en eiwitrijk.';sub='Je hoeft koolhydraten niet bewust laag te houden; herstel kost ook energie.';}
    const logged=n?`${fmt(n.calories)} kcal · ${fmt(n.protein)} g eiwit gelogd`:null;
    return {main,sub,logged};
  }

  function weekTrainingMinutes(){const b=weekBounds();return (state?.trainingCheckins||[]).filter(x=>String(x.date||'')>=b.start&&String(x.date||'')<=b.end).reduce((s,x)=>s+(Number(x.minutes)||0),0);}
  function strengthCount(){const p=currentPlan();try{const c=p&&typeof checklistFor==='function'?checklistFor(p):{};return (c.kracht1?1:0)+(c.kracht2?1:0);}catch{return 0;}}
  function intensity(){
    const d=state?.tredictSnapshot?.runningIntensity||{};
    const total=Number(d.low||0)+Number(d.medium||0)+Number(d.high||0);
    if(!total)return {low:0,medium:0,high:0,available:false};
    return {low:Number(d.low)/total*100,medium:Number(d.medium)/total*100,high:Number(d.high)/total*100,available:true};
  }
  function weeklyKmSeries(n=5){
    const iw=isoWeek(),curMon=isoMonday(iw.year,iw.week),out=[];
    for(let i=n-1;i>=0;i--){const mon=new Date(curMon);mon.setUTCDate(mon.getUTCDate()-7*i);const start=mon.toISOString().slice(0,10),end=new Date(mon.getTime()+6*DAY).toISOString().slice(0,10);const km=(state?.garminActivities||[]).filter(a=>isRun(a)&&activityDate(a)>=start&&activityDate(a)<=end).reduce((s,a)=>s+(Number(a.distanceKm)||0),0);const w=isoWeek(new Date(`${start}T12:00:00`));out.push({label:`W${w.week}`,km,current:i===0});}return out;
  }
  function notable(){
    const l=load(),r=recovery(),z=intensity(),items=[];
    if(l.delta!=null)items.push(`Belasting is ${Math.abs(l.delta).toFixed(0)}% ${l.delta>=0?'hoger':'lager'} dan de vorige 7 dagen.`);
    if(z.available)items.push(`${fmt(z.low)}% van je loopintensiteit zit laag, ${fmt(z.medium)}% midden en ${fmt(z.high)}% hoog.`);
    if(r.avg7!=null)items.push(`Gemiddelde slaap laatste 7 dagen: ${fmt(r.avg7,1)} uur.`);
    return items.slice(0,3);
  }

  function style(){
    if(document.getElementById('rhMeaningfulV2Style'))return;
    const s=document.createElement('style');s.id='rhMeaningfulV2Style';s.textContent=`
      .rh-ready-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.rh-ready-badge{padding:7px 10px;border-radius:999px;background:#fff;color:var(--rh-pink);font-size:10px;font-weight:850;white-space:nowrap}
      .rh-food-copy{display:grid;gap:5px}.rh-food-copy strong{font-size:14px;line-height:1.35}.rh-food-copy span{font-size:12px;color:var(--rh-muted);line-height:1.45}.rh-food-log{margin-top:10px;padding-top:10px;border-top:1px solid var(--rh-line);font-size:11px;color:var(--rh-muted)}
      .rh-load-card{display:grid;gap:12px}.rh-load-row{display:flex;justify-content:space-between;align-items:end;gap:12px}.rh-load-row strong{font-size:27px}.rh-load-delta{font-size:12px;font-weight:800;color:var(--rh-pink)}
      .rh-zonebar{display:flex;height:14px;border-radius:999px;overflow:hidden;background:#f2edf0}.rh-zonebar i:nth-child(1){background:#efb8cf}.rh-zonebar i:nth-child(2){background:#f28ab6}.rh-zonebar i:nth-child(3){background:#d94e86}.rh-zonelegend{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px}.rh-zonelegend span{font-size:10px;color:var(--rh-muted)}.rh-zonelegend b{display:block;font-size:14px;color:var(--rh-ink);margin-bottom:2px}
      .rh-note-list{display:grid;gap:0}.rh-note-list div{padding:11px 0;border-top:1px solid var(--rh-line);font-size:12px;line-height:1.4}.rh-note-list div:first-child{border-top:0}
    `;document.head.appendChild(s);
  }

  function renderTodayV2(){
    const root=document.querySelector('#view-today .rh-clean-root');if(!root)return;
    const rd=readiness(),ids=todayIds(),plan=currentPlan(),food=nutritionAdvice(),km=weekKm(),target=plannedRunKm(plan),pct=target?clamp(km/target*100,0,100):0;
    const sessions=ids.length?ids.map(id=>`<div class="rh-session"><span class="rh-session-icon">${META[id]?.icon||'•'}</span><div class="rh-session-main"><strong>${esc(META[id]?.name||id)}</strong><span>${esc(shortDetail(detailFor(id,plan)))}</span></div></div>`).join(''):`<div class="rh-session"><span class="rh-session-icon">♡</span><div class="rh-session-main"><strong>Geen vaste training</strong><span>Herstel en bewegen op gevoel</span></div></div>`;
    root.innerHTML=`
      <article class="rh-card rh-soft-card"><div class="rh-ready-head"><div><p class="rh-kicker">Training readiness</p><h2>${esc(rd.title)}</h2><p class="rh-muted" style="margin:6px 0 0">${esc(rd.copy)}</p></div><span class="rh-ready-badge">${esc(rd.recovery.label)}</span></div><div class="rh-readiness"><div class="rh-mini"><b>Slaap</b><strong>${rd.recovery.latest==null?'—':`${fmt(rd.recovery.latest,1)} u`}</strong></div><div class="rh-mini"><b>Belasting</b><strong>${esc(rd.load.label)}</strong></div><div class="rh-mini"><b>Herstel</b><strong>${esc(rd.recovery.label)}</strong></div></div></article>
      <div class="rh-section-title"><h2>Vandaag gepland</h2></div><div class="rh-planned">${sessions}</div>
      <article class="rh-card rh-soft-card" style="margin-top:12px"><p class="rh-kicker">Eetadvies vandaag</p><div class="rh-focus"><span class="rh-focus-icon">◉</span><div class="rh-food-copy"><strong>${esc(food.main)}</strong><span>${esc(food.sub)}</span></div></div>${food.logged?`<div class="rh-food-log">Vandaag: ${esc(food.logged)}</div>`:''}</article>
      <article class="rh-card"><div class="rh-topline"><div><p class="rh-kicker" style="margin-bottom:3px">Kilometers deze week</p><strong>${fmt(km,1)} / ${fmt(target,1)} km</strong></div><span class="rh-muted">${weekRuns().length} run${weekRuns().length===1?'':'s'}</span></div><div class="rh-progress"><i style="width:${pct}%"></i></div></article>`;
  }

  function renderInsightsV2(){
    const root=document.querySelector('#view-progress .rh-clean-root');if(!root)return;
    const r=recovery(),l=load(),z=intensity(),km=weekKm(),mins=weekTrainingMinutes(),strength=strengthCount(),series=weeklyKmSeries(),max=Math.max(1,...series.map(x=>x.km)),notes=notable();
    const bars=series.map(x=>`<div class="rh-bar-col"><i class="rh-bar ${x.current?'current':''}" style="height:${Math.max(4,x.km/max*100)}%"></i><span class="rh-bar-label">${x.label}</span></div>`).join('');
    const delta=l.delta==null?'Nog geen vergelijking':`${l.delta>=0?'+':''}${fmt(l.delta)}% vs vorige 7d`;
    root.innerHTML=`
      <div class="rh-insight-grid"><article class="rh-stat"><b>Kilometers</b><strong>${fmt(km,1)} km</strong><small>deze week</small></article><article class="rh-stat"><b>Trainingstijd</b><strong>${fmt(mins)} min</strong><small>gelogd</small></article><article class="rh-stat"><b>Slaap gem.</b><strong>${r.avg7==null?'—':`${fmt(r.avg7,1)} u`}</strong><small>laatste 7 d</small></article></div>
      <article class="rh-card rh-load-card" style="margin-top:12px"><div class="rh-load-row"><div><p class="rh-kicker">Trainingsbelasting</p><h3>${esc(l.label)}</h3></div><div style="text-align:right"><strong>${fmt(l.current)}</strong><div class="rh-load-delta">${esc(delta)}</div></div></div><p class="rh-muted" style="margin:0">${l.source==='Tredict'?'Tredict effort over de laatste 7 dagen. Gebruik vooral de trend, niet het absolute getal.':'Gebaseerd op je gelogde session-RPE.'}</p></article>
      <article class="rh-card"><div class="rh-topline"><div><p class="rh-kicker">Loopintensiteit</p><h3>Verdeling laag · midden · hoog</h3></div></div>${z.available?`<div class="rh-zonebar"><i style="width:${z.low}%"></i><i style="width:${z.medium}%"></i><i style="width:${z.high}%"></i></div><div class="rh-zonelegend"><span><b>${fmt(z.low)}%</b>Laag</span><span><b>${fmt(z.medium)}%</b>Midden</span><span><b>${fmt(z.high)}%</b>Hoog</span></div>`:'<p class="rh-muted">Nog geen intensiteitsverdeling beschikbaar.</p>'}<p class="rh-muted" style="margin:11px 0 0">Dit is de huidige Tredict-verdeling voor hardlopen; geen exacte Garmin hartslagzone-tijd.</p></article>
      <article class="rh-card"><div class="rh-topline"><div><p class="rh-kicker">Hardlopen</p><h3>Kilometers per week</h3></div><span class="rh-muted">${strength}× kracht</span></div><div class="rh-bars">${bars}</div></article>
      <article class="rh-card"><p class="rh-kicker">Wat valt op?</p><div class="rh-note-list">${notes.length?notes.map(x=>`<div>${esc(x)}</div>`).join(''):'<div>Nog te weinig gekoppelde data voor een betrouwbare trend.</div>'}</div></article>`;
  }

  function apply(){
    if(applying)return;applying=true;style();
    try{renderTodayV2();renderInsightsV2();}catch(err){console.warn('Romy dashboard insights v2',err);}
    applying=false;
  }

  ['view-today','view-progress'].forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    new MutationObserver(()=>{if(!applying)requestAnimationFrame(apply);}).observe(el,{childList:true,subtree:true});
  });
  const prev=window.romyMinimalRefresh;
  if(typeof prev==='function')window.romyMinimalRefresh=function(){const r=prev.apply(this,arguments);setTimeout(apply,0);return r;};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,450));else setTimeout(apply,100);
  window.addEventListener('load',()=>{setTimeout(apply,600);setTimeout(apply,1500);});
})();