// Performance-focused recovery and energy insights for Romy Health.
(function(){
  const DAY=86400000;
  const EXTENDED_SYNC_KEY='romy-health-garmin-14d-sync-ts';

  function localKey(date=new Date()){
    const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  function shiftDate(days){
    const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+days); return localKey(d);
  }
  function avg(values){
    const nums=values.map(Number).filter(Number.isFinite);
    return nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : null;
  }
  function fmt(value,digits=0){
    return value==null||!Number.isFinite(Number(value)) ? '—' : Number(value).toLocaleString('nl-NL',{minimumFractionDigits:digits,maximumFractionDigits:digits});
  }
  function entriesBetween(start,end){
    return Object.entries(state.garminDaily||{}).filter(([date])=>date>=start&&date<=end);
  }
  function metricAverage(field,start,end){ return avg(entriesBetween(start,end).map(([,v])=>v?.[field])); }
  function signed(value,digits=0,suffix=''){
    if(value==null||!Number.isFinite(Number(value))) return 'nog geen vergelijking';
    const n=Number(value); return `${n>0?'+':''}${fmt(n,digits)}${suffix}`;
  }
  function latestGarmin(){
    const keys=Object.keys(state.garminDaily||{}).sort();
    return keys.length ? {date:keys.at(-1),...(state.garminDaily[keys.at(-1)]||{})} : null;
  }

  function recoveryData(){
    const nowStart=shiftDate(-6), nowEnd=shiftDate(0), prevStart=shiftDate(-13), prevEnd=shiftDate(-7);
    const specs=[
      {key:'sleepHours',label:'Slaap',unit:'u',digits:1},
      {key:'hrv',label:'HRV',unit:'ms',digits:0},
      {key:'restingHeartRate',label:'Rusthartslag',unit:'bpm',digits:0},
      {key:'bodyBattery',label:'Body Battery',unit:'',digits:0}
    ];
    return specs.map(s=>{
      const current=metricAverage(s.key,nowStart,nowEnd);
      const previous=metricAverage(s.key,prevStart,prevEnd);
      return {...s,current,previous,delta:current!=null&&previous!=null?current-previous:null};
    });
  }

  function energyDays(){
    const start=shiftDate(-6), end=shiftDate(0);
    const rows=[];
    for(const [date,n] of Object.entries(state.nutrition||{})){
      if(date<start||date>end) continue;
      const g=state.garminDaily?.[date];
      const eaten=Number(n?.calories), burned=Number(g?.totalCalories);
      if(Number.isFinite(eaten)&&Number.isFinite(burned)&&burned>0) rows.push({date,eaten,burned,diff:eaten-burned});
    }
    return rows.sort((a,b)=>a.date.localeCompare(b.date));
  }

  function ensureStyles(){
    if(document.getElementById('performanceInsightStyles')) return;
    const style=document.createElement('style');
    style.id='performanceInsightStyles';
    style.textContent=`
      .performance-card{border:1px solid var(--line);background:var(--surface);border-radius:24px;box-shadow:0 6px 22px rgba(45,27,36,.045);padding:18px}
      .performance-card h3{margin:4px 0 0;font-size:20px;letter-spacing:-.45px}
      .performance-card p{margin:7px 0 0;color:var(--muted);font-size:12px;line-height:1.45}
      .performance-today{margin:14px 0 6px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .performance-mini{padding:14px;border-radius:17px;background:var(--surface-soft);border:1px solid #f6dbe7}
      .performance-mini small{color:var(--muted);font-size:10px;font-weight:700;display:block}
      .performance-mini strong{display:block;margin-top:5px;font-size:17px;line-height:1.25}
      .performance-mini span{display:block;margin-top:3px;color:var(--muted);font-size:10px;line-height:1.35}
      .recovery-trend-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
      .recovery-trend-card{padding:14px;border:1px solid var(--line);border-radius:18px;background:var(--surface)}
      .recovery-trend-card small{display:block;color:var(--muted);font-size:10px}
      .recovery-trend-card strong{display:block;font-size:21px;margin:5px 0 3px}
      .recovery-trend-card span{font-size:11px;color:var(--muted)}
      .energy-comparison{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;margin-top:14px}
      .energy-side{padding:14px;border:1px solid var(--line);border-radius:18px;text-align:center}
      .energy-side small{display:block;color:var(--muted);font-size:10px}
      .energy-side strong{display:block;font-size:21px;margin-top:4px}
      .energy-arrow{color:var(--pink-strong);font-weight:800}
      .energy-delta{margin-top:11px;padding:10px 12px;border-radius:14px;background:var(--surface-soft);font-size:12px;font-weight:730;text-align:center}
      @media(max-width:430px){.performance-today{grid-template-columns:1fr}.recovery-trend-grid{grid-template-columns:1fr 1fr}.energy-comparison{grid-template-columns:1fr}.energy-arrow{transform:rotate(90deg)}}
    `;
    document.head.appendChild(style);
  }

  function renderTodayPerformance(){
    const todayView=document.getElementById('view-today');
    const planning=[...todayView?.querySelectorAll('.section-heading')||[]].find(x=>x.textContent.includes('Planning'));
    if(!todayView||!planning) return;
    let section=document.getElementById('dailyPerformanceSummary');
    if(!section){
      planning.insertAdjacentHTML('beforebegin','<section id="dailyPerformanceSummary" class="performance-card" style="margin-top:18px"></section>');
      section=document.getElementById('dailyPerformanceSummary');
    }
    const latest=latestGarmin();
    const today=localKey();
    const g=state.garminDaily?.[today] || null;
    const n=state.nutrition?.[today] || null;
    const sleep=latest?.sleepHours;
    const bb=latest?.bodyBattery;
    const eaten=Number(n?.calories);
    const burned=Number(g?.totalCalories);
    const haveEaten=Number.isFinite(eaten)&&eaten>0;
    const haveBurned=Number.isFinite(burned)&&burned>0;
    const difference=haveEaten&&haveBurned?eaten-burned:null;
    const recoveryMain=sleep!=null?`${fmt(sleep,1)} u slaap`:(bb!=null?`Body Battery ${fmt(bb)}`:'Garmin nog aanvullen');
    const recoverySub=[bb!=null?`Body Battery ${fmt(bb)}`:null,latest?.hrv!=null?`HRV ${fmt(latest.hrv)} ms`:null].filter(Boolean).join(' · ') || 'Laatste hersteldata van Garmin';
    const energyMain=haveEaten&&haveBurned?`${fmt(eaten)} in · ${fmt(burned)} uit`:haveEaten?`${fmt(eaten)} kcal gegeten`:haveBurned?`${fmt(burned)} kcal verbruikt`:'Nog geen energiegegevens';
    const energySub=difference==null?(haveEaten?'Garmin-verbruik nog niet beschikbaar':'Voeding van vandaag nog invullen'):`verschil ${difference>0?'+':''}${fmt(difference)} kcal`;
    section.innerHTML=`<p class="eyebrow">Dagbalans</p><h3>Presteren & herstellen</h3><div class="performance-today"><div class="performance-mini"><small>HERSTEL</small><strong>${recoveryMain}</strong><span>${recoverySub}</span></div><div class="performance-mini"><small>ENERGIE VANDAAG</small><strong>${energyMain}</strong><span>${energySub}</span></div></div><p>Gebruik energieverbruik als ruwe schatting. Trainingskwaliteit, herstel en je weektrend zijn belangrijker dan één dag exact gelijk krijgen.</p>`;

    // The four top cards should describe today, not silently carry yesterday's nutrition forward.
    const cal=document.getElementById('dashCalories'), protein=document.getElementById('dashProtein');
    if(cal) cal.textContent=n?.calories!=null?fmt(n.calories):'—';
    if(protein) protein.textContent=n?.protein!=null?`${fmt(n.protein)} g`:'—';
  }

  function ensureProgressInsights(){
    const tabs=document.getElementById('metricTabs');
    if(!tabs) return;
    if(!document.getElementById('recoveryTrendSection')) tabs.insertAdjacentHTML('beforebegin',`<section id="recoveryTrendSection" class="performance-card" style="margin-bottom:12px"></section>`);
    if(!document.getElementById('energyBalanceSection')) tabs.insertAdjacentHTML('beforebegin',`<section id="energyBalanceSection" class="performance-card" style="margin-bottom:22px"></section>`);
  }

  function renderRecoveryTrend(){
    ensureProgressInsights();
    const el=document.getElementById('recoveryTrendSection'); if(!el) return;
    const data=recoveryData();
    const available=data.filter(x=>x.current!=null);
    el.innerHTML=`<p class="eyebrow">Hersteltrend</p><h3>Afgelopen 7 dagen</h3><p>Vergelijk je eigen recente herstel met de 7 dagen ervoor. Kijk vooral naar de combinatie van signalen, niet naar één losse waarde.</p><div class="recovery-trend-grid">${data.map(x=>`<div class="recovery-trend-card"><small>${x.label}</small><strong>${x.current==null?'—':`${fmt(x.current,x.digits)}${x.unit?' '+x.unit:''}`}</strong><span>${x.delta==null?'Nog te weinig eerdere data':`vs. vorige 7 dagen: ${signed(x.delta,x.digits,x.unit?' '+x.unit:'')}`}</span></div>`).join('')}</div>${!available.length?'<p>Nog geen Garmin-hersteldata beschikbaar.</p>':''}`;
  }

  function renderEnergyBalance(){
    ensureProgressInsights();
    const el=document.getElementById('energyBalanceSection'); if(!el) return;
    const rows=energyDays();
    const eaten=avg(rows.map(x=>x.eaten)), burned=avg(rows.map(x=>x.burned));
    const diff=eaten!=null&&burned!=null?eaten-burned:null;
    const dayLabel=rows.length===1?'1 gekoppelde dag':`${rows.length} gekoppelde dagen`;
    el.innerHTML=`<p class="eyebrow">Energie in / uit</p><h3>Afgelopen 7 dagen</h3><p>${dayLabel}. Alleen dagen waarop zowel voeding als Garmin-verbruik beschikbaar zijn tellen mee.</p><div class="energy-comparison"><div class="energy-side"><small>GEM. GEGETEN</small><strong>${eaten==null?'—':`${fmt(eaten)} kcal`}</strong></div><div class="energy-arrow">↔</div><div class="energy-side"><small>GEM. GARMIN-VERBRUIK</small><strong>${burned==null?'—':`${fmt(burned)} kcal`}</strong></div></div><div class="energy-delta">Gemiddeld verschil: ${diff==null?'—':`${diff>0?'+':''}${fmt(diff)} kcal/dag`}</div><p>Garmin-verbruik blijft een schatting. Voor jouw doel is structureel genoeg brandstof voor training en herstel belangrijker dan iedere dag een tekort afdwingen.</p>`;
  }

  function renderAllPerformance(){ renderTodayPerformance(); renderRecoveryTrend(); renderEnergyBalance(); }

  const baseDashboard=renderDashboard;
  renderDashboard=function(){ baseDashboard(); renderTodayPerformance(); };
  if(typeof renderProgress==='function'){
    const baseProgress=renderProgress;
    renderProgress=function(){ baseProgress(); renderRecoveryTrend(); renderEnergyBalance(); };
  }
  if(typeof window.ingestGarminData==='function'){
    const baseIngest=window.ingestGarminData;
    window.ingestGarminData=function(payload){ baseIngest(payload); renderAllPerformance(); };
  }

  async function extendedGarminHistory(){
    const last=Number(localStorage.getItem(EXTENDED_SYNC_KEY)||0);
    if(Date.now()-last<20*60*60*1000 || typeof cloud==='undefined') return;
    try{
      const {data:{session}}=await cloud.auth.getSession();
      if(!session) return;
      const {data,error}=await cloud.functions.invoke('garmin-sync',{body:{days:14}});
      if(error||data?.error||(!data?.daily&&!Array.isArray(data?.activities))) return;
      window.ingestGarminData(data);
      localStorage.setItem(EXTENDED_SYNC_KEY,String(Date.now()));
    }catch(err){ console.debug('Extended Garmin history skipped',err); }
  }

  ensureStyles();
  renderAllPerformance();
  setTimeout(extendedGarminHistory,2600);
})();