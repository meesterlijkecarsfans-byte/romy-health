// Romy Health v44 compatibility + focused dashboard layer.
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
  const todayKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};

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
    const r=readiness(),z=intensity();
    const minis=root.querySelectorAll('.r38-mini-grid .r38-mini');
    if(minis[0])minis[0].innerHTML=`<b>Slaap · 7d</b><strong>${r.sleep==null?'—':`${fmt(r.sleep,1)} u`}</strong>`;
    if(minis[1])minis[1].innerHTML=`<b>Belasting · 7d</b><strong>${r.delta==null?'—':`${r.delta>=0?'+':''}${fmt(r.delta)}%`}</strong>`;
    if(minis[2]){const km=(()=>{try{return [...root.querySelectorAll('.r38-card')].find(x=>x.textContent.includes('Kilometers per week'))?'Trend':'—';}catch{return '—';}})();minis[2].innerHTML=`<b>Hardlopen</b><strong>${km}</strong>`;}

    const loadCard=[...root.querySelectorAll('.r38-card')].find(x=>x.textContent.includes('Trainingsbelasting · 7 dagen'));
    if(loadCard){
      const s=state.tredictSnapshot||LATEST_TREDICT;
      loadCard.innerHTML=`<div class="r38-top"><div><p class="r38-kicker">Trainingsbelasting · 7 dagen</p><h2>${fmt(s.effort7)}</h2></div><strong style="color:var(--r38);font-size:12px">${r.delta==null?'—':`${r.delta>=0?'+':''}${fmt(r.delta)}%`}</strong></div><p class="r38-muted">Vorige 7 dagen: ${fmt(s.effortPrev7)} · ${r.delta==null?'geen vergelijking':Math.abs(r.delta)<10?'stabiel':'duidelijke verandering'}</p>`;
    }

    const zoneCard=[...root.querySelectorAll('.r38-card')].find(x=>x.textContent.includes('Loopintensiteit')||x.textContent.includes('Laag / midden / hoog'));
    if(zoneCard){zoneCard.innerHTML=`<p class="r38-kicker">Intensity distribution · alle sporten</p><h3>Laag / midden / hoog</h3><p class="r38-muted" style="margin-bottom:0">Hartslag · deze week · Tredict</p><div class="r38-zonebar"><i style="width:${z.low}%"></i><i style="width:${z.medium}%"></i><i style="width:${z.high}%"></i></div><div class="r38-zonelegend"><span><b>${fmt(z.low)}%</b>Laag</span><span><b>${fmt(z.medium)}%</b>Midden</span><span><b>${fmt(z.high)}%</b>Hoog</span></div>`;}

    const note=[...root.querySelectorAll('.r38-card')].find(x=>x.querySelector('.r38-kicker')?.textContent.includes('Wat valt op?'));
    note?.remove();
  }

  function patchSettings(){
    const card=document.getElementById('tredictSettingsCard');
    if(card){const small=card.querySelector('small');if(small)small.textContent='Romy Health gebruikt nu een Tredict-snapshot via ChatGPT. Voor volledig automatische sync is later een veilige Personal API-koppeling nodig; zet nooit een token in GitHub-code.';}
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
    if(typeof baseSave==='function'&&!baseSave._romyV44Wrapped){
      const wrapped=function(){const out=baseSave.apply(this,arguments);setTimeout(refresh,0);return out;};
      wrapped._romyV44Wrapped=true;
      saveState=wrapped;
    }
  }catch{}

  document.querySelectorAll('.bottom-nav .nav-item').forEach(btn=>btn.addEventListener('click',()=>setTimeout(refresh,0)));
  window.addEventListener('pageshow',()=>setTimeout(refresh,0));
  window.addEventListener('load',()=>setTimeout(refresh,150));
  setTimeout(refresh,0);
})();