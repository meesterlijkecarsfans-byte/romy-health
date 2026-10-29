// Fixed weekly routine + safe run matching for Romy Health.
(function(){
  const DAY=86400000;
  const ROUTINE={
    1:{label:'Maandag',items:['kracht1','tweeslag'],text:'Gym 1 · Beachvolleybal 1'},
    2:{label:'Dinsdag',items:['zwemmen','donitas1'],text:'Zwemmen · Volleybal 1'},
    3:{label:'Woensdag',items:['tritanium'],text:'Tritanium hardlopen'},
    4:{label:'Donderdag',items:['kracht2','donitas2'],text:'Gym 2 · Donitas 2'},
    5:{label:'Vrijdag',items:['run1'],text:'Run 1'},
    6:{label:'Zaterdag',items:[],text:'Volleybalwedstrijd of rustdag'},
    0:{label:'Zondag',items:['run2'],text:'Run 2'}
  };
  window.ROMY_WEEKLY_ROUTINE=ROUTINE;

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function localKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function activityDate(a){return String(a?.date||a?.startTimeLocal||a?.startTime||'').slice(0,10);}
  function isRun(a){const t=`${a?.type||''} ${a?.name||''}`.toLowerCase();return t.includes('run')||t.includes('hardloop');}
  function fmt(v,d=1){return v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d});}
  function parseKm(text){const m=String(text||'').match(/(\d+(?:[,.]\d+)?)\s*km/i);return m?Number(m[1].replace(',','.')):null;}
  function parsePaceRange(text){const m=String(text||'').match(/(\d:\d{2})\s*[–-]\s*(\d:\d{2})\s*\/km/i);return m?{from:m[1],to:m[2]}:null;}
  function paceToSec(p){const m=String(p||'').match(/(\d+):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):null;}
  function secToPace(sec){if(!Number.isFinite(sec)||sec<=0)return '—';const m=Math.floor(sec/60),s=Math.round(sec%60);return `${m}:${String(s).padStart(2,'0')}/km`;}

  function isoWeekMonday(year,week){
    const jan4=new Date(Date.UTC(year,0,4));
    const day=jan4.getUTCDay()||7;
    const monday=new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate()-(day-1)+(week-1)*7);
    return monday;
  }
  function dateAtOffset(year,week,offset){const d=isoWeekMonday(year,week);d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);}
  function dayDistance(a,b){return Math.abs((new Date(`${a}T12:00:00Z`)-new Date(`${b}T12:00:00Z`))/DAY);}
  function weekdayLabel(key){return new Intl.DateTimeFormat('nl-NL',{weekday:'short',day:'numeric',month:'short'}).format(new Date(`${key}T12:00:00`)).replace('.','');}

  function applyActivityNames(){
    if(typeof EXTRA_WEEKLY_ACTIVITIES==='undefined'||!Array.isArray(EXTRA_WEEKLY_ACTIVITIES)) return;
    const meta={
      kracht1:{name:'Gym 1',day:'Maandag'},
      tweeslag:{name:'Beachvolleybal 1',day:'Maandag'},
      zwemmen:{name:'Zwemmen',day:'Dinsdag'},
      donitas1:{name:'Volleybal 1',day:'Dinsdag'},
      tritanium:{name:'Tritanium',day:'Woensdag'},
      kracht2:{name:'Gym 2',day:'Donderdag'},
      donitas2:{name:'Donitas 2',day:'Donderdag'},
      run1:{name:'Run 1',day:'Vrijdag'},
      run2:{name:'Run 2',day:'Zondag'}
    };
    EXTRA_WEEKLY_ACTIVITIES.forEach(item=>{
      const m=meta[item.id]; if(!m||item._routineApplied) return;
      const oldHint=item.hint;
      item.name=m.name;
      item.hint=plan=>`${m.day} · ${typeof oldHint==='function'?oldHint(plan):oldHint||''}`;
      item._routineApplied=true;
    });
  }

  function installTodayDefaults(){
    state.dailyPlans ||= {};
    const key=localKey();
    if(Object.prototype.hasOwnProperty.call(state.dailyPlans,key)) return;
    const dow=new Date(`${key}T12:00:00`).getDay();
    state.dailyPlans[key]=[...(ROUTINE[dow]?.items||[])];
    try{saveState();}catch{}
  }

  function renderRoutineCard(){
    const groups=document.getElementById('trainingGroups'); if(!groups) return;
    let card=document.getElementById('weeklyRoutineCard');
    if(!card){groups.insertAdjacentHTML('beforebegin','<section id="weeklyRoutineCard" class="smart-card" style="margin-bottom:14px"></section>');card=document.getElementById('weeklyRoutineCard');}
    const order=[1,2,3,4,5,6,0];
    card.innerHTML=`<p class="eyebrow">Vaste weekindeling</p><h3>Standaard trainingsweek</h3><p>Deze dagen worden gebruikt voor Vandaag gepland én voor het koppelen van hardloopactiviteiten. Handmatige keuzes voor een specifieke dag blijven leidend.</p><div style="display:grid;gap:7px;margin-top:12px">${order.map(d=>`<div style="display:flex;justify-content:space-between;gap:12px;padding:9px 11px;border:1px solid var(--line);border-radius:13px"><strong style="font-size:12px">${ROUTINE[d].label}</strong><span style="font-size:11px;color:var(--muted);text-align:right">${ROUTINE[d].text}</span></div>`).join('')}</div>`;
  }

  function expectedOffset(plan,key){
    const text=String(plan?.[key]||'').toLowerCase();
    const named=[['maandag',0],['dinsdag',1],['woensdag',2],['donderdag',3],['vrijdag',4],['zaterdag',5],['zondag',6]];
    const explicit=named.find(([name])=>text.includes(name));
    if(explicit) return explicit[1];
    return key==='tritanium'?2:key==='run1'?4:6;
  }

  function matchWeekRuns(plan){
    if(!plan) return [];
    const start=dateAtOffset(plan.year,plan.week,0),end=dateAtOffset(plan.year,plan.week,6);
    const runs=(state.garminActivities||[]).filter(a=>isRun(a)&&activityDate(a)>=start&&activityDate(a)<=end).map((a,index)=>({a,index,date:activityDate(a),km:Number(a.distanceKm)||0}));
    const slots=[
      {key:'tritanium',label:'Tritanium',text:plan.tritanium,targetKm:null},
      {key:'run1',label:'Run 1',text:plan.run1,targetKm:parseKm(plan.run1)},
      {key:'run2',label:'Run 2',text:plan.run2,targetKm:parseKm(plan.run2)}
    ].map(s=>({...s,expected:dateAtOffset(plan.year,plan.week,expectedOffset(plan,s.key)),best:null}));
    const used=new Set();

    function choose(slot,exact){
      let best=null,bestScore=Infinity;
      runs.forEach(r=>{
        if(used.has(r.index)) return;
        const dd=dayDistance(r.date,slot.expected);
        if(exact?dd!==0:dd>1) return;
        const distancePenalty=slot.targetKm&&r.km>0?Math.abs(r.km-slot.targetKm)/slot.targetKm*10:0;
        const score=dd*100+distancePenalty;
        if(score<bestScore){bestScore=score;best=r;}
      });
      if(best){slot.best=best;used.add(best.index);}
    }
    slots.forEach(s=>choose(s,true));
    slots.filter(s=>!s.best).forEach(s=>choose(s,false));
    return slots;
  }

  function runStatus(slot){
    if(!slot.best) return {label:'Niet gekoppeld',detail:`Verwacht ${weekdayLabel(slot.expected)}`};
    const dd=dayDistance(slot.best.date,slot.expected);
    if(slot.key==='tritanium') return {label:dd===0?'Tritanium gekoppeld':'Dag verschoven',detail:`${weekdayLabel(slot.best.date)} · ${fmt(slot.best.km,1)} km`};
    const diff=slot.targetKm&&slot.best.km?Math.abs(slot.best.km-slot.targetKm)/slot.targetKm:null;
    const seconds=Number(slot.best.a.durationSeconds),actualPace=seconds>0&&slot.best.km>0?seconds/slot.best.km:null;
    let label=diff!=null&&diff<=.10?'Afstand goed':'Afstand wijkt af';
    const pace=parsePaceRange(slot.text);
    if(actualPace&&pace){const a=paceToSec(pace.from),b=paceToSec(pace.to);if(a&&b){const fast=Math.min(a,b),slow=Math.max(a,b);if(actualPace<fast-8)label='Sneller dan gepland';else if(actualPace>slow+12)label='Rustiger dan gepland';}}
    if(dd===1) label=`${label} · dag verschoven`;
    return {label,detail:`${weekdayLabel(slot.best.date)} · ${fmt(slot.best.km,1)} km${actualPace?` · ${secToPace(actualPace)}`:''}`};
  }

  function renderCorrectPlanActual(){
    const card=document.getElementById('planVsActualCard');
    if(!card||typeof currentPlan!=='function') return;
    const plan=currentPlan(),slots=matchWeekRuns(plan);
    card.innerHTML=`<p class="eyebrow">Gepland vs uitgevoerd</p><h3>Week ${plan.week}</h3><p>Koppeling gebeurt eerst op je vaste trainingsdag: woensdag Tritanium, vrijdag Run 1 en zondag Run 2. Afstand en tempo worden pas daarna gebruikt. Een sessie mag maximaal één dag verschoven zijn.</p><div class="plan-actual-list">${slots.map(slot=>{const st=runStatus(slot);return `<div class="plan-actual-row"><div><strong>${esc(slot.label)} · ${weekdayLabel(slot.expected)}</strong><span class="plan-badge">${esc(st.label)}</span></div><small>Plan: ${esc(slot.text||'vaste trainingsprikkel')}</small><small>${esc(st.detail)}</small></div>`;}).join('')}</div>`;
  }

  function refresh(){
    applyActivityNames();
    installTodayDefaults();
    try{renderTraining();}catch{}
    try{window.renderSmartCoach?.();}catch{}
    renderRoutineCard();
    renderCorrectPlanActual();
  }

  if(typeof renderTraining==='function'){
    const base=renderTraining;
    renderTraining=function(){const r=base();setTimeout(renderRoutineCard,0);return r;};
  }
  if(typeof renderRunPlan==='function'){
    const base=renderRunPlan;
    renderRunPlan=function(){const r=base();setTimeout(renderCorrectPlanActual,0);return r;};
  }
  if(typeof window.ingestGarminData==='function'){
    const base=window.ingestGarminData;
    window.ingestGarminData=function(payload){const r=base(payload);setTimeout(renderCorrectPlanActual,0);return r;};
  }

  refresh();
  setTimeout(refresh,250);
})();