// Romy Health smart features v2
// Automatic Garmin review, strength progression, conflict checks, weather/fueling and weekly coach.
(function(){
  const WEATHER_CACHE_KEY='romy-health-weather-cache-v1';
  const WEATHER_TTL=60*60*1000;
  state.trainingCheckins ||= [];
  state.dailyPlans ||= {};

  function localKey(date=new Date()){
    const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  function dateShift(days){ const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+days); return localKey(d); }
  function fmt(v,d=0){ return v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d}); }
  function avg(vals){ const n=vals.map(Number).filter(Number.isFinite); return n.length?n.reduce((a,b)=>a+b,0)/n.length:null; }
  function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function activityDate(a){ return String(a?.date||a?.startTimeLocal||a?.startTime||'').slice(0,10); }
  function activityName(a){ return String(a?.name||a?.type||'Garmin training'); }
  function activityMinutes(a){ const s=Number(a?.durationSeconds); return Number.isFinite(s)&&s>0?Math.max(1,Math.round(s/60)):null; }
  function activityId(a){ return String(a?.id||`${activityDate(a)}-${activityName(a)}`); }
  function typeText(a){ return `${a?.type||''} ${a?.name||''}`.toLowerCase(); }
  function isRun(a){ const t=typeText(a); return t.includes('run')||t.includes('hardloop'); }
  function selectedPlans(date=localKey()){ return Array.isArray(state.dailyPlans?.[date])?state.dailyPlans[date]:[]; }

  function injectStyles(){
    if(document.getElementById('smartFeaturesV2Styles')) return;
    const s=document.createElement('style'); s.id='smartFeaturesV2Styles';
    s.textContent=`
      .smart-v2-card{border:1px solid var(--line);background:var(--surface);border-radius:24px;padding:18px;box-shadow:0 6px 22px rgba(45,27,36,.045)}
      .smart-v2-card h3{margin:4px 0 0;font-size:20px;letter-spacing:-.45px}.smart-v2-card p{margin:7px 0 0;color:var(--muted);font-size:12px;line-height:1.5}
      .pending-review{margin-bottom:12px;background:#fff8fb;border-color:#f5d7e4}.pending-head{display:flex;justify-content:space-between;gap:12px;align-items:start}.pending-meta{color:var(--muted);font-size:11px;margin-top:4px}
      .quick-rpe{display:grid;grid-template-columns:1fr .8fr auto;gap:8px;margin-top:12px;align-items:end}.quick-rpe label{display:grid;gap:5px;color:var(--muted);font-size:10px;font-weight:750}.quick-rpe input,.quick-rpe select{width:100%;border:1px solid var(--line);border-radius:11px;padding:9px;background:#fff}.quick-rpe button{border:0;background:var(--pink);color:white;border-radius:11px;padding:10px 12px;font-weight:780}
      .progression-note{margin-top:8px;padding:9px 11px;border-radius:12px;background:var(--surface-soft);border:1px solid #f3dce6;font-size:11px;line-height:1.4}.progression-note strong{font-size:11px}
      .warning-list{display:grid;gap:8px;margin-top:12px}.smart-warning{padding:11px 12px;border-radius:14px;background:#fff8f2;border:1px solid #f1dfca}.smart-warning strong{display:block;font-size:12px}.smart-warning span{display:block;margin-top:3px;color:var(--muted);font-size:11px;line-height:1.4}.smart-warning.ok{background:#f5fbf7;border-color:#dceee2}
      .weather-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}.weather-mini{padding:12px;border:1px solid var(--line);border-radius:15px;background:var(--surface-soft)}.weather-mini small{display:block;color:var(--muted);font-size:9px;font-weight:750}.weather-mini strong{display:block;margin-top:4px;font-size:17px}.weather-button{margin-top:12px;border:0;background:var(--pink);color:white;border-radius:12px;padding:10px 12px;font-weight:780;width:100%}
      .coach-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:12px}.coach-mini{padding:13px;border-radius:16px;background:var(--surface-soft);border:1px solid var(--line)}.coach-mini small{display:block;color:var(--muted);font-size:9px;font-weight:750}.coach-mini strong{display:block;font-size:17px;margin-top:4px}.coach-points{margin:12px 0 0;padding-left:18px;color:var(--text);font-size:12px;line-height:1.55}.coach-points li+li{margin-top:5px}
      @media(max-width:560px){.quick-rpe{grid-template-columns:1fr 1fr}.quick-rpe button{grid-column:1/-1}.weather-row,.coach-grid{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(s);
  }

  // 1) Automatic Garmin -> RPE review
  function checkinMatchesActivity(c,a){
    if(c?.garminActivityId && String(c.garminActivityId)===activityId(a)) return true;
    if(String(c?.date||'')!==activityDate(a)) return false;
    const cn=String(c?.activityName||'').toLowerCase(), an=activityName(a).toLowerCase();
    if(cn && (cn.includes(an)||an.includes(cn))) return true;
    const cm=Number(c?.minutes), am=activityMinutes(a);
    return Number.isFinite(cm)&&am!=null&&Math.abs(cm-am)<=3;
  }
  function pendingGarminActivities(){
    const cutoff=dateShift(-3);
    return (state.garminActivities||[])
      .filter(a=>activityDate(a)>=cutoff && activityMinutes(a)!=null)
      .filter(a=>!(state.trainingCheckins||[]).some(c=>checkinMatchesActivity(c,a)))
      .sort((a,b)=>String(activityDate(b)).localeCompare(String(activityDate(a))));
  }
  function renderPendingGarminReview(){
    const section=document.getElementById('trainingCheckinSection'); if(!section) return;
    section.querySelector('#pendingGarminReview')?.remove();
    const pending=pendingGarminActivities(); if(!pending.length) return;
    const a=pending[0], mins=activityMinutes(a), date=activityDate(a);
    const wrap=document.createElement('div'); wrap.id='pendingGarminReview'; wrap.className='smart-v2-card pending-review';
    wrap.innerHTML=`<div class="pending-head"><div><p class="eyebrow">Garmin gevonden</p><h3>${esc(activityName(a))}</h3><div class="pending-meta">${esc(date)} · ${fmt(mins)} min${a.distanceKm?` · ${fmt(a.distanceKm,1)} km`:''}</div></div><span class="quality-pill">${pending.length} open</span></div><p>Datum en duur zijn al ingevuld. Geef alleen aan hoe zwaar de training voelde.</p><form class="quick-rpe" id="quickGarminRpe"><label>RPE 0–10<input name="rpe" type="number" min="0" max="10" step="0.5" required inputmode="decimal"></label><label>Meegedaan<select name="participation"><option value="full">Volledig</option><option value="mostly">Grotendeels</option><option value="no">Niet volledig</option></select></label><button type="submit">Opslaan</button></form>`;
    section.prepend(wrap);
    wrap.querySelector('form').addEventListener('submit',e=>{
      e.preventDefault(); const f=new FormData(e.currentTarget), rpe=Number(f.get('rpe'));
      if(!Number.isFinite(rpe)||rpe<0||rpe>10) return;
      state.trainingCheckins.push({
        id:`rpe-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
        date,activity:`garmin-id:${activityId(a)}`,activityName:activityName(a),garminActivityId:activityId(a),
        minutes:mins,rpe,participation:String(f.get('participation')||'full'),note:'',createdAt:new Date().toISOString()
      });
      saveState();
      try{window.renderSmartCoach?.();renderProgress?.();}catch{}
      setTimeout(renderSmartFeaturesV2,0);
    });
  }

  // 2) Strength progression suggestions
  function targetRepRange(target){
    const nums=String(target||'').match(/\d+/g)?.map(Number)||[];
    if(!nums.length) return null;
    return {min:nums[0],max:nums[1]||nums[0]};
  }
  function numericSets(ex){ return (ex?.sets||[]).filter(s=>s?.done||s?.reps||s?.weight).map(s=>({reps:Number(s.reps),weight:Number(s.weight)})); }
  function progressionFor(exerciseId,type){
    const sessions=(state.strengthSessions||[]).filter(s=>s.type===type).slice(-2);
    const last=sessions.at(-1); if(!last) return 'Eerste referentie: log je sets; daarna kan Romy Health progressie adviseren.';
    const ex=last.exercises?.find(x=>x.id===exerciseId), template=typeof STRENGTH_TEMPLATES!=='undefined'?STRENGTH_TEMPLATES[type]?.exercises?.find(x=>x.id===exerciseId):null;
    const sets=numericSets(ex); if(!sets.length) return 'Vorige training bevat nog te weinig ingevulde sets voor advies.';
    if(template?.noWeight){
      const range=targetRepRange(template.target), reps=sets.map(s=>s.reps).filter(Number.isFinite);
      if(range&&reps.length&&Math.min(...reps)>=range.max) return 'Doel gehaald. Maak de variant iets uitdagender of verleng/verhoog gecontroleerd.';
      return 'Bouw eerst reps of tijd binnen dezelfde variant verder uit.';
    }
    const range=targetRepRange(template?.target), reps=sets.map(s=>s.reps).filter(Number.isFinite), weights=sets.map(s=>s.weight).filter(x=>Number.isFinite(x)&&x>0);
    if(!range||!reps.length||!weights.length) return 'Gebruik dezelfde belasting en probeer de uitvoering of reps te verbeteren.';
    const minRep=Math.min(...reps), sameWeight=Math.max(...weights)-Math.min(...weights)<0.01;
    if(minRep>=range.max && sameWeight) return 'Alle werksets bovenin je rep-range: volgende keer een kleine stap omhoog in gewicht (ongeveer 2–5%).';
    if(minRep>=range.min) return 'Binnen je rep-range: houd het gewicht en probeer 1 rep extra op één of meer sets.';
    const lowSets=reps.filter(r=>r<range.min).length;
    if(lowSets>=Math.ceil(reps.length/2)) return 'Meerdere sets onder je rep-range: houd het gewicht gelijk of schakel 2–5% terug en bouw opnieuw op.';
    return 'Bijna in de doelzone: houd het gewicht nog een training gelijk.';
  }
  function applyStrengthProgression(){
    if(typeof STRENGTH_TEMPLATES==='undefined') return;
    const draft=state.strengthDraft; if(!draft) return;
    document.querySelectorAll('#strengthApp .strength-exercise').forEach(card=>{
      if(card.querySelector('.progression-note')) return;
      const title=card.querySelector('h3')?.textContent; if(!title) return;
      const template=STRENGTH_TEMPLATES[draft.type]?.exercises?.find(x=>x.name===title); if(!template) return;
      const note=document.createElement('div'); note.className='progression-note';
      note.innerHTML=`<strong>Progressieadvies</strong><br>${esc(progressionFor(template.id,draft.type))}`;
      card.querySelector('.strength-exercise-head')?.insertAdjacentElement('afterend',note);
    });
  }
  function wrapStrengthRenderer(){
    if(typeof renderStrengthView!=='function'||renderStrengthView._smartV2Wrapped) return;
    const base=renderStrengthView;
    const wrapped=function(){ const r=base(); setTimeout(applyStrengthProgression,0); return r; };
    wrapped._smartV2Wrapped=true; renderStrengthView=wrapped;
    applyStrengthProgression();
  }

  // 3) Training conflict detection
  function srpeRecent(days=2){
    const start=dateShift(-(days-1));
    return (state.trainingCheckins||[]).filter(x=>x.date>=start&&x.date<=localKey()).map(x=>({...x,load:Number(x.minutes)*Number(x.rpe)}));
  }
  function conflictMessages(){
    const plans=selectedPlans(), yesterday=dateShift(-1), yRows=(state.trainingCheckins||[]).filter(x=>x.date===yesterday);
    const msgs=[];
    const hardIds=plans.filter(id=>/run2|tritanium|kracht|tweeslag|donitas|spinning/.test(id));
    if(plans.length>=2) msgs.push({title:'Dubbele trainingsdag',copy:'Twee of meer sessies op één dag. Plan koolhydraten en drinken tussen de sessies en maak één sessie niet zwaarder dan nodig.'});
    if(plans.some(x=>x==='run2'||x==='tritanium') && plans.some(x=>x.startsWith('kracht'))) msgs.push({title:'Veel beenbelasting op één dag',copy:'Lange/intensieve loop + kracht kan elkaar bijten. Houd kracht technisch/compact of zet de zwaarste beenprikkel op een andere dag.'});
    const yLoad=yRows.reduce((s,x)=>s+(Number(x.minutes)||0)*(Number(x.rpe)||0),0);
    if(yLoad>=450 && hardIds.length) msgs.push({title:'Gisteren was al zwaar',copy:`Gisteren stond ongeveer ${fmt(yLoad)} sRPE-belasting. Als je benen of energie vandaag minder zijn, schaal volume of intensiteit terug.`});
    const hard48=srpeRecent(2).filter(x=>Number(x.rpe)>=7 && Number(x.minutes)>=45).length;
    if(hard48>=2 && hardIds.length) msgs.push({title:'Meerdere zware prikkels kort op elkaar',copy:'Je hebt al meerdere zware sessies in ongeveer 48 uur geregistreerd. Maak vandaag bewust onderscheid tussen een sleuteltraining en extra volume.'});
    if(!msgs.length) msgs.push({title:'Geen duidelijk trainingsconflict',copy:'Op basis van je planning en recente RPE-checks zie ik geen opvallende stapeling. Gevoel blijft leidend.',ok:true});
    return msgs.slice(0,3);
  }
  function renderConflictCard(){
    const plan=document.getElementById('smartTodayPlan'); if(!plan) return;
    let card=document.getElementById('trainingConflictCard');
    if(!card){ plan.insertAdjacentHTML('afterend','<section id="trainingConflictCard" class="smart-v2-card" style="margin-top:12px"></section>'); card=document.getElementById('trainingConflictCard'); }
    const msgs=conflictMessages();
    card.innerHTML=`<p class="eyebrow">Belastingscheck</p><h3>Past je training logisch bij de afgelopen dagen?</h3><div class="warning-list">${msgs.map(m=>`<div class="smart-warning ${m.ok?'ok':''}"><strong>${esc(m.title)}</strong><span>${esc(m.copy)}</span></div>`).join('')}</div>`;
  }

  // 4) Weather-aware fueling & hydration
  function readWeatherCache(){ try{ const x=JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY)||'null'); return x&&Date.now()-x.savedAt<WEATHER_TTL?x:null; }catch{return null;} }
  function saveWeatherCache(data){ localStorage.setItem(WEATHER_CACHE_KEY,JSON.stringify({...data,savedAt:Date.now()})); }
  async function fetchWeatherForLocation(lat,lon){
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m&timezone=auto`;
    const res=await fetch(url,{headers:{Accept:'application/json'}}); if(!res.ok) throw new Error(`Weer ophalen mislukt (${res.status})`);
    const j=await res.json(), c=j.current||{};
    const out={temp:Number(c.temperature_2m),feels:Number(c.apparent_temperature),humidity:Number(c.relative_humidity_2m),rain:Number(c.precipitation),wind:Number(c.wind_speed_10m)};
    saveWeatherCache(out); return out;
  }
  function getBrowserWeather(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation) return reject(new Error('Locatie is niet beschikbaar in deze browser.'));
      navigator.geolocation.getCurrentPosition(async pos=>{
        try{ resolve(await fetchWeatherForLocation(pos.coords.latitude,pos.coords.longitude)); }catch(e){reject(e);}
      },()=>reject(new Error('Locatietoegang is niet toegestaan.')),{enableHighAccuracy:false,timeout:10000,maximumAge:30*60*1000});
    });
  }
  function plannedLongRun(){
    const plans=selectedPlans(); if(!plans.includes('run2')) return null;
    try{
      const p=typeof currentPlan==='function'?currentPlan():null, text=String(p?.run2||'');
      const m=text.match(/(\d+(?:[,.]\d+)?)\s*km/i); return m?Number(m[1].replace(',','.')):null;
    }catch{return null;}
  }
  function weatherAdvice(w){
    const plans=selectedPlans(), longKm=plannedLongRun(), pieces=[];
    if(plans.length>=2) pieces.push('Dubbele trainingsdag: plan koolhydraten en vocht tussen de sessies.');
    if(longKm&&longKm>=12) pieces.push(`${fmt(longKm,0)} km gepland: neem brandstof/drinken mee in plaats van alles achteraf in te halen.`);
    if(w&&Number.isFinite(w.temp)){
      if(w.temp>=23 || w.feels>=25) pieces.push('Warm weer: start goed gehydrateerd en neem extra drinken mee; prestatie gaat vóór een calorietekort.');
      else if(w.temp>=18 && (longKm>=12||plans.length>=2)) pieces.push('Mild-warm: drinken bewust plannen is verstandig bij deze trainingsduur.');
      if(w.wind>=30) pieces.push('Veel wind: stuur op inspanning/hartslag, niet star op tempo.');
    }
    if(!pieces.length) pieces.push(plans.length?'Normale trainingsdag: voldoende koolhydraten rond de sessie en drinken op dorst.':'Geen zware sessie gepland: normaal eten en herstel prioriteren.');
    return pieces.join(' ');
  }
  function renderWeatherCard(){
    const conflict=document.getElementById('trainingConflictCard')||document.getElementById('smartTodayPlan'); if(!conflict) return;
    let card=document.getElementById('weatherFuelCard');
    if(!card){ conflict.insertAdjacentHTML('afterend','<section id="weatherFuelCard" class="smart-v2-card" style="margin-top:12px"></section>'); card=document.getElementById('weatherFuelCard'); }
    const w=readWeatherCache();
    card.innerHTML=`<p class="eyebrow">Weer × fueling</p><h3>${w&&Number.isFinite(w.temp)?`${fmt(w.temp,0)}°C buiten`:'Maak advies weerslim'}</h3>${w?`<div class="weather-row"><div class="weather-mini"><small>GEVOELSTEMP.</small><strong>${fmt(w.feels,0)}°</strong></div><div class="weather-mini"><small>LUCHTVOCHTIGHEID</small><strong>${fmt(w.humidity)}%</strong></div><div class="weather-mini"><small>WIND</small><strong>${fmt(w.wind)} km/u</strong></div></div>`:''}<div class="fuel-status"><strong>Advies</strong><span>${esc(weatherAdvice(w))}</span></div>${!w?'<button type="button" id="enableWeatherButton" class="weather-button">Gebruik mijn locatie voor weeradvies</button>':'<button type="button" id="refreshWeatherButton" class="text-button" style="margin-top:10px">Weer vernieuwen</button>'}`;
    const go=async btn=>{ btn.disabled=true; const old=btn.textContent; btn.textContent='Weer ophalen…'; try{ await getBrowserWeather(); renderWeatherCard(); }catch(e){btn.disabled=false;btn.textContent=old;alert(e.message||e);} };
    card.querySelector('#enableWeatherButton')?.addEventListener('click',e=>go(e.currentTarget));
    card.querySelector('#refreshWeatherButton')?.addEventListener('click',e=>go(e.currentTarget));
  }

  // 5) Weekly coach summary
  function weeklyMetrics(){
    const start=dateShift(-6), end=localKey();
    const checkins=(state.trainingCheckins||[]).filter(x=>x.date>=start&&x.date<=end);
    const load=checkins.reduce((s,x)=>s+(Number(x.minutes)||0)*(Number(x.rpe)||0),0), minutes=checkins.reduce((s,x)=>s+(Number(x.minutes)||0),0), avgRpe=avg(checkins.map(x=>x.rpe));
    const garminDays=Object.entries(state.garminDaily||{}).filter(([d])=>d>=start&&d<=end), sleep=avg(garminDays.map(([,v])=>v.sleepHours));
    const nutrition=Object.entries(state.nutrition||{}).filter(([d])=>d>=start&&d<=end), protein=avg(nutrition.map(([,v])=>v.protein)), carbs=avg(nutrition.map(([,v])=>v.carbs));
    const runs=(state.garminActivities||[]).filter(a=>activityDate(a)>=start&&activityDate(a)<=end&&isRun(a)), km=runs.reduce((s,a)=>s+(Number(a.distanceKm)||0),0);
    const strength=(state.strengthSessions||[]).filter(s=>String(s.date||'')>=start&&String(s.date||'')<=end).length;
    return {checkins,load,minutes,avgRpe,sleep,nutritionDays:nutrition.length,protein,carbs,km,strength};
  }
  function weeklyCoachPoints(m){
    const pts=[];
    if(m.checkins.length>=3) pts.push(`Je registreerde ${m.checkins.length} trainingen met gemiddeld RPE ${fmt(m.avgRpe,1)}; gebruik vooral de trend in sRPE (${fmt(m.load)}) om stapeling te herkennen.`);
    else pts.push('Vul na meer trainingen RPE in; met minstens enkele check-ins per week wordt je belastingstrend veel bruikbaarder.');
    if(m.sleep!=null) pts.push(m.sleep<7?`Gemiddelde slaap is ${fmt(m.sleep,1)} u. Bij veel trainingsvolume is herstel een logische eerste knop om aan te draaien.`:`Je gemiddelde slaap van ${fmt(m.sleep,1)} u geeft geen duidelijke reden om extra volume te compenseren met minder herstel.`);
    if(m.nutritionDays<5) pts.push(`Voeding is ${m.nutritionDays}/7 dagen ingevuld; weekadvies over fueling blijft daardoor voorlopig voorzichtig.`);
    else if(m.carbs!=null) pts.push(`Koolhydraten zijn gemiddeld ${fmt(m.carbs)} g op je ingevulde dagen. Kijk vooral of hogere innames samenvallen met zware/lange trainingsdagen.`);
    if(m.km>0) pts.push(`${fmt(m.km,1)} km hardgelopen deze 7 dagen${m.strength?` en ${m.strength} krachttraining${m.strength===1?'':'en'}`:''}. Houd de combinatie van loopvolume en beenkracht in de gaten.`);
    return pts.slice(0,3);
  }
  function renderWeeklyCoach(){
    const tabs=document.getElementById('metricTabs'); if(!tabs) return;
    let card=document.getElementById('weeklyCoachCard');
    if(!card){ tabs.insertAdjacentHTML('beforebegin','<section id="weeklyCoachCard" class="smart-v2-card" style="margin-bottom:12px"></section>'); card=document.getElementById('weeklyCoachCard'); }
    const m=weeklyMetrics(), points=weeklyCoachPoints(m);
    card.innerHTML=`<p class="eyebrow">Weekcoach</p><h3>Wat valt op in de laatste 7 dagen?</h3><div class="coach-grid"><div class="coach-mini"><small>TRAINING</small><strong>${fmt(m.minutes)} min</strong></div><div class="coach-mini"><small>sRPE</small><strong>${m.checkins.length?fmt(m.load):'—'}</strong></div><div class="coach-mini"><small>SLAAP</small><strong>${m.sleep==null?'—':`${fmt(m.sleep,1)} u`}</strong></div><div class="coach-mini"><small>HARDLOPEN</small><strong>${fmt(m.km,1)} km</strong></div><div class="coach-mini"><small>KRACHT</small><strong>${m.strength}×</strong></div><div class="coach-mini"><small>VOEDING</small><strong>${m.nutritionDays}/7</strong></div></div><ul class="coach-points">${points.map(p=>`<li>${esc(p)}</li>`).join('')}</ul><p>Dit zijn patroon-signalen, geen medische of causale conclusies.</p>`;
  }

  function renderSmartFeaturesV2(){
    injectStyles();
    renderPendingGarminReview();
    wrapStrengthRenderer(); applyStrengthProgression();
    renderConflictCard(); renderWeatherCard(); renderWeeklyCoach();
  }
  window.renderSmartFeaturesV2=renderSmartFeaturesV2;

  if(typeof renderTraining==='function'&&!renderTraining._smartV2Wrapped){
    const base=renderTraining; const wrapped=function(){const r=base();setTimeout(renderSmartFeaturesV2,0);return r;}; wrapped._smartV2Wrapped=true;renderTraining=wrapped;
  }
  if(typeof renderDashboard==='function'&&!renderDashboard._smartV2Wrapped){
    const base=renderDashboard; const wrapped=function(){const r=base();setTimeout(renderSmartFeaturesV2,0);return r;}; wrapped._smartV2Wrapped=true;renderDashboard=wrapped;
  }
  if(typeof renderProgress==='function'&&!renderProgress._smartV2Wrapped){
    const base=renderProgress; const wrapped=function(){const r=base();setTimeout(renderWeeklyCoach,0);return r;}; wrapped._smartV2Wrapped=true;renderProgress=wrapped;
  }
  if(typeof window.ingestGarminData==='function'&&!window.ingestGarminData._smartV2Wrapped){
    const base=window.ingestGarminData; const wrapped=function(payload){const r=base(payload);setTimeout(renderSmartFeaturesV2,0);return r;}; wrapped._smartV2Wrapped=true;window.ingestGarminData=wrapped;
  }

  renderSmartFeaturesV2();
})();
