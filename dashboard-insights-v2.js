// Stable Romy Health v49 UI loader + final insights presentation layer.
(function(){
  function load(src,id,next){
    const existing=document.getElementById(id);
    if(existing){next?.();return;}
    const s=document.createElement('script');s.id=id;s.src=src;s.async=false;
    if(next)s.onload=next;document.body.appendChild(s);
  }

  const fmt=(v,d=0)=>v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d});
  const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const dayLabel=date=>new Intl.DateTimeFormat('nl-NL',{weekday:'short'}).format(date).replace('.','');

  function last7Dates(){
    const out=[];const now=new Date();now.setHours(12,0,0,0);
    for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(now.getDate()-i);out.push({date:key(d),label:dayLabel(d)});}
    return out;
  }

  function energyRows(){
    return last7Dates().map(x=>{
      const eaten=Number(state?.nutrition?.[x.date]?.calories);
      const burned=Number(state?.garminDaily?.[x.date]?.totalCalories);
      return {...x,in:Number.isFinite(eaten)&&eaten>0?eaten:null,out:Number.isFinite(burned)&&burned>0?burned:null};
    });
  }

  function energyCardHtml(){
    const rows=energyRows();
    const paired=rows.filter(x=>x.in!=null&&x.out!=null);
    const totalIn=paired.reduce((s,x)=>s+x.in,0),totalOut=paired.reduce((s,x)=>s+x.out,0),diff=totalIn-totalOut;
    const max=Math.max(1,...rows.flatMap(x=>[x.in||0,x.out||0]));
    const bars=rows.map(x=>{
      const hi=x.in==null?0:Math.max(3,x.in/max*100),ho=x.out==null?0:Math.max(3,x.out/max*100);
      return `<div style="flex:1;min-width:0;text-align:center"><div style="height:112px;display:flex;align-items:flex-end;justify-content:center;gap:3px"><i title="In: ${x.in==null?'geen invoer':`${fmt(x.in)} kcal`}" style="display:block;width:36%;height:${hi}%;background:#f28ab6;border-radius:7px 7px 2px 2px;${x.in==null?'opacity:.12':''}"></i><i title="Uit: ${x.out==null?'geen data':`${fmt(x.out)} kcal`}" style="display:block;width:36%;height:${ho}%;background:#6f6870;border-radius:7px 7px 2px 2px;${x.out==null?'opacity:.12':''}"></i></div><span style="font-size:9px;color:var(--r38muted)">${x.label}</span></div>`;
    }).join('');
    const diffText=paired.length?`${diff>=0?'+':''}${fmt(diff)} kcal`:'—';
    const basis=paired.length===7?'7-daags verschil':paired.length?`Verschil · ${paired.length} complete dagen`:'Nog geen complete dagen';
    return `<p class="r38-kicker">Energiebalans · afgelopen 7 dagen</p><div class="r38-top"><div><h2>${diffText}</h2><p class="r38-muted" style="margin-bottom:0">${basis}</p></div><div style="font-size:10px;color:var(--r38muted);text-align:right"><span style="display:block"><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#f28ab6;margin-right:4px"></i>In</span><span style="display:block;margin-top:3px"><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#6f6870;margin-right:4px"></i>Uit</span></div></div><div style="display:flex;gap:6px;align-items:end;margin-top:12px">${bars}</div><div class="r38-mini-grid" style="margin-top:14px"><div class="r38-mini"><b>In</b><strong>${paired.length?`${fmt(totalIn)} kcal`:'—'}</strong></div><div class="r38-mini"><b>Uit</b><strong>${paired.length?`${fmt(totalOut)} kcal`:'—'}</strong></div><div class="r38-mini"><b>Gem./dag</b><strong>${paired.length?`${diff>=0?'+':''}${fmt(diff/paired.length)} kcal`:'—'}</strong></div></div><p class="r38-muted" style="font-size:9px;margin:9px 0 0">Verschil wordt alleen berekend voor dagen met zowel voedingsinvoer als Garmin-verbranding. Verbranding blijft een schatting.</p>`;
  }

  function sleepCardHtml(){
    const rows=last7Dates().map(x=>{
      const sleep=Number(state?.garminDaily?.[x.date]?.sleepHours);
      return {...x,sleep:Number.isFinite(sleep)&&sleep>0?sleep:null};
    });
    const valid=rows.filter(x=>x.sleep!=null),avg=valid.length?valid.reduce((s,x)=>s+x.sleep,0)/valid.length:null;
    const max=Math.max(10,...valid.map(x=>x.sleep));
    const bars=rows.map(x=>`<div style="flex:1;min-width:0;text-align:center"><div style="height:86px;display:flex;align-items:flex-end;justify-content:center"><i title="${x.sleep==null?'Geen slaapdata':`${fmt(x.sleep,1)} uur`}" style="display:block;width:62%;height:${x.sleep==null?3:Math.max(4,x.sleep/max*100)}%;background:linear-gradient(#f5bad2,#f05d9d);border-radius:7px 7px 2px 2px;${x.sleep==null?'opacity:.12':''}"></i></div><span style="font-size:9px;color:var(--r38muted)">${x.label}</span></div>`).join('');
    return `<div class="r38-top"><div><p class="r38-kicker">Slaap · afgelopen 7 dagen</p><h2>${avg==null?'—':`${fmt(avg,1)} u`}</h2></div><span style="font-size:11px;color:var(--r38muted)">${valid.length}/7 nachten</span></div><div style="display:flex;gap:7px;align-items:end;margin-top:12px">${bars}</div><p class="r38-muted" style="font-size:9px;margin:9px 0 0">Gemiddelde van de beschikbare Garmin-slaapdata.</p>`;
  }

  function patchInsightsOrder(){
    const root=document.querySelector('#view-progress .r38');
    if(!root)return;

    const zone=[...root.querySelectorAll('.r38-card')].find(x=>x.textContent.includes('Intensity distribution')||x.textContent.includes('Loopintensiteit'));
    const recovery=document.getElementById('r47RecoveryCard');
    const run=[...root.querySelectorAll('.r38-card')].find(x=>x.textContent.includes('Kilometers per week'));
    if(!zone||!run)return;

    let energy=document.getElementById('r49EnergyCard');
    if(!energy){energy=document.createElement('article');energy.id='r49EnergyCard';energy.className='r38-card';}
    energy.innerHTML=energyCardHtml();

    let sleep=document.getElementById('r49SleepCard');
    if(!sleep){sleep=document.createElement('article');sleep.id='r49SleepCard';sleep.className='r38-card';}
    sleep.innerHTML=sleepCardHtml();

    const load=[...root.querySelectorAll('.r38-card')].find(x=>x.textContent.includes('Trainingsbelasting · 7 dagen'));
    load?.remove();
    root.querySelector('.r38-mini-grid')?.remove();
    [...root.querySelectorAll('.r38-card')].filter(x=>x.querySelector('.r38-kicker')?.textContent.includes('Wat valt op?')).forEach(x=>x.remove());

    root.append(zone,energy,sleep);
    if(recovery)root.append(recovery);
    root.append(run);
  }

  function installFinalLayer(){
    const previous=window.romyV38Refresh;
    if(typeof previous==='function'&&!previous._r49Wrapped){
      const wrapped=function(){const out=previous.apply(this,arguments);setTimeout(patchInsightsOrder,25);return out;};
      wrapped._r49Wrapped=true;window.romyV38Refresh=wrapped;
    }
    document.querySelectorAll('.bottom-nav .nav-item').forEach(btn=>btn.addEventListener('click',()=>setTimeout(patchInsightsOrder,45)));
    window.addEventListener('pageshow',()=>setTimeout(patchInsightsOrder,60));
    window.addEventListener('load',()=>setTimeout(patchInsightsOrder,180));
    setTimeout(patchInsightsOrder,40);
  }

  load('./romy-ui-v38.js?v=49','romyUiV49',()=>{
    load('./romy-compat-v39.js?v=49','romyCompatV49',installFinalLayer);
  });
})();