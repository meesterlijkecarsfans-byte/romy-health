// Garmin sleep insights for Today + Progress.
(function(){
  function sleepEntries(){
    return Object.entries(state.garminDaily || {})
      .map(([date,v])=>({date, hours:Number(v?.sleepHours)}))
      .filter(x=>Number.isFinite(x.hours) && x.hours>0)
      .sort((a,b)=>a.date.localeCompare(b.date));
  }
  function avg(arr){ return arr.length ? arr.reduce((s,x)=>s+x.hours,0)/arr.length : null; }
  function fmtHours(v){ return v==null ? '—' : `${Number(v).toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1})} u`; }

  function renderTodaySleep(){
    const entries=sleepEntries();
    const latest=entries.at(-1);
    const value=document.getElementById('dashSleep');
    if(value) value.textContent=fmtHours(latest?.hours);
    const label=value?.closest('.metric-card')?.querySelector('.metric-label');
    if(label) label.textContent='afgelopen nacht';
  }

  function drawSleepChart(){
    if(chartMetric!=='sleep') return false;
    const canvas=document.getElementById('progressChart');
    if(!canvas || !canvas.offsetParent) return true;
    const data=sleepEntries().slice(-14);
    const width=canvas.clientWidth, h=220, ratio=window.devicePixelRatio||1;
    canvas.width=width*ratio; canvas.height=h*ratio;
    const ctx=canvas.getContext('2d'); ctx.scale(ratio,ratio); ctx.clearRect(0,0,width,h);
    ctx.strokeStyle='#eee7eb'; ctx.lineWidth=1;
    for(let i=0;i<4;i++){ const y=18+i*55; ctx.beginPath(); ctx.moveTo(10,y); ctx.lineTo(width-10,y); ctx.stroke(); }
    if(!data.length){ ctx.fillStyle='#918890'; ctx.font='13px -apple-system, sans-serif'; ctx.textAlign='center'; ctx.fillText('Nog geen slaapgegevens van Garmin',width/2,h/2); return true; }
    const vals=data.map(x=>x.hours), min=Math.min(...vals), max=Math.max(...vals), spread=Math.max(1,max-min);
    const x=i=>10+i*((width-20)/(vals.length-1||1));
    const y=v=>18+(max+spread*.25-v)/(spread*1.5)*(h-50);
    ctx.beginPath(); vals.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));
    ctx.strokeStyle='#ea5e9b'; ctx.lineWidth=3; ctx.lineJoin='round'; ctx.stroke();
    vals.forEach((v,i)=>{ctx.beginPath();ctx.arc(x(i),y(v),3.5,0,Math.PI*2);ctx.fillStyle='#ea5e9b';ctx.fill();});
    return true;
  }

  function renderSleepProgress(){
    if(chartMetric!=='sleep') return false;
    const entries=sleepEntries();
    const latest=entries.at(-1);
    const last7=entries.slice(-7), prev7=entries.slice(-14,-7);
    const avg7=avg(last7), avgPrev=avg(prev7);
    const trend=avg7!=null&&avgPrev!=null ? avg7-avgPrev : null;
    document.getElementById('chartEyebrow').textContent='Afgelopen 14 nachten';
    document.getElementById('chartTitle').textContent='Slaap';
    document.getElementById('chartLatest').textContent=fmtHours(latest?.hours);
    const trendText=trend==null?'—':`${trend>=0?'+':''}${trend.toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1})} u`;
    document.getElementById('progressStats').innerHTML=`
      <div class="stat-card"><small>Afgelopen nacht</small><strong>${fmtHours(latest?.hours)}</strong></div>
      <div class="stat-card"><small>Gem. 7 dagen</small><strong>${fmtHours(avg7)}</strong></div>
      <div class="stat-card"><small>vs. vorige 7 dagen</small><strong>${trendText}</strong></div>`;
    const milestones=document.getElementById('milestones');
    if(milestones) milestones.innerHTML=entries.length
      ? `<article class="milestone"><div class="milestone-icon">☾</div><div><strong>${Math.min(entries.length,14)} recente nachten beschikbaar</strong><p>De grafiek gebruikt rechtstreeks je Garmin-slaapdata.</p></div></article>`
      : '';
    drawSleepChart();
    return true;
  }

  const baseRenderDashboard=renderDashboard;
  renderDashboard=function(){ baseRenderDashboard(); renderTodaySleep(); };
  const baseRenderProgress=renderProgress;
  renderProgress=function(){ if(!renderSleepProgress()) baseRenderProgress(); };
  const baseRenderChart=renderChart;
  renderChart=function(){ if(!drawSleepChart()) baseRenderChart(); };

  if(typeof window.ingestGarminData==='function'){
    const baseIngest=window.ingestGarminData;
    window.ingestGarminData=function(payload){ baseIngest(payload); renderTodaySleep(); if(chartMetric==='sleep') renderSleepProgress(); };
  }
  renderTodaySleep();
  if(chartMetric==='sleep') renderSleepProgress();
})();
