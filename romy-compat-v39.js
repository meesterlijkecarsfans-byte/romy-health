// Romy Health v47 compatibility + focused dashboard layer.
(function(){
  'use strict';

  const LATEST_TREDICT={
    date:'2026-10-30',
    fitness:1258,
    fatigue:822,
    performance:444,
    performanceBalance:-37,
    effort7:649,
    effortPrev7:617,
    sleepAvg7:8.1,
    hrv:84,
    hrvBaseline:85,
    allSportIntensity:{low:27422,medium:2036,high:342},
    runningIntensity:{low:27422,medium:2036,high:342},
    note:'Tredict snapshot via ChatGPT connector · alle sporten'
  };

  const fmt=(v,d=0)=>v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const todayKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const activityDate=a=>String(a?.date||a?.startTimeLocal||a?.startTime||'').slice(0,10);
  const isRun=a=>`${a?.type||''} ${a?.name||''}`.toLowerCase().includes('run')||`${a?.type||''} ${a?.name||''}`.toLowerCase().includes('hardloop');

  function currentWeekBounds(){
    const now=new Date();now.setHours(12,0,0,0);const day=now.getDay()||7;
    const mon=new Date(now);mon.setDate(now.getDate()-(day-1));const sun=new Date(mon);sun.setDate(mon.getDate()+6);
    const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return {start:key(mon),end:key(sun)};
  }
  function weekKm(){const b=currentWeekBounds();return (state.garminActivities||[]).filter(a=>isRun(a)&&activityDate(a)>=b.start&&activityDate(a)<=b.end).reduce((s,a)=>s+(Number(a.distanceKm)||0),0);}

  function ensureTredictSnapshot(){
    try{
      const cur=state.tredictSnapshot||{};
      const stale=!cur.date||String(cur.date)<LATEST_TREDICT.date;
      if(stale){ state.tredictSnapshot={...cur,...LATEST_TREDICT}; return; }
      if(String(cur.date)===LATEST_TREDICT.date){
        state.tredictSnapshot={...LATEST_TREDICT,...cur,allSportIntensity:cur.allSportIntensity||LATEST_TREDICT.allSportIntensity};
      }
    }catch{}
  }

  function avgSleep7(){
    try{
      const rows=Object.entries(state.garminDaily||{}).map(([date,v])=>({date,h:Number(v?.sleepHours)})).filter(x=>Number.isFinite(x.h)&&x.h>0).sort((a,b)=>a.date.localeCompare(b.date)).slice(-7);
      if(rows.length>=3)return rows.reduce((s,x)=>s+x.h,0)/rows.length;
    }catch{}
    const s=state.tredictSnapshot||LATEST_TREDICT;
    return Number.isFinite(Number(s.sleepAvg7))?Number(s.sleepAvg7):null;
  }

  function loadDelta(){
    const s=state.tredictSnapshot||LATEST_TREDICT,cur=Number(s.effort7),prev=Number(s.effortPrev7);
    if(!Number.isFinite(cur)||!Number.isFinite(prev)||prev<=0)return null;
    return (cur/prev-1)*100;
  }

  function intensity(){
    const s=state.tredictSnapshot||LATEST_TREDICT,d=s.allSportIntensity||s.runningIntensity||{};
    const low=Number(d.low||0),medium=Number(d.medium||0),high=Number(d.high||0),total=low+medium+high;
    if(!total)return {low:0,medium:0,high:0};
    return {low:low/total*100,medium:medium/total*100,high:high/total*100};
  }

  function recentNutrition(){
    const now=new Date();now.setHours(12,0,0,0);const cutoff=new Date(now);cutoff.setDate(now.getDate()-4);
    const cut=`${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,'0')}-${String(cutoff.getDate()).padStart(2,'0')}`;
    return Object.entries(state.nutrition||{}).filter(([date])=>date>=cut&&date<=todayKey()).sort((a,b)=>a[0].localeCompare(b[0])).slice(-3).map(([date,v])=>({date,...v}));
  }

  function fuelingSignal(){
    const rows=recentNutrition(),energyTarget=Math.max(1,Number(state.nutritionGoals?.calories)||2500);
    const lowEnergy=rows.filter(x=>Number(x.calories)>0&&Number(x.calories)<energyTarget*.8).length;
    const lowProtein=rows.filter(x=>Number(x.protein)>0&&Number(x.protein)<100).length;
    if(rows.length>=2&&lowEnergy>=2&&lowProtein>=2)return {tone:'watch',text:'Je energie én eiwit lagen meerdere recente dagen laag. Eet vandaag niet te krap en plan extra eiwit en koolhydraten rond training.'};
    if(rows.length>=2&&lowEnergy>=2)return {tone:'watch',text:'Je energie-inname lag meerdere recente dagen laag. Geef herstel prioriteit en voeg vooral rond trainingen voldoende koolhydraten toe.'};
    if(rows.length>=2&&lowProtein>=2)return {tone:'watch',text:'Je eiwit lag meerdere recente dagen onder 100 g. Verdeel vandaag extra eiwit over 3–4 eetmomenten.'};
    return {tone:'good',text:'Fueling ziet er stabiel uit. Houd eiwit verdeeld over de dag en gebruik extra koolhydraten rond langere of intensieve trainingen.'};
  }

  function readiness(){
    const s=state.tredictSnapshot||LATEST_TREDICT,sleep=avgSleep7(),delta=loadDelta(),hrv=Number(s.hrv),base=Number(s.hrvBaseline),hrvRatio=base>0?hrv/base:null;
    let title='Goed om te trainen',copy='Slaap, HRV en belasting geven samen geen duidelijk remsignaal.';
    const sleepLow=sleep!=null&&sleep<7,hrvLow=hrvRatio!=null&&hrvRatio<.9,loadHigh=delta!=null&&delta>30;
    if((sleepLow&&hrvLow)||loadHigh){title='Rustiger aan';copy='Meerdere herstelsignalen vragen aandacht. Houd intensiteit en extra volume beperkt.';}
    else if(sleepLow||hrvLow||(delta!=null&&delta>20)){title='Train op gevoel';copy='Er is één aandachtspunt in je herstel of belasting. Train, maar houd ruimte om bij te sturen.';}
    return {title,copy,sleep,delta,hrv,base};
  }

  function recoveryRows(){
    const rows=Object.entries(state.garminDaily||{}).map(([date,v])=>({
      date,
      sleep:Number(v?.sleepHours),
      hrv:Number(v?.hrv),
      rhr:Number(v?.restingHeartRate)
    })).filter(x=>x.date&&[x.sleep,x.hrv,x.rhr].some(Number.isFinite)).sort((a,b)=>a.date.localeCompare(b.date));
    return rows.slice(-21);
  }
  function avg(values){const xs=values.filter(Number.isFinite);return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;}
  function recoveryTrend(){
    const rows=recoveryRows();
    const t=state.tredictSnapshot||LATEST_TREDICT;
    const fallbackHrvBase=Number.isFinite(Number(t.hrvBaseline))?Number(t.hrvBaseline):avg(rows.map(x=>x.hrv));
    const fallbackRhrBase=avg(rows.slice(-7).map(x=>x.rhr));
    const fallbackSleepBase=avg(rows.slice(-7).map(x=>x.sleep))||avgSleep7();
    const out=rows.map((row,i)=>{
      const prev=rows.slice(Math.max(0,i-7),i);
      const hBase=avg(prev.map(x=>x.hrv))||fallbackHrvBase;
      const rBase=avg(prev.map(x=>x.rhr))||fallbackRhrBase;
      const sBase=avg(prev.map(x=>x.sleep))||fallbackSleepBase;
      let score=100;
      let hrvLow=false,rhrHigh=false,sleepLow=false;
      if(Number.isFinite(row.hrv)&&Number.isFinite(hBase)&&hBase>0){const ratio=row.hrv/hBase;hrvLow=ratio<.90;score-=Math.min(30,Math.max(0,(1-ratio)*200));}
      if(Number.isFinite(row.rhr)&&Number.isFinite(rBase)){const diff=row.rhr-rBase;rhrHigh=diff>=5;score-=Math.min(25,Math.max(0,diff*4));}
      if(Number.isFinite(row.sleep)&&Number.isFinite(sBase)){const diff=sBase-row.sleep;sleepLow=diff>=1||row.sleep<6;score-=Math.min(25,Math.max(0,diff*12));if(row.sleep<6)score-=5;}
      const signals=[hrvLow,rhrHigh,sleepLow].filter(Boolean).length;
      return {...row,score:Math.round(clamp(score,35,100)),signals,hrvLow,rhrHigh,sleepLow};
    });
    return out.slice(-14);
  }
  function recoveryStatus(score){return score>=80?'Goed':score>=65?'Normaal':'Aandacht';}
  function recoveryCopy(latest){
    if(!latest)return 'Nog te weinig dagelijkse hersteldata voor een trend.';
    const bits=[];
    if(latest.hrvLow)bits.push('HRV lager dan je patroon');
    if(latest.rhrHigh)bits.push('rusthartslag hoger dan normaal');
    if(latest.sleepLow)bits.push('slaap duidelijk lager dan je patroon');
    if(latest.signals>=2)return `Herstel wijkt af: ${bits.join(' en ')}. Zie dit als een signaal om extra op herstel te letten, niet als een diagnose.`;
    if(latest.signals===1)return `Eén herstelsignaal wijkt af (${bits[0]}), maar het totale patroon blijft redelijk stabiel.`;
    return 'Herstel stabiel: HRV, rusthartslag en slaap liggen rond je persoonlijke patroon.';
  }
  function recoveryChartHtml(trend){
    if(!trend.length)return '<div class="r38-muted" style="margin-top:12px">Nog geen Garmin-dagd ata beschikbaar.</div>'.replace('dagd ata','dagdata');
    const w=300,h=92,pad=8,min=35,max=100;
    const pts=trend.map((x,i)=>{const px=trend.length===1?w/2:pad+i*((w-pad*2)/(trend.length-1));const py=pad+(max-x.score)/(max-min)*(h-pad*2);return [px,py];});
    const poly=pts.map(p=>p.join(',')).join(' ');
    const circles=pts.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${trend[i].signals>=2?'#d76a78':'#f05d9d'}"/>`).join('');
    const first=trend[0]?.date,last=trend.at(-1)?.date;
    const label=d=>d?new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short'}).format(new Date(`${d}T12:00:00`)):'';
    return `<div style="margin-top:14px"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Herstelscore laatste ${trend.length} dagen" style="width:100%;height:105px;overflow:visible"><line x1="${pad}" y1="${pad+(max-80)/(max-min)*(h-pad*2)}" x2="${w-pad}" y2="${pad+(max-80)/(max-min)*(h-pad*2)}" stroke="#f1e5eb" stroke-width="1" stroke-dasharray="4 4"/><polyline points="${poly}" fill="none" stroke="#f05d9d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${circles}</svg><div style="display:flex;justify-content:space-between;margin-top:-2px;font-size:9px;color:var(--r38muted)"><span>${label(first)}</span><span>${label(last)}</span></div></div>`;
  }

  function patchToday(){
    const root=document.querySelector('#view-today .r38');if(!root)return;

    const nextSection=[...root.querySelectorAll('.r38-section')].find(x=>x.textContent.includes('Volgende op je weeklijst'));
    if(nextSection){const row=nextSection.nextElementSibling;nextSection.remove();if(row?.classList.contains('r38-row'))row.remove();}

    const readyCard=root.querySelector('.r38-card.r38-soft');
    if(readyCard){
      const r=readiness();
      readyCard.innerHTML=`<p class="r38-kicker">Training readiness</p><h2>${esc(r.title)}</h2><p class="r38-muted">${esc(r.copy)}</p><div class="r38-mini-grid"><div class="r38-mini"><b>Slaap · 7d</b><strong>${r.sleep==null?'—':`${fmt(r.sleep,1)} u`}</strong></div><div class="r38-mini"><b>HRV</b><strong>${Number.isFinite(r.hrv)?fmt(r.hrv):'—'}</strong><span class="r38-muted" style="font-size:9px">${Number.isFinite(r.base)?`baseline ${fmt(r.base)}`:''}</span></div><div class="r38-mini"><b>Belasting · 7d</b><strong>${r.delta==null?'—':`${r.delta>=0?'+':''}${fmt(r.delta)}%`}</strong></div></div>`;
    }

    const foodCard=[...root.querySelectorAll('.r38-card')].find(x=>x.querySelector('.r38-kicker')?.textContent.includes('Eetadvies'));
    if(foodCard){
      const sig=fuelingSignal(),n=state.nutrition?.[todayKey()];
      const tone=sig.tone==='watch'?'background:#fff8ef;border-color:#f2dfbf;':'';
      foodCard.setAttribute('style',tone);
      foodCard.innerHTML=`<p class="r38-kicker">Eetadvies</p><div class="r38-top"><div class="r38-copy"><strong>${esc(sig.text)}</strong><small>${n?`${fmt(n.calories)} kcal · ${fmt(n.protein)} g eiwit vandaag gelogd`:'Nog geen voeding voor vandaag gelogd'}</small></div></div>`;
    }

    const runCard=[...root.querySelectorAll('.r38-card')].find(x=>x.querySelector('.r38-kicker')?.textContent.includes('Kilometers deze week'));
    if(runCard){const k=runCard.querySelector('.r38-kicker');if(k)k.textContent='Hardloopprogressie · deze week';}
  }

  function patchInsights(){
    const root=document.querySelector('#view-progress .r38');if(!root)return;
    const r=readiness(),z=intensity(),km=weekKm();
    const minis=root.querySelectorAll('.r38-mini-grid .r38-mini');
    if(minis[0])minis[0].innerHTML=`<b>Slaap · 7d</b><strong>${r.sleep==null?'—':`${fmt(r.sleep,1)} u`}</strong>`;
    if(minis[1])minis[1].innerHTML=`<b>Belasting · 7d</b><strong>${r.delta==null?'—':`${r.delta>=0?'+':''}${fmt(r.delta)}%`}</strong>`;
    if(minis[2])minis[2].innerHTML=`<b>Hardlopen</b><strong>${fmt(km,1)} km</strong>`;

    const loadCard=[...root.querySelectorAll('.r38-card')].find(x=>x.textContent.includes('Trainingsbelasting · 7 dagen'));
    if(loadCard){
      const s=state.tredictSnapshot||LATEST_TREDICT;
      loadCard.innerHTML=`<div class="r38-top"><div><p class="r38-kicker">Trainingsbelasting · 7 dagen</p><h2>${fmt(s.effort7)}</h2></div><strong style="color:var(--r38);font-size:12px">${r.delta==null?'—':`${r.delta>=0?'+':''}${fmt(r.delta)}%`}</strong></div><p class="r38-muted">Vorige 7 dagen: ${fmt(s.effortPrev7)} · ${r.delta==null?'geen vergelijking':Math.abs(r.delta)<10?'stabiel':'duidelijke verandering'}</p>`;
    }

    let recoveryCard=document.getElementById('r47RecoveryCard');
    if(!recoveryCard){
      recoveryCard=document.createElement('article');recoveryCard.id='r47RecoveryCard';recoveryCard.className='r38-card';
      if(loadCard?.nextSibling)loadCard.parentNode.insertBefore(recoveryCard,loadCard.nextSibling);else root.appendChild(recoveryCard);
    }
    const trend=recoveryTrend(),latest=trend.at(-1)||null,score=latest?.score??null,status=score==null?'Nog geen score':recoveryStatus(score);
    recoveryCard.innerHTML=`<div class="r38-top"><div><p class="r38-kicker">Herstel · laatste 14 dagen</p><h2>${score==null?'—':fmt(score)}${score==null?'':` · ${status}`}</h2></div><span style="font-size:11px;color:var(--r38muted)">0–100</span></div>${recoveryChartHtml(trend)}<p class="r38-muted" style="margin:12px 0 0">${esc(recoveryCopy(latest))}</p><p class="r38-muted" style="font-size:9px;margin:6px 0 0">Gebaseerd op HRV, rusthartslag en slaap t.o.v. jouw eigen patroon.</p>`;

    const zoneCard=[...root.querySelectorAll('.r38-card')].find(x=>x.textContent.includes('Loopintensiteit')||x.textContent.includes('Laag / midden / hoog'));
    if(zoneCard){zoneCard.innerHTML=`<p class="r38-kicker">Intensity distribution · alle sporten</p><h3>Laag / midden / hoog</h3><p class="r38-muted" style="margin-bottom:0">Hartslag · deze week · Tredict</p><div class="r38-zonebar"><i style="width:${z.low}%"></i><i style="width:${z.medium}%"></i><i style="width:${z.high}%"></i></div><div class="r38-zonelegend"><span><b>${fmt(z.low)}%</b>Laag</span><span><b>${fmt(z.medium)}%</b>Midden</span><span><b>${fmt(z.high)}%</b>Hoog</span></div>`;}

    const note=[...root.querySelectorAll('.r38-card')].find(x=>x.querySelector('.r38-kicker')?.textContent.includes('Wat valt op?'));
    note?.remove();
  }

  function patchSettings(){
    const card=document.getElementById('tredictSettingsCard');
    if(card)card.style.display='none';
  }

  ensureTredictSnapshot();
  const baseRomyRefresh=window.romyV38Refresh;
  function refresh(){
    ensureTredictSnapshot();
    try{baseRomyRefresh?.();}catch(e){console.error('Romy refresh',e);}
    setTimeout(()=>{try{patchToday();patchInsights();patchSettings();}catch(e){console.error('Romy focused patch',e);}},0);
  }
  window.romyV38Refresh=refresh;

  try{renderDashboard=function(){refresh();};}catch{}
  try{renderTraining=function(){refresh();};}catch{}
  try{renderRunPlan=function(){refresh();};}catch{}
  try{renderProgress=function(){refresh();};}catch{}
  try{renderChart=function(){};}catch{}

  try{
    const baseSave=saveState;
    if(typeof baseSave==='function'&&!baseSave._romyV47Wrapped){
      const wrapped=function(){const out=baseSave.apply(this,arguments);setTimeout(refresh,0);return out;};
      wrapped._romyV47Wrapped=true;
      saveState=wrapped;
    }
  }catch{}

  document.querySelectorAll('.bottom-nav .nav-item').forEach(btn=>btn.addEventListener('click',()=>setTimeout(refresh,0)));
  window.addEventListener('pageshow',()=>setTimeout(refresh,0));
  window.addEventListener('load',()=>setTimeout(refresh,150));
  setTimeout(refresh,0);
})();