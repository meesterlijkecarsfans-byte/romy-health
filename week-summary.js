// Weekly overview for the Progress tab.
(function(){
  function dateKeyLocal(date){
    const y=date.getFullYear(), m=String(date.getMonth()+1).padStart(2,'0'), d=String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }

  function weekBounds(date=new Date()){
    const d=new Date(date.getFullYear(),date.getMonth(),date.getDate());
    const weekday=d.getDay()||7;
    const start=new Date(d); start.setDate(d.getDate()-(weekday-1));
    const end=new Date(start); end.setDate(start.getDate()+6);
    return {start:dateKeyLocal(start),end:dateKeyLocal(end),startDate:start,endDate:end};
  }

  function inRange(key,start,end){ return key>=start && key<=end; }
  function avg(values){
    const nums=values.map(Number).filter(Number.isFinite);
    return nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : null;
  }
  function fmtNumber(value,digits=0){
    return value==null ? '—' : Number(value).toLocaleString('nl-NL',{minimumFractionDigits:digits,maximumFractionDigits:digits});
  }

  function currentPlanForWeek(){
    if(typeof marathonPlan==='undefined' || typeof currentIsoWeek!=='function') return null;
    const iso=currentIsoWeek();
    return marathonPlan.find(p=>p.year===iso.year&&p.week===iso.week) || null;
  }

  function runningKmForRange(start,end){
    return (state.garminActivities||[])
      .filter(a=>{
        const date=String(a.date||'').slice(0,10);
        const type=String(a.type||'').toLowerCase();
        const name=String(a.name||'').toLowerCase();
        return inRange(date,start,end) && (type.includes('run')||type.includes('hardloop')||name.includes('run')||name.includes('hardloop'));
      })
      .reduce((sum,a)=>sum+(Number(a.distanceKm)||0),0);
  }

  function ensureWeekSummary(){
    const progress=document.getElementById('view-progress');
    const tabs=document.getElementById('metricTabs');
    if(!progress||!tabs||document.getElementById('weekSummarySection')) return;
    tabs.insertAdjacentHTML('beforebegin', `
      <section id="weekSummarySection" style="margin-bottom:26px;">
        <div class="section-heading compact">
          <div><p class="eyebrow">Deze week</p><h2 id="weekSummaryTitle">Weekoverzicht</h2></div>
          <span id="weekSummaryRange" style="font-size:12px;color:var(--muted);font-weight:700;"></span>
        </div>
        <div class="summary-grid" id="weekSummaryGrid"></div>
      </section>`);
  }

  window.renderWeekSummary=function(){
    ensureWeekSummary();
    const grid=document.getElementById('weekSummaryGrid');
    if(!grid) return;
    const {start,end,startDate,endDate}=weekBounds();
    const plan=currentPlanForWeek();
    let trainingCount=0;
    if(plan && typeof doneCount==='function') trainingCount=doneCount(plan);

    const nutritionDays=Object.entries(state.nutrition||{}).filter(([key])=>inRange(key,start,end));
    const eatenAvg=avg(nutritionDays.map(([,v])=>v?.calories));

    const garminDays=Object.entries(state.garminDaily||{}).filter(([key])=>inRange(key,start,end));
    const sleepAvg=avg(garminDays.map(([,v])=>v?.sleepHours));
    const burnedAvg=avg(garminDays.map(([,v])=>v?.totalCalories));
    const runningKm=runningKmForRange(start,end);

    const dateFmt=new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short'});
    document.getElementById('weekSummaryRange').textContent=`${dateFmt.format(startDate)} – ${dateFmt.format(endDate)}`;

    const cards=[
      ['✓',String(trainingCount),'sportmomenten'],
      ['🏃',runningKm?`${fmtNumber(runningKm,1)} km`:'—','hardgelopen'],
      ['😴',sleepAvg!=null?`${fmtNumber(sleepAvg,1)} u`:'—','gem. slaap'],
      ['🍎',eatenAvg!=null?`${fmtNumber(Math.round(eatenAvg))}`:'—','gem. kcal gegeten'],
      ['🔥',burnedAvg!=null?`${fmtNumber(Math.round(burnedAvg))}`:'—','gem. kcal verbrand'],
      ['◉',`${nutritionDays.length}/7`,'voedingsdagen']
    ];

    grid.innerHTML=cards.map(([icon,value,label])=>`<div class="metric-card"><span class="metric-icon">${icon}</span><span class="metric-value">${value}</span><span class="metric-label">${label}</span></div>`).join('');
  };

  if(typeof renderProgress==='function'){
    const baseRenderProgress=renderProgress;
    renderProgress=function(){ baseRenderProgress(); renderWeekSummary(); };
  }
  if(typeof renderDashboard==='function'){
    const baseRenderDashboard=renderDashboard;
    renderDashboard=function(){ baseRenderDashboard(); renderWeekSummary(); };
  }
  if(typeof window.ingestGarminData==='function'){
    const baseIngest=window.ingestGarminData;
    window.ingestGarminData=function(payload){ baseIngest(payload); renderWeekSummary(); };
  }

  renderWeekSummary();
})();
