const STORAGE_KEY = 'romy-health-local-v1';

const defaultState = {
  nutrition: {},
  training: {},
  runningDone: {},
  history: []
};

const trainingTasks = [
  {name:'Rust / recovery', group:'Hardlopen', hint:'Herstelmoment'},
  {name:'Looptraining', group:'Hardlopen', hint:'Training of interval'},
  {name:'Duurloop', group:'Hardlopen', hint:'Rustig duurwerk'},
  {name:'Volleybal 1', group:'Volleybal', hint:'Training'},
  {name:'Volleybal 2', group:'Volleybal', hint:'Training'},
  {name:'Volleybal 3', group:'Volleybal', hint:'Training'},
  {name:'Krachttraining', group:'Kracht', hint:'Kracht'},
  {name:'Extra kracht', group:'Kracht', hint:'Optioneel'},
  {name:'Zwemmen', group:'Overig', hint:'Conditie / herstel'},
  {name:'Spinning', group:'Overig', hint:'Cardio'},
  {name:'Extra', group:'Overig', hint:'Andere activiteit'}
];

let state = loadState();
let trainingWeek = currentIsoWeek().week;
let selectedNutritionDate = latestNutritionDate();
let chartMetric = 'sleep';

function clone(v){ return JSON.parse(JSON.stringify(v)); }
function loadState(){
  try { return {...clone(defaultState), ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {})}; }
  catch { return clone(defaultState); }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function currentIsoWeek(date = new Date()){
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return {year:d.getUTCFullYear(), week:Math.ceil((((d-yearStart)/86400000)+1)/7)};
}
function localDateKey(date){
  const y=date.getFullYear(), m=String(date.getMonth()+1).padStart(2,'0'), d=String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function latestNutritionDate(){
  const keys=Object.keys(state?.nutrition||{}).sort();
  return keys.at(-1) || localDateKey(new Date());
}
function formatDateLong(date){ return new Intl.DateTimeFormat('nl-NL',{weekday:'long',day:'numeric',month:'long'}).format(date); }
function formatFullDate(key){ return new Intl.DateTimeFormat('nl-NL',{weekday:'long',day:'numeric',month:'long'}).format(new Date(`${key}T12:00:00`)); }
function formatShortDate(key){ return new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short'}).format(new Date(`${key}T12:00:00`)); }
function fmt(n,d=0){ return n===null||n===undefined||n==='' ? '—' : Number(n).toLocaleString('nl-NL',{maximumFractionDigits:d}); }
function clamp(n,a,b){ return Math.min(b,Math.max(a,n)); }

function navigate(target){
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===target));
  document.querySelectorAll('.nav-item').forEach(v=>v.classList.toggle('active',v.dataset.target===target));
  window.scrollTo({top:0,behavior:'smooth'});
  if(target==='progress') requestAnimationFrame(renderChart);
}
document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.target)));
document.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.jump)));
document.getElementById('todayLabel').textContent = formatDateLong(new Date());

function ensureWeek(){
  if(!state.training[trainingWeek]) state.training[trainingWeek]=Array(trainingTasks.length).fill(false);
  return state.training[trainingWeek];
}

function renderDashboard(){
  const statuses=ensureWeek();
  const done=statuses.filter(Boolean).length;
  const key=latestNutritionDate();
  const n=state.nutrition[key];
  const hist=state.history.at(-1);
  document.getElementById('dashCalories').textContent=n?fmt(n.calories):'—';
  document.getElementById('dashProtein').textContent=n?`${fmt(n.protein)} g`:'—';
  document.getElementById('dashTraining').textContent=`${done}/${statuses.length}`;
  document.getElementById('dashSleep').textContent=hist?.sleep!=null?`${fmt(hist.sleep,1)} u`:'—';
  document.getElementById('heroTitle').textContent=done>=6?'Sterke week ✨':done>=3?'Mooie basis':'Klaar voor je week';
  document.getElementById('heroCopy').textContent=`Je hebt ${done} activiteiten afgevinkt in week ${trainingWeek}. Je gegevens blijven privé op dit apparaat.`;
  document.getElementById('nextRunCard').innerHTML='<div class="run-card-top"><span class="run-pill">🏃 Hardlopen</span><span class="run-date">Privé planning</span></div><h3>Voeg je loopschema lokaal toe</h3><p>De app bewaart je planning alleen in deze browser. Een volgende versie kan een volledige schema-editor krijgen.</p>';
  renderNutritionSnapshot(key);
}

function renderNutritionSnapshot(key){
  const n=state.nutrition[key];
  const el=document.getElementById('nutritionSnapshot');
  if(!n){ el.innerHTML='<div class="empty-state">Nog geen voeding ingevuld. Tik op + om je eerste dag toe te voegen.</div>'; return; }
  const pct=clamp((Number(n.protein||0)/100)*100,0,100);
  el.innerHTML=`<div class="ring" style="--pct:${pct}%"><strong>${fmt(n.protein)}g</strong></div><div class="snapshot-details"><p class="eyebrow">${formatFullDate(key)}</p><h3>${fmt(n.calories)} kcal</h3><div class="snapshot-metrics"><span><strong>${fmt(n.fiber)} g</strong>vezels</span><span><strong>${fmt(n.sugar)} g</strong>suiker</span><span><strong>${fmt(n.salt,1)} g</strong>zout</span></div></div>`;
}

function renderTraining(){
  const statuses=ensureWeek();
  const done=statuses.filter(Boolean).length, pct=Math.round(done/statuses.length*100);
  document.getElementById('trainingWeekTitle').textContent=`Week ${trainingWeek}`;
  document.getElementById('trainingWeekSubtitle').textContent='Jouw weekoverzicht';
  document.getElementById('trainingDoneCount').textContent=done;
  document.getElementById('trainingPercent').textContent=`${pct}%`;
  document.getElementById('trainingProgressBar').style.width=`${pct}%`;
  const groups=[...new Set(trainingTasks.map(t=>t.group))];
  document.getElementById('trainingGroups').innerHTML=groups.map(group=>`<section class="training-group"><h3>${group}</h3><div class="training-list">${trainingTasks.map((t,i)=>({...t,i})).filter(t=>t.group===group).map(t=>`<button class="training-row ${statuses[t.i]?'done':''}" data-training-index="${t.i}"><span class="check">${statuses[t.i]?'✓':''}</span><div><strong>${t.name}</strong><small>${t.hint}</small></div></button>`).join('')}</div></section>`).join('');
  document.querySelectorAll('[data-training-index]').forEach(b=>b.addEventListener('click',()=>{ const i=Number(b.dataset.trainingIndex); state.training[trainingWeek][i]=!state.training[trainingWeek][i]; saveState();renderTraining();renderDashboard(); }));
}
document.getElementById('trainingPrev').addEventListener('click',()=>{trainingWeek--;renderTraining();});
document.getElementById('trainingNext').addEventListener('click',()=>{trainingWeek++;renderTraining();});

function renderRunPlan(){
  document.getElementById('runPlan').innerHTML='<div class="empty-state">Je loopschema blijft privé en staat nog niet in GitHub. Binnenkort kun je hier lokaal je eigen weken en runs toevoegen.</div>';
}

document.querySelectorAll('#runFilters [data-filter]').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('#runFilters .chip').forEach(x=>x.classList.toggle('active',x===btn));
}));

function renderNutrition(){
  const keys=Object.keys(state.nutrition).sort();
  if(keys.length && !keys.includes(selectedNutritionDate)) selectedNutritionDate=keys.at(-1);
  document.getElementById('nutritionDates').innerHTML=keys.slice(-7).map(key=>{ const d=new Date(`${key}T12:00:00`); const day=new Intl.DateTimeFormat('nl-NL',{weekday:'short'}).format(d).replace('.',''); return `<button class="date-button ${key===selectedNutritionDate?'active':''}" data-date="${key}"><small>${day}</small><strong>${d.getDate()}</strong></button>`; }).join('');
  document.querySelectorAll('[data-date]').forEach(b=>b.addEventListener('click',()=>{selectedNutritionDate=b.dataset.date;renderNutrition();}));
  const n=state.nutrition[selectedNutritionDate];
  const card=document.getElementById('calorieCard'), grid=document.getElementById('nutrientGrid');
  if(!n){ card.innerHTML='<div class="empty-state">Nog geen voeding voor deze dag.</div>'; grid.innerHTML=''; }
  else {
    card.innerHTML=`<div class="calorie-main"><span>${formatFullDate(selectedNutritionDate)}</span><strong>${fmt(n.calories)} kcal</strong></div><span class="calorie-badge">Dagtotaal</span>`;
    const nutrients=[['Eiwit',n.protein,100],['Vezels',n.fiber,30],['Suiker',n.sugar,100],['Zout',n.salt,6],['Verz. vet',n.satFat,20]];
    grid.innerHTML=nutrients.map(([name,value,ref])=>`<article class="nutrient-card"><div class="nutrient-top"><span>${name}</span><span>${fmt(clamp(Number(value||0)/ref*100,0,100))}%</span></div><strong>${fmt(value,1)} g</strong><div class="mini-track"><div style="width:${clamp(Number(value||0)/ref*100,0,100)}%"></div></div></article>`).join('');
  }
  document.getElementById('nutritionHistory').innerHTML=[...keys].reverse().map(key=>{const x=state.nutrition[key]; return `<button class="history-row" data-history-date="${key}"><div><strong>${formatShortDate(key)}</strong><small>${fmt(x.protein)} g eiwit · ${fmt(x.fiber)} g vezels</small></div><strong>${fmt(x.calories)} kcal</strong></button>`;}).join('') || '<div class="empty-state">Nog geen dagen opgeslagen.</div>';
  document.querySelectorAll('[data-history-date]').forEach(b=>b.addEventListener('click',()=>{selectedNutritionDate=b.dataset.historyDate;renderNutrition();}));
}

const nutritionModal=document.getElementById('nutritionModal');
function openNutritionModal(date=localDateKey(new Date())){
  const f=document.getElementById('nutritionForm'), x=state.nutrition[date]||{};
  f.elements.date.value=date;
  ['calories','protein','fiber','sugar','salt','satFat'].forEach(k=>f.elements[k].value=x[k]??'');
  nutritionModal.classList.add('open');
}
function closeNutritionModal(){nutritionModal.classList.remove('open');}
document.getElementById('nutritionAddButton').addEventListener('click',()=>openNutritionModal());
document.querySelector('[data-close-modal]').addEventListener('click',closeNutritionModal);
document.getElementById('nutritionForm').addEventListener('submit',e=>{
  e.preventDefault(); const f=new FormData(e.currentTarget), val=k=>f.get(k)===''?null:Number(f.get(k)); const date=f.get('date');
  state.nutrition[date]={calories:val('calories'),protein:val('protein'),fiber:val('fiber'),sugar:val('sugar'),salt:val('salt'),satFat:val('satFat')};
  selectedNutritionDate=date; saveState();closeNutritionModal();renderNutrition();renderDashboard();
});

const metricMeta={sleep:['Slaap','u',1],training:['Trainingsuren','u',1],calories:['Calorieën','kcal',0],running:['Hardlopen','km',1]};
document.querySelectorAll('#metricTabs [data-metric]').forEach(btn=>btn.addEventListener('click',()=>{chartMetric=btn.dataset.metric;document.querySelectorAll('#metricTabs .chip').forEach(x=>x.classList.toggle('active',x===btn));renderProgress();}));
function renderProgress(){
  const data=state.history.filter(x=>x?.[chartMetric]!=null); const [title,unit,digits]=metricMeta[chartMetric];
  document.getElementById('chartTitle').textContent=title;
  if(!data.length){ document.getElementById('chartLatest').textContent='—';document.getElementById('progressStats').innerHTML='<div class="empty-state" style="grid-column:1/-1">Nog geen weekgegevens. Deze functie wordt in de volgende versie invoerbaar.</div>';document.getElementById('milestones').innerHTML='';renderChart();return; }
  const vals=data.map(x=>Number(x[chartMetric])), avg=vals.reduce((a,b)=>a+b,0)/vals.length;
  document.getElementById('chartLatest').textContent=`${fmt(vals.at(-1),digits)} ${unit}`;
  document.getElementById('progressStats').innerHTML=`<div class="stat-card"><small>Gemiddeld</small><strong>${fmt(avg,digits)} ${unit}</strong></div><div class="stat-card"><small>Hoogste</small><strong>${fmt(Math.max(...vals),digits)} ${unit}</strong></div><div class="stat-card"><small>Laagste</small><strong>${fmt(Math.min(...vals),digits)} ${unit}</strong></div>`;
  document.getElementById('milestones').innerHTML=data.filter(x=>x.notes).reverse().map(x=>`<article class="milestone"><div class="milestone-icon">✦</div><div><strong>${x.notes}</strong><p>Week ${x.week}</p></div></article>`).join('');renderChart();
}
function renderChart(){
  const canvas=document.getElementById('progressChart'); if(!canvas||!canvas.offsetParent)return; const data=state.history.filter(x=>x?.[chartMetric]!=null), width=canvas.clientWidth, h=220, ratio=window.devicePixelRatio||1;canvas.width=width*ratio;canvas.height=h*ratio;const ctx=canvas.getContext('2d');ctx.scale(ratio,ratio);ctx.clearRect(0,0,width,h);
  ctx.strokeStyle='#eee7eb';for(let i=0;i<4;i++){const y=18+i*55;ctx.beginPath();ctx.moveTo(10,y);ctx.lineTo(width-10,y);ctx.stroke();}
  if(!data.length){ctx.fillStyle='#918890';ctx.font='13px -apple-system, sans-serif';ctx.textAlign='center';ctx.fillText('Nog geen gegevens',width/2,h/2);return;}
  const vals=data.map(x=>Number(x[chartMetric])), min=Math.min(...vals),max=Math.max(...vals),spread=max-min||1,x=i=>10+i*((width-20)/(vals.length-1||1)),y=v=>18+(max+spread*.1-v)/(spread*1.2)*(h-50);
  ctx.beginPath();vals.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));ctx.strokeStyle='#ea5e9b';ctx.lineWidth=3;ctx.lineJoin='round';ctx.stroke();
}
window.addEventListener('resize',()=>requestAnimationFrame(renderChart));

const quickSheet=document.getElementById('quickSheet'),backdrop=document.getElementById('sheetBackdrop');
function openSheet(){quickSheet.classList.add('open');backdrop.classList.add('open');}
function closeSheet(){quickSheet.classList.remove('open');backdrop.classList.remove('open');}
document.getElementById('fab').addEventListener('click',openSheet);document.querySelector('[data-close-sheet]').addEventListener('click',closeSheet);backdrop.addEventListener('click',closeSheet);
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>{const a=b.dataset.action;closeSheet();if(a==='nutrition'){navigate('nutrition');setTimeout(()=>openNutritionModal(),120);}else navigate(a);}));

const settingsModal=document.getElementById('settingsModal');
document.getElementById('settingsButton').addEventListener('click',()=>settingsModal.classList.add('open'));document.querySelector('[data-close-settings]').addEventListener('click',()=>settingsModal.classList.remove('open'));
document.getElementById('exportData').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`romy-health-backup-${localDateKey(new Date())}.json`;a.click();URL.revokeObjectURL(url);});
document.getElementById('importData').addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{state=JSON.parse(reader.result);saveState();location.reload();}catch{alert('Deze backup kon niet worden gelezen.');}};reader.readAsText(file);});
document.getElementById('resetLocalData').addEventListener('click',()=>{if(confirm('Alle lokale gegevens op dit apparaat wissen?')){localStorage.removeItem(STORAGE_KEY);location.reload();}});

function init(){renderDashboard();renderTraining();renderRunPlan();renderNutrition();renderProgress();}
init();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));