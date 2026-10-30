// Visual Today cockpit for Romy Health.
// Keeps the analytical modules running in the background, but turns Today into a calm action-first screen.
(function(){
  const WEATHER_KEY='romy-health-weather-cache-v1';
  const WEATHER_TTL=60*60*1000;
  const DAY=86400000;

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function fmt(v,d=0){return v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('nl-NL',{minimumFractionDigits:d,maximumFractionDigits:d});}
  function localKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function shiftDate(date,days){const d=new Date(date);d.setHours(12,0,0,0);d.setDate(d.getDate()+days);return d;}
  function dateLabel(d){return new Intl.DateTimeFormat('nl-NL',{weekday:'long',day:'numeric',month:'long'}).format(d);}
  function shortDay(d){return new Intl.DateTimeFormat('nl-NL',{weekday:'short'}).format(d).replace('.','').slice(0,2).toUpperCase();}
  function activityDate(a){return String(a?.date||a?.startTimeLocal||a?.startTime||'').slice(0,10);}
  function avg(values){const nums=values.map(Number).filter(Number.isFinite);return nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:null;}
  function clamp(v,min,max){return Math.max(min,Math.min(max,v));}

  const ACTIVITY_META={
    kracht1:{name:'Gym 1',icon:'🏋️',sub:'Krachttraining'},
    tweeslag:{name:'Beachvolleybal 1',icon:'🏐',sub:'Beachvolleybal'},
    zwemmen:{name:'Zwemmen',icon:'🏊',sub:'Zwemtraining'},
    donitas1:{name:'Volleybal 1',icon:'🏐',sub:'Volleybaltraining'},
    tritanium:{name:'Tritanium',icon:'⚡',sub:'Intensieve looptraining'},
    kracht2:{name:'Gym 2',icon:'🏋️',sub:'Krachttraining'},
    donitas2:{name:'Donitas 2',icon:'🏐',sub:'Volleybaltraining'},
    run1:{name:'Run 1',icon:'🏃',sub:'Easy run'},
    run2:{name:'Run 2',icon:'🏃',sub:'Lange duurloop'}
  };

  const FOCUS={
    1:'Wees proactief',2:'Begin met het einde voor ogen',3:'Belangrijke zaken eerst',4:'Denk win-win',5:'Eerst begrijpen, dan begrepen worden',6:'Synergie',0:'Houd de zaag scherp'
  };

  function routine(){
    return window.ROMY_WEEKLY_ROUTINE||{
      1:{items:['kracht1','tweeslag'],text:'Gym 1 · Beachvolleybal 1'},
      2:{items:['zwemmen','donitas1'],text:'Zwemmen · Volleybal 1'},
      3:{items:['tritanium'],text:'Tritanium hardlopen'},
      4:{items:['kracht2','donitas2'],text:'Gym 2 · Donitas 2'},
      5:{items:['run1'],text:'Run 1'},6:{items:[],text:'Volleybalwedstrijd of rustdag'},0:{items:['run2'],text:'Run 2'}
    };
  }

  function isoWeek(date=new Date()){
    const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
    const day=d.getUTCDay()||7; d.setUTCDate(d.getUTCDate()+4-day);
    const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return {year:d.getUTCFullYear(),week:Math.ceil((((d-yearStart)/DAY)+1)/7)};
  }
  function planForDate(date=new Date()){
    try{
      const iso=isoWeek(date);
      return (typeof marathonPlan!=='undefined'?marathonPlan:[]).find(p=>p.year===iso.year&&p.week===iso.week)||null;
    }catch{return null;}
  }
  function planDetail(id,date=new Date()){
    const p=planForDate(date);
    if(!p) return ACTIVITY_META[id]?.sub||'';
    if(id==='run1') return p.run1||ACTIVITY_META[id].sub;
    if(id==='run2') return p.run2||ACTIVITY_META[id].sub;
    if(id==='tritanium') return p.tritanium||ACTIVITY_META[id].sub;
    return ACTIVITY_META[id]?.sub||'';
  }

  function todayPlans(){
    const key=localKey();
    if(Array.isArray(state.dailyPlans?.[key])) return state.dailyPlans[key];
    return [...(routine()[new Date().getDay()]?.items||[])];
  }

  function metricEntries(field,start,end){
    return Object.entries(state.garminDaily||{}).filter(([d])=>d>=start&&d<=end).map(([,v])=>Number(v?.[field])).filter(Number.isFinite);
  }
  function recoverySignal(){
    const now=new Date();
    const curStart=localKey(shiftDate(now,-6)), curEnd=localKey(now), baseStart=localKey(shiftDate(now,-27)), baseEnd=localKey(shiftDate(now,-7));
    const specs=[
      ['sleepHours','down',.94],['hrv','down',.90],['restingHeartRate','up',1.05]
    ];
    let available=0,flags=0;
    specs.forEach(([field,dir,threshold])=>{
      const cur=avg(metricEntries(field,curStart,curEnd)), base=avg(metricEntries(field,baseStart,baseEnd));
      if(cur==null||base==null||base<=0) return;
      available++;
      if(dir==='down'?cur<base*threshold:cur>base*threshold) flags++;
    });
    if(available<2) return {level:'building',label:'Wordt opgebouwd',dots:2};
    if(flags>=2) return {level:'lower',label:'Lager dan normaal',dots:2};
    if(flags===1) return {level:'watch',label:'Even volgen',dots:3};
    return {level:'stable',label:'Stabiel',dots:4};
  }

  function latestSleep(){
    const rows=Object.entries(state.garminDaily||{}).map(([date,v])=>({date,h:Number(v?.sleepHours)})).filter(x=>Number.isFinite(x.h)&&x.h>0).sort((a,b)=>a.date.localeCompare(b.date));
    return rows.at(-1)||null;
  }
  function sleepSignal(){
    const row=latestSleep();
    if(!row) return {label:'Nog geen data',dots:0,value:'—'};
    const h=row.h;
    const dots=h>=8?5:h>=7.5?4:h>=7?3:h>=6.5?2:1;
    return {label:h>=7.5?'Goede basis':h>=7?'Redelijk':'Kort',dots,value:`${fmt(h,1)} u`};
  }

  function srpeWindow(start,end){
    const rows=(state.trainingCheckins||[]).filter(x=>String(x.date||'')>=start&&String(x.date||'')<=end);
    return rows.reduce((s,x)=>s+(Number(x.minutes)||0)*(Number(x.rpe)||0),0);
  }
  function loadSignal(){
    const s=state.tredictSnapshot;
    if(s&&Number(s.effortPrev7)>0&&Number.isFinite(Number(s.effort7))){
      const ratio=Number(s.effort7)/Number(s.effortPrev7), delta=(ratio-1)*100;
      if(ratio>=1.30) return {level:'high',label:'Duidelijk hoger',dots:5,delta,source:'Tredict'};
      if(ratio>=1.05) return {level:'raised',label:'Iets hoger',dots:4,delta,source:'Tredict'};
      if(ratio<=.70) return {level:'low',label:'Duidelijk lager',dots:1,delta,source:'Tredict'};
      if(ratio<=.90) return {level:'lower',label:'Iets lager',dots:2,delta,source:'Tredict'};
      return {level:'normal',label:'Vrij stabiel',dots:3,delta,source:'Tredict'};
    }
    const now=new Date(),cur=srpeWindow(localKey(shiftDate(now,-6)),localKey(now)),prev=srpeWindow(localKey(shiftDate(now,-13)),localKey(shiftDate(now,-7)));
    if(!prev||!cur) return {level:'building',label:'Wordt opgebouwd',dots:2,delta:null,source:'RPE'};
    const ratio=cur/prev,delta=(ratio-1)*100;
    if(ratio>=1.30)return {level:'high',label:'Duidelijk hoger',dots:5,delta,source:'RPE'};
    if(ratio>=1.05)return {level:'raised',label:'Iets hoger',dots:4,delta,source:'RPE'};
    if(ratio<=.70)return {level:'low',label:'Duidelijk lager',dots:1,delta,source:'RPE'};
    if(ratio<=.90)return {level:'lower',label:'Iets lager',dots:2,delta,source:'RPE'};
    return {level:'normal',label:'Vrij stabiel',dots:3,delta,source:'RPE'};
  }

  function overallStatus(rec,load,plans){
    if(rec.level==='lower'&&['high','raised'].includes(load.level)) return {label:'Vandaag flexibel trainen',copy:'Herstel en belasting vragen allebei wat aandacht.'};
    if(rec.level==='lower') return {label:'Train op gevoel',copy:'Je herstel wijkt af van je eigen recente patroon.'};
    if(load.level==='high') return {label:'Klaar, maar geen extra volume',copy:'Je trainingsbelasting ligt duidelijk hoger dan je recente week.'};
    if(plans.length>=2) return {label:'Klaar voor een dubbele trainingsdag',copy:'Verdeel je energie slim over beide sessies.'};
    if(!plans.length) return {label:'Hersteldag',copy:'Geen vaste training gepland. Herstel telt vandaag mee.'};
    return {label:'Klaar voor training',copy:'Geen duidelijke reden om je geplande sessie vooraf af te remmen.'};
  }

  function dots(n){return `<span class="cockpit-pips">${[1,2,3,4,5].map(i=>`<i class="${i<=n?'on':''}"></i>`).join('')}</span>`;}

  function advice(rec,load,plans){
    const pieces=[];
    if(rec.level==='lower') pieces.push('Je herstel wijkt af: houd volume en intensiteit vandaag flexibel.');
    else if(rec.level==='watch') pieces.push('Eén herstelsignaal wijkt af; gevoel blijft leidend.');
    if(load.level==='high') pieces.push('Je belasting ligt duidelijk hoger dan vorige week, dus voeg niets extra’s toe.');

    const strength=plans.some(x=>x==='kracht1'||x==='kracht2'), volley=plans.some(x=>/donitas|tweeslag/.test(x));
    if(plans.length>=2&&strength&&volley) pieces.push('Twee trainingen gepland. Houd de gymsessie gecontroleerd zodat je genoeg kwaliteit overhoudt voor volleybal; neem tussen beide sessies koolhydraten en drinken.');
    else if(plans.length>=2) pieces.push('Dubbele trainingsdag: maak één sessie de belangrijkste en plan koolhydraten en drinken tussen beide.');
    else if(plans.includes('run2')){
      const text=String(planForDate(new Date())?.run2||''),m=text.match(/(\d+(?:[,.]\d+)?)\s*km/i),km=m?Number(m[1].replace(',','.')):null;
      pieces.push(`${km?`${fmt(km)} km lange duurloop`: 'Lange duurloop'}: rustig starten, hartslag leidend en brandstof/drinken vooraf plannen.`);
    } else if(plans.includes('run1')) pieces.push('Run 1 is je rustige loopprikkel. Houd hem echt easy zodat je zondag ruimte houdt voor Run 2.');
    else if(plans.includes('tritanium')) pieces.push('Tritanium is vandaag je intensieve loopprikkel. Laat extra loopvolume achterwege en herstel daarna goed.');
    else if(strength) pieces.push('Krachtdag: stuur op goede uitvoering en progressie, niet op extra sets omdat het goed voelt.');
    else if(volley) pieces.push('Volleybaldag: zorg dat je met voldoende energie aan de training begint en herstel daarna met eiwit + koolhydraten.');
    else if(!plans.length) pieces.push('Geen vaste training gepland. Normaal eten, bewegen op gevoel en herstel prioriteren is genoeg.');
    return pieces.slice(0,2).join(' ');
  }

  function nextKeyTraining(){
    const base=new Date();base.setHours(12,0,0,0);
    const preferred=new Set(['run1','run2','tritanium','donitas2','donitas1','kracht1','kracht2','tweeslag','zwemmen']);
    for(let i=1;i<=7;i++){
      const d=shiftDate(base,i),items=(routine()[d.getDay()]?.items||[]).filter(x=>preferred.has(x));
      if(!items.length) continue;
      const id=items.find(x=>['run1','run2','tritanium'].includes(x))||items[0];
      return {id,date:d,name:ACTIVITY_META[id]?.name||id,icon:ACTIVITY_META[id]?.icon||'•',detail:planDetail(id,d)};
    }
    return null;
  }

  function currentWeek(){
    const now=new Date();now.setHours(12,0,0,0);const dow=now.getDay()||7;
    const monday=shiftDate(now,-(dow-1));
    const plan=planForDate(now);let check={};
    try{check=plan&&typeof checklistFor==='function'?checklistFor(plan):{};}catch{}
    const days=[];let doneSessions=0,totalSessions=0;
    for(let i=0;i<7;i++){
      const d=shiftDate(monday,i),items=routine()[d.getDay()]?.items||[];
      totalSessions+=items.length;
      const done=items.length>0&&items.every(id=>!!check[id]);
      doneSessions+=items.filter(id=>!!check[id]).length;
      const isToday=localKey(d)===localKey(now),past=d<now;
      days.push({d,items,done,isToday,past,rest:items.length===0});
    }
    return {days,doneSessions,totalSessions};
  }

  function readWeather(){try{const w=JSON.parse(localStorage.getItem(WEATHER_KEY)||'null');return w&&Date.now()-Number(w.savedAt||0)<WEATHER_TTL?w:null;}catch{return null;}}
  function outdoorToday(plans){return plans.some(id=>['run1','run2','tritanium','tweeslag'].includes(id));}
  async function fetchWeather(){
    if(!navigator.geolocation) throw new Error('Locatie is niet beschikbaar.');
    const pos=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,()=>reject(new Error('Locatietoegang is niet toegestaan.')),{enableHighAccuracy:false,timeout:10000,maximumAge:30*60*1000}));
    const {latitude,longitude}=pos.coords;
    const res=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m&timezone=auto`);
    if(!res.ok) throw new Error('Weer ophalen mislukt.');
    const c=(await res.json()).current||{};
    const w={temp:Number(c.temperature_2m),feels:Number(c.apparent_temperature),humidity:Number(c.relative_humidity_2m),rain:Number(c.precipitation),wind:Number(c.wind_speed_10m),savedAt:Date.now()};
    localStorage.setItem(WEATHER_KEY,JSON.stringify(w));return w;
  }
  function weatherAdvice(w,plans){
    if(!w) return '';
    const bits=[];
    if(Number(w.temp)>=23||Number(w.feels)>=25) bits.push('warm: neem extra drinken mee');
    if(Number(w.wind)>=30) bits.push('veel wind: stuur op inspanning, niet op tempo');
    if(Number(w.rain)>0) bits.push('neerslag: kies grip en comfort boven tempo');
    if(!bits.length&&plans.includes('run2')) bits.push('prima omstandigheden: drinken blijft bij een lange duurloop bewust onderdeel van je plan');
    return bits.join(' · ');
  }

  function injectStyles(){
    if(document.getElementById('todayCockpitStyles')) return;
    const s=document.createElement('style');s.id='todayCockpitStyles';
    s.textContent=`
      #view-today>.cockpit-hidden{display:none!important}
      #dashboardCockpit{display:grid;gap:14px;padding-bottom:8px}
      .cockpit-hero{position:relative;overflow:hidden;border-radius:28px;padding:22px;background:linear-gradient(145deg,var(--pink-soft),#fff);border:1px solid #f5d7e4;box-shadow:0 10px 32px rgba(68,40,54,.06)}
      .cockpit-hero:after{content:'';position:absolute;width:180px;height:180px;border-radius:50%;right:-70px;top:-75px;background:rgba(255,255,255,.55)}
      .cockpit-date{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--pink-dark)}
      .cockpit-hero h2{position:relative;z-index:1;margin:5px 0 4px;font-size:27px;letter-spacing:-.8px}.cockpit-hero>p{position:relative;z-index:1;margin:0;color:var(--muted);font-size:12px;line-height:1.5;max-width:85%}
      .signal-grid{position:relative;z-index:1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:18px}
      .signal-card{padding:12px;border-radius:18px;background:rgba(255,255,255,.78);border:1px solid rgba(255,255,255,.9);min-width:0}.signal-icon{font-size:18px}.signal-card small{display:block;margin-top:7px;color:var(--muted);font-size:9px;font-weight:800;letter-spacing:.04em}.signal-card strong{display:block;margin-top:3px;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .cockpit-pips{display:flex;gap:3px;margin-top:8px}.cockpit-pips i{width:8px;height:4px;border-radius:999px;background:#eadde3}.cockpit-pips i.on{background:var(--pink-strong)}
      .cockpit-card{border:1px solid var(--line);background:var(--surface);border-radius:24px;padding:17px;box-shadow:0 6px 22px rgba(45,27,36,.04)}.cockpit-card h3{margin:4px 0 0;font-size:19px;letter-spacing:-.4px}.cockpit-card>p{margin:7px 0 0;color:var(--muted);font-size:12px;line-height:1.5}
      .today-sessions{display:grid;gap:8px;margin-top:12px}.today-session{display:grid;grid-template-columns:42px minmax(0,1fr);gap:11px;align-items:center;padding:11px;border-radius:17px;background:var(--surface-soft);border:1px solid #f4e2ea}.today-session-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:14px;background:white;font-size:20px}.today-session strong{display:block;font-size:14px}.today-session span{display:block;margin-top:3px;color:var(--muted);font-size:10px;line-height:1.35}
      .coach-card{background:linear-gradient(145deg,#fff8fb,#fff);border-color:#f4d7e3}.coach-chip-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.coach-chip{font-size:9px;font-weight:780;border-radius:999px;padding:6px 8px;background:white;border:1px solid #f0dce4;color:var(--muted)}
      .key-training{display:grid;grid-template-columns:50px minmax(0,1fr) auto;gap:11px;align-items:center;margin-top:12px}.key-icon{width:50px;height:50px;display:grid;place-items:center;border-radius:16px;background:var(--pink-soft);font-size:23px}.key-training strong{display:block;font-size:15px}.key-training small{display:block;color:var(--muted);font-size:10px;margin-top:3px;line-height:1.35}.key-day{font-size:10px;font-weight:800;color:var(--pink-dark);white-space:nowrap}
      .week-dots{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:13px}.week-day{text-align:center}.week-day b{display:block;font-size:9px;color:var(--muted);margin-bottom:6px}.week-orb{margin:auto;width:29px;height:29px;border-radius:50%;display:grid;place-items:center;border:1px solid var(--line);font-size:10px;font-weight:800;color:var(--muted);background:white}.week-day.done .week-orb{background:var(--pink);border-color:var(--pink);color:white}.week-day.today .week-orb{box-shadow:0 0 0 3px var(--pink-soft);border-color:var(--pink)}.week-day.rest .week-orb{background:var(--surface-soft)}.week-caption{display:flex;justify-content:space-between;gap:10px;margin-top:10px;font-size:10px;color:var(--muted)}
      .cockpit-weather{display:grid;grid-template-columns:auto 1fr;gap:11px;align-items:center}.weather-temp{font-size:25px;font-weight:800}.weather-copy{font-size:11px;color:var(--muted);line-height:1.45}.weather-link{border:0;background:transparent;color:var(--pink-dark);font-size:10px;font-weight:800;padding:0;margin-top:8px}
      .cockpit-evening{display:flex;justify-content:space-between;gap:12px;align-items:center}.cockpit-evening button,.cockpit-action{border:0;background:var(--text);color:white;border-radius:12px;padding:9px 11px;font-size:10px;font-weight:800}.cockpit-focus{text-align:center;color:var(--muted);font-size:10px;padding:5px 10px 0}.cockpit-focus strong{color:var(--text)}
      @media(max-width:430px){.cockpit-hero{padding:19px}.cockpit-hero h2{font-size:24px}.signal-card{padding:10px}.signal-card strong{font-size:12px}.signal-card small{font-size:8px}.cockpit-pips i{width:6px}.key-training{grid-template-columns:46px minmax(0,1fr)}.key-day{grid-column:2}.week-dots{gap:4px}.week-orb{width:27px;height:27px}}
    `;document.head.appendChild(s);
  }

  function ensureCockpit(){
    const view=document.getElementById('view-today');if(!view)return null;
    let el=document.getElementById('dashboardCockpit');
    if(!el){el=document.createElement('div');el.id='dashboardCockpit';view.prepend(el);}
    [...view.children].forEach(child=>{if(child!==el)child.classList.add('cockpit-hidden');});
    return el;
  }

  function renderCockpit(){
    injectStyles();
    const root=ensureCockpit();if(!root)return;
    const now=new Date(),plans=todayPlans(),rec=recoverySignal(),load=loadSignal(),sleep=sleepSignal(),overall=overallStatus(rec,load,plans),next=nextKeyTraining(),week=currentWeek(),weather=readWeather(),outdoor=outdoorToday(plans);
    const chips=[];
    if(plans.length>=2)chips.push('Dubbele trainingsdag');
    if(load.level==='raised'||load.level==='high')chips.push('Belasting ↑');
    if(rec.level==='stable')chips.push('Herstel stabiel'); else if(rec.level==='watch'||rec.level==='lower')chips.push('Herstel volgen');
    if(plans.includes('run2'))chips.push('Lange duurloop');
    const dayRoutine=routine()[now.getDay()];
    const planRows=plans.length?plans.map(id=>{
      const m=ACTIVITY_META[id]||{name:id,icon:'•',sub:''};
      return `<div class="today-session"><div class="today-session-icon">${m.icon}</div><div><strong>${esc(m.name)}</strong><span>${esc(planDetail(id,now))}</span></div></div>`;
    }).join(''):`<div class="today-session"><div class="today-session-icon">🌿</div><div><strong>${now.getDay()===6?'Wedstrijd of rustdag':'Geen vaste training'}</strong><span>${now.getDay()===6?'Als je geen wedstrijd hebt, is dit je vaste rustmoment.':'Bewegen op gevoel; herstel telt mee.'}</span></div></div>`;

    const weatherBlock=outdoor?`<section class="cockpit-card"><div class="cockpit-weather">${weather?`<div class="weather-temp">${fmt(weather.temp)}°</div><div><strong>Weer voor je buitensessie</strong><div class="weather-copy">${esc(weatherAdvice(weather,plans)||`${fmt(weather.wind)} km/u wind · gevoel ${fmt(weather.feels)}°`)}</div><button class="weather-link" type="button" data-cockpit-weather>Vernieuwen</button></div>`:`<div style="font-size:23px">🌦️</div><div><strong>Maak je buitentraining weerslim</strong><div class="weather-copy">Haal alleen voor deze locatie het actuele weer op voor tempo-, drink- en fuelingadvies.</div><button class="weather-link" type="button" data-cockpit-weather>Weer ophalen</button></div>`}</div></section>`:'';

    const review=state.dailyReviews?.[localKey()]||null;
    const evening=now.getHours()>=18?`<section class="cockpit-card cockpit-evening"><div><p class="eyebrow">Avondcheck</p><h3>${review?'Dag afgerond ✓':'Maak je dag compleet'}</h3><p>${review?'Je kunt voeding of training later nog aanpassen.':'Voeding, training en Garmin in één korte check.'}</p></div><button type="button" data-open-nightly>${review?'Bekijken':'Afronden'}</button></section>`:'';

    root.innerHTML=`
      <section class="cockpit-hero">
        <div class="cockpit-date">${esc(dateLabel(now))}</div>
        <h2>${esc(overall.label)}</h2>
        <p>${esc(overall.copy)}</p>
        <div class="signal-grid">
          <div class="signal-card"><div class="signal-icon">♡</div><small>HERSTEL</small><strong>${esc(rec.label)}</strong>${dots(rec.dots)}</div>
          <div class="signal-card"><div class="signal-icon">↗</div><small>BELASTING</small><strong>${esc(load.label)}</strong>${dots(load.dots)}</div>
          <div class="signal-card"><div class="signal-icon">☾</div><small>SLAAP</small><strong>${esc(sleep.value)}</strong>${dots(sleep.dots)}</div>
        </div>
      </section>

      <section class="cockpit-card">
        <p class="eyebrow">Vandaag gepland</p><h3>${plans.length?`${plans.length} sessie${plans.length===1?'':'s'}`:(dayRoutine?.text||'Hersteldag')}</h3>
        <div class="today-sessions">${planRows}</div>
      </section>

      <section class="cockpit-card coach-card">
        <p class="eyebrow">Romy vandaag</p><h3>Hier zou ik op letten</h3><p>${esc(advice(rec,load,plans))}</p>
        ${chips.length?`<div class="coach-chip-row">${chips.map(x=>`<span class="coach-chip">${esc(x)}</span>`).join('')}</div>`:''}
      </section>

      ${weatherBlock}

      <section class="cockpit-card">
        <p class="eyebrow">Volgende sleuteltraining</p>
        ${next?`<div class="key-training"><div class="key-icon">${next.icon}</div><div><strong>${esc(next.name)}</strong><small>${esc(next.detail)}</small></div><span class="key-day">${esc(new Intl.DateTimeFormat('nl-NL',{weekday:'short',day:'numeric',month:'short'}).format(next.date).replace('.',''))}</span></div>`:'<p>Nog geen volgende vaste sessie gevonden.</p>'}
      </section>

      <section class="cockpit-card">
        <p class="eyebrow">Deze week</p><h3>${week.doneSessions} van ${week.totalSessions} vaste sessies gedaan</h3>
        <div class="week-dots">${week.days.map(x=>`<div class="week-day ${x.done?'done':''} ${x.isToday?'today':''} ${x.rest?'rest':''}"><b>${shortDay(x.d)}</b><div class="week-orb">${x.done?'✓':x.rest?'–':x.isToday?'•':''}</div></div>`).join('')}</div>
        <div class="week-caption"><span>Maandag → zondag</span><span>${week.doneSessions}/${week.totalSessions}</span></div>
      </section>

      ${evening}
      <div class="cockpit-focus">💭 Vandaag: <strong>${esc(FOCUS[now.getDay()]||FOCUS[1])}</strong></div>`;

    root.querySelector('[data-open-nightly]')?.addEventListener('click',()=>{try{openNightly();}catch{}});
    root.querySelector('[data-cockpit-weather]')?.addEventListener('click',async e=>{
      const btn=e.currentTarget,old=btn.textContent;btn.disabled=true;btn.textContent='Ophalen…';
      try{await fetchWeather();renderCockpit();}catch(err){btn.disabled=false;btn.textContent=old;alert(err?.message||'Weer ophalen mislukt.');}
    });
  }

  let timer=null;
  function schedule(){clearTimeout(timer);timer=setTimeout(renderCockpit,20);}
  function observe(){
    const view=document.getElementById('view-today');if(!view||view.dataset.cockpitObserved)return;
    view.dataset.cockpitObserved='1';
    new MutationObserver(()=>schedule()).observe(view,{childList:true,subtree:false});
  }

  if(typeof renderDashboard==='function'&&!renderDashboard._cockpitWrapped){
    const base=renderDashboard;const wrapped=function(){const r=base.apply(this,arguments);setTimeout(renderCockpit,0);return r;};wrapped._cockpitWrapped=true;renderDashboard=wrapped;
  }
  if(typeof window.ingestGarminData==='function'&&!window.ingestGarminData._cockpitWrapped){
    const base=window.ingestGarminData;const wrapped=function(payload){const r=base(payload);setTimeout(renderCockpit,0);return r;};wrapped._cockpitWrapped=true;window.ingestGarminData=wrapped;
  }
  if(typeof window.renderSmartCoach==='function'&&!window.renderSmartCoach._cockpitWrapped){
    const base=window.renderSmartCoach;const wrapped=function(){const r=base.apply(this,arguments);setTimeout(renderCockpit,0);return r;};wrapped._cockpitWrapped=true;window.renderSmartCoach=wrapped;
  }

  renderCockpit();observe();setTimeout(()=>{renderCockpit();observe();},500);
})();