// Progress & motivation features inspired by popular training apps, adapted for Romy Health.
(function(){
  const DAY=86400000;
  state.sportGoals ||= {monthlyRunKm:100,weeklyStrength:2,runAdherence:80};
  state.runningShoes ||= [];
  state.runDayOverrides ||= {};

  function localKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function activityDate(a){return String(a?.date||a?.startTimeLocal||a?.startTime||'').slice(0,10);}
  function typeText(a){return `${a?.type||''} ${a?.name||''}`.toLowerCase();}
  function isRun(a){const t=typeText(a);return t.includes('run')||t.includes('hardloop');}
  function isStrengthActivity(a){const t=typeText(a);return /strength|kracht|weight/.test(t);}
  function isSwim(a){return /swim|zwem/.test(typeText(a));}
  function isCycle(a){return /cycl|bike|fiets|spinning/.test(typeText(a));}
  function isVolley(a){return /volley|beach/.test(typeText(a));}
  function fmt(v,d=0){return v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d});}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function paceSec(a){const km=Number(a?.distanceKm),sec=Number(a?.durationSeconds);return km>0&&sec>0?sec/km:null;}
  function paceText(sec){if(!Number.isFinite(sec)||sec<=0)return '—';const m=Math.floor(sec/60),s=Math.round(sec%60);return `${m}:${String(s).padStart(2,'0')}/km`;}
  function findNumber(obj,keys,seen=new Set()){
    if(!obj||typeof obj!=='object'||seen.has(obj)) return null; seen.add(obj);
    for(const k of keys){const n=Number(obj[k]);if(Number.isFinite(n)&&n>0)return n;}
    for(const v of Object.values(obj)){const n=findNumber(v,keys,seen);if(n!=null)return n;}
    return null;
  }
  function avg(xs){const n=xs.map(Number).filter(Number.isFinite);return n.length?n.reduce((a,b)=>a+b,0)/n.length:null;}
  function runs(){return (state.garminActivities||[]).filter(isRun).filter(a=>Number(a.distanceKm)>0).sort((a,b)=>activityDate(a).localeCompare(activityDate(b)));}
  function allActivities(){return (state.garminActivities||[]).filter(a=>activityDate(a));}
  function strengthSessions(){return (state.strengthSessions||[]).filter(s=>String(s?.date||s?.startedAt||'').slice(0,10));}
  function monthPrefix(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
  function weekMonday(d=new Date()) {const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());const wd=x.getDay()||7;x.setDate(x.getDate()-(wd-1));return x;}
  function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
  function dateDiff(a,b){return Math.round((new Date(`${a}T12:00:00`)-new Date(`${b}T12:00:00`))/DAY);}
  function currentPlanSafe(){try{return typeof currentPlan==='function'?currentPlan():null;}catch{return null;}}
  function activityId(a){return String(a?.id||a?.activityId||`${activityDate(a)}-${a?.name||a?.type||'activity'}-${a?.distanceKm||''}`);}

  function injectStyles(){
    if(document.getElementById('progressMotivationStyles')) return;
    const s=document.createElement('style');s.id='progressMotivationStyles';s.textContent=`
      .pm-card{border:1px solid var(--line);background:var(--surface);border-radius:24px;padding:18px;box-shadow:0 6px 22px rgba(45,27,36,.045)}
      .pm-card h3{margin:4px 0 0;font-size:20px;letter-spacing:-.4px}.pm-card p{margin:7px 0 0;color:var(--muted);font-size:12px;line-height:1.48}
      .pm-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}.pm-mini{padding:12px;border:1px solid var(--line);border-radius:16px;background:var(--surface-soft)}.pm-mini small{display:block;color:var(--muted);font-size:9px;font-weight:780}.pm-mini strong{display:block;margin-top:4px;font-size:17px}.pm-mini span{display:block;margin-top:3px;color:var(--muted);font-size:9px;line-height:1.35}
      .pm-goals{display:grid;gap:10px;margin-top:12px}.pm-goal{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px 12px;align-items:center}.pm-goal strong{font-size:12px}.pm-goal span{font-size:10px;color:var(--muted)}.pm-track{grid-column:1/-1;height:8px;background:#f1e8ed;border-radius:999px;overflow:hidden}.pm-track>i{display:block;height:100%;background:var(--pink);border-radius:999px}
      .pm-calendar{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-top:12px}.pm-cal-head{text-align:center;font-size:9px;color:var(--muted);font-weight:760;padding:3px}.pm-day{min-height:44px;border:1px solid var(--line);border-radius:12px;padding:6px;background:var(--surface-soft)}.pm-day.empty{opacity:.2}.pm-day b{font-size:10px}.pm-dots{display:flex;gap:3px;flex-wrap:wrap;margin-top:6px}.pm-dot{width:6px;height:6px;border-radius:50%;background:var(--pink)}.pm-dot.run{background:#e95a98}.pm-dot.strength{background:#7d6aa8}.pm-dot.swim{background:#5aa7c8}.pm-dot.cycle{background:#6aa86f}.pm-dot.volley{background:#e0a04a}
      .pm-match{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;margin-top:12px}.pm-match-side{padding:12px;border:1px solid var(--line);border-radius:16px;background:var(--surface-soft)}.pm-match-side small{display:block;color:var(--muted);font-size:9px}.pm-match-side strong{display:block;margin-top:4px;font-size:16px}.pm-arrow{font-weight:850;color:var(--pink-dark)}
      .pm-shoe{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:10px;padding:12px;border:1px solid var(--line);border-radius:16px;background:var(--surface-soft)}.pm-shoe strong{display:block}.pm-shoe small{display:block;color:var(--muted);margin-top:3px}.pm-pill{font-size:9px;font-weight:780;border-radius:999px;padding:5px 8px;background:var(--pink-soft);white-space:nowrap}
      .pm-form{display:grid;grid-template-columns:1fr 100px auto;gap:7px;margin-top:10px}.pm-form input,.pm-form select{border:1px solid var(--line);border-radius:11px;padding:9px;background:white;min-width:0}.pm-form button,.pm-button{border:0;background:var(--pink);color:white;border-radius:11px;padding:9px 11px;font-weight:780}.pm-text-btn{border:0;background:transparent;color:var(--pink-dark);font-size:10px;font-weight:780;padding:4px}
      .pm-plan-list{display:grid;gap:8px;margin-top:12px}.pm-plan-row{display:grid;grid-template-columns:1fr 120px;gap:9px;align-items:center;padding:11px;border:1px solid var(--line);border-radius:15px}.pm-plan-row strong{font-size:12px}.pm-plan-row small{display:block;color:var(--muted);margin-top:3px}.pm-plan-row select{border:1px solid var(--line);border-radius:10px;padding:8px;background:white}
      .pm-report-head{display:flex;justify-content:space-between;align-items:start;gap:10px}.pm-year{font-size:10px;font-weight:780;color:var(--pink-dark);background:var(--pink-soft);padding:6px 8px;border-radius:999px}
      @media(max-width:620px){.pm-grid{grid-template-columns:1fr 1fr}.pm-match{grid-template-columns:1fr}.pm-arrow{text-align:center;transform:rotate(90deg)}.pm-form{grid-template-columns:1fr 90px}.pm-form button{grid-column:1/-1}.pm-plan-row{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function prData(){
    const rs=runs();
    const longest=rs.length?[...rs].sort((a,b)=>Number(b.distanceKm)-Number(a.distanceKm))[0]:null;
    function fastestAround(target,tol){return rs.filter(a=>Math.abs(Number(a.distanceKm)-target)<=tol).filter(a=>paceSec(a)).sort((a,b)=>paceSec(a)-paceSec(b))[0]||null;}
    const five=fastestAround(5,.75), ten=fastestAround(10,1.25);
    let lift=null;
    strengthSessions().forEach(s=>(s.exercises||[]).forEach(ex=>(ex.sets||[]).forEach(set=>{const w=Number(set.weight);if(Number.isFinite(w)&&w>0&&(!lift||w>lift.weight))lift={weight:w,name:ex.name||'Oefening',date:String(s.date||s.startedAt||'').slice(0,10)};})));
    return {longest,five,ten,lift};
  }

  function renderPrCard(){
    const overview=document.querySelector('[data-insights-panel="overview"]'); if(!overview) return;
    let card=document.getElementById('pmPrCard');if(!card){card=document.createElement('section');card.id='pmPrCard';card.className='pm-card';overview.appendChild(card);}
    const p=prData();
    const cards=[
      ['LANGSTE RUN',p.longest?`${fmt(p.longest.distanceKm,1)} km`:'—',p.longest?activityDate(p.longest):'meer data nodig'],
      ['5 KM-ACHTIG',p.five?paceText(paceSec(p.five)):'—',p.five?`${fmt(p.five.distanceKm,1)} km · ${activityDate(p.five)}`:'geen vergelijkbare run'],
      ['10 KM-ACHTIG',p.ten?paceText(paceSec(p.ten)):'—',p.ten?`${fmt(p.ten.distanceKm,1)} km · ${activityDate(p.ten)}`:'geen vergelijkbare run'],
      ['ZWAARSTE SET',p.lift?`${fmt(p.lift.weight)} kg`:'—',p.lift?`${p.lift.name} · ${p.lift.date}`:'krachtsets loggen']
    ];
    card.innerHTML=`<p class="eyebrow">PR's & mijlpalen</p><h3>Jouw beste geregistreerde prestaties</h3><p>Alleen prestaties die uit Romy/Garmin-data zijn af te leiden tellen mee. Een langere run wordt niet automatisch als exact 5 of 10 km-PR behandeld.</p><div class="pm-grid">${cards.map(x=>`<div class="pm-mini"><small>${x[0]}</small><strong>${esc(x[1])}</strong><span>${esc(x[2])}</span></div>`).join('')}</div>`;
  }

  function matchedRun(){
    const rs=runs(); if(rs.length<2) return null;
    const latest=rs.at(-1), km=Number(latest.distanceKm);
    const candidates=rs.slice(0,-1).map(a=>({a,diff:Math.abs(Number(a.distanceKm)-km)/km})).filter(x=>x.diff<=.12).sort((a,b)=>b.a.date?.localeCompare?.(a.a.date)||0);
    if(!candidates.length) return {latest,previous:null};
    return {latest,previous:candidates[0].a};
  }
  function hrFor(a){return findNumber(a,['averageHeartRate','avgHeartRate','averageHR','avgHr','heartRateAvg']);}
  function rpeFor(a){const d=activityDate(a),mins=Number(a.durationSeconds)/60;const rows=(state.trainingCheckins||[]).filter(x=>x.date===d);let best=rows.find(x=>x.garminActivityId&&String(x.garminActivityId)===activityId(a));if(!best&&Number.isFinite(mins))best=rows.find(x=>Math.abs(Number(x.minutes)-mins)<=4);return Number.isFinite(Number(best?.rpe))?Number(best.rpe):null;}
  function renderMatchedRun(){
    const filters=document.getElementById('runFilters');if(!filters)return;
    let card=document.getElementById('pmMatchedRun');if(!card){card=document.createElement('section');card.id='pmMatchedRun';card.className='pm-card';filters.insertAdjacentElement('beforebegin',card);}
    const m=matchedRun();
    if(!m){card.innerHTML=`<p class="eyebrow">Matched Runs</p><h3>Nog geen vergelijkbaar paar</h3><p>Na twee runs met ongeveer dezelfde afstand vergelijkt Romy tempo, hartslag en RPE automatisch.</p>`;return;}
    if(!m.previous){card.innerHTML=`<p class="eyebrow">Matched Runs</p><h3>${fmt(m.latest.distanceKm,1)} km geregistreerd</h3><p>Nog geen eerdere run binnen ongeveer 12% van deze afstand gevonden.</p>`;return;}
    const lp=paceSec(m.latest),pp=paceSec(m.previous),lh=hrFor(m.latest),ph=hrFor(m.previous),lr=rpeFor(m.latest),pr=rpeFor(m.previous);
    const delta=lp&&pp?lp-pp:null;
    const verdict=delta==null?'Vergelijkbare afstand gevonden':delta<-5?'Sneller dan vorige vergelijkbare run':delta>5?'Rustiger dan vorige vergelijkbare run':'Vrijwel hetzelfde tempo';
    card.innerHTML=`<p class="eyebrow">Matched Runs</p><h3>${esc(verdict)}</h3><div class="pm-match"><div class="pm-match-side"><small>VORIGE · ${esc(activityDate(m.previous))}</small><strong>${fmt(m.previous.distanceKm,1)} km · ${paceText(pp)}</strong><span>${ph?`HR ${fmt(ph)} bpm`:''}${pr!=null?`${ph?' · ':''}RPE ${fmt(pr,1)}`:''}</span></div><div class="pm-arrow">→</div><div class="pm-match-side"><small>LAATSTE · ${esc(activityDate(m.latest))}</small><strong>${fmt(m.latest.distanceKm,1)} km · ${paceText(lp)}</strong><span>${lh?`HR ${fmt(lh)} bpm`:''}${lr!=null?`${lh?' · ':''}RPE ${fmt(lr,1)}`:''}</span></div></div><p>${delta==null?'':`${Math.abs(Math.round(delta))} sec/km ${delta<0?'sneller':'rustiger'} bij een vergelijkbare afstand.`}</p>`;
  }

  function classifyActivity(a){if(isRun(a))return'run';if(isStrengthActivity(a))return'strength';if(isSwim(a))return'swim';if(isCycle(a))return'cycle';if(isVolley(a))return'volley';return'other';}
  function monthActivityMap(prefix){
    const map={};
    allActivities().filter(a=>activityDate(a).startsWith(prefix)).forEach(a=>{const d=activityDate(a);(map[d]||=[]).push(classifyActivity(a));});
    strengthSessions().filter(s=>String(s.date||s.startedAt||'').slice(0,7)===prefix).forEach(s=>{const d=String(s.date||s.startedAt||'').slice(0,10);if(!(map[d]||[]).includes('strength'))(map[d]||=[]).push('strength');});
    return map;
  }
  function renderTrainingLog(){
    const overview=document.querySelector('[data-insights-panel="overview"]');if(!overview)return;
    let card=document.getElementById('pmTrainingLog');if(!card){card=document.createElement('section');card.id='pmTrainingLog';card.className='pm-card';overview.appendChild(card);}
    const now=new Date(),y=now.getFullYear(),m=now.getMonth(),prefix=monthPrefix(now),first=new Date(y,m,1),days=new Date(y,m+1,0).getDate(),offset=(first.getDay()+6)%7,map=monthActivityMap(prefix);
    const labels=['MA','DI','WO','DO','VR','ZA','ZO'];
    const cells=[];for(let i=0;i<offset;i++)cells.push('<div class="pm-day empty"></div>');
    for(let day=1;day<=days;day++){const key=`${prefix}-${String(day).padStart(2,'0')}`,types=map[key]||[];cells.push(`<div class="pm-day"><b>${day}</b><div class="pm-dots">${types.slice(0,5).map(t=>`<i class="pm-dot ${t}" title="${t}"></i>`).join('')}</div></div>`);}
    const monthName=new Intl.DateTimeFormat('nl-NL',{month:'long',year:'numeric'}).format(now);
    card.innerHTML=`<p class="eyebrow">Trainingslogboek</p><h3>${esc(monthName)}</h3><p>Een snelle visuele kalender van geregistreerde trainingen. Roze = hardlopen, paars = kracht, blauw = zwemmen, groen = fietsen, geel = volleybal.</p><div class="pm-calendar">${labels.map(x=>`<div class="pm-cal-head">${x}</div>`).join('')}${cells.join('')}</div>`;
  }

  function activeDaysStreak(prefix){const days=[...new Set([...allActivities().map(activityDate),...strengthSessions().map(s=>String(s.date||s.startedAt||'').slice(0,10))].filter(d=>d.startsWith(prefix)))].sort();let best=0,cur=0,prev=null;days.forEach(d=>{if(prev&&dateDiff(d,prev)===1)cur++;else cur=1;best=Math.max(best,cur);prev=d;});return best;}
  function monthMetrics(date=new Date()){
    const prefix=monthPrefix(date),acts=allActivities().filter(a=>activityDate(a).startsWith(prefix));
    const hours=acts.reduce((s,a)=>s+(Number(a.durationSeconds)||0)/3600,0);
    const runKm=acts.filter(isRun).reduce((s,a)=>s+(Number(a.distanceKm)||0),0);
    const strengthDates=new Set(strengthSessions().filter(s=>String(s.date||s.startedAt||'').slice(0,7)===prefix).map(s=>String(s.date||s.startedAt||'').slice(0,10)));
    acts.filter(isStrengthActivity).forEach(a=>strengthDates.add(activityDate(a)));
    const sleep=avg(Object.entries(state.garminDaily||{}).filter(([d])=>d.startsWith(prefix)).map(([,v])=>v.sleepHours));
    return {sessions:new Set(acts.map(a=>activityId(a))).size+strengthDates.size,hours,runKm,strength:strengthDates.size,sleep,streak:activeDaysStreak(prefix)};
  }
  function yearMetrics(year=new Date().getFullYear()){
    const p=`${year}-`,acts=allActivities().filter(a=>activityDate(a).startsWith(p)),runKm=acts.filter(isRun).reduce((s,a)=>s+(Number(a.distanceKm)||0),0),hours=acts.reduce((s,a)=>s+(Number(a.durationSeconds)||0)/3600,0);return {sessions:acts.length,runKm,hours};
  }
  function renderMonthlyReport(){
    const overview=document.querySelector('[data-insights-panel="overview"]');if(!overview)return;
    let card=document.getElementById('pmMonthlyReport');if(!card){card=document.createElement('section');card.id='pmMonthlyReport';card.className='pm-card';overview.appendChild(card);}
    const m=monthMetrics(),y=yearMetrics(),name=new Intl.DateTimeFormat('nl-NL',{month:'long'}).format(new Date());
    card.innerHTML=`<div class="pm-report-head"><div><p class="eyebrow">Maandrapport</p><h3>${name.charAt(0).toUpperCase()+name.slice(1)} in cijfers</h3></div><span class="pm-year">${new Date().getFullYear()} tot nu toe · ${fmt(y.runKm,0)} km</span></div><div class="pm-grid"><div class="pm-mini"><small>TRAININGEN</small><strong>${fmt(m.sessions)}</strong><span>geregistreerde sessies</span></div><div class="pm-mini"><small>UREN</small><strong>${fmt(m.hours,1)}</strong><span>Garmin-activiteitstijd</span></div><div class="pm-mini"><small>HARDLOPEN</small><strong>${fmt(m.runKm,1)} km</strong><span>deze maand</span></div><div class="pm-mini"><small>KRACHT</small><strong>${fmt(m.strength)}×</strong><span>dagen met kracht</span></div><div class="pm-mini"><small>SLAAP</small><strong>${m.sleep==null?'—':`${fmt(m.sleep,1)} u`}</strong><span>gemiddelde</span></div><div class="pm-mini"><small>BESTE REEKS</small><strong>${fmt(m.streak)} d</strong><span>actieve dagen op rij</span></div><div class="pm-mini"><small>JAAR · UREN</small><strong>${fmt(y.hours,1)}</strong><span>${new Date().getFullYear()} totaal</span></div><div class="pm-mini"><small>JAAR · SESSIES</small><strong>${fmt(y.sessions)}</strong><span>Garmin-activiteiten</span></div></div>`;
  }

  function currentWeekStrength(){const mon=weekMonday(),start=localKey(mon),end=localKey(addDays(mon,6)),dates=new Set(strengthSessions().map(s=>String(s.date||s.startedAt||'').slice(0,10)).filter(d=>d>=start&&d<=end));allActivities().filter(a=>isStrengthActivity(a)&&activityDate(a)>=start&&activityDate(a)<=end).forEach(a=>dates.add(activityDate(a)));return dates.size;}
  function runAdherence(){
    if(typeof marathonPlan==='undefined')return null;let done=0,total=0;const today=localKey();
    marathonPlan.forEach(p=>{const mon=(()=>{const jan4=new Date(Date.UTC(p.year,0,4)),day=jan4.getUTCDay()||7,x=new Date(jan4);x.setUTCDate(jan4.getUTCDate()-(day-1)+(p.week-1)*7);return x;})();[['run1',4],['run2',6]].forEach(([key,off])=>{const d=new Date(mon);d.setUTCDate(mon.getUTCDate()+off);const date=d.toISOString().slice(0,10);if(date<=today){total++;try{if(checklistFor(p)?.[key])done++;}catch{}}});});
    return total?{done,total,pct:done/total*100}:null;
  }
  function renderGoals(){
    const overview=document.querySelector('[data-insights-panel="overview"]');if(!overview)return;
    let card=document.getElementById('pmGoals');if(!card){card=document.createElement('section');card.id='pmGoals';card.className='pm-card';overview.prepend(card);}
    const month=monthMetrics(),strength=currentWeekStrength(),adh=runAdherence(),g=state.sportGoals;
    const goals=[
      {name:'Hardlopen deze maand',value:month.runKm,target:Number(g.monthlyRunKm),unit:'km'},
      {name:'Kracht deze week',value:strength,target:Number(g.weeklyStrength),unit:'×'},
      {name:'Run 1 + Run 2 uitgevoerd',value:adh?.pct??0,target:Number(g.runAdherence),unit:'%'}
    ];
    card.innerHTML=`<div class="pm-report-head"><div><p class="eyebrow">Doelen</p><h3>Waar werk je naartoe?</h3></div><button class="pm-text-btn" type="button" id="pmEditGoals">Aanpassen</button></div><div class="pm-goals">${goals.map(x=>{const pct=x.target>0?Math.min(100,x.value/x.target*100):0;return `<div class="pm-goal"><strong>${esc(x.name)}</strong><span>${fmt(x.value,x.unit==='km'?1:0)} / ${fmt(x.target)} ${x.unit}</span><div class="pm-track"><i style="width:${pct}%"></i></div></div>`;}).join('')}</div><form id="pmGoalsForm" class="pm-form" hidden><input name="monthlyRunKm" type="number" min="0" step="1" value="${esc(g.monthlyRunKm)}" aria-label="Hardloopdoel km per maand"><input name="weeklyStrength" type="number" min="0" step="1" value="${esc(g.weeklyStrength)}" aria-label="Krachttrainingen per week"><button>Opslaan</button><input name="runAdherence" type="number" min="0" max="100" step="5" value="${esc(g.runAdherence)}" aria-label="Run adherence procent"><span style="font-size:10px;color:var(--muted);align-self:center">km/maand · kracht/week · % runs</span></form>`;
    card.querySelector('#pmEditGoals')?.addEventListener('click',()=>{const f=card.querySelector('#pmGoalsForm');f.hidden=!f.hidden;});
    card.querySelector('#pmGoalsForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.currentTarget);state.sportGoals={monthlyRunKm:Number(f.get('monthlyRunKm'))||0,weeklyStrength:Number(f.get('weeklyStrength'))||0,runAdherence:Number(f.get('runAdherence'))||0};saveState();renderProgressMotivation();});
  }

  function shoeKm(shoe){const from=shoe.from||shoe.createdOn||localKey(),until=shoe.until||'9999-12-31';return Number(shoe.startKm||0)+runs().filter(a=>{const d=activityDate(a);return d>=from&&d<=until;}).reduce((s,a)=>s+(Number(a.distanceKm)||0),0);}
  function renderShoes(){
    const filters=document.getElementById('runFilters');if(filters){let card=document.getElementById('pmShoesCard');if(!card){card=document.createElement('section');card.id='pmShoesCard';card.className='pm-card';filters.insertAdjacentElement('beforebegin',card);}const active=state.runningShoes.filter(s=>s.active!==false);card.innerHTML=`<p class="eyebrow">Schoenkilometers</p><h3>${active.length?'Je hardloopschoenen':'Voeg je eerste paar toe'}</h3><p>Romy telt Garmin-runs automatisch bij het standaardpaar op vanaf de datum waarop je dat paar actief maakt.</p>${active.map(s=>`<div class="pm-shoe"><div><strong>${esc(s.name)}</strong><small>vanaf ${esc(s.from||s.createdOn)} · start ${fmt(s.startKm,1)} km</small></div><span class="pm-pill">${fmt(shoeKm(s),1)} km${s.default?' · standaard':''}</span></div>`).join('')||'<p>Voeg schoenen toe via Instellingen.</p>'}`;}
    const list=document.querySelector('#settingsModal .settings-list');if(!list)return;
    let box=document.getElementById('pmShoeSettings');if(!box){box=document.createElement('div');box.id='pmShoeSettings';box.className='pm-card';list.appendChild(box);}
    box.innerHTML=`<strong style="display:block">👟 Hardloopschoenen</strong><small style="display:block;margin-top:5px;color:var(--muted);line-height:1.4">Vul bij toevoegen de kilometerstand in die het paar nu al heeft. Toekomstige Garmin-runs tellen daarna automatisch op.</small><form id="pmShoeForm" class="pm-form"><input name="name" placeholder="Bijv. Novablast 5" required><input name="startKm" type="number" min="0" step="0.1" placeholder="km"><button>Toevoegen</button></form><div>${state.runningShoes.filter(s=>s.active!==false).map(s=>`<div class="pm-shoe"><div><strong>${esc(s.name)}</strong><small>${fmt(shoeKm(s),1)} km</small></div><div><button type="button" class="pm-text-btn" data-default-shoe="${esc(s.id)}">${s.default?'Standaard ✓':'Maak standaard'}</button><button type="button" class="pm-text-btn" data-delete-shoe="${esc(s.id)}">×</button></div></div>`).join('')}</div>`;
    box.querySelector('#pmShoeForm')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.currentTarget),today=localKey();if(!state.runningShoes.length){} const id=`shoe-${Date.now()}`;const makeDefault=!state.runningShoes.some(s=>s.default&&s.active!==false);state.runningShoes.push({id,name:String(f.get('name')||'').trim(),startKm:Number(f.get('startKm'))||0,createdOn:today,from:today,default:makeDefault,active:true});saveState();renderProgressMotivation();});
    box.querySelectorAll('[data-default-shoe]').forEach(btn=>btn.addEventListener('click',()=>{const today=localKey();state.runningShoes.forEach(s=>{if(s.default&&s.id!==btn.dataset.defaultShoe){s.default=false;s.until=localKey(addDays(new Date(),-1));}});const s=state.runningShoes.find(x=>x.id===btn.dataset.defaultShoe);if(s){s.default=true;s.from=today;delete s.until;}saveState();renderProgressMotivation();}));
    box.querySelectorAll('[data-delete-shoe]').forEach(btn=>btn.addEventListener('click',()=>{const s=state.runningShoes.find(x=>x.id===btn.dataset.deleteShoe);if(s){s.active=false;s.default=false;s.until=localKey();}saveState();renderProgressMotivation();}));
  }

  const DAY_NAMES=['Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag','Zondag'];
  const DEFAULT_DAY={tritanium:2,run1:4,run2:6};
  function planExpectedDate(plan,key,offset){const jan4=new Date(Date.UTC(plan.year,0,4)),wd=jan4.getUTCDay()||7,m=new Date(jan4);m.setUTCDate(jan4.getUTCDate()-(wd-1)+(plan.week-1)*7+offset);return m.toISOString().slice(0,10);}
  function planAdvice(plan,key,offset,done){const expected=planExpectedDate(plan,key,offset),diff=dateDiff(localKey(),expected);if(done)return'Afgerond';if(diff<0)return`Gepland ${DAY_NAMES[offset].toLowerCase()}`;if(diff===0)return'Vandaag gepland';if(key==='run1'&&diff>0&&diff<=2)return'Gemist: niet automatisch vlak vóór Run 2 inhalen.';if(key==='tritanium'&&diff>0)return'Gemist: voorkom dat je de intensieve prikkel bovenop Run 1 stapelt.';if(key==='run2'&&diff>0)return'Gemist: pak je schema weer op zonder extra kilometers te stapelen.';return'Planning controleren';}
  function renderPlanHelper(){
    const filters=document.getElementById('runFilters');if(!filters||typeof currentPlan!=='function')return;
    let card=document.getElementById('pmPlanHelper');if(!card){card=document.createElement('section');card.id='pmPlanHelper';card.className='pm-card';filters.insertAdjacentElement('beforebegin',card);}
    const plan=currentPlan(),check=typeof checklistFor==='function'?checklistFor(plan):{},over=state.runDayOverrides[plan.key]||{};
    const slots=[['tritanium','Tritanium'],['run1','Run 1'],['run2','Run 2']];
    card.innerHTML=`<p class="eyebrow">Slimme planhulp</p><h3>Verschuif alleen als het logisch blijft</h3><p>De standaard blijft woensdag Tritanium, vrijdag Run 1 en zondag Run 2. Een wijziging wordt ook gebruikt voor de Garmin-koppeling.</p><div class="pm-plan-list">${slots.map(([key,label])=>{const off=Number.isInteger(over[key])?over[key]:DEFAULT_DAY[key];return `<div class="pm-plan-row"><div><strong>${label}</strong><small>${esc(planAdvice(plan,key,off,!!check[key]))}</small></div><select data-plan-day="${key}">${DAY_NAMES.map((d,i)=>`<option value="${i}" ${i===off?'selected':''}>${d}</option>`).join('')}</select></div>`;}).join('')}</div><p>Romy adviseert bij gemiste sessies liever niet automatisch “inhaalvolume” als dat een volgende sleuteltraining in de weg zit.</p>`;
    card.querySelectorAll('[data-plan-day]').forEach(sel=>sel.addEventListener('change',()=>{state.runDayOverrides[plan.key]||={};state.runDayOverrides[plan.key][sel.dataset.planDay]=Number(sel.value);saveState();try{renderRunPlan();}catch{}setTimeout(()=>{renderPlanHelper();try{window.renderCorrectPlanActual?.();}catch{}},20);}));
  }

  function renderProgressMotivation(){
    injectStyles();
    renderMatchedRun();renderShoes();renderPlanHelper();
    renderGoals();renderPrCard();renderTrainingLog();renderMonthlyReport();
  }
  window.renderProgressMotivation=renderProgressMotivation;

  if(typeof renderProgress==='function'&&!renderProgress._pmWrapped){const base=renderProgress;const wrapped=function(){const r=base.apply(this,arguments);setTimeout(renderProgressMotivation,40);return r;};wrapped._pmWrapped=true;renderProgress=wrapped;}
  if(typeof renderRunPlan==='function'&&!renderRunPlan._pmWrapped){const base=renderRunPlan;const wrapped=function(){const r=base.apply(this,arguments);setTimeout(renderProgressMotivation,40);return r;};wrapped._pmWrapped=true;renderRunPlan=wrapped;}
  if(typeof renderDashboard==='function'&&!renderDashboard._pmWrapped){const base=renderDashboard;const wrapped=function(){const r=base.apply(this,arguments);setTimeout(renderProgressMotivation,40);return r;};wrapped._pmWrapped=true;renderDashboard=wrapped;}
  if(typeof window.ingestGarminData==='function'&&!window.ingestGarminData._pmWrapped){const base=window.ingestGarminData;const wrapped=function(payload){const r=base(payload);setTimeout(renderProgressMotivation,40);return r;};wrapped._pmWrapped=true;window.ingestGarminData=wrapped;}
  renderProgressMotivation();setTimeout(renderProgressMotivation,700);
})();