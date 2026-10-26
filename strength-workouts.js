// Hevy-style strength workout module for Romy Health.
const STRENGTH_TEMPLATES = {
  kracht1: {
    name: 'Kracht 1',
    exercises: [
      {id:'box-jump', name:'Box Jump', sets:3, target:'3 reps', noWeight:true},
      {id:'hang-clean', name:'Hang Clean', sets:3, target:'3 reps'},
      {id:'front-squat', name:'Front Squat', sets:3, target:'4–6 reps'},
      {id:'romanian-deadlift', name:'Romanian Deadlift', sets:3, target:'6–8 reps'},
      {id:'incline-db-bench', name:'Incline DB Bench Press', sets:3, target:'8–10 reps'},
      {id:'lat-pulldown', name:'Lat Pulldown / Pull-up', sets:3, target:'6–10 reps'},
      {id:'single-arm-row', name:'Single-arm Row', sets:3, target:'8–12 reps'},
      {id:'standing-calf-raise', name:'Standing Calf Raise', sets:3, target:'8–12 reps'},
      {id:'copenhagen-plank', name:'Copenhagen Plank', sets:2, target:'20–30 sec/zijde', noWeight:true, timed:true}
    ]
  },
  kracht2: {
    name: 'Kracht 2',
    exercises: [
      {id:'jump-squat-pogos', name:'Jump Squat / Pogos', sets:2, target:'5 reps', noWeight:true},
      {id:'db-snatch', name:'Dumbbell Snatch', sets:3, target:'4/zijde'},
      {id:'trap-bar-deadlift', name:'Trap-bar Deadlift', sets:3, target:'3–5 reps'},
      {id:'bulgarian-split-squat', name:'Bulgarian Split Squat', sets:3, target:'6–8/been'},
      {id:'db-overhead-press', name:'DB Overhead Press', sets:3, target:'6–10 reps'},
      {id:'seated-row', name:'Seated Row', sets:3, target:'8–12 reps'},
      {id:'seated-calf-raise', name:'Seated Calf Raise', sets:3, target:'10–15 reps'},
      {id:'pallof-press', name:'Pallof Press', sets:3, target:'10/zijde', noWeight:true},
      {id:'face-pull', name:'Face Pull (optioneel)', sets:2, target:'12–15 reps', optional:true}
    ]
  }
};

state.strengthSessions ||= [];
state.strengthDraft ||= null;
state.lastStrengthResult ||= null;

let selectedStrengthType = state.strengthDraft?.type || 'kracht1';
let strengthRestEnd = null;
let strengthTimerInterval = null;

function strengthToday(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function isoWeekForDate(value){
  const d=new Date(`${value}T12:00:00`);
  const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const day=t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate()+4-day);
  const year=t.getUTCFullYear();
  const y0=new Date(Date.UTC(year,0,1));
  const week=Math.ceil((((t-y0)/86400000)+1)/7);
  return {year,week};
}

function createStrengthDraft(type, date=strengthToday()){
  const template=STRENGTH_TEMPLATES[type];
  return {
    type,
    date,
    startedAt:new Date().toISOString(),
    exercises:template.exercises.map(ex=>({
      id:ex.id,
      name:ex.name,
      sets:Array.from({length:ex.sets},()=>({weight:'',reps:'',done:false}))
    }))
  };
}

function latestStrengthSession(type){
  return [...(state.strengthSessions||[])].reverse().find(s=>s.type===type) || null;
}

function previousStrengthSet(type, exerciseId, setIndex){
  const previous=latestStrengthSession(type);
  const exercise=previous?.exercises?.find(ex=>ex.id===exerciseId);
  return exercise?.sets?.[setIndex] || null;
}

function previousSetText(type, exerciseId, setIndex){
  const s=previousStrengthSet(type,exerciseId,setIndex);
  if(!s) return 'Nog geen vorige waarde';
  const parts=[];
  if(s.weight!=='' && s.weight!=null) parts.push(`${s.weight} kg`);
  if(s.reps!=='' && s.reps!=null) parts.push(String(s.reps));
  return parts.length ? `Vorige keer: ${parts.join(' × ')}` : 'Vorige keer: —';
}

function injectStrengthStyles(){
  if(document.getElementById('strengthStyles')) return;
  const style=document.createElement('style');
  style.id='strengthStyles';
  style.textContent=`
    .strength-select{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}
    .strength-select button{border:1px solid var(--line);background:var(--surface);border-radius:16px;padding:13px;font-weight:760}
    .strength-select button.active{background:var(--text);color:#fff;border-color:var(--text)}
    .strength-start-card,.strength-exercise,.strength-finish-card,.strength-timer{border:1px solid var(--line);background:var(--surface);border-radius:22px;box-shadow:0 6px 22px rgba(45,27,36,.045)}
    .strength-start-card{padding:18px;display:grid;gap:14px}
    .strength-start-card label{display:grid;gap:6px;color:var(--muted);font-size:12px;font-weight:700}
    .strength-start-card input{border:1px solid var(--line);border-radius:13px;padding:11px;background:white}
    .strength-timer{position:sticky;top:82px;z-index:8;padding:14px 16px;margin:12px 0;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#fff7fa}
    .strength-timer strong{font-size:26px;letter-spacing:-1px}
    .strength-timer-actions{display:flex;gap:7px}
    .strength-timer-actions button{border:1px solid var(--line);background:white;border-radius:11px;padding:8px 10px;font-weight:730}
    .strength-list{display:grid;gap:13px;margin-top:14px}
    .strength-exercise{padding:16px}
    .strength-exercise-head{display:flex;justify-content:space-between;gap:12px;align-items:start;margin-bottom:10px}
    .strength-exercise-head h3{margin:0;font-size:17px}
    .strength-exercise-head small{color:var(--muted)}
    .strength-set{display:grid;grid-template-columns:34px 42px minmax(72px,1fr) minmax(72px,1fr);gap:8px;align-items:center;padding:10px 0;border-top:1px solid var(--line)}
    .strength-set:first-of-type{border-top:0}
    .strength-set-check{width:30px;height:30px;border:2px solid #ddd4da;background:white;border-radius:9px;font-weight:800}
    .strength-set.done .strength-set-check{background:var(--pink);border-color:var(--pink);color:white}
    .strength-set-num{font-weight:760;font-size:13px;color:var(--muted)}
    .strength-input-wrap{display:grid;gap:4px}
    .strength-input-wrap small{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:750}
    .strength-input-wrap input{width:100%;min-width:0;border:1px solid var(--line);border-radius:11px;padding:9px 8px;background:#fff}
    .strength-prev{grid-column:3 / 5;color:var(--muted);font-size:11px;margin-top:-2px}
    .strength-finish-bar{display:grid;gap:10px;margin:18px 0 4px}
    .strength-primary{border:0;background:var(--pink);color:white;border-radius:15px;padding:14px 16px;font-weight:800;font-size:15px}
    .strength-secondary{border:1px solid var(--line);background:white;border-radius:15px;padding:12px 14px;font-weight:760}
    .strength-finish-card{padding:18px;margin-top:16px}
    .strength-finish-card textarea{width:100%;min-height:220px;border:1px solid var(--line);border-radius:14px;padding:12px;resize:vertical;background:#fff;font:inherit;line-height:1.45}
    @media(max-width:420px){.bottom-nav .nav-item small{font-size:9px}.strength-set{grid-template-columns:30px 38px 1fr 1fr;gap:6px}}
  `;
  document.head.appendChild(style);
}

function formatStrengthTimer(seconds){
  const m=Math.floor(seconds/60), s=seconds%60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function startStrengthRest(seconds=90){
  strengthRestEnd=Date.now()+seconds*1000;
  clearInterval(strengthTimerInterval);
  updateStrengthTimer();
  strengthTimerInterval=setInterval(updateStrengthTimer,250);
}

function updateStrengthTimer(){
  const value=document.getElementById('strengthTimerValue');
  const label=document.getElementById('strengthTimerLabel');
  if(!value) return;
  if(!strengthRestEnd){ value.textContent='01:30'; if(label) label.textContent='Rusttimer'; return; }
  const remaining=Math.max(0,Math.ceil((strengthRestEnd-Date.now())/1000));
  value.textContent=formatStrengthTimer(remaining);
  if(remaining<=0){
    clearInterval(strengthTimerInterval);
    strengthTimerInterval=null;
    strengthRestEnd=null;
    if(label) label.textContent='Volgende set ✓';
    if(navigator.vibrate) navigator.vibrate([160,80,160]);
  } else if(label) label.textContent='Rust';
}

function addStrengthRest(seconds){
  if(!strengthRestEnd) strengthRestEnd=Date.now();
  strengthRestEnd+=seconds*1000;
  if(!strengthTimerInterval) strengthTimerInterval=setInterval(updateStrengthTimer,250);
  updateStrengthTimer();
}

function resetStrengthRest(){
  strengthRestEnd=null;
  clearInterval(strengthTimerInterval);
  strengthTimerInterval=null;
  updateStrengthTimer();
}

function strengthSetRow(exercise, templateExercise, set, setIndex){
  const noWeight=templateExercise.noWeight;
  return `<div class="strength-set ${set.done?'done':''}" data-strength-row="${exercise.id}-${setIndex}">
    <button class="strength-set-check" type="button" data-strength-check="${exercise.id}" data-set-index="${setIndex}">${set.done?'✓':''}</button>
    <span class="strength-set-num">Set ${setIndex+1}</span>
    <label class="strength-input-wrap"><small>${noWeight?'Notitie':'kg'}</small><input data-strength-weight="${exercise.id}" data-set-index="${setIndex}" ${noWeight?'placeholder="—"':'inputmode="decimal" placeholder="kg"'} value="${set.weight??''}"></label>
    <label class="strength-input-wrap"><small>${templateExercise.timed?'duur':'reps'}</small><input data-strength-reps="${exercise.id}" data-set-index="${setIndex}" placeholder="${templateExercise.target}" value="${set.reps??''}"></label>
    <div class="strength-prev">${previousSetText(state.strengthDraft.type,exercise.id,setIndex)}</div>
  </div>`;
}

function renderStrengthView(){
  injectStrengthStyles();
  const root=document.getElementById('strengthApp');
  if(!root) return;
  const draft=state.strengthDraft;
  const selected=draft?.type || selectedStrengthType;
  const template=STRENGTH_TEMPLATES[selected];
  const last=state.lastStrengthResult;

  root.innerHTML=`
    <div class="page-heading"><p class="eyebrow">Krachttraining</p><h2>Workout</h2><p>Log iedere set, zie je vorige waarden en gebruik automatisch 1:30 rust na een afgevinkte set.</p></div>
    <div class="strength-select">
      <button type="button" data-strength-type="kracht1" class="${selected==='kracht1'?'active':''}">Kracht 1</button>
      <button type="button" data-strength-type="kracht2" class="${selected==='kracht2'?'active':''}">Kracht 2</button>
    </div>
    ${!draft ? `<div class="strength-start-card"><label>Datum<input id="strengthDate" type="date" value="${strengthToday()}"></label><div><strong>${template.name}</strong><p style="margin:5px 0 0;color:var(--muted);font-size:13px;line-height:1.45">${template.exercises.length} oefeningen · rusttimer 1:30 · waarden worden opgeslagen voor “vorige keer”.</p></div><button class="strength-primary" id="startStrengthWorkout" type="button">▶ Start ${template.name}</button></div>` : `
      <div class="strength-timer"><div><small id="strengthTimerLabel" style="display:block;color:var(--muted);font-weight:700">Rusttimer</small><strong id="strengthTimerValue">01:30</strong></div><div class="strength-timer-actions"><button type="button" id="strengthTimerStart">▶ 1:30</button><button type="button" id="strengthTimerPlus">+30</button><button type="button" id="strengthTimerReset">↻</button></div></div>
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin:15px 2px 6px"><div><strong style="font-size:18px">${STRENGTH_TEMPLATES[draft.type].name}</strong><small style="display:block;color:var(--muted);margin-top:2px">${draft.date}</small></div><button id="cancelStrengthWorkout" class="text-button" type="button">Stoppen</button></div>
      <div class="strength-list">${draft.exercises.map(ex=>{
        const tex=STRENGTH_TEMPLATES[draft.type].exercises.find(x=>x.id===ex.id);
        return `<section class="strength-exercise"><div class="strength-exercise-head"><div><h3>${ex.name}</h3><small>${tex.target}${tex.optional?' · optioneel':''}</small></div></div>${ex.sets.map((s,i)=>strengthSetRow(ex,tex,s,i)).join('')}</section>`;
      }).join('')}</div>
      <div class="strength-finish-bar"><button type="button" class="strength-primary" id="finishStrengthWorkout">Workout voltooien ✓</button><small style="text-align:center;color:var(--muted)">Hiermee wordt ${STRENGTH_TEMPLATES[draft.type].name} ook automatisch afgevinkt in Training.</small></div>`}
    ${last ? `<section class="strength-finish-card"><p class="eyebrow">Laatste workout</p><h3 style="margin:5px 0 12px">Kopieer voor Strava</h3><textarea id="strengthStravaText" readonly>${last.strava}</textarea><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px"><button class="strength-primary" id="copyStrengthStrava" type="button">📋 Kopiëren</button><button class="strength-secondary" id="clearStrengthResult" type="button">Verbergen</button></div></section>`:''}
  `;

  root.querySelectorAll('[data-strength-type]').forEach(btn=>btn.addEventListener('click',()=>{
    if(state.strengthDraft) return;
    selectedStrengthType=btn.dataset.strengthType;
    renderStrengthView();
  }));

  document.getElementById('startStrengthWorkout')?.addEventListener('click',()=>{
    const date=document.getElementById('strengthDate')?.value || strengthToday();
    state.strengthDraft=createStrengthDraft(selectedStrengthType,date);
    saveState(); renderStrengthView();
  });

  document.getElementById('cancelStrengthWorkout')?.addEventListener('click',()=>{
    if(confirm('Deze onvoltooide workout stoppen?')){ state.strengthDraft=null; saveState(); resetStrengthRest(); renderStrengthView(); }
  });
  document.getElementById('strengthTimerStart')?.addEventListener('click',()=>startStrengthRest(90));
  document.getElementById('strengthTimerPlus')?.addEventListener('click',()=>addStrengthRest(30));
  document.getElementById('strengthTimerReset')?.addEventListener('click',resetStrengthRest);

  root.querySelectorAll('[data-strength-weight]').forEach(input=>input.addEventListener('input',()=>updateStrengthDraftValue(input.dataset.strengthWeight,Number(input.dataset.setIndex),'weight',input.value)));
  root.querySelectorAll('[data-strength-reps]').forEach(input=>input.addEventListener('input',()=>updateStrengthDraftValue(input.dataset.strengthReps,Number(input.dataset.setIndex),'reps',input.value)));
  root.querySelectorAll('[data-strength-check]').forEach(btn=>btn.addEventListener('click',()=>toggleStrengthSet(btn.dataset.strengthCheck,Number(btn.dataset.setIndex))));
  document.getElementById('finishStrengthWorkout')?.addEventListener('click',finishStrengthWorkout);
  document.getElementById('copyStrengthStrava')?.addEventListener('click',copyStrengthStrava);
  document.getElementById('clearStrengthResult')?.addEventListener('click',()=>{state.lastStrengthResult=null;saveState();renderStrengthView();});
  updateStrengthTimer();
}

function updateStrengthDraftValue(exerciseId,setIndex,key,value){
  const ex=state.strengthDraft?.exercises?.find(x=>x.id===exerciseId);
  if(!ex?.sets?.[setIndex]) return;
  ex.sets[setIndex][key]=value;
  saveState();
}

function toggleStrengthSet(exerciseId,setIndex){
  const ex=state.strengthDraft?.exercises?.find(x=>x.id===exerciseId);
  if(!ex?.sets?.[setIndex]) return;
  const set=ex.sets[setIndex];
  set.done=!set.done;
  saveState();
  if(set.done) startStrengthRest(90);
  renderStrengthView();
}

function compactExerciseForStrava(exercise){
  const sets=exercise.sets.filter(s=>s.done || s.weight || s.reps);
  if(!sets.length) return null;
  const values=sets.map(s=>({w:String(s.weight??'').trim(),r:String(s.reps??'').trim()}));
  const same=values.every(v=>v.w===values[0].w && v.r===values[0].r);
  if(same){
    const v=values[0];
    if(v.w && v.r) return `${exercise.name}\n${sets.length}×${v.r} @ ${v.w} kg`;
    if(v.r) return `${exercise.name}\n${sets.length}×${v.r}`;
    if(v.w) return `${exercise.name}\n${sets.length} sets @ ${v.w} kg`;
  }
  return `${exercise.name}\n${values.map(v=>v.w&&v.r?`${v.w} kg × ${v.r}`:v.r||`${v.w} kg`).join(' · ')}`;
}

function createStrengthStrava(session){
  const lines=[`${session.name} 💪`];
  session.exercises.forEach(ex=>{ const text=compactExerciseForStrava(ex); if(text) lines.push(text); });
  return lines.join('\n');
}

function markStrengthInWeeklyPlan(type,date){
  if(typeof marathonPlan==='undefined' || typeof checklistFor!=='function') return;
  const iso=isoWeekForDate(date);
  const plan=marathonPlan.find(p=>p.year===iso.year && p.week===iso.week);
  if(!plan) return;
  checklistFor(plan)[type]=true;
}

function finishStrengthWorkout(){
  const draft=state.strengthDraft;
  if(!draft) return;
  const session={...draft,completedAt:new Date().toISOString(),name:STRENGTH_TEMPLATES[draft.type].name};
  const strava=createStrengthStrava(session);
  state.strengthSessions=[...(state.strengthSessions||[]),session].slice(-150);
  state.lastStrengthResult={date:session.date,type:session.type,strava};
  markStrengthInWeeklyPlan(session.type,session.date);
  state.strengthDraft=null;
  resetStrengthRest();
  saveState();
  try{renderTraining();renderDashboard();}catch{}
  renderStrengthView();
}

async function copyStrengthStrava(){
  const text=state.lastStrengthResult?.strava;
  if(!text) return;
  try{ await navigator.clipboard.writeText(text); }
  catch{ const area=document.getElementById('strengthStravaText'); area?.select(); document.execCommand('copy'); }
  const btn=document.getElementById('copyStrengthStrava');
  if(btn){ const old=btn.textContent; btn.textContent='✓ Gekopieerd'; setTimeout(()=>btn.textContent=old,1600); }
}

renderStrengthView();
