// Unified Progress charts for Romy Health.
// Uses the live data sources instead of the legacy state.history structure.
(function(){
  const DAYS = 14;

  function localKey(date=new Date()){
    const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  function dateKeys(count=DAYS){
    const out=[];
    const now=new Date(); now.setHours(12,0,0,0);
    for(let i=count-1;i>=0;i--){
      const d=new Date(now); d.setDate(now.getDate()-i); out.push(localKey(d));
    }
    return out;
  }
  function dateLabel(key){
    return new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short'}).format(new Date(`${key}T12:00:00`)).replace('.','');
  }
  function fmt(v,d=0){
    return v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d});
  }
  function sum(values){ return values.reduce((s,v)=>s+(Number.isFinite(Number(v))?Number(v):0),0); }
  function avg(values){
    const nums=values.filter(v=>v!=null&&Number.isFinite(Number(v))).map(Number);
    return nums.length?sum(nums)/nums.length:null;
  }
  function activityDate(a){ return String(a?.date||a?.startTimeLocal||a?.startTime||'').slice(0,10); }
  function activityText(a){ return `${a?.type||''} ${a?.name||''}`.toLowerCase(); }
  function isRun(a){ const t=activityText(a); return t.includes('run')||t.includes('hardloop'); }
  function isStrength(a){ const t=activityText(a); return t.includes('strength')||t.includes('kracht')||t.includes('weight'); }

  function sleepSeries(keys){
    return keys.map(date=>{
      const v=Number(state.garminDaily?.[date]?.sleepHours);
      return Number.isFinite(v)&&v>0?v:null;
    });
  }
  function caloriesSeries(keys){
    return keys.map(date=>{
      const v=Number(state.nutrition?.[date]?.calories);
      return Number.isFinite(v)&&v>0?v:null;
    });
  }
  function runningSeries(keys){
    const byDate=new Map(keys.map(k=>[k,0]));
    (state.garminActivities||[]).forEach(a=>{
      const date=activityDate(a); if(!byDate.has(date)||!isRun(a)) return;
      const km=Number(a?.distanceKm); if(Number.isFinite(km)&&km>0) byDate.set(date,byDate.get(date)+km);
    });
    return keys.map(k=>byDate.get(k)||0);
  }
  function trainingSeries(keys){
    const byDate=new Map(keys.map(k=>[k,0]));
    const garminStrengthDates=new Set();
    (state.garminActivities||[]).forEach(a=>{
      const date=activityDate(a); if(!byDate.has(date)) return;
      const seconds=Number(a?.durationSeconds);
      if(Number.isFinite(seconds)&&seconds>0) byDate.set(date,byDate.get(date)+seconds/3600);
      if(isStrength(a)) garminStrengthDates.add(date);
    });
    (state.strengthSessions||[]).forEach(s=>{
      const date=String(s?.date||s?.startedAt||'').slice(0,10);
      if(!byDate.has(date)||garminStrengthDates.has(date)) return;
      const start=Date.parse(s?.startedAt||''), end=Date.parse(s?.completedAt||'');
      if(Number.isFinite(start)&&Number.isFinite(end)&&end>start) byDate.set(date,byDate.get(date)+(end-start)/3600000);
    });
    return keys.map(k=>byDate.get(k)||0);
  }

  function metricData(){
    const keys=dateKeys();
    if(chartMetric==='sleep') return {keys,values:sleepSeries(keys),title:'Slaap',unit:'u',digits:1,eyebrow:'Afgelopen 14 nachten',kind:'line',zero:false};
    if(chartMetric==='training') return {keys,values:trainingSeries(keys),title:'Trainingsuren',unit:'u',digits:1,eyebrow:'Afgelopen 14 dagen',kind:'bar',zero:true};
    if(chartMetric==='calories') return {keys,values:caloriesSeries(keys),title:'Calorieën gegeten',unit:'kcal',digits:0,eyebrow:'Afgelopen 14 dagen',kind:'line',zero:false};
    return {keys,values:runningSeries(keys),title:'Hardlopen',unit:'km',digits:1,eyebrow:'Afgelopen 14 dagen',kind:'bar',zero:true};
  }

  function niceStep(raw){
    if(!Number.isFinite(raw)||raw<=0) return 1;
    const power=Math.pow(10,Math.floor(Math.log10(raw)));
    const n=raw/power;
    const nice=n<=1?1:n<=2?2:n<=5?5:10;
    return nice*power;
  }
  function scaleFor(meta){
    const nums=meta.values.filter(v=>v!=null&&Number.isFinite(Number(v))).map(Number);
    if(!nums.length) return {min:0,max:1,step:.25,ticks:[0,.25,.5,.75,1]};
    let min=Math.min(...nums), max=Math.max(...nums);
    if(meta.zero){
      min=0;
      if(max===0) max=meta.unit==='u'?1:meta.unit==='km'?5:1;
    }else if(meta.unit==='u'){
      min=Math.max(0,Math.floor((min-.5)*2)/2);
      max=Math.ceil((max+.5)*2)/2;
      if(max-min<2){ min=Math.max(0,min-.5); max+=.5; }
    }else if(meta.unit==='kcal'){
      min=Math.max(0,Math.floor((min-200)/250)*250);
      max=Math.ceil((max+200)/250)*250;
      if(max-min<500) max=min+500;
    }
    const step=niceStep((max-min)/4);
    min=meta.zero?0:Math.floor(min/step)*step;
    max=Math.ceil(max/step)*step;
    if(max<=min) max=min+step*4;
    const ticks=[];
    for(let v=min;v<=max+step*.01;v+=step) ticks.push(Number(v.toFixed(6)));
    if(ticks.length>6){
      const step2=niceStep((max-min)/3); ticks.length=0;
      for(let v=Math.floor(min/step2)*step2;v<=max+step2*.01;v+=step2) ticks.push(Number(v.toFixed(6)));
      return {min:ticks[0],max:ticks.at(-1),step:step2,ticks};
    }
    return {min,max,step,ticks};
  }

  function yTickLabel(v,meta){
    if(meta.unit==='kcal') return fmt(v,0);
    if(meta.unit==='u') return `${fmt(v,1)} u`;
    if(meta.unit==='km') return `${fmt(v,1)} km`;
    return fmt(v,meta.digits);
  }

  function drawUnifiedChart(){
    const canvas=document.getElementById('progressChart');
    if(!canvas||!canvas.offsetParent) return;
    const meta=metricData();
    const cssWidth=Math.max(280,canvas.clientWidth||300), cssHeight=260, ratio=window.devicePixelRatio||1;
    canvas.width=Math.round(cssWidth*ratio); canvas.height=Math.round(cssHeight*ratio);
    canvas.style.height=`${cssHeight}px`;
    const ctx=canvas.getContext('2d');
    ctx.setTransform(ratio,0,0,ratio,0,0); ctx.clearRect(0,0,cssWidth,cssHeight);

    const left=58,right=14,top=16,bottom=38;
    const plotW=cssWidth-left-right, plotH=cssHeight-top-bottom;
    const scale=scaleFor(meta);
    const y=v=>top+(scale.max-v)/(scale.max-scale.min)*plotH;
    const x=i=>left+(meta.values.length<=1?plotW/2:i*(plotW/(meta.values.length-1)));

    ctx.font='11px -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif';
    ctx.textBaseline='middle';
    scale.ticks.forEach(t=>{
      const yy=y(t);
      ctx.strokeStyle='#eee7eb'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(left,yy); ctx.lineTo(cssWidth-right,yy); ctx.stroke();
      ctx.fillStyle='#8c858c'; ctx.textAlign='right'; ctx.fillText(yTickLabel(t,meta),left-8,yy);
    });

    ctx.strokeStyle='#dcd5da'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(left,top); ctx.lineTo(left,top+plotH); ctx.lineTo(cssWidth-right,top+plotH); ctx.stroke();

    const tickIdx=[0,3,6,9,13].filter(i=>i<meta.keys.length);
    ctx.textBaseline='top'; ctx.textAlign='center'; ctx.fillStyle='#8c858c';
    tickIdx.forEach(i=>ctx.fillText(dateLabel(meta.keys[i]),x(i),top+plotH+10));

    const available=meta.values.filter(v=>v!=null&&Number.isFinite(Number(v)));
    const meaningful=meta.zero?available.some(v=>Number(v)>0):available.length>0;
    if(!meaningful){
      ctx.fillStyle='#918890'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='13px -apple-system,BlinkMacSystemFont,sans-serif';
      const msg=chartMetric==='sleep'?'Nog geen slaapdata':chartMetric==='training'?'Nog geen trainingsduur geregistreerd':chartMetric==='calories'?'Nog geen voedingsdagen in deze periode':'Nog geen hardloopkilometers in deze periode';
      ctx.fillText(msg,left+plotW/2,top+plotH/2);
      return;
    }

    if(meta.kind==='bar'){
      const gap=plotW/(meta.values.length-1||1);
      const barW=Math.max(5,Math.min(20,gap*.55));
      meta.values.forEach((v,i)=>{
        if(v==null||!Number.isFinite(Number(v))) return;
        const yy=y(Number(v)), base=y(Math.max(0,scale.min));
        const h=Math.max(Number(v)>0?2:1,base-yy);
        ctx.fillStyle='#f08ab6';
        const xx=x(i)-barW/2;
        if(typeof ctx.roundRect==='function'){
          ctx.beginPath(); ctx.roundRect(xx,base-h,barW,h,Math.min(5,barW/2)); ctx.fill();
        }else ctx.fillRect(xx,base-h,barW,h);
      });
    }else{
      ctx.strokeStyle='#ea5e9b'; ctx.lineWidth=3; ctx.lineJoin='round'; ctx.lineCap='round';
      let started=false;
      ctx.beginPath();
      meta.values.forEach((v,i)=>{
        if(v==null||!Number.isFinite(Number(v))){ started=false; return; }
        const xx=x(i),yy=y(Number(v));
        if(!started){ ctx.moveTo(xx,yy); started=true; } else ctx.lineTo(xx,yy);
      });
      ctx.stroke();
      meta.values.forEach((v,i)=>{
        if(v==null||!Number.isFinite(Number(v))) return;
        ctx.beginPath();ctx.arc(x(i),y(Number(v)),3.5,0,Math.PI*2);ctx.fillStyle='#ea5e9b';ctx.fill();
      });
    }
  }

  function deltaText(current,previous,unit,digits){
    if(current==null||previous==null) return '—';
    const d=current-previous;
    return `${d>0?'+':''}${fmt(d,digits)} ${unit}`;
  }
  function statCard(label,value){ return `<div class="stat-card"><small>${label}</small><strong>${value}</strong></div>`; }

  function renderUnifiedProgress(){
    const meta=metricData();
    document.getElementById('chartEyebrow').textContent=meta.eyebrow;
    document.getElementById('chartTitle').textContent=meta.title;
    const recent=meta.values.slice(-7), previous=meta.values.slice(0,7);
    let stats='';

    if(chartMetric==='sleep'){
      const latest=[...meta.values].reverse().find(v=>v!=null);
      const a=avg(recent),p=avg(previous);
      document.getElementById('chartLatest').textContent=latest==null?'—':`${fmt(latest,1)} u`;
      stats=statCard('Afgelopen nacht',latest==null?'—':`${fmt(latest,1)} u`)+statCard('Gem. 7 dagen',a==null?'—':`${fmt(a,1)} u`)+statCard('vs. vorige 7 dagen',deltaText(a,p,'u',1));
    }else if(chartMetric==='training'){
      const cur=sum(recent),prev=sum(previous);
      document.getElementById('chartLatest').textContent=`7d: ${fmt(cur,1)} u`;
      stats=statCard('Afgelopen 7 dagen',`${fmt(cur,1)} u`)+statCard('Vorige 7 dagen',`${fmt(prev,1)} u`)+statCard('Verschil',`${cur-prev>0?'+':''}${fmt(cur-prev,1)} u`);
    }else if(chartMetric==='calories'){
      const a=avg(recent),p=avg(previous),logged=recent.filter(v=>v!=null).length;
      document.getElementById('chartLatest').textContent=a==null?'—':`gem. ${fmt(a)} kcal`;
      stats=statCard('Gem. 7 dagen',a==null?'—':`${fmt(a)} kcal`)+statCard('Ingevuld',`${logged}/7 dagen`)+statCard('vs. vorige 7 dagen',deltaText(a,p,'kcal',0));
    }else{
      const cur=sum(recent),prev=sum(previous),longest=Math.max(...recent.map(v=>Number(v)||0));
      document.getElementById('chartLatest').textContent=`7d: ${fmt(cur,1)} km`;
      stats=statCard('Afgelopen 7 dagen',`${fmt(cur,1)} km`)+statCard('Vorige 7 dagen',`${fmt(prev,1)} km`)+statCard('Langste dag',`${fmt(longest,1)} km`);
    }
    document.getElementById('progressStats').innerHTML=stats;

    const available=meta.values.filter(v=>v!=null).length;
    const source=chartMetric==='sleep'?'Garmin-slaapdata':chartMetric==='training'?'Garmin-activiteiten en Romy Health-kracht':chartMetric==='calories'?'je ingevulde voedingsdagen':'Garmin-hardloopactiviteiten';
    const milestones=document.getElementById('milestones');
    if(milestones) milestones.innerHTML=`<article class="milestone"><div class="milestone-icon">↗</div><div><strong>${available} van 14 dagen beschikbaar</strong><p>Deze grafiek gebruikt ${source}.</p></div></article>`;
    requestAnimationFrame(drawUnifiedChart);
  }

  // Replace the legacy history-based chart renderer.
  renderChart=drawUnifiedChart;
  renderProgress=renderUnifiedProgress;

  if(typeof window.ingestGarminData==='function'){
    const baseIngest=window.ingestGarminData;
    window.ingestGarminData=function(payload){
      baseIngest(payload);
      if(document.getElementById('view-progress')?.classList.contains('active')) renderUnifiedProgress();
    };
  }

  window.addEventListener('resize',()=>requestAnimationFrame(drawUnifiedChart));
  if(document.getElementById('view-progress')?.classList.contains('active')) renderUnifiedProgress();
})();