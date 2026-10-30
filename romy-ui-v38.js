// Romy Health v38 — one stable UI layer for Today, Schema, Hardlopen and Inzichten.
// Keeps existing state/data integrations, but avoids stacked observers and competing render layers.
(function(){
  'use strict';
  const DAY=86400000;
  const FIXED=[
    {id:'tweeslag',name:'Beachvolleybal',type:'volley'},
    {id:'donitas1',name:'Donitas 1',type:'volley'},
    {id:'donitas2',name:'Donitas 2',type:'volley'},
    {id:'kracht1',name:'Gym 1',type:'strength'},
    {id:'kracht2',name:'Gym 2',type:'strength'},
    {id:'tritanium',name:'Tritanium Run',type:'run'},
    {id:'run1',name:'Run 2',type:'run'},
    {id:'run2',name:'Run 3',type:'run'},
    {id:'zwemmen',name:'Zwemmen',type:'swim'},
    {id:'spinning',name:'Spinning',type:'cycle'}
  ];
  const EXTRA_OPTIONS=[
    ['','Kies sport…'],['beach','Beachvolleybal'],['volley','Volleybal'],['strength','Gym / kracht'],['run','Hardlopen'],['swim','Zwemmen'],['cycle','Spinning / fietsen'],['walk','Wandelen'],['other','Anders']
  ];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=(v,d=0)=>v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d});
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  function icon(type){
    const common='viewBox="0 0 24 24" aria-hidden="true"';
    if(type==='strength')return `<svg ${common}><path d="M7 8v8M4.5 9.5v5M17 8v8M19.5 9.5v5M7 12h10M2.5 11v2M21.5 11v2"/></svg>`;
    if(type==='volley'||type==='beach')return `<svg ${common}><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5c2.6 2.5 3.4 5.2 2.6 8.1M20.5 12c-3.4-.2-5.8 1-7.4 3.6M7.1 19c.9-3.2.2-5.9-2.2-8.2"/><path d="M14.6 11.6c-2.5-.8-4.8-.6-6.8.6"/></svg>`;
    if(type==='swim')return `<svg ${common}><path d="M3 15c2 1.7 4 1.7 6 0s4-1.7 6 0 4 1.7 6 0M3 19c2 1.7 4 1.7 6 0s4-1.7 6 0 4 1.7 6 0"/><circle cx="15.5" cy="5.5" r="1.7"/><path d="m5 13 4.5-5 4.5 3 3.5-2"/></svg>`;
    if(type==='cycle')return `<svg ${common}><circle cx="6" cy="17" r="3.5"/><circle cx="18" cy="17" r="3.5"/><path d="M8.5 17 12 9l3 8M9.5 11h6M12 9l-2-2M15.5 7h2"/></svg>`;
    if(type==='walk')return `<svg ${common}><circle cx="13.5" cy="4.5" r="1.7"/><path d="m11.5 8 2.8 2.3 2.2 3.2M12.5 10.5l-2.2 4.2-3 4M13.5 12.5l2 6"/></svg>`;
    if(type==='nutrition')return `<svg ${common}><path d="M12.5 7c-1.6-2-4.8-1.7-6.2.4C4 11 6.2 19 10 20c1 .3 1.5-.4 2-.4s1 .7 2 .4c3.8-1 6-9 3.7-12.6-1.3-2.1-4.3-2.4-5.2-.4Z"/><path d="M12 6c.2-2 1.5-3.3 3.5-3.8"/></svg>`;
    if(type==='home')return `<svg ${common}><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5M9.5 20v-6h5v6"/></svg>`;
    if(type==='list')return `<svg ${common}><path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1.4 1.4L7.5 4.8M3.5 12l1.4 1.4 2.6-2.6M3.5 18l1.4 1.4 2.6-2.6"/></svg>`;
    if(type==='chart')return `<svg ${common}><path d="M4 19V10M10 19V5M16 19v-7M22 19V3"/><path d="m4 8 6-5 6 6 6-6"/></svg>`;
    return `<svg ${common}><circle cx="14.5" cy="4.5" r="1.7"/><path d="m10 8 3-1.5 2.5 3 3 .8M12.5 8.5l-2 4 3.5 2.5 1.5 4.5M10.5 12.5 7 15l-2.5 4"/></svg>`;
  }

  function installStyle(){
    let s=document.getElementById('romyV38Style'); if(s)return;
    s=document.createElement('style');s.id='romyV38Style';s.textContent=`
      :root{--r38:#f05d9d;--r38soft:#fff0f6;--r38line:#eee7ec;--r38ink:#242129;--r38muted:#8a828c}
      .fab{display:none!important}.r38{padding-bottom:8px}.r38 *{box-sizing:border-box}.r38-card{background:#fff;border:1px solid var(--r38line);border-radius:24px;padding:18px;margin-bottom:12px;box-shadow:0 7px 24px rgba(48,28,40,.035)}
      .r38-soft{background:linear-gradient(145deg,#fff7fa,#ffeef6);border-color:#f7d7e5}.r38-kicker{margin:0 0 6px;font-size:10px;text-transform:uppercase;letter-spacing:.13em;font-weight:850;color:var(--r38muted)}.r38 h2,.r38 h3,.r38 p{margin-top:0}.r38 h2{font-size:23px;margin-bottom:5px}.r38 h3{font-size:17px;margin-bottom:4px}.r38-muted{color:var(--r38muted);font-size:12px;line-height:1.45}.r38-top{display:flex;justify-content:space-between;gap:12px;align-items:center}.r38-progress{height:9px;background:#f2ebef;border-radius:999px;overflow:hidden;margin-top:10px}.r38-progress i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#f58ab8,var(--r38))}
      .r38-mini-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}.r38-mini{border:1px solid #f5dce6;background:rgba(255,255,255,.8);border-radius:18px;padding:11px 9px}.r38-mini b{display:block;font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--r38muted);margin-bottom:5px}.r38-mini strong{font-size:16px;white-space:nowrap}.r38-section{display:flex;justify-content:space-between;align-items:end;margin:20px 2px 9px}.r38-section h2{font-size:20px;margin:0}.r38-section span{font-size:11px;color:var(--r38muted)}
      .r38-row{display:flex;align-items:center;gap:12px;width:100%;border:1px solid var(--r38line);border-radius:18px;background:#fff;padding:13px 14px;margin-bottom:8px;color:inherit;text-align:left}.r38-row.done{background:#fff8fb;border-color:#f3d0df}.r38-icon{width:42px;height:42px;border-radius:14px;background:var(--r38soft);display:grid;place-items:center;color:var(--r38);flex:0 0 auto}.r38-icon svg,.r38-nav-icon svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.r38-copy{min-width:0;flex:1}.r38-copy strong{display:block;font-size:14px}.r38-copy small{display:block;color:var(--r38muted);font-size:11px;line-height:1.35;margin-top:3px}.r38-check{width:25px;height:25px;border-radius:50%;border:1.5px solid #e4dbe0;display:grid;place-items:center;color:#fff;font-size:12px;flex:0 0 auto}.r38-row.done .r38-check{background:var(--r38);border-color:var(--r38)}
      .r38-extra{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}.r38-extra select{width:100%;border:1px solid var(--r38line);border-radius:14px;padding:11px;background:#fff;color:var(--r38ink)}.r38-extra button{border:0;border-radius:14px;background:var(--r38);color:#fff;padding:11px 13px;font-weight:800}.r38-extra-note{font-size:10px;color:var(--r38muted);margin-top:7px}.r38-week-card{border:1px solid var(--r38line);border-radius:22px;background:#fff;margin-bottom:10px;overflow:hidden}.r38-week-card.current{border-color:#f0b8d0;background:#fffafd}.r38-week-head{padding:14px 15px 10px;display:flex;justify-content:space-between;gap:10px}.r38-week-head strong{font-size:15px}.r38-week-head span{font-size:10px;color:var(--r38muted)}.r38-run-line{display:grid;grid-template-columns:42px 1fr;gap:10px;align-items:start;padding:11px 15px;border-top:1px solid var(--r38line)}.r38-run-line .r38-icon{width:38px;height:38px;border-radius:13px}.r38-run-line strong{display:block;font-size:13px}.r38-run-line p{margin:3px 0 0;color:var(--r38muted);font-size:11px;line-height:1.42}.r38-zonebar{display:flex;height:13px;border-radius:999px;overflow:hidden;background:#f2edf0;margin-top:12px}.r38-zonebar i:nth-child(1){background:#efb8cf}.r38-zonebar i:nth-child(2){background:#f28ab6}.r38-zonebar i:nth-child(3){background:#d94e86}.r38-zonelegend{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:9px}.r38-zonelegend b{display:block;font-size:14px}.r38-zonelegend span{font-size:10px;color:var(--r38muted)}.r38-bars{height:110px;display:flex;align-items:end;gap:9px;margin-top:15px;padding-bottom:20px}.r38-barcol{height:100%;flex:1;display:flex;align-items:end;position:relative}.r38-bar{width:100%;min-height:3px;border-radius:8px 8px 3px 3px;background:#f4d4e2}.r38-bar.current{background:linear-gradient(#f58ab8,var(--r38))}.r38-barcol span{position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);font-size:9px;color:var(--r38muted)}
      .bottom-nav{grid-template-columns:repeat(6,1fr)!important;padding-left:4px!important;padding-right:4px!important}.nav-item{min-width:0!important;gap:4px!important;padding-inline:1px!important}.r38-nav-icon{width:31px;height:31px;border-radius:11px;display:grid;place-items:center}.nav-item.active .r38-nav-icon{background:var(--r38soft)}.nav-item small{font-size:9px!important;white-space:nowrap}.r38-sportcount{font-size:12px;color:var(--r38muted)}
      @media(max-width:380px){.r38-mini-grid{gap:5px}.r38-mini{padding:9px 7px}.r38-mini strong{font-size:14px}.nav-item small{font-size:8px!important}}
    `;document.head.appendChild(s);
  }

  function isoWeek(date=new Date()){
    if(typeof currentIsoWeek==='function')return currentIsoWeek(date);
    const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));const day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);const y0=new Date(Date.UTC(d.getUTCFullYear(),0,1));return {year:d.getUTCFullYear(),week:Math.ceil((((d-y0)/DAY)+1)/7)};
  }
  function planList(){try{return Array.isArray(marathonPlan)?marathonPlan:[];}catch{return [];}}
  function currentPlan(){const iw=isoWeek();const list=planList();return list.find(p=>p.year===iw.year&&p.week===iw.week)||list.find(p=>p.year>iw.year||(p.year===iw.year&&p.week>iw.week))||list.at(-1)||null;}
  function check(plan){try{return plan&&typeof checklistFor==='function'?checklistFor(plan):{};}catch{return {};}}
  function planText(id,p){if(!p)return '';if(id==='tritanium')return p.tritanium||'';if(id==='run1')return p.run1||'';if(id==='run2')return p.run2||'';return id==='zwemmen'?'Zwemtraining':id==='spinning'?'Spinning / indoor cycling':id.startsWith('kracht')?'Krachttraining':id==='tweeslag'?'Beachvolleybaltraining':'Volleybaltraining';}
  function extraKey(p){return p?.key||`${isoWeek().year}-${isoWeek().week}`;}
  function extraState(p){state.extraTrainingV38 ||= {};const k=extraKey(p);state.extraTrainingV38[k] ||= {sport:'',done:false};return state.extraTrainingV38[k];}
  function save(){try{saveState();}catch{try{localStorage.setItem('romy-health-local-v1',JSON.stringify(state));}catch{}}}

  function parseKm(text){const m=String(text||'').match(/(\d+(?:[,.]\d+)?)\s*km/i);return m?Number(m[1].replace(',','.')):0;}
  function activityDate(a){return String(a?.date||a?.startTimeLocal||a?.startTime||'').slice(0,10);}
  function isRun(a){const t=`${a?.type||''} ${a?.name||''}`.toLowerCase();return t.includes('run')||t.includes('hardloop');}
  function weekBounds(){const now=new Date();now.setHours(12,0,0,0);const d=now.getDay()||7;const mon=new Date(now);mon.setDate(now.getDate()-(d-1));const sun=new Date(mon);sun.setDate(mon.getDate()+6);const key=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;return {start:key(mon),end:key(sun)};}
  function weekRuns(){const b=weekBounds();return (state.garminActivities||[]).filter(a=>isRun(a)&&activityDate(a)>=b.start&&activityDate(a)<=b.end);}
  function weekKm(){return weekRuns().reduce((s,a)=>s+(Number(a.distanceKm)||0),0);}
  function plannedKm(p){return (parseKm(p?.run1)||0)+(parseKm(p?.run2)||0)+6.5;}
  function latestSleep(){const rows=Object.entries(state.garminDaily||{}).map(([date,v])=>({date,h:Number(v?.sleepHours)})).filter(x=>Number.isFinite(x.h)&&x.h>0).sort((a,b)=>a.date.localeCompare(b.date));return rows.at(-1)?.h??null;}
  function avgSleep(){const rows=Object.values(state.garminDaily||{}).map(v=>Number(v?.sleepHours)).filter(Number.isFinite).slice(-7);return rows.length?rows.reduce((a,b)=>a+b,0)/rows.length:null;}
  function load(){const s=state.tredictSnapshot||{};const cur=Number(s.effort7),prev=Number(s.effortPrev7);if(Number.isFinite(cur)&&prev>0){const ratio=cur/prev,delta=(ratio-1)*100;return {label:ratio>=1.3?'Hoog':ratio>=1.05?'Iets hoger':ratio<=.8?'Rustig':'Prima',cur,prev,delta};}return {label:'Wordt opgebouwd',cur:null,prev:null,delta:null};}
  function recovery(){const h=latestSleep();if(h==null)return 'Wordt opgebouwd';if(h>=7.5)return 'Goed';if(h>=6.75)return 'Redelijk';return 'Rustig aan';}
  function intensity(){const d=state.tredictSnapshot?.runningIntensity||{};const total=Number(d.low||0)+Number(d.medium||0)+Number(d.high||0);if(!total)return {low:0,medium:0,high:0};return {low:Number(d.low)/total*100,medium:Number(d.medium)/total*100,high:Number(d.high)/total*100};}
  function weeklySeries(n=5){const out=[];const now=new Date();const dow=now.getDay()||7;const mon=new Date(now);mon.setHours(12,0,0,0);mon.setDate(now.getDate()-(dow-1));for(let i=n-1;i>=0;i--){const a=new Date(mon);a.setDate(mon.getDate()-7*i);const b=new Date(a);b.setDate(a.getDate()+6);const key=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;const km=(state.garminActivities||[]).filter(r=>isRun(r)&&activityDate(r)>=key(a)&&activityDate(r)<=key(b)).reduce((s,r)=>s+(Number(r.distanceKm)||0),0);const w=isoWeek(a);out.push({label:`W${w.week}`,km,current:i===0});}return out;}
  function weekMinutes(){const b=weekBounds();return (state.trainingCheckins||[]).filter(x=>String(x.date||'')>=b.start&&String(x.date||'')<=b.end).reduce((s,x)=>s+(Number(x.minutes)||0),0);}

  function replaceView(id,html){const v=document.getElementById(id);if(!v)return null;v.innerHTML=`<div class="r38">${html}</div>`;return v.querySelector('.r38');}

  function renderToday(){
    const p=currentPlan(),c=check(p),l=load(),h=latestSleep(),rec=recovery(),km=weekKm(),target=plannedKm(p),pct=target?clamp(km/target*100,0,100):0;
    const pending=FIXED.filter(x=>!c[x.id]);const next=pending[0];
    let ready='Klaar voor training',copy='Geen duidelijk signaal om je week vooraf af te remmen.';
    if(rec==='Rustig aan'&&['Hoog','Iets hoger'].includes(l.label)){ready='Train gecontroleerd';copy='Slaap/herstel en belasting vragen allebei wat aandacht.';}else if(rec==='Rustig aan'){ready='Train op gevoel';copy='Je laatste slaap ligt laag; houd ruimte om bij te sturen.';}else if(l.label==='Hoog'){ready='Geen extra volume';copy='Je belasting ligt duidelijk hoger dan de vorige 7 dagen.';}
    const nextName=next?.name||'Weeklijst afgerond';const nextType=next?.type||'run';
    let food='Eet regelmatig en zorg bij elke hoofdmaaltijd voor een goede eiwitbron.';
    if(nextType==='run')food='Voor je volgende run: koolhydraten vooraf; daarna 25–35 g eiwit + koolhydraten.';
    else if(nextType==='strength')food='Rond je volgende gymsessie: normale koolhydraten en 25–35 g eiwit erna.';
    else if(nextType==='volley')food='Voor volleybal: voldoende koolhydraten en drinken; na afloop eiwit + koolhydraten.';
    else if(nextType==='swim'||nextType==='cycle')food='Voor deze sessie is een normale maaltijd meestal genoeg; herstel daarna met eiwit.';
    const n=state.nutrition?.[new Date().toISOString().slice(0,10)];
    const root=replaceView('view-today',`
      <article class="r38-card r38-soft"><div class="r38-top"><div><p class="r38-kicker">Training readiness</p><h2>${esc(ready)}</h2></div><span class="r38-sportcount">${pending.length} open</span></div><p class="r38-muted">${esc(copy)}</p><div class="r38-mini-grid"><div class="r38-mini"><b>Slaap</b><strong>${h==null?'—':`${fmt(h,1)} u`}</strong></div><div class="r38-mini"><b>Belasting</b><strong>${esc(l.label)}</strong></div><div class="r38-mini"><b>Herstel</b><strong>${esc(rec)}</strong></div></div></article>
      <div class="r38-section"><h2>Volgende op je weeklijst</h2><span>flexibel</span></div>
      <article class="r38-row"><span class="r38-icon">${icon(nextType)}</span><span class="r38-copy"><strong>${esc(nextName)}</strong><small>${next?esc(planText(next.id,p)):'Alles afgevinkt — mooi.'}</small></span></article>
      <article class="r38-card"><p class="r38-kicker">Eetadvies</p><div class="r38-top"><span class="r38-icon">${icon('nutrition')}</span><div class="r38-copy"><strong>${esc(food)}</strong><small>${n?`${fmt(n.calories)} kcal · ${fmt(n.protein)} g eiwit vandaag gelogd`:'Nog geen voeding voor vandaag gelogd'}</small></div></div></article>
      <article class="r38-card"><div class="r38-top"><div><p class="r38-kicker">Kilometers deze week</p><h3>${fmt(km,1)} / ${fmt(target,1)} km</h3></div><span class="r38-muted">${weekRuns().length} runs</span></div><div class="r38-progress"><i style="width:${pct}%"></i></div></article>`);
    return root;
  }

  function renderSchema(){
    const p=currentPlan(),c=check(p),extra=extraState(p);const fixedDone=FIXED.filter(x=>c[x.id]).length,total=FIXED.length+(extra.sport?1:0),done=fixedDone+(extra.sport&&extra.done?1:0),pct=total?done/total*100:0;
    const rows=FIXED.map(x=>`<button class="r38-row ${c[x.id]?'done':''}" data-r38-toggle="${x.id}"><span class="r38-icon">${icon(x.type)}</span><span class="r38-copy"><strong>${esc(x.name)}</strong><small>${esc(planText(x.id,p))}</small></span><span class="r38-check">${c[x.id]?'✓':''}</span></button>`).join('');
    const extraLabel=EXTRA_OPTIONS.find(x=>x[0]===extra.sport)?.[1]||'Extra training';
    const root=replaceView('view-training',`
      <article class="r38-card"><div class="r38-top"><div><p class="r38-kicker">Deze week</p><h2>Week ${p?.week??isoWeek().week}</h2></div><span class="r38-sportcount">${done} van ${total} gedaan</span></div><div class="r38-progress"><i style="width:${pct}%"></i></div></article>
      <p class="r38-muted" style="margin:0 2px 10px">Niet aan vaste dagen gekoppeld. Vink af wat je deze week daadwerkelijk doet.</p>${rows}
      <article class="r38-card"><p class="r38-kicker">Extra training</p><div class="r38-extra"><select id="r38ExtraSport">${EXTRA_OPTIONS.map(([v,l])=>`<option value="${v}" ${v===extra.sport?'selected':''}>${l}</option>`).join('')}</select><button id="r38ExtraSave" type="button">Kiezen</button></div><p class="r38-extra-note">Bijvoorbeeld een extra run, fietstraining, volleybal of andere sport.</p>${extra.sport?`<button class="r38-row ${extra.done?'done':''}" id="r38ExtraToggle" type="button" style="margin-top:10px;margin-bottom:0"><span class="r38-icon">${icon(extra.sport==='beach'?'volley':extra.sport)}</span><span class="r38-copy"><strong>${esc(extraLabel)}</strong><small>Extra sportmoment deze week</small></span><span class="r38-check">${extra.done?'✓':''}</span></button>`:''}</article>`);
    root?.querySelectorAll('[data-r38-toggle]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.r38Toggle;if(typeof togglePlanItem==='function'&&p)togglePlanItem(p.key,id);else{c[id]=!c[id];save();}renderSchema();renderToday();}));
    root?.querySelector('#r38ExtraSave')?.addEventListener('click',()=>{extra.sport=root.querySelector('#r38ExtraSport').value;extra.done=false;save();renderSchema();renderToday();});
    root?.querySelector('#r38ExtraToggle')?.addEventListener('click',()=>{extra.done=!extra.done;save();renderSchema();renderToday();});
  }

  function renderRunning(){
    const iw=isoWeek();const cards=planList().map(p=>{const current=p.year===iw.year&&p.week===iw.week;return `<article class="r38-week-card ${current?'current':''}"><div class="r38-week-head"><strong>Week ${p.week}${current?' · nu':''}</strong><span>${esc(p.range||p.year)}</span></div>${[["tritanium","Tritanium Run"],["run1","Run 2"],["run2","Run 3"]].map(([id,name])=>`<div class="r38-run-line"><span class="r38-icon">${icon('run')}</span><div><strong>${name}</strong><p>${esc(planText(id,p))}</p></div></div>`).join('')}</article>`;}).join('');
    replaceView('view-running',`<article class="r38-card r38-soft"><p class="r38-kicker">Enschede Marathon · 11 april 2027</p><h2>Volledig hardloopschema</h2><p class="r38-muted">Alle weken staan hieronder. Afvinken doe je alleen in Schema.</p></article>${cards}`);
  }

  function renderInsights(){
    const l=load(),z=intensity(),series=weeklySeries(),max=Math.max(1,...series.map(x=>x.km)),bars=series.map(x=>`<div class="r38-barcol"><i class="r38-bar ${x.current?'current':''}" style="height:${Math.max(4,x.km/max*100)}%"></i><span>${x.label}</span></div>`).join('');const p=currentPlan(),c=check(p),sportDone=FIXED.filter(x=>c[x.id]).length;
    replaceView('view-progress',`
      <div class="r38-mini-grid" style="margin-top:0"><div class="r38-mini"><b>Trainingstijd</b><strong>${fmt(weekMinutes())} min</strong></div><div class="r38-mini"><b>Hardlopen</b><strong>${fmt(weekKm(),1)} km</strong></div><div class="r38-mini"><b>Slaap gem.</b><strong>${avgSleep()==null?'—':`${fmt(avgSleep(),1)} u`}</strong></div></div>
      <article class="r38-card" style="margin-top:12px"><div class="r38-top"><div><p class="r38-kicker">Trainingsbelasting · 7 dagen</p><h2>${l.cur==null?'—':fmt(l.cur)}</h2></div><strong style="color:var(--r38);font-size:12px">${l.delta==null?'wordt opgebouwd':`${l.delta>=0?'+':''}${fmt(l.delta)}%`}</strong></div><p class="r38-muted">${l.prev==null?'Nog geen betrouwbare vergelijking.':`Vorige 7 dagen: ${fmt(l.prev)} · ${esc(l.label)}`}</p></article>
      <article class="r38-card"><p class="r38-kicker">Loopintensiteit</p><h3>Laag / midden / hoog</h3><div class="r38-zonebar"><i style="width:${z.low}%"></i><i style="width:${z.medium}%"></i><i style="width:${z.high}%"></i></div><div class="r38-zonelegend"><span><b>${fmt(z.low)}%</b>Laag</span><span><b>${fmt(z.medium)}%</b>Midden</span><span><b>${fmt(z.high)}%</b>Hoog</span></div></article>
      <article class="r38-card"><div class="r38-top"><div><p class="r38-kicker">Hardlopen</p><h3>Kilometers per week</h3></div></div><div class="r38-bars">${bars}</div></article>
      <article class="r38-card"><p class="r38-kicker">Wat valt op?</p><p class="r38-muted" style="margin-bottom:0">${l.delta!=null?`Je belasting ligt ${Math.abs(Math.round(l.delta))}% ${l.delta>=0?'hoger':'lager'} dan de vorige 7 dagen. `:''}${z.low?`${fmt(z.low)}% van je loopintensiteit is laag. `:''}${sportDone} van ${FIXED.length} vaste sportmomenten zijn deze week afgevinkt.</p></article>`);
  }

  function uniformNav(){
    const map={today:['home','Vandaag'],training:['list','Schema'],running:['run','Hardlopen'],strength:['strength','Kracht'],nutrition:['nutrition','Voeding'],progress:['chart','Inzichten']};
    document.querySelectorAll('.bottom-nav .nav-item').forEach(btn=>{const x=map[btn.dataset.target];if(!x)return;btn.innerHTML=`<span class="r38-nav-icon">${icon(x[0])}</span><small>${x[1]}</small>`;});
  }

  function renderAll(){
    installStyle();
    try{renderToday();}catch(e){console.error('Romy v38 Today',e);}
    try{renderSchema();}catch(e){console.error('Romy v38 Schema',e);}
    try{renderRunning();}catch(e){console.error('Romy v38 Running',e);}
    try{renderInsights();}catch(e){console.error('Romy v38 Insights',e);}
    try{uniformNav();}catch(e){console.error('Romy v38 Nav',e);}
  }

  window.romyV38Refresh=renderAll;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(renderAll,0));else setTimeout(renderAll,0);
  window.addEventListener('load',()=>setTimeout(renderAll,100));
})();