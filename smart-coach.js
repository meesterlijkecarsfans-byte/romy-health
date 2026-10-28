// Romy Health smart coaching layer.
// Centralises recovery, training load, fueling and data-quality logic.
(function(){
  const DAY=86400000;
  const RPE_KEY='trainingCheckins';
  const PLAN_KEY='dailyPlans';
  const GARMIN_SYNC_KEY='romy-health-garmin-sync-ts';
  const GARMIN_28_KEY='romy-health-garmin-28d-sync-ts';

  state[RPE_KEY] ||= [];
  state[PLAN_KEY] ||= {};
  state.nutritionGoals ||= {calories:2500,bodyWeightKg:null};

  function localKey(date=new Date()){
    const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  function shift(days){ const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+days); return localKey(d); }
  function fmt(v,d=0){ return v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d}); }
  function avg(values){ const n=values.map(Number).filter(Number.isFinite); return n.length?n.reduce((a,b)=>a+b,0)/n.length:null; }
  function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function dateText(key){ try{return new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short'}).format(new Date(`${key}T12:00:00`)).replace('.','');}catch{return key;} }
  function activityDate(a){ return String(a?.date||a?.startTimeLocal||a?.startTime||'').slice(0,10); }
  function activityText(a){ return `${a?.type||''} ${a?.name||''}`.toLowerCase(); }
  function isStrength(a){ const t=activityText(a); return t.includes('strength')||t.includes('kracht')||t.includes('weight'); }

  function findNumber(obj,keys,seen=new Set()){
    if(!obj||typeof obj!=='object'||seen.has(obj)) return null;
    seen.add(obj);
    for(const key of keys){ const n=Number(obj[key]); if(Number.isFinite(n)&&n>0) return n; }
    for(const value of Object.values(obj)){ const n=findNumber(value,keys,seen); if(n!=null) return n; }
    return null;
  }
  function burnedForDay(g){
    if(!g) return null;
    const direct=findNumber(g,['totalCalories','totalKilocalories','caloriesTotal','totalKcal','totalCaloriesBurned']);
    if(direct!=null) return direct;
    const active=findNumber(g,['activeCalories','activeKilocalories','activeKcal']);
    const resting=findNumber(g,['restingCalories','restingKilocalories','bmrCalories','basalCalories','bmrKilocalories']);
    return active!=null&&resting!=null?active+resting:null;
  }

  function injectStyles(){
    if(document.getElementById('smartCoachStyles')) return;
    const s=document.createElement('style'); s.id='smartCoachStyles';
    s.textContent=`
      .smart-card{border:1px solid var(--line);background:var(--surface);border-radius:24px;padding:18px;box-shadow:0 6px 22px rgba(45,27,36,.045)}
      .smart-card h3{margin:4px 0 0;font-size:20px;letter-spacing:-.45px}.smart-card p{margin:7px 0 0;color:var(--muted);font-size:12px;line-height:1.5}
      .smart-chips{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.smart-chip{border:1px solid var(--line);background:white;border-radius:999px;padding:8px 10px;font-size:11px;font-weight:720}.smart-chip.active{background:var(--text);color:white;border-color:var(--text)}
      .smart-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:12px}.smart-mini{padding:13px;border:1px solid var(--line);border-radius:17px;background:var(--surface-soft)}.smart-mini small{display:block;color:var(--muted);font-size:10px;font-weight:700}.smart-mini strong{display:block;margin-top:4px;font-size:17px}.smart-mini span{display:block;margin-top:3px;color:var(--muted);font-size:10px;line-height:1.35}
      .rpe-form{display:grid;grid-template-columns:1.4fr .7fr .7fr;gap:8px;margin-top:12px}.rpe-form label{display:grid;gap:5px;color:var(--muted);font-size:10px;font-weight:750}.rpe-form input,.rpe-form select,.rpe-form textarea{width:100%;border:1px solid var(--line);background:white;border-radius:11px;padding:9px;color:var(--text)}.rpe-form textarea{grid-column:1/-1;min-height:62px;resize:vertical}.rpe-save{grid-column:1/-1;border:0;background:var(--pink);color:white;border-radius:12px;padding:11px;font-weight:780}.rpe-history{display:grid;gap:7px;margin-top:12px}.rpe-row{display:flex;gap:10px;justify-content:space-between;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:14px}.rpe-row small{color:var(--muted);display:block;margin-top:2px}.rpe-row button{border:0;background:transparent;color:var(--muted);font-size:16px}
      .quality-pill{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:6px 9px;background:var(--surface-soft);font-size:10px;font-weight:750;color:var(--muted)}
      .fuel-status{margin-top:12px;padding:13px 14px;border-radius:16px;background:var(--surface-soft);border:1px solid #f6dbe7}.fuel-status strong{font-size:15px}.fuel-status span{display:block;color:var(--muted);font-size:11px;margin-top:4px;line-height:1.4}
      @media(max-width:560px){.smart-grid{grid-template-columns:1fr 1fr}.rpe-form{grid-template-columns:1fr 1fr}.rpe-form label:first-child{grid-column:1/-1}}
    `;
    document.head.appendChild(s);
  }

  // --- Nutrition: carbohydrates + personalised protein status ---
  function ensureCarbInput(){
    const form=document.getElementById('nutritionForm'); if(!form) return;
    const grid=form.querySelector('.form-grid'); if(!grid||form.elements.carbs) return;
    const protein=form.elements.protein?.closest('label');
    const label=document.createElement('label'); label.innerHTML='Koolhydraten (g)<input type="number" step="0.1" name="carbs" inputmode="decimal" />';
    if(protein?.nextSibling) grid.insertBefore(label,protein.nextSibling); else grid.appendChild(label);
  }
  function installNutritionSave(){
    const form=document.getElementById('nutritionForm'); if(!form||form.dataset.smartCarbs) return;
    form.dataset.smartCarbs='1';
    form.addEventListener('submit',()=>{
      const date=form.elements.date?.value, value=form.elements.carbs?.value;
      queueMicrotask(()=>{
        if(!date||!state.nutrition?.[date]) return;
        const n=Number(String(value??'').replace(',','.'));
        state.nutrition[date].carbs=value===''?null:(Number.isFinite(n)?n:null);
        saveState();
        try{renderNutrition();}catch{}
        renderSmartCoach();
      });
    },true);
    if(typeof openNutritionModal==='function'){
      const base=openNutritionModal;
      openNutritionModal=function(date=localKey()){
        const result=base(date); ensureCarbInput();
        const form=document.getElementById('nutritionForm');
        if(form?.elements.carbs) form.elements.carbs.value=state.nutrition?.[date]?.carbs??'';
        return result;
      };
    }
  }
  function renderCarbCard(){
    const grid=document.getElementById('nutrientGrid'); if(!grid||!selectedNutritionDate) return;
    grid.querySelector('[data-smart-carbs]')?.remove();
    const n=state.nutrition?.[selectedNutritionDate]; if(!n) return;
    const value=Number(n.carbs);
    const article=document.createElement('article'); article.className='nutrition-goal-card'; article.dataset.smartCarbs='1';
    article.innerHTML=`<div class="nutrition-goal-head"><span>Koolhydraten</span><small>trainingsbrandstof</small></div><strong>${Number.isFinite(value)?fmt(value,1):'—'} g</strong><div class="nutrition-goal-note">Belangrijk rond intensieve, lange en dubbele trainingsdagen. Romy Health gebruikt dit vooral voor fueling-advies, niet als harde bovengrens.</div>`;
    const first=grid.children[1]||grid.firstChild; grid.insertBefore(article,first);
  }
  function proteinStatus(n){
    const kg=Number(state.nutritionGoals?.bodyWeightKg), protein=Number(n?.protein);
    if(!Number.isFinite(kg)||kg<=0||!Number.isFinite(protein)) return null;
    const min=kg*1.4, high=kg*1.8;
    return {min,high,label:protein<min?'onder je sportzone':protein<=high?'binnen je sportzone':'boven je sportzone'};
  }

  // --- Daily planning / fueling focus ---
  function planOptions(){
    if(Array.isArray(window.EXTRA_WEEKLY_ACTIVITIES)) return window.EXTRA_WEEKLY_ACTIVITIES;
    if(typeof EXTRA_WEEKLY_ACTIVITIES!=='undefined'&&Array.isArray(EXTRA_WEEKLY_ACTIVITIES)) return EXTRA_WEEKLY_ACTIVITIES;
    return [
      {id:'run1',name:'Run 1'},{id:'run2',name:'Run 2'},{id:'tritanium',name:'Tritanium'},
      {id:'tweeslag',name:'Tweeslag'},{id:'donitas1',name:'Donitas 1'},{id:'donitas2',name:'Donitas 2'},
      {id:'kracht1',name:'Kracht 1'},{id:'kracht2',name:'Kracht 2'},{id:'zwemmen',name:'Zwemmen'},{id:'spinning',name:'Spinning'},{id:'fietsen',name:'Fietsen'}
    ];
  }
  function selectedPlans(date=localKey()){ return Array.isArray(state[PLAN_KEY]?.[date])?state[PLAN_KEY][date]:[]; }
  function planIntensity(ids){
    const t=ids.join(' ').toLowerCase();
    const endurance=/run|tritanium|zwem|spinning|fietsen/.test(t), volley=/tweeslag|donitas/.test(t), strength=/kracht/.test(t);
    if(ids.length>=2) return {level:'high',copy:'Dubbele trainingsdag: geef koolhydraten, drinken en herstel tussen/na sessies prioriteit.'};
    if(endurance||volley) return {level:'moderate',copy:'Trainingsdag: zorg dat er voldoende koolhydraten rond je sessie zitten en herstel daarna met eiwit + koolhydraten.'};
    if(strength) return {level:'moderate',copy:'Krachtdag: voldoende totale energie, eiwit verspreid over de dag en koolhydraten rond de training helpen je kwaliteit.'};
    return {level:'light',copy:'Geen zware sessie gepland. Eet normaal, herstel goed en forceer geen extra trainingsvolume.'};
  }
  function ensureTodayPlan(){
    const perf=document.getElementById('dailyPerformanceSummary');
    const planning=[...document.querySelectorAll('#view-today .section-heading')].find(x=>x.textContent.includes('Planning'));
    if(!planning) return;
    let card=document.getElementById('smartTodayPlan');
    if(!card){
      const target=perf||planning;
      target.insertAdjacentHTML(perf?'afterend':'beforebegin','<section id="smartTodayPlan" class="smart-card" style="margin-top:12px"></section>');
      card=document.getElementById('smartTodayPlan');
    }
    const date=localKey(), selected=selectedPlans(date), options=planOptions();
    const actualToday=(state.garminActivities||[]).filter(a=>activityDate(a)===date);
    const effective=selected.length?selected:actualToday.map(a=>String(a.type||a.name||'').toLowerCase());
    const focus=planIntensity(effective);
    card.innerHTML=`<p class="eyebrow">Vandaag gepland</p><h3>${selected.length?`${selected.length} training${selected.length===1?'':'en'} geselecteerd`:(actualToday.length?'Activiteit van vandaag gevonden':'Plan je trainingsdag')}</h3><p>${focus.copy}</p><div class="smart-chips">${options.map(o=>`<button type="button" class="smart-chip ${selected.includes(o.id)?'active':''}" data-day-plan="${esc(o.id)}">${esc(o.name)}</button>`).join('')}</div><p>${selected.length?'Tik opnieuw om een sessie van vandaag te verwijderen.':'Selecteer hier wat je vandaag gaat doen; je weekplanning zelf blijft ongewijzigd.'}</p>`;
    card.querySelectorAll('[data-day-plan]').forEach(btn=>btn.addEventListener('click',()=>{
      state[PLAN_KEY] ||= {}; const arr=new Set(selectedPlans(date));
      arr.has(btn.dataset.dayPlan)?arr.delete(btn.dataset.dayPlan):arr.add(btn.dataset.dayPlan);
      state[PLAN_KEY][date]=[...arr]; saveState(); renderSmartCoach();
    }));
  }

  // --- Personal 28-day recovery baseline ---
  function metricValues(field,start=shift(-27),end=shift(0)){
    return Object.entries(state.garminDaily||{}).filter(([d])=>d>=start&&d<=end).map(([,v])=>Number(v?.[field])).filter(Number.isFinite);
  }
  function current7(field){ return avg(metricValues(field,shift(-6),shift(0))); }
  function baselinePrior(field){ return avg(metricValues(field,shift(-27),shift(-7))); }
  function recoveryBaseline(){
    const items=[
      {field:'sleepHours',label:'Slaap',unit:'u',digits:1,direction:'down',threshold:.94},
      {field:'hrv',label:'HRV',unit:'ms',digits:0,direction:'down',threshold:.90},
      {field:'restingHeartRate',label:'Rusthartslag',unit:'bpm',digits:0,direction:'up',threshold:1.05}
    ].map(x=>{
      const cur=current7(x.field), base=baselinePrior(x.field), enough=metricValues(x.field,shift(-27),shift(0)).length>=7;
      let flag=false;
      if(enough&&cur!=null&&base!=null&&base>0) flag=x.direction==='down'?cur<base*x.threshold:cur>base*x.threshold;
      return {...x,cur,base,enough,flag};
    });
    const available=items.filter(x=>x.enough&&x.cur!=null&&x.base!=null), flags=available.filter(x=>x.flag).length;
    const level=available.length<2?'building':flags>=2?'lower':flags===1?'watch':'stable';
    return {items,available,flags,level};
  }
  function renderRecovery(){
    const r=recoveryBaseline();
    const title=r.level==='lower'?'Herstel wijkt duidelijk af':r.level==='watch'?'Eén herstelsignaal wijkt af':r.level==='stable'?'Herstel rond je eigen niveau':'Persoonlijke baseline wordt opgebouwd';
    const copy=r.level==='building'?'Na meerdere Garmin-dagen vergelijkt Romy Health slaap, HRV en rusthartslag met jouw eigen recente patroon.':r.level==='stable'?'Je 7-daagse gemiddelden liggen zonder duidelijke afwijking rond je persoonlijke baseline.':'Gebruik dit als trainingssignaal en combineer het met hoe je je voelt; het is geen medische beoordeling.';
    const card=document.getElementById('recoveryCard');
    if(card) card.innerHTML=`<div class="run-card-top"><span class="run-pill">♡ Persoonlijke hersteltrend</span><span class="run-date">7 dagen vs. eerdere 21 dagen</span></div><h3>${title}</h3><p>${copy}</p>`;
    const section=document.getElementById('recoveryTrendSection');
    if(section) section.innerHTML=`<p class="eyebrow">Hersteltrend</p><h3>Jouw 28-daagse baseline</h3><p>Geen vaste HRV-grens: je laatste 7 dagen worden vergeleken met je eigen eerdere patroon.</p><div class="recovery-trend-grid">${r.items.map(x=>`<div class="recovery-trend-card"><small>${x.label}</small><strong>${x.cur==null?'—':`${fmt(x.cur,x.digits)} ${x.unit}`}</strong><span>${x.base==null?'baseline wordt opgebouwd':`baseline ${fmt(x.base,x.digits)} ${x.unit}${x.flag?' · wijkt af':''}`}</span></div>`).join('')}</div>`;
    return r;
  }

  // --- sRPE training check-in ---
  function checkinsBetween(start,end){ return (state[RPE_KEY]||[]).filter(x=>x.date>=start&&x.date<=end); }
  function srpeWindow(start,end){
    const rows=checkinsBetween(start,end).filter(x=>Number.isFinite(Number(x.minutes))&&Number.isFinite(Number(x.rpe)));
    const load=rows.reduce((s,x)=>s+Number(x.minutes)*Number(x.rpe),0);
    return {rows,load,minutes:rows.reduce((s,x)=>s+Number(x.minutes),0),avgRpe:avg(rows.map(x=>x.rpe))};
  }
  function recentActivityOptions(){
    const cutoff=shift(-7);
    return (state.garminActivities||[]).filter(a=>activityDate(a)>=cutoff).slice(-12).reverse();
  }
  function ensureRpeSection(){
    const view=document.getElementById('view-training'), groups=document.getElementById('trainingGroups'); if(!view||!groups) return;
    let section=document.getElementById('trainingCheckinSection');
    if(!section){ groups.insertAdjacentHTML('afterend','<section id="trainingCheckinSection" class="smart-card" style="margin-top:20px"></section>'); section=document.getElementById('trainingCheckinSection'); }
    const recent=recentActivityOptions(), today=localKey();
    const options=[...planOptions().map(o=>({value:`plan:${o.id}`,label:o.name,minutes:''})),...recent.map((a,i)=>({value:`garmin:${i}`,label:`${dateText(activityDate(a))} · ${a.name||a.type||'Garmin'}`,minutes:Number(a.durationSeconds)>0?Math.round(Number(a.durationSeconds)/60):''}))];
    const history=(state[RPE_KEY]||[]).slice().sort((a,b)=>String(b.createdAt||b.date).localeCompare(String(a.createdAt||a.date))).slice(0,5);
    section.innerHTML=`<p class="eyebrow">Trainingscheck</p><h3>Hoe zwaar was deze training?</h3><p>RPE 0–10 × trainingsduur geeft je session-RPE-belasting. Vul dit idealiter kort na de training in; trend is belangrijker dan één getal.</p><form id="rpeForm" class="rpe-form"><label>Training<select name="activity"><option value="">Kies training…</option>${options.map(o=>`<option value="${esc(o.value)}" data-minutes="${o.minutes}">${esc(o.label)}</option>`).join('')}</select></label><label>Duur (min)<input name="minutes" type="number" min="1" max="600" inputmode="numeric" required></label><label>RPE 0–10<input name="rpe" type="number" min="0" max="10" step="0.5" inputmode="decimal" required></label><label>Datum<input name="date" type="date" value="${today}" required></label><label>Volledig meegedaan?<select name="participation"><option value="full">Ja</option><option value="mostly">Grotendeels</option><option value="no">Nee</option></select></label><label>Notitie<textarea name="note" placeholder="Optioneel: benen zwaar, lekker getraind…"></textarea></label><button class="rpe-save" type="submit">Trainingscheck opslaan</button></form><div class="rpe-history">${history.map(x=>`<div class="rpe-row"><div><strong>${esc(x.activityName||'Training')} · RPE ${fmt(x.rpe,1)}</strong><small>${dateText(x.date)} · ${fmt(x.minutes)} min · belasting ${fmt(Number(x.minutes)*Number(x.rpe))}</small></div><button type="button" data-delete-rpe="${esc(x.id)}" aria-label="Verwijderen">×</button></div>`).join('')}</div>`;
    const form=section.querySelector('#rpeForm');
    form.elements.activity.addEventListener('change',()=>{
      const opt=form.elements.activity.selectedOptions[0], mins=opt?.dataset.minutes; if(mins) form.elements.minutes.value=mins;
    });
    form.addEventListener('submit',e=>{
      e.preventDefault(); const f=new FormData(form), raw=String(f.get('activity')||'');
      let name=raw.replace(/^plan:/,'').replace(/^garmin:\d+$/,'Garmin training');
      const opt=form.elements.activity.selectedOptions[0]; if(opt?.textContent) name=opt.textContent.replace(/^\d+\s+\w+\s+·\s+/,'');
      const row={id:`rpe-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,date:String(f.get('date')),activity:raw,activityName:name,minutes:Number(f.get('minutes')),rpe:Number(f.get('rpe')),participation:String(f.get('participation')),note:String(f.get('note')||'').trim(),createdAt:new Date().toISOString()};
      state[RPE_KEY].push(row); saveState(); renderSmartCoach(); try{renderProgress();}catch{}
    });
    section.querySelectorAll('[data-delete-rpe]').forEach(b=>b.addEventListener('click',()=>{ state[RPE_KEY]=state[RPE_KEY].filter(x=>x.id!==b.dataset.deleteRpe); saveState(); renderSmartCoach(); try{renderProgress();}catch{}; }));
  }
  function renderTrainingLoad(){
    const cur=srpeWindow(shift(-6),shift(0)), prev=srpeWindow(shift(-13),shift(-7));
    const section=document.getElementById('trainingLoadSection'); if(!section) return;
    const ratio=prev.load>0?cur.load/prev.load:null;
    const trend=ratio==null?'Nog geen volledige vergelijking':ratio>1.3?'Duidelijk hoger':ratio<.7?'Duidelijk lager':'Vergelijkbaar';
    section.innerHTML=`<p class="eyebrow">Trainingsbelasting</p><h3>Interne belasting via session-RPE</h3><p>Duur × RPE maakt verschil tussen 90 minuten rustig en 90 minuten zwaar. Alleen trainingen met een ingevulde check tellen mee in deze sRPE-trend.</p><div class="load-grid"><div class="recovery-trend-card"><small>AFGELOPEN 7 DAGEN</small><strong>${cur.rows.length?fmt(cur.load):'—'}</strong><span>${cur.rows.length} check-in${cur.rows.length===1?'':'s'} · ${fmt(cur.minutes)} min</span></div><div class="recovery-trend-card"><small>GEM. RPE</small><strong>${cur.avgRpe==null?'—':fmt(cur.avgRpe,1)}</strong><span>0–10 schaal</span></div><div class="recovery-trend-card"><small>VS. VORIGE 7 DAGEN</small><strong>${trend}</strong><span>${prev.rows.length?`${fmt(prev.load)} vorige belasting`:'meer check-ins nodig'}</span></div></div>`;
  }

  // --- Fueling instead of pseudo-precise energy balance ---
  function energyRows(start=shift(-6),end=shift(0)){
    return Object.entries(state.nutrition||{}).filter(([d])=>d>=start&&d<=end).map(([date,n])=>({date,eaten:Number(n?.calories),burned:burnedForDay(state.garminDaily?.[date])})).filter(x=>Number.isFinite(x.eaten)&&x.eaten>0&&Number.isFinite(x.burned)&&x.burned>0);
  }
  function fuelingStatus(){
    const rows=energyRows(); if(!rows.length) return {label:'Nog onvoldoende gekoppelde data',level:'unknown',rows};
    const ratio=avg(rows.map(x=>x.eaten/x.burned));
    const label=ratio<.88?'Waarschijnlijk laag voor je verbruik':ratio>1.12?'Waarschijnlijk ruim':'Globaal passend';
    return {label,level:ratio<.88?'low':ratio>1.12?'high':'ok',ratio,rows};
  }
  function renderFueling(){
    const f=fuelingStatus(), section=document.getElementById('energyBalanceSection'); if(!section) return;
    const eaten=avg(f.rows.map(x=>x.eaten)), burned=avg(f.rows.map(x=>x.burned));
    section.innerHTML=`<p class="eyebrow">Fueling · 7 dagen</p><h3>${f.label}</h3><p>Romy Health gebruikt energie in/uit als grove trend, niet als exact dagelijks tekort. Garmin-verbruik en voedingsinvoer zijn beide schattingen.</p><div class="energy-comparison"><div class="energy-side"><small>GEM. GEGETEN</small><strong>${eaten==null?'—':`${fmt(eaten)} kcal`}</strong></div><div class="energy-arrow">↔</div><div class="energy-side"><small>GEM. GARMIN</small><strong>${burned==null?'—':`${fmt(burned)} kcal`}</strong></div></div><div class="fuel-status"><strong>${f.rows.length}/7 dagen gekoppeld</strong><span>${f.level==='low'?'Bij veel training: kijk eerst naar herstel, prestaties en voldoende koolhydraten vóór je bewust lager gaat eten.':f.level==='high'?'Kijk naar de weektrend en je doel; één ruime dag zegt weinig.':'De beschikbare dagen liggen zonder groot verschil bij elkaar.'}</span></div>`;
  }

  // --- Data quality / freshness ---
  function formatSync(ts){ if(!ts)return 'nog niet'; const d=new Date(Number(ts)); return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(d):'onbekend'; }
  function renderDataQuality(){
    const tabs=document.getElementById('metricTabs'); if(!tabs) return;
    let el=document.getElementById('dataQualitySection');
    if(!el){ tabs.insertAdjacentHTML('beforebegin','<section id="dataQualitySection" class="smart-card" style="margin-bottom:12px"></section>'); el=document.getElementById('dataQualitySection'); }
    const garmin28=Object.keys(state.garminDaily||{}).filter(d=>d>=shift(-27)&&d<=shift(0)).length;
    const nutrition7=Object.keys(state.nutrition||{}).filter(d=>d>=shift(-6)&&d<=shift(0)).length;
    const rpe7=checkinsBetween(shift(-6),shift(0)).length;
    const today=state.nutrition?.[localKey()];
    const complete=!!(Number(today?.calories)>0&&Number(today?.protein)>0&&Number(today?.carbs)>0);
    const kg=Number(state.nutritionGoals?.bodyWeightKg);
    el.innerHTML=`<p class="eyebrow">Datakwaliteit</p><h3>Weet waarop je advies is gebaseerd</h3><div class="smart-grid"><div class="smart-mini"><small>GARMIN</small><strong>${garmin28}/28 dagen</strong><span>laatste sync ${formatSync(localStorage.getItem(GARMIN_SYNC_KEY))}</span></div><div class="smart-mini"><small>VOEDING</small><strong>${nutrition7}/7 dagen</strong><span>vandaag ${complete?'compleet':'nog niet compleet'}</span></div><div class="smart-mini"><small>RPE</small><strong>${rpe7} check-ins</strong><span>afgelopen 7 dagen</span></div><div class="smart-mini"><small>EIWITDOEL</small><strong>${Number.isFinite(kg)&&kg>0?`${fmt(kg,1)} kg ingesteld`:'gewicht ontbreekt'}</strong><span>${Number.isFinite(kg)&&kg>0?'persoonlijke zone actief':'vul gewicht in bij Instellingen'}</span></div></div>`;
  }

  function renderTodaySmartSummary(){
    const section=document.getElementById('dailyPerformanceSummary'); if(!section) return;
    const rec=recoveryBaseline(), f=fuelingStatus(), today=state.nutrition?.[localKey()], p=proteinStatus(today), plans=selectedPlans(), focus=planIntensity(plans);
    const focusEl=section.querySelector('.today-focus');
    if(focusEl){
      const recoveryText=rec.level==='lower'?'Herstel wijkt af; houd intensiteit flexibel.':rec.level==='watch'?'Eén herstelsignaal wijkt af; train op gevoel.':'';
      const fuelText=f.level==='low'?'Je 7-daagse fueling lijkt aan de lage kant.':'';
      focusEl.innerHTML=`<strong>Focus vandaag:</strong> ${[recoveryText,fuelText,focus.copy].filter(Boolean).join(' ')}`;
    }
    const energyMini=[...section.querySelectorAll('.performance-mini')].find(x=>x.querySelector('small')?.textContent.includes('ENERGIE'));
    if(energyMini){
      energyMini.querySelector('small').textContent='FUELING';
      energyMini.querySelector('strong').textContent=f.label;
      const parts=[]; if(today?.carbs!=null) parts.push(`${fmt(today.carbs)} g koolhydraten`); if(p) parts.push(p.label);
      energyMini.querySelector('span').textContent=parts.join(' · ')||'Voeding invullen geeft gerichter advies';
    }
  }

  async function maybeSync28Days(){
    const last=Number(localStorage.getItem(GARMIN_28_KEY)||0); if(Date.now()-last<6*60*60*1000) return;
    try{
      if(typeof cloud==='undefined'||!cloud?.auth||!cloud?.functions) return;
      const {data:{session}}=await cloud.auth.getSession(); if(!session) return;
      const {data,error}=await cloud.functions.invoke('garmin-sync',{body:{days:28}}); if(error||data?.error) return;
      if(typeof window.ingestGarminData==='function') window.ingestGarminData(data);
      localStorage.setItem(GARMIN_28_KEY,String(Date.now()));
      localStorage.setItem(GARMIN_SYNC_KEY,String(Date.now()));
      renderSmartCoach();
    }catch(err){ console.warn('28d Garmin sync overgeslagen',err); }
  }

  function installNutritionRenderer(){
    if(typeof renderNutrition!=='function'||renderNutrition._smartWrapped) return;
    const base=renderNutrition;
    const wrapped=function(){ base(); ensureCarbInput(); renderCarbCard(); };
    wrapped._smartWrapped=true; renderNutrition=wrapped;
  }

  window.renderSmartCoach=renderSmartCoach;
  function renderSmartCoach(){
    injectStyles(); ensureCarbInput(); installNutritionSave(); installNutritionRenderer();
    try{renderCarbCard();}catch{}
    ensureTodayPlan(); ensureRpeSection();
    renderRecovery(); renderTrainingLoad(); renderFueling(); renderDataQuality(); renderTodaySmartSummary();
  }

  // Re-apply smart content after the older renderers do their work.
  if(typeof renderDashboard==='function'){
    const base=renderDashboard;
    renderDashboard=function(){ const r=base(); setTimeout(renderSmartCoach,0); return r; };
  }
  if(typeof renderProgress==='function'){
    const base=renderProgress;
    renderProgress=function(){ const r=base(); setTimeout(()=>{renderRecovery();renderTrainingLoad();renderFueling();renderDataQuality();},0); return r; };
  }
  if(typeof renderTraining==='function'){
    const base=renderTraining;
    renderTraining=function(){ const r=base(); setTimeout(ensureRpeSection,0); return r; };
  }
  if(typeof renderGarminHealth==='function'){
    const base=renderGarminHealth;
    renderGarminHealth=function(){ const r=base(); setTimeout(()=>{renderRecovery();renderDataQuality();renderTodaySmartSummary();},0); return r; };
  }

  renderSmartCoach();
  setTimeout(maybeSync28Days,2600);
})();
