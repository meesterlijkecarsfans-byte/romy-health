// Robust Garmin calorie resolver for Romy Health.
// Garmin Personal API payloads can expose total energy under different keys.
(function(){
  function localKey(date=new Date()){
    const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  function shiftDate(days){ const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+days); return localKey(d); }
  function fmt(value,digits=0){
    return value==null||!Number.isFinite(Number(value))?'—':Number(value).toLocaleString('nl-NL',{minimumFractionDigits:digits,maximumFractionDigits:digits});
  }
  function num(v){ const n=Number(v); return v!==null&&v!==''&&Number.isFinite(n)?n:null; }
  function deepFind(obj, keys, seen=new Set()){
    if(!obj || typeof obj!=='object' || seen.has(obj)) return null;
    seen.add(obj);
    const lowered=new Map(Object.keys(obj).map(k=>[k.toLowerCase(),k]));
    for(const wanted of keys){
      const real=lowered.get(wanted.toLowerCase());
      if(real!==undefined){ const n=num(obj[real]); if(n!==null) return n; }
    }
    for(const child of Object.values(obj)){
      if(child && typeof child==='object'){
        const found=deepFind(child,keys,seen);
        if(found!==null) return found;
      }
    }
    return null;
  }
  function garminCalories(day){
    if(!day) return null;
    const direct=num(day.totalCalories);
    if(direct!==null && direct>0) return direct;

    const sources=[day,day.raw,day.raw?.daily].filter(Boolean);
    const totalKeys=['totalKilocalories','totalCalories','caloriesTotal','totalKcal','totalCaloriesBurned','burnedCalories','caloriesBurned','wellnessCalories','kilocalories'];
    for(const source of sources){
      const total=deepFind(source,totalKeys);
      if(total!==null && total>0) return total;
    }

    let active=num(day.activeCalories);
    if(active===null){
      for(const source of sources){
        active=deepFind(source,['activeKilocalories','activeCalories','activityCalories','wellnessActiveKilocalories']);
        if(active!==null) break;
      }
    }
    let resting=null;
    for(const source of sources){
      resting=deepFind(source,['bmrKilocalories','bmrCalories','restingKilocalories','restingCalories','basalCalories','basalMetabolicCalories']);
      if(resting!==null) break;
    }
    if(active!==null && resting!==null && active+resting>0) return active+resting;
    return null;
  }
  window.romyGarminCalories=garminCalories;

  function energyRows(){
    const start=shiftDate(-6),end=shiftDate(0),rows=[];
    for(const [date,n] of Object.entries(state.nutrition||{})){
      if(date<start||date>end) continue;
      const eaten=num(n?.calories);
      const burned=garminCalories(state.garminDaily?.[date]);
      if(eaten!==null&&eaten>0&&burned!==null&&burned>0) rows.push({date,eaten,burned,diff:eaten-burned});
    }
    return rows.sort((a,b)=>a.date.localeCompare(b.date));
  }
  function average(arr,key){ return arr.length?arr.reduce((s,x)=>s+Number(x[key]||0),0)/arr.length:null; }

  function renderEnergySection(){
    const el=document.getElementById('energyBalanceSection');
    if(!el) return;
    const rows=energyRows();
    const eaten=average(rows,'eaten'),burned=average(rows,'burned');
    const diff=eaten!=null&&burned!=null?eaten-burned:null;
    const label=rows.length===1?'1 gekoppelde dag':`${rows.length} gekoppelde dagen`;
    el.innerHTML=`<p class="eyebrow">Energie in / uit</p><h3>Afgelopen 7 dagen</h3><p>${label}. Alleen dagen waarop zowel voeding als Garmin-verbruik beschikbaar zijn tellen mee.</p><div class="energy-comparison"><div class="energy-side"><small>GEM. GEGETEN</small><strong>${eaten==null?'—':`${fmt(eaten)} kcal`}</strong></div><div class="energy-arrow">↔</div><div class="energy-side"><small>GEM. GARMIN-VERBRUIK</small><strong>${burned==null?'—':`${fmt(burned)} kcal`}</strong></div></div><div class="energy-delta">Gemiddeld verschil: ${diff==null?'—':`${diff>0?'+':''}${fmt(diff)} kcal/dag`}</div><p>Garmin-verbruik blijft een schatting. Kijk vooral naar voldoende brandstof, training, herstel en de trend over meerdere dagen.</p>`;
  }

  function renderTodayEnergy(){
    const today=localKey();
    const n=state.nutrition?.[today];
    const eaten=num(n?.calories);
    const burned=garminCalories(state.garminDaily?.[today]);
    const card=document.querySelector('#dailyPerformanceSummary .performance-mini:nth-child(3)');
    if(card){
      const haveE=eaten!==null&&eaten>0,haveB=burned!==null&&burned>0;
      const diff=haveE&&haveB?eaten-burned:null;
      const main=haveE&&haveB?`${fmt(eaten)} in · ${fmt(burned)} uit`:haveE?`${fmt(eaten)} kcal gegeten`:haveB?`${fmt(burned)} kcal verbruikt`:'Nog geen energiegegevens';
      const sub=diff==null?(haveE?'Garmin-verbruik nog niet beschikbaar':'Voeding van vandaag nog invullen'):`momentopname ${diff>0?'+':''}${fmt(diff)} kcal`;
      card.innerHTML=`<small>ENERGIE VANDAAG</small><strong>${main}</strong><span>${sub}</span>`;
    }
    const burnedEl=document.getElementById('garminBurned');
    if(burnedEl){
      const latestKeys=Object.keys(state.garminDaily||{}).sort();
      const latest=latestKeys.length?state.garminDaily[latestKeys.at(-1)]:null;
      const latestBurn=garminCalories(latest);
      burnedEl.textContent=latestBurn==null?'—':`${fmt(latestBurn)} kcal`;
    }
  }

  function renderAll(){ renderEnergySection(); renderTodayEnergy(); }

  if(typeof renderDashboard==='function'){
    const base=renderDashboard;
    renderDashboard=function(){ base(); renderAll(); };
  }
  if(typeof renderProgress==='function'){
    const base=renderProgress;
    renderProgress=function(){ base(); renderEnergySection(); };
  }
  if(typeof renderGarminHealth==='function'){
    const base=renderGarminHealth;
    renderGarminHealth=function(){ base(); renderTodayEnergy(); };
  }
  if(typeof window.ingestGarminData==='function'){
    const base=window.ingestGarminData;
    window.ingestGarminData=function(payload){ base(payload); renderAll(); };
  }

  renderAll();
})();