// Romy Health minimal UI — calm presentation layer over the existing data/integrations.
// Existing Garmin, Tredict, nutrition, strength, cloud sync and plan logic remain intact.
(function(){
  const DAY=86400000;
  let selectedRunPlanIndex=null;

  const META={
    kracht1:{name:'Gym 1',icon:'🏋︎',sub:'Krachttraining'},
    tweeslag:{name:'Beachvolleybal 1',icon:'♡',sub:'Beachvolleybal'},
    zwemmen:{name:'Zwemmen',icon:'≈',sub:'Techniek / herstel'},
    donitas1:{name:'Volleybal 1',icon:'♡',sub:'Volleybaltraining'},
    tritanium:{name:'Tritanium',icon:'⌁',sub:'Kwaliteitstraining'},
    kracht2:{name:'Gym 2',icon:'🏋︎',sub:'Krachttraining'},
    donitas2:{name:'Donitas 2',icon:'♡',sub:'Volleybaltraining'},
    run1:{name:'Run 1',icon:'⌁',sub:'Rustige loop'},
    run2:{name:'Run 2',icon:'⌁',sub:'Lange duurloop'}
  };

  const FALLBACK_ROUTINE={
    1:{label:'Maandag',items:['kracht1','tweeslag']},
    2:{label:'Dinsdag',items:['zwemmen','donitas1']},
    3:{label:'Woensdag',items:['tritanium']},
    4:{label:'Donderdag',items:['kracht2','donitas2']},
    5:{label:'Vrijdag',items:['run1']},
    6:{label:'Zaterdag',items:[]},
    0:{label:'Zondag',items:['run2']}
  };

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function fmt(v,d=0){return v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d});}
  function localKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function shiftDate(date,days){const d=new Date(date);d.setHours(12,0,0,0);d.setDate(d.getDate()+days);return d;}
  function activityDate(a){return String(a?.date||a?.startTimeLocal||a?.startTime||'').slice(0,10);}
  function isRun(a){const t=`${a?.type||''} ${a?.name||''}`.toLowerCase();return t.includes('run')||t.includes('hardloop');}
  function parseKm(text){const m=String(text||'').match(/(\d+(?:[,.]\d+)?)\s*km/i);return m?Number(m[1].replace(',','.')):null;}
  function isoWeek(date=new Date()){
    const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
    const day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);
    const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return {year:d.getUTCFullYear(),week:Math.ceil((((d-yearStart)/DAY)+1)/7)};
  }
  function isoMonday(year,week){
    const jan4=new Date(Date.UTC(year,0,4)),day=jan4.getUTCDay()||7,d=new Date(jan4);
    d.setUTCDate(jan4.getUTCDate()-(day-1)+(week-1)*7);d.setUTCHours(12,0,0,0);return d;
  }
  function planDate(plan,offset){const d=isoMonday(plan.year,plan.week);d.setUTCDate(d.getUTCDate()+offset);return new Date(`${d.toISOString().slice(0,10)}T12:00:00`);}
  function currentWeekPlan(){
    const iw=isoWeek();
    return (typeof marathonPlan!=='undefined'?marathonPlan:[]).find(p=>p.year===iw.year&&p.week===iw.week)
      ||(typeof marathonPlan!=='undefined'?marathonPlan:[]).find(p=>p.year>iw.year||(p.year===iw.year&&p.week>iw.week))
      ||(typeof marathonPlan!=='undefined'?marathonPlan.at(-1):null);
  }
  function routine(){return window.ROMY_WEEKLY_ROUTINE||FALLBACK_ROUTINE;}
  function checkFor(plan){try{return typeof checklistFor==='function'&&plan?checklistFor(plan):{};}catch{return {};}}
  function detailFor(id,plan){if(!plan)return META[id]?.sub||'';if(id==='run1')return plan.run1||'';if(id==='run2')return plan.run2||'';if(id==='tritanium')return plan.tritanium||'';return META[id]?.sub||'';}
  function shortDetail(text){
    const parts=String(text||'').split('·').map(x=>x.trim()).filter(Boolean);
    if(!parts.length)return '';
    if(/progress|marathon|hotspot|wedstrijd|race/i.test(parts[0])) return parts.slice(0,1).join(' · ');
    return parts.slice(0,2).join(' · ');
  }
  function dayLabel(date){return new Intl.DateTimeFormat('nl-NL',{weekday:'short'}).format(date).replace('.','');}
  function dateShort(date){return new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short'}).format(date).replace('.','');}

  function currentWeekBounds(date=new Date()){
    const d=new Date(date);d.setHours(12,0,0,0);const dow=d.getDay()||7;
    const start=shiftDate(d,-(dow-1)),end=shiftDate(start,6);return {start:localKey(start),end:localKey(end),monday:start};
  }
  function runsBetween(start,end){return (state.garminActivities||[]).filter(a=>isRun(a)&&activityDate(a)>=start&&activityDate(a)<=end);}
  function currentRunStats(){
    const b=currentWeekBounds(),runs=runsBetween(b.start,b.end);
    const km=runs.reduce((s,a)=>s+(Number(a.distanceKm)||0),0);
    return {runs,km,bounds:b};
  }
  function recentTritaniumEstimate(){
    const rows=(state.garminActivities||[]).filter(a=>isRun(a)&&Number(a.distanceKm)>0)
      .filter(a=>new Date(`${activityDate(a)}T12:00:00`).getDay()===3).slice(-4).map(a=>Number(a.distanceKm));
    return rows.length?rows.reduce((a,b)=>a+b,0)/rows.length:6.5;
  }
  function targetKm(plan){
    if(!plan)return 0;
    return (parseKm(plan.run1)||0)+(parseKm(plan.run2)||0)+recentTritaniumEstimate();
  }
  function sleepStats(){
    const rows=Object.entries(state.garminDaily||{}).map(([date,v])=>({date,h:Number(v?.sleepHours)})).filter(x=>Number.isFinite(x.h)&&x.h>0).sort((a,b)=>a.date.localeCompare(b.date));
    const latest=rows.at(-1)?.h??null,last7=rows.slice(-7).map(x=>x.h);
    return {latest,avg:last7.length?last7.reduce((a,b)=>a+b,0)/last7.length:null};
  }
  function loadLabel(){
    const s=state.tredictSnapshot;
    if(s&&Number(s.effortPrev7)>0&&Number.isFinite(Number(s.effort7))){
      const r=Number(s.effort7)/Number(s.effortPrev7);
      return r>=1.3?'hoog':r>=1.05?'iets hoger':r<=.8?'rustig':'prima';
    }
    return 'prima';
  }
  function recoveryLabel(){
    const s=sleepStats();if(s.latest==null)return 'opbouw';
    if(s.latest>=7.5)return 'goed';if(s.latest>=6.75)return 'redelijk';return 'rustig aan';
  }
  function todayIds(plan){
    const key=localKey();
    if(Array.isArray(state.dailyPlans?.[key]))return state.dailyPlans[key];
    const dow=new Date().getDay();return [...(routine()[dow]?.items||[])];
  }
  function coachText(ids){
    if(ids.includes('run2'))return 'Rustig beginnen en je lange duurloop gecontroleerd uitlopen.';
    if(ids.includes('run1'))return 'Houd je rustige run echt easy zodat je zondag fris bent voor Run 2.';
    if(ids.includes('tritanium'))return 'Tritanium is je kwaliteitstraining. Geen extra loopvolume nodig vandaag.';
    if(ids.some(x=>x==='kracht1'||x==='kracht2'))return 'Kies voor goede uitvoering en laat genoeg over voor je andere trainingen.';
    if(ids.some(x=>/donitas|tweeslag/.test(x)))return 'Ga met genoeg energie je volleybaltraining in en herstel daarna goed.';
    if(ids.includes('zwemmen'))return 'Gebruik het zwemmen als techniek- en herstelprikkel.';
    return 'Geen vaste training: herstel en normaal bewegen is vandaag genoeg.';
  }

  function installStyle(){
    if(document.getElementById('romyMinimalStyle'))return;
    const s=document.createElement('style');s.id='romyMinimalStyle';s.textContent=`
      :root{--rh-pink:#f25b9d;--rh-soft:#fff0f6;--rh-line:#eee7ec;--rh-ink:#242129;--rh-muted:#8a828c}
      .fab{display:none!important}.rh-clean-view>:not(.rh-clean-root){display:none!important}.rh-clean-root{display:block!important;padding-bottom:8px}.rh-clean-root *{box-sizing:border-box}
      .rh-card{background:#fff;border:1px solid var(--rh-line);border-radius:24px;padding:18px;margin-bottom:12px;box-shadow:0 8px 24px rgba(47,31,41,.035)}
      .rh-soft-card{background:linear-gradient(145deg,#fff5f9,#ffeaf3);border-color:#f8d6e5}.rh-kicker{font-size:11px;letter-spacing:.13em;text-transform:uppercase;font-weight:850;color:var(--rh-muted);margin:0 0 7px}.rh-card h2,.rh-card h3{color:var(--rh-ink);margin:0}.rh-card h2{font-size:23px}.rh-card h3{font-size:17px}.rh-muted{color:var(--rh-muted);font-size:13px;line-height:1.45}.rh-topline{display:flex;align-items:center;justify-content:space-between;gap:12px}.rh-topline strong{font-size:13px}.rh-progress{height:9px;background:#f2ebef;border-radius:999px;overflow:hidden;margin-top:11px}.rh-progress>i{display:block;height:100%;background:linear-gradient(90deg,#f47eb3,var(--rh-pink));border-radius:999px}.rh-readiness{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px}.rh-mini{background:rgba(255,255,255,.78);border:1px solid rgba(255,255,255,.9);border-radius:18px;padding:12px 10px;min-width:0}.rh-mini b{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--rh-muted);margin-bottom:6px}.rh-mini strong{font-size:17px;white-space:nowrap}.rh-planned{display:grid;gap:8px}.rh-session{display:flex;align-items:center;gap:12px;border:1px solid var(--rh-line);background:#fff;border-radius:18px;padding:13px 14px;color:inherit;text-align:left;width:100%}.rh-session-icon{width:44px;height:44px;border-radius:15px;background:var(--rh-soft);color:var(--rh-pink);display:grid;place-items:center;font-size:20px;flex:0 0 auto}.rh-session-main{min-width:0;flex:1}.rh-session-main strong{display:block;font-size:15px;color:var(--rh-ink)}.rh-session-main span{display:block;color:var(--rh-muted);font-size:12px;line-height:1.35;margin-top:3px}.rh-focus{display:flex;gap:12px;align-items:center}.rh-focus-icon{width:44px;height:44px;border-radius:50%;background:#fff;color:var(--rh-pink);display:grid;place-items:center;font-size:20px;flex:0 0 auto}.rh-section-title{display:flex;justify-content:space-between;align-items:end;margin:21px 2px 10px}.rh-section-title h2{margin:0;font-size:20px}.rh-section-title span{font-size:12px;color:var(--rh-muted)}
      .rh-week-head{margin-bottom:14px}.rh-day-list{display:grid;gap:8px}.rh-day-card{display:grid;grid-template-columns:52px 1fr;gap:10px;align-items:start;background:#fff;border:1px solid var(--rh-line);border-radius:18px;padding:10px}.rh-datebox{padding:4px 2px;text-align:center;color:var(--rh-muted);font-size:10px;text-transform:uppercase}.rh-datebox strong{display:block;font-size:17px;color:var(--rh-ink);text-transform:none;margin-bottom:1px}.rh-day-sessions{display:grid;gap:6px}.rh-toggle{display:flex;align-items:center;gap:10px;width:100%;border:0;background:transparent;padding:5px 4px;text-align:left;color:inherit}.rh-toggle-icon{width:34px;height:34px;border-radius:12px;background:var(--rh-soft);display:grid;place-items:center;color:var(--rh-pink);flex:0 0 auto}.rh-toggle-copy{min-width:0;flex:1}.rh-toggle-copy strong{display:block;font-size:14px}.rh-toggle-copy small{display:block;color:var(--rh-muted);font-size:11px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rh-check{width:24px;height:24px;border:1.5px solid #e6dce2;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:12px;flex:0 0 auto}.rh-toggle.done .rh-check{background:var(--rh-pink);border-color:var(--rh-pink)}.rh-rest{padding:10px;color:var(--rh-muted);font-size:12px}
      .rh-run-switch{display:flex;align-items:center;justify-content:space-between;gap:12px}.rh-arrow{width:34px;height:34px;border:0;border-radius:50%;background:var(--rh-soft);color:var(--rh-pink);font-size:22px}.rh-run-week{text-align:center}.rh-run-week strong{display:block;font-size:17px}.rh-run-week span{font-size:11px;color:var(--rh-muted)}.rh-run-list{display:grid;gap:9px}.rh-run-card{border:1px solid var(--rh-line);background:#fff;border-radius:18px;overflow:hidden}.rh-run-card summary{list-style:none;display:flex;align-items:center;gap:12px;padding:13px 14px;cursor:pointer}.rh-run-card summary::-webkit-details-marker{display:none}.rh-run-card[open]{border-color:#f4cadd;background:#fffafd}.rh-run-extra{padding:0 14px 14px 70px;color:#6f6872;font-size:12px;line-height:1.5}.rh-run-date{font-size:10px;color:var(--rh-muted);text-align:right;white-space:nowrap}.rh-run-card .rh-session-main span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .rh-insight-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.rh-stat{background:#fff;border:1px solid var(--rh-line);border-radius:20px;padding:14px 11px;min-width:0}.rh-stat b{font-size:10px;color:var(--rh-muted);display:block;margin-bottom:7px}.rh-stat strong{font-size:19px;display:block;white-space:nowrap}.rh-stat small{font-size:10px;color:var(--rh-muted)}.rh-bars{height:118px;display:flex;align-items:end;gap:10px;margin-top:18px;padding:0 5px 22px;position:relative}.rh-bar-col{flex:1;height:100%;display:flex;align-items:end;position:relative}.rh-bar{width:100%;min-height:3px;border-radius:8px 8px 3px 3px;background:#f6d9e6}.rh-bar.current{background:linear-gradient(#f58ab8,var(--rh-pink))}.rh-bar-label{position:absolute;left:50%;transform:translateX(-50%);bottom:-18px;font-size:9px;color:var(--rh-muted)}.rh-bullets{display:grid;gap:0;margin-top:8px}.rh-bullet{display:flex;gap:10px;align-items:center;padding:11px 0;border-top:1px solid var(--rh-line);font-size:13px}.rh-bullet:first-child{border-top:0}.rh-bullet i{width:30px;height:30px;border-radius:10px;background:var(--rh-soft);display:grid;place-items:center;color:var(--rh-pink);font-style:normal}.rh-pr{display:flex;justify-content:space-between;align-items:center;gap:12px}.rh-pr strong{font-size:23px}.rh-pr span{font-size:11px;color:var(--rh-muted)}
      .bottom-nav{background:rgba(255,255,255,.94)!important;backdrop-filter:blur(18px);border-top:1px solid #f0e9ed!important}.nav-item span{font-size:20px!important}.nav-item small{font-size:9px!important}.nav-item.active{color:var(--rh-pink)!important}
      @media(max-width:380px){.rh-readiness,.rh-insight-grid{gap:5px}.rh-mini{padding:10px 7px}.rh-mini strong{font-size:15px}.rh-stat strong{font-size:17px}}
    `;document.head.appendChild(s);
  }

  function rootFor(id){
    const view=document.getElementById(id);if(!view)return null;view.classList.add('rh-clean-view');
    let root=view.querySelector(':scope > .rh-clean-root');if(!root){root=document.createElement('div');root.className='rh-clean-root';view.appendChild(root);}return root;
  }

  function renderToday(){
    const root=rootFor('view-today');if(!root)return;
    const plan=currentWeekPlan(),ids=todayIds(plan),sleep=sleepStats(),run=currentRunStats(),target=targetKm(plan),pct=target?clamp(run.km/target*100,0,100):0;
    const title=ids.length?'Klaar voor training':'Hersteldag';
    const planned=ids.length?ids.map(id=>`<div class="rh-session"><span class="rh-session-icon">${META[id]?.icon||'•'}</span><div class="rh-session-main"><strong>${esc(META[id]?.name||id)}</strong><span>${esc(shortDetail(detailFor(id,plan))||META[id]?.sub||'')}</span></div></div>`).join(''):`<div class="rh-session"><span class="rh-session-icon">♡</span><div class="rh-session-main"><strong>Geen vaste training</strong><span>Herstel en bewegen op gevoel</span></div></div>`;
    root.innerHTML=`
      <article class="rh-card rh-soft-card"><p class="rh-kicker">Vandaag</p><h2>${title}</h2><p class="rh-muted" style="margin:5px 0 0">Alleen wat je vandaag echt nodig hebt.</p><div class="rh-readiness">
        <div class="rh-mini"><b>Slaap</b><strong>${sleep.latest==null?'—':`${fmt(sleep.latest,1)} u`}</strong></div>
        <div class="rh-mini"><b>Belasting</b><strong>${esc(loadLabel())}</strong></div>
        <div class="rh-mini"><b>Herstel</b><strong>${esc(recoveryLabel())}</strong></div>
      </div></article>
      <div class="rh-section-title"><h2>Vandaag gepland</h2></div><div class="rh-planned">${planned}</div>
      <article class="rh-card rh-soft-card" style="margin-top:12px"><p class="rh-kicker">Focus vandaag</p><div class="rh-focus"><span class="rh-focus-icon">◎</span><div><strong>${esc(coachText(ids))}</strong></div></div></article>
      <article class="rh-card"><div class="rh-topline"><div><p class="rh-kicker" style="margin-bottom:3px">Kilometers deze week</p><strong>${fmt(run.km,1)} / ${fmt(target,1)} km</strong></div><span class="rh-muted">${run.runs.length} run${run.runs.length===1?'':'s'}</span></div><div class="rh-progress"><i style="width:${pct}%"></i></div></article>`;
  }

  function renderSchema(){
    const root=rootFor('view-training');if(!root)return;
    const plan=currentWeekPlan();if(!plan){root.innerHTML='<article class="rh-card">Nog geen weekschema.</article>';return;}
    const check=checkFor(plan),order=[1,2,3,4,5,6,0],monday=isoMonday(plan.year,plan.week);
    const allIds=order.flatMap(d=>routine()[d]?.items||[]),done=allIds.filter(id=>check[id]).length,pct=allIds.length?done/allIds.length*100:0;
    const rows=order.map((dow,i)=>{
      const date=new Date(`${new Date(monday.getTime()+i*DAY).toISOString().slice(0,10)}T12:00:00`),items=routine()[dow]?.items||[];
      const body=items.length?items.map(id=>`<button class="rh-toggle ${check[id]?'done':''}" data-rh-toggle="${id}"><span class="rh-toggle-icon">${META[id]?.icon||'•'}</span><span class="rh-toggle-copy"><strong>${esc(META[id]?.name||id)}</strong><small>${esc(shortDetail(detailFor(id,plan))||META[id]?.sub||'')}</small></span><span class="rh-check">${check[id]?'✓':''}</span></button>`).join(''):`<div class="rh-rest">Rustdag / wedstrijd indien van toepassing</div>`;
      return `<article class="rh-day-card"><div class="rh-datebox"><strong>${esc(dayLabel(date))}</strong>${esc(dateShort(date))}</div><div class="rh-day-sessions">${body}</div></article>`;
    }).join('');
    root.innerHTML=`<article class="rh-card rh-week-head"><div class="rh-topline"><div><p class="rh-kicker" style="margin-bottom:3px">Deze week</p><h2>Week ${plan.week}</h2></div><span class="rh-muted">${esc(plan.range)}</span></div><div class="rh-topline" style="margin-top:12px"><strong>${done} van ${allIds.length} sessies gedaan</strong></div><div class="rh-progress"><i style="width:${pct}%"></i></div></article><div class="rh-day-list">${rows}</div>`;
    root.querySelectorAll('[data-rh-toggle]').forEach(btn=>btn.addEventListener('click',()=>{
      if(typeof togglePlanItem==='function')togglePlanItem(plan.key,btn.dataset.rhToggle);setTimeout(renderAllMinimal,20);
    }));
  }

  function currentPlanIdx(){
    const plan=currentWeekPlan();const list=typeof marathonPlan!=='undefined'?marathonPlan:[];const idx=plan?list.findIndex(p=>p.key===plan.key):-1;return idx>=0?idx:0;
  }
  function renderRunning(){
    const root=rootFor('view-running');if(!root)return;const list=typeof marathonPlan!=='undefined'?marathonPlan:[];if(!list.length)return;
    if(selectedRunPlanIndex==null)selectedRunPlanIndex=currentPlanIdx();selectedRunPlanIndex=clamp(selectedRunPlanIndex,0,list.length-1);
    const plan=list[selectedRunPlanIndex],isCurrent=plan.key===currentWeekPlan()?.key,run=currentRunStats(),target=targetKm(plan),pct=isCurrent&&target?clamp(run.km/target*100,0,100):0;
    const sessions=[['tritanium','Tritanium',2],['run1','Run 1',4],['run2','Run 2',6]];
    const cards=sessions.map(([id,label,offset])=>{
      const full=detailFor(id,plan),date=planDate(plan,offset);
      return `<details class="rh-run-card"><summary><span class="rh-session-icon">${META[id]?.icon||'⌁'}</span><span class="rh-session-main"><strong>${label}</strong><span>${esc(shortDetail(full)||META[id]?.sub||'')}</span></span><span class="rh-run-date">${esc(dayLabel(date))}<br>${esc(dateShort(date))}</span></summary><div class="rh-run-extra">${esc(full)}</div></details>`;
    }).join('');
    root.innerHTML=`
      ${isCurrent?`<article class="rh-card"><div class="rh-topline"><div><p class="rh-kicker" style="margin-bottom:3px">Kilometers deze week</p><h2>${fmt(run.km,1)} / ${fmt(target,1)} km</h2></div><span class="rh-muted">${run.runs.length} gelopen</span></div><div class="rh-progress"><i style="width:${pct}%"></i></div></article>`:''}
      <article class="rh-card"><div class="rh-run-switch"><button class="rh-arrow" data-run-prev aria-label="Vorige week">‹</button><div class="rh-run-week"><strong>Week ${plan.week}</strong><span>${esc(plan.range)}</span></div><button class="rh-arrow" data-run-next aria-label="Volgende week">›</button></div></article>
      <div class="rh-section-title"><h2>${isCurrent?'Deze week':'Loopschema'}</h2><span>Tik voor details</span></div><div class="rh-run-list">${cards}</div>`;
    root.querySelector('[data-run-prev]')?.addEventListener('click',()=>{selectedRunPlanIndex--;renderRunning();});
    root.querySelector('[data-run-next]')?.addEventListener('click',()=>{selectedRunPlanIndex++;renderRunning();});
  }

  function weekTrainingMinutes(){
    const b=currentWeekBounds();return (state.trainingCheckins||[]).filter(x=>String(x.date||'')>=b.start&&String(x.date||'')<=b.end).reduce((s,x)=>s+(Number(x.minutes)||0),0);
  }
  function longestRun(){
    const rows=(state.garminActivities||[]).filter(a=>isRun(a)&&Number(a.distanceKm)>0);return rows.sort((a,b)=>Number(b.distanceKm)-Number(a.distanceKm))[0]||null;
  }
  function best5k(){
    const rows=(state.garminActivities||[]).filter(a=>isRun(a)&&Number(a.distanceKm)>=4.5&&Number(a.distanceKm)<=5.5&&Number(a.durationSeconds)>0)
      .map(a=>({...a,pace:Number(a.durationSeconds)/Number(a.distanceKm)})).sort((a,b)=>a.pace-b.pace);return rows[0]||null;
  }
  function pace(sec){if(!Number.isFinite(sec))return '—';const m=Math.floor(sec/60),s=Math.round(sec%60);return `${m}:${String(s).padStart(2,'0')}/km`;}
  function weeklyKmSeries(n=5){
    const now=new Date(),cur=isoWeek(now),curMon=isoMonday(cur.year,cur.week),out=[];
    for(let i=n-1;i>=0;i--){const mon=new Date(curMon);mon.setUTCDate(mon.getUTCDate()-7*i);const start=mon.toISOString().slice(0,10),end=new Date(mon.getTime()+6*DAY).toISOString().slice(0,10);const km=runsBetween(start,end).reduce((s,a)=>s+(Number(a.distanceKm)||0),0);const iw=isoWeek(new Date(`${start}T12:00:00`));out.push({label:`W${iw.week}`,km,current:i===0});}return out;
  }
  function renderInsights(){
    const root=rootFor('view-progress');if(!root)return;
    const run=currentRunStats(),sleep=sleepStats(),minutes=weekTrainingMinutes(),long=longestRun(),best=best5k(),plan=currentWeekPlan(),check=checkFor(plan),strength=(check.kracht1?1:0)+(check.kracht2?1:0),series=weeklyKmSeries(),max=Math.max(1,...series.map(x=>x.km));
    const bars=series.map(x=>`<div class="rh-bar-col"><i class="rh-bar ${x.current?'current':''}" style="height:${Math.max(4,x.km/max*100)}%"></i><span class="rh-bar-label">${x.label}</span></div>`).join('');
    root.innerHTML=`
      <div class="rh-insight-grid"><article class="rh-stat"><b>Trainingstijd</b><strong>${fmt(minutes)} min</strong><small>deze week</small></article><article class="rh-stat"><b>Kilometers</b><strong>${fmt(run.km,1)} km</strong><small>${run.runs.length} runs</small></article><article class="rh-stat"><b>Slaap gem.</b><strong>${sleep.avg==null?'—':`${fmt(sleep.avg,1)} u`}</strong><small>laatste 7</small></article></div>
      <article class="rh-card" style="margin-top:12px"><div class="rh-topline"><div><p class="rh-kicker" style="margin-bottom:3px">Hardlopen</p><h3>Kilometers per week</h3></div></div><div class="rh-bars">${bars}</div></article>
      <article class="rh-card"><p class="rh-kicker">Deze week</p><div class="rh-bullets"><div class="rh-bullet"><i>⌁</i><span>Je liep <strong>${run.runs.length}</strong> run${run.runs.length===1?'':'s'}.</span></div><div class="rh-bullet"><i>🏋︎</i><span><strong>${strength}</strong> krachttraining${strength===1?'':'en'} afgevinkt.</span></div><div class="rh-bullet"><i>↗</i><span>Langste geregistreerde run: <strong>${long?`${fmt(long.distanceKm,1)} km`:'—'}</strong>.</span></div></div></article>
      <article class="rh-card rh-pr"><div><p class="rh-kicker" style="margin-bottom:4px">Beste 5 km-achtig</p><strong>${best?pace(best.pace):'—'}</strong></div><span>${best?esc(dateShort(new Date(`${activityDate(best)}T12:00:00`))):'nog geen vergelijkbare run'}</span></article>`;
  }

  function renderAllMinimal(){
    try{installStyle();renderToday();renderSchema();renderRunning();renderInsights();}catch(err){console.warn('Romy minimal UI',err);}
  }
  window.romyMinimalRefresh=renderAllMinimal;

  function wrap(name){
    try{
      const base=window[name];if(typeof base!=='function'||base._rhMinimalWrapped)return;
      const wrapped=function(){const out=base.apply(this,arguments);setTimeout(renderAllMinimal,0);return out;};wrapped._rhMinimalWrapped=true;window[name]=wrapped;
    }catch{}
  }

  ['renderDashboard','renderTraining','renderRunPlan','renderProgress'].forEach(wrap);
  try{
    const baseSave=saveState;
    if(typeof baseSave==='function') saveState=function(){const out=baseSave.apply(this,arguments);setTimeout(renderAllMinimal,0);return out;};
  }catch{}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(renderAllMinimal,250));
  else setTimeout(renderAllMinimal,50);
  window.addEventListener('load',()=>{setTimeout(renderAllMinimal,350);setTimeout(renderAllMinimal,1200);});
})();