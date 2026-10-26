// Performance-first cards for the Today overview.
(function(){
  function localKey(date=new Date()){
    const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  function shiftKey(days){
    const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+days); return localKey(d);
  }
  function fmt(value,digits=0){
    return value==null||!Number.isFinite(Number(value))?'—':Number(value).toLocaleString('nl-NL',{minimumFractionDigits:digits,maximumFractionDigits:digits});
  }
  function recentActivities(){
    const start=shiftKey(-6), end=shiftKey(0);
    return (state.garminActivities||[]).filter(a=>{
      const date=String(a?.date||a?.startTime||'').slice(0,10);
      return date>=start&&date<=end;
    });
  }
  function trainingMinutes7d(){
    const start=shiftKey(-6), end=shiftKey(0);
    const activities=recentActivities();
    let minutes=activities.reduce((sum,a)=>{
      const sec=Number(a?.durationSeconds);
      return sum+(Number.isFinite(sec)&&sec>0?sec/60:0);
    },0);
    const garminStrengthDates=new Set(activities.filter(a=>/strength|kracht|weight/i.test(`${a?.type||''} ${a?.name||''}`)).map(a=>String(a?.date||a?.startTime||'').slice(0,10)));
    (state.strengthSessions||[]).forEach(s=>{
      const date=String(s?.date||s?.startedAt||'').slice(0,10);
      if(date<start||date>end||garminStrengthDates.has(date)) return;
      const a=Date.parse(s?.startedAt||''), b=Date.parse(s?.completedAt||'');
      if(Number.isFinite(a)&&Number.isFinite(b)&&b>a) minutes+=(b-a)/60000;
    });
    return minutes;
  }
  function runningKm7d(){
    return recentActivities().reduce((sum,a)=>{
      const text=`${a?.type||''} ${a?.name||''}`.toLowerCase();
      return sum+((text.includes('run')||text.includes('hardloop'))?(Number(a?.distanceKm)||0):0);
    },0);
  }
  function latestSleep(){
    const rows=Object.entries(state.garminDaily||{}).map(([date,v])=>({date,hours:Number(v?.sleepHours)})).filter(x=>Number.isFinite(x.hours)&&x.hours>0).sort((a,b)=>a.date.localeCompare(b.date));
    return rows.at(-1)?.hours ?? null;
  }
  function currentSportMoments(){
    try{
      const iso=currentIsoWeek();
      const plan=marathonPlan.find(p=>p.year===iso.year&&p.week===iso.week) || currentPlan();
      return plan&&typeof doneCount==='function'?doneCount(plan):null;
    }catch{return null;}
  }
  function setCard(id,{icon,value,label,jump}){
    const valueEl=document.getElementById(id);
    const card=valueEl?.closest('.metric-card');
    if(!valueEl||!card) return null;
    valueEl.textContent=value;
    const iconEl=card.querySelector('.metric-icon'); if(iconEl) iconEl.textContent=icon;
    const labelEl=card.querySelector('.metric-label'); if(labelEl) labelEl.textContent=label;
    if(jump) card.dataset.jump=jump;
    card.classList.remove('metric-primary');
    return card;
  }
  function renderPerformanceOverview(){
    const sleep=setCard('dashSleep',{icon:'😴',value:latestSleep()==null?'—':`${fmt(latestSleep(),1)} u`,label:'afgelopen nacht',jump:'progress'});
    const sport=setCard('dashTraining',{icon:'✓',value:currentSportMoments()==null?'—':String(currentSportMoments()),label:'sportmomenten · week',jump:'training'});
    const minutes=trainingMinutes7d();
    const load=setCard('dashCalories',{icon:'⏱',value:minutes>0?`${fmt(Math.round(minutes))} min`:'—',label:'training · 7 dagen',jump:'progress'});
    const km=runningKm7d();
    const run=setCard('dashProtein',{icon:'🏃',value:km>0?`${fmt(km,1)} km`:'—',label:'hardlopen · 7 dagen',jump:'progress'});
    const grid=document.querySelector('#view-today .summary-grid');
    if(grid&&sleep&&sport&&load&&run){ [sleep,sport,load,run].forEach(card=>grid.appendChild(card)); sleep.classList.add('metric-primary'); }
  }

  if(typeof renderDashboard==='function'){
    const base=renderDashboard;
    renderDashboard=function(){ base(); renderPerformanceOverview(); };
  }
  if(typeof window.ingestGarminData==='function'){
    const baseIngest=window.ingestGarminData;
    window.ingestGarminData=function(payload){ baseIngest(payload); renderPerformanceOverview(); };
  }
  renderPerformanceOverview();
})();