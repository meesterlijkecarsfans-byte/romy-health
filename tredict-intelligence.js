// Tredict intelligence bridge for Romy Health.
// Uses a locally stored/snapshotted Tredict model so the UI works without exposing OAuth credentials in the PWA.
(function(){
  const DEFAULT_SNAPSHOT={
    date:'2026-10-28',
    fitness:1377,
    fatigue:947,
    performance:393,
    effort7:712,
    effortPrev7:623,
    runningIntensity:{low:64,medium:27,high:10},
    note:'Tredict snapshot via ChatGPT connector'
  };
  const RUN_ZONES=[
    {z:'Z1',name:'Herstel',pace:'7:05–7:30+',hr:'< 140 bpm',hint:'heel rustig · herstel / loslopen'},
    {z:'Z2',name:'Easy',pace:'6:40–7:05',hr:'140–154 bpm',hint:'duurloop · gesprekstempo'},
    {z:'Z3',name:'Steady',pace:'5:50–6:35',hr:'155–165 bpm',hint:'steady / marathongericht'},
    {z:'Z4',name:'Tempo',pace:'5:10–5:50',hr:'166–178 bpm',hint:'tempo / drempelachtig'},
    {z:'Z5',name:'Interval',pace:'< 5:10',hr:'179+ bpm',hint:'korte intensieve blokken'}
  ];

  function fmt(v,d=0){return v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d});}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function snapshot(){return state.tredictSnapshot||DEFAULT_SNAPSHOT;}
  function isRun(a){const t=`${a?.type||''} ${a?.name||''}`.toLowerCase();return t.includes('run')||t.includes('hardloop');}
  function activityDate(a){return String(a?.date||a?.startTimeLocal||a?.startTime||'').slice(0,10);}
  function parseKm(text){const m=String(text||'').match(/(\d+(?:[,.]\d+)?)\s*km/i);return m?Number(m[1].replace(',','.')):null;}
  function parsePaceRange(text){
    const m=String(text||'').match(/(\d:\d{2})\s*[–-]\s*(\d:\d{2})\s*\/km/i);
    return m?{from:m[1],to:m[2]}:null;
  }
  function paceToSec(p){const m=String(p||'').match(/(\d+):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):null;}
  function secToPace(sec){if(!Number.isFinite(sec)||sec<=0)return '—';const m=Math.floor(sec/60),s=Math.round(sec%60);return `${m}:${String(s).padStart(2,'0')}/km`;}
  function weekBounds(year,week){
    const jan4=new Date(Date.UTC(year,0,4));
    const jan4Day=jan4.getUTCDay()||7;
    const monday=new Date(jan4); monday.setUTCDate(jan4.getUTCDate()-(jan4Day-1)+(week-1)*7);
    const sunday=new Date(monday); sunday.setUTCDate(monday.getUTCDate()+6);
    return {start:monday.toISOString().slice(0,10),end:sunday.toISOString().slice(0,10)};
  }

  function injectStyles(){
    if(document.getElementById('tredictIntelligenceStyles')) return;
    const s=document.createElement('style'); s.id='tredictIntelligenceStyles';
    s.textContent=`
      .tredict-card{border:1px solid var(--line);background:var(--surface);border-radius:24px;padding:18px;box-shadow:0 6px 22px rgba(45,27,36,.045)}
      .tredict-card h3{margin:4px 0 0;font-size:20px;letter-spacing:-.4px}.tredict-card p{margin:7px 0 0;color:var(--muted);font-size:12px;line-height:1.5}
      .tredict-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:12px}.tredict-mini{padding:12px;border:1px solid var(--line);border-radius:16px;background:var(--surface-soft)}.tredict-mini small{display:block;color:var(--muted);font-size:9px;font-weight:780}.tredict-mini strong{display:block;margin-top:4px;font-size:18px}.tredict-mini span{display:block;margin-top:3px;color:var(--muted);font-size:10px;line-height:1.3}
      .zone-card{margin:14px 0 12px}.zone-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-top:12px}.zone-item{border:1px solid var(--line);border-radius:15px;padding:11px;background:var(--surface-soft)}.zone-item b{font-size:13px}.zone-item strong{display:block;margin-top:5px;font-size:15px}.zone-item small{display:block;color:var(--muted);font-size:9px;line-height:1.35;margin-top:3px}
      .intensity-bar{display:flex;height:10px;border-radius:999px;overflow:hidden;background:#eee7eb;margin-top:10px}.intensity-bar span:nth-child(1){background:#7ab99a}.intensity-bar span:nth-child(2){background:#e8b66a}.intensity-bar span:nth-child(3){background:#d96876}.intensity-legend{display:flex;gap:10px;flex-wrap:wrap;margin-top:7px;color:var(--muted);font-size:10px}
      .plan-actual-list{display:grid;gap:8px;margin-top:12px}.plan-actual-row{border:1px solid var(--line);border-radius:16px;padding:12px}.plan-actual-row>div{display:flex;justify-content:space-between;gap:12px}.plan-actual-row small{display:block;color:var(--muted);margin-top:4px;line-height:1.4}.plan-badge{font-size:10px;font-weight:780;border-radius:999px;padding:5px 8px;background:var(--surface-soft);white-space:nowrap;height:max-content}
      .tredict-import{margin-top:10px;display:flex;gap:7px}.tredict-import input{flex:1;min-width:0;border:1px solid var(--line);border-radius:11px;padding:9px}.tredict-import button{border:0;background:var(--pink);color:white;border-radius:11px;padding:9px 11px;font-weight:760}
      @media(max-width:620px){.tredict-grid{grid-template-columns:1fr 1fr}.zone-grid{grid-template-columns:1fr 1fr}.zone-item:last-child{grid-column:1/-1}}
    `;
    document.head.appendChild(s);
  }

  function renderZoneCard(){
    const filters=document.getElementById('runFilters'); if(!filters) return;
    let card=document.getElementById('runningZoneEstimate');
    if(!card){ filters.insertAdjacentHTML('beforebegin','<section id="runningZoneEstimate" class="tredict-card zone-card"></section>'); card=document.getElementById('runningZoneEstimate'); }
    card.innerHTML=`<p class="eyebrow">Geschatte loopzones</p><h3>Tempo per zone</h3><p>Tredict heeft nog geen eigen zonegrenzen opgeslagen. Daarom zijn dit praktische schattingen op basis van je recente Tredict/Garmin-runs en je huidige loopschema. Hartslag, terrein, weer en gevoel gaan vóór tempo.</p><div class="zone-grid">${RUN_ZONES.map(z=>`<div class="zone-item"><b>${z.z} · ${z.name}</b><strong>${z.pace}</strong><small>${z.hr}</small><small>${z.hint}</small></div>`).join('')}</div>`;
  }

  function matchPlanToRuns(plan){
    if(!plan) return [];
    const bounds=weekBounds(plan.year,plan.week);
    const runs=(state.garminActivities||[]).filter(a=>isRun(a)&&activityDate(a)>=bounds.start&&activityDate(a)<=bounds.end).map(a=>({a,km:Number(a.distanceKm)||0,date:activityDate(a)})).filter(x=>x.km>0);
    const used=new Set();
    return ['run1','run2'].map(key=>{
      const text=plan[key], targetKm=parseKm(text), pace=parsePaceRange(text);
      let best=null,bestIndex=-1,bestDiff=Infinity;
      runs.forEach((r,i)=>{if(used.has(i)||!targetKm)return;const diff=Math.abs(r.km-targetKm)/targetKm;if(diff<bestDiff){bestDiff=diff;best=r;bestIndex=i;}});
      if(best&&bestDiff<=.35) used.add(bestIndex); else best=null;
      if(!best) return {key,text,targetKm,pace,status:'Nog niet gekoppeld',tone:'neutral'};
      const seconds=Number(best.a.durationSeconds), actualPace=seconds>0&&best.km>0?seconds/best.km:null;
      let status=bestDiff<=.10?'Afstand goed':'Afstand wijkt af',tone=bestDiff<=.10?'good':'watch';
      if(actualPace&&pace){const lo=paceToSec(pace.from),hi=paceToSec(pace.to);if(lo&&hi){const fast=Math.min(lo,hi),slow=Math.max(lo,hi);if(actualPace<fast-8){status='Sneller dan gepland';tone='watch';}else if(actualPace>slow+12){status='Rustiger dan gepland';tone='watch';}}}
      return {key,text,targetKm,pace,best,actualPace,status,tone};
    });
  }

  function renderPlanActual(){
    const filters=document.getElementById('runFilters'); if(!filters||typeof currentPlan!=='function') return;
    let card=document.getElementById('planVsActualCard');
    if(!card){ filters.insertAdjacentHTML('beforebegin','<section id="planVsActualCard" class="tredict-card" style="margin:0 0 12px"></section>'); card=document.getElementById('planVsActualCard'); }
    const plan=currentPlan(), rows=matchPlanToRuns(plan);
    card.innerHTML=`<p class="eyebrow">Gepland vs uitgevoerd</p><h3>Week ${plan.week}</h3><p>Romy Health vergelijkt je eigen marathonschema met geregistreerde runs. Tredict heeft momenteel geen aparte geplande workouts in je Tredict-kalender.</p><div class="plan-actual-list">${rows.map((r,i)=>`<div class="plan-actual-row"><div><strong>Run ${i+1} · ${r.targetKm?`${fmt(r.targetKm,1)} km`:'schema'}</strong><span class="plan-badge">${r.status}</span></div><small>Plan: ${esc(r.text)}</small><small>${r.best?`Gedaan: ${fmt(r.best.km,1)} km${r.actualPace?` · ${secToPace(r.actualPace)}`:''} · ${r.best.date}`:'Nog geen passende Garmin-run in deze week gevonden.'}</small></div>`).join('')}</div>`;
  }

  function renderTodayTredict(){
    const todayView=document.getElementById('view-today'); if(!todayView) return;
    const planning=[...todayView.querySelectorAll('.section-heading')].find(x=>x.textContent.includes('Planning'));
    if(!planning) return;
    let card=document.getElementById('tredictTodayCard');
    if(!card){ planning.insertAdjacentHTML('beforebegin','<section id="tredictTodayCard" class="tredict-card" style="margin-top:12px"></section>'); card=document.getElementById('tredictTodayCard'); }
    const s=snapshot(), delta=s.effortPrev7>0?(s.effort7/s.effortPrev7-1)*100:null;
    card.innerHTML=`<p class="eyebrow">Tredict intelligence</p><h3>Trainingstatus</h3><div class="tredict-grid"><div class="tredict-mini"><small>FITNESS</small><strong>${fmt(s.fitness)}</strong><span>Tredict-modelwaarde</span></div><div class="tredict-mini"><small>FATIGUE</small><strong>${fmt(s.fatigue)}</strong><span>opgebouwde vermoeidheid</span></div><div class="tredict-mini"><small>PERFORMANCE</small><strong>${fmt(s.performance)}</strong><span>modelwaarde vandaag</span></div><div class="tredict-mini"><small>EFFORT · 7D</small><strong>${fmt(s.effort7)}</strong><span>${delta==null?'geen vergelijking':`${delta>=0?'+':''}${fmt(delta)}% vs vorige 7d`}</span></div></div><p>Gebruik vooral de trend van deze waarden; het zijn geen percentages of rapportcijfers. Snapshot ${esc(s.date)}.</p>`;
  }

  function currentSrpe7(){
    const rows=(state.trainingCheckins||[]).filter(x=>{const d=String(x.date||'');const cutoff=new Date();cutoff.setDate(cutoff.getDate()-6);const k=`${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,'0')}-${String(cutoff.getDate()).padStart(2,'0')}`;return d>=k&&d<=today();});
    return rows.reduce((sum,x)=>sum+(Number(x.minutes)||0)*(Number(x.rpe)||0),0);
  }

  function renderProgressTredict(){
    const tabs=document.getElementById('metricTabs'); if(!tabs) return;
    let card=document.getElementById('tredictProgressCard');
    if(!card){ tabs.insertAdjacentHTML('beforebegin','<section id="tredictProgressCard" class="tredict-card" style="margin-bottom:12px"></section>'); card=document.getElementById('tredictProgressCard'); }
    const s=snapshot(), dist=s.runningIntensity||{}, total=Number(dist.low||0)+Number(dist.medium||0)+Number(dist.high||0), srpe=currentSrpe7();
    const low=total?Number(dist.low)/total*100:0,med=total?Number(dist.medium)/total*100:0,high=total?Number(dist.high)/total*100:0;
    card.innerHTML=`<p class="eyebrow">Tredict · hardlopen</p><h3>Effort & intensiteitsverdeling</h3><div class="tredict-grid"><div class="tredict-mini"><small>TREDICT EFFORT · 7D</small><strong>${fmt(s.effort7)}</strong><span>vorige 7d ${fmt(s.effortPrev7)}</span></div><div class="tredict-mini"><small>ROMY sRPE · 7D</small><strong>${srpe?fmt(srpe):'—'}</strong><span>${srpe?'subjectieve interne belasting':'meer RPE-checks nodig'}</span></div><div class="tredict-mini"><small>FITNESS</small><strong>${fmt(s.fitness)}</strong><span>modeltrend</span></div><div class="tredict-mini"><small>FATIGUE</small><strong>${fmt(s.fatigue)}</strong><span>modeltrend</span></div></div><div class="intensity-bar"><span style="width:${low}%"></span><span style="width:${med}%"></span><span style="width:${high}%"></span></div><div class="intensity-legend"><span>Laag ${fmt(low)}%</span><span>Midden ${fmt(med)}%</span><span>Hoog ${fmt(high)}%</span></div><p>Deze intensiteitsverdeling komt uit de huidige Tredict-snapshot voor hardlopen. Romy Health houdt Tredict effort en jouw eigen session-RPE naast elkaar omdat ze iets anders meten.</p>`;
  }

  function parseImport(raw){
    const p=String(raw||'').trim().split('|');
    if(p[0]!=='TRD'||p.length<10) return null;
    const n=i=>{const x=Number(String(p[i]).replace(',','.'));return Number.isFinite(x)?x:null;};
    if(!/^\d{4}-\d{2}-\d{2}$/.test(p[1])) return null;
    return {date:p[1],fitness:n(2),fatigue:n(3),performance:n(4),effort7:n(5),effortPrev7:n(6),runningIntensity:{low:n(7),medium:n(8),high:n(9)},note:'Tredict import'};
  }
  window.ingestTredictSnapshot=function(value){ if(!value)return false;state.tredictSnapshot=value;saveState();renderAll();return true; };

  function ensureSettings(){
    const list=document.querySelector('#settingsModal .settings-list'); if(!list||document.getElementById('tredictSettingsCard')) return;
    const box=document.createElement('div');box.id='tredictSettingsCard';box.className='tredict-card';
    box.innerHTML=`<strong style="display:block">↗ Tredict intelligence</strong><small style="display:block;margin-top:5px;color:var(--muted);line-height:1.4">De PWA kan je ChatGPT/Tredict-login niet rechtstreeks gebruiken. Plak hier later een nieuwe TRD-snapshot om de analyse te vernieuwen.</small><div class="tredict-import"><input id="tredictImportInput" placeholder="TRD|2026-10-28|1377|947|393|712|623|64|27|10"><button id="tredictImportButton" type="button">Bijwerken</button></div><small id="tredictImportStatus" style="display:block;margin-top:6px;color:var(--muted)"></small>`;
    list.appendChild(box);
    box.querySelector('#tredictImportButton').addEventListener('click',()=>{
      const parsed=parseImport(box.querySelector('#tredictImportInput').value),status=box.querySelector('#tredictImportStatus');
      if(!parsed){status.textContent='Code niet herkend.';return;}
      state.tredictSnapshot=parsed;saveState();status.textContent=`✓ Tredict bijgewerkt: ${parsed.date}`;renderAll();
    });
  }

  function renderAll(){
    injectStyles();renderZoneCard();renderPlanActual();renderTodayTredict();renderProgressTredict();ensureSettings();
  }

  if(typeof renderRunPlan==='function'){
    const base=renderRunPlan;renderRunPlan=function(){const r=base();setTimeout(()=>{renderZoneCard();renderPlanActual();},0);return r;};
  }
  if(typeof renderDashboard==='function'){
    const base=renderDashboard;renderDashboard=function(){const r=base();setTimeout(renderTodayTredict,0);return r;};
  }
  if(typeof renderProgress==='function'){
    const base=renderProgress;renderProgress=function(){const r=base();setTimeout(renderProgressTredict,0);return r;};
  }
  if(typeof window.ingestGarminData==='function'){
    const base=window.ingestGarminData;window.ingestGarminData=function(payload){base(payload);setTimeout(()=>{renderPlanActual();renderTodayTredict();},0);};
  }

  renderAll();
})();