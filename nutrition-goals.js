// Nutrition goal meters for Romy Health.
// Defaults are intentionally editable: calories 2500 kcal/day; protein depends on body weight.
(function(){
  state.nutritionGoals ||= { calories: 2500, bodyWeightKg: null };
  if(!Number.isFinite(Number(state.nutritionGoals.calories))) state.nutritionGoals.calories = 2500;
  if(state.nutritionGoals.bodyWeightKg === undefined) state.nutritionGoals.bodyWeightKg = null;

  function calorieTarget(){ return Math.max(1, Number(state.nutritionGoals.calories) || 2500); }
  function bodyWeight(){ const n=Number(state.nutritionGoals.bodyWeightKg); return Number.isFinite(n)&&n>0?n:null; }
  function satFatMax(){ return calorieTarget()*0.10/9; }
  function fiberRange(){
    const mj=calorieTarget()*4.184/1000;
    return {min:mj*3.0, high:mj*3.5};
  }
  function proteinRange(){
    const kg=bodyWeight();
    return kg ? {min:kg*1.4, high:kg*1.8, basic:kg*0.83, focus:kg*1.6} : null;
  }
  function pct(value, target){ return Math.max(0, Math.min(100, Number(value||0)/target*100)); }
  function fmt1(v){ return Number(v).toLocaleString('nl-NL',{maximumFractionDigits:1}); }

  function injectStyles(){
    if(document.getElementById('nutritionGoalStyles')) return;
    const style=document.createElement('style');
    style.id='nutritionGoalStyles';
    style.textContent=`
      .nutrition-goal-card{padding:16px;border-radius:22px;background:var(--surface);border:1px solid var(--line)}
      .nutrition-goal-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      .nutrition-goal-head span{font-size:12px;color:var(--muted)}
      .nutrition-goal-head small{font-size:10px;color:var(--muted);text-align:right}
      .nutrition-goal-card strong{display:block;font-size:22px;margin:8px 0 9px}
      .nutrition-goal-track{height:8px;background:#f1ebef;border-radius:999px;overflow:hidden;position:relative}
      .nutrition-goal-track>div{height:100%;border-radius:inherit;background:var(--pink);transition:width .2s ease}
      .nutrition-goal-card.warn .nutrition-goal-track>div{background:#d45b64}
      .nutrition-goal-card.good .nutrition-goal-track>div{background:#4fa87b}
      .nutrition-goal-note{margin-top:7px;color:var(--muted);font-size:10px;line-height:1.35}
      .nutrition-goal-settings{padding:14px 16px;border:1px solid var(--line);border-radius:18px;background:var(--surface-soft);margin-bottom:8px}
      .nutrition-goal-settings strong{display:block;font-size:14px}
      .nutrition-goal-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
      .nutrition-goal-fields label{display:grid;gap:5px;color:var(--muted);font-size:11px;font-weight:700}
      .nutrition-goal-fields input{width:100%;border:1px solid var(--line);background:white;border-radius:11px;padding:9px}
      .nutrition-goal-save{margin-top:9px;width:100%;border:0;background:var(--pink);color:white;border-radius:11px;padding:10px;font-weight:760}
    `;
    document.head.appendChild(style);
  }

  function card(name,value,unit,kind,target,label,note){
    const v=Number(value||0);
    let width=0, cls='';
    if(kind==='max'){
      width=pct(v,target);
      if(v>target) cls='warn'; else if(v>0) cls='good';
    } else if(kind==='min'){
      width=pct(v,target);
      if(v>=target) cls='good';
    } else if(kind==='band'){
      width=pct(v,target.high);
      if(v>=target.min && v<=target.high) cls='good';
    } else if(kind==='reference'){
      width=pct(v,target);
    }
    return `<article class="nutrition-goal-card ${cls}"><div class="nutrition-goal-head"><span>${name}</span><small>${label}</small></div><strong>${fmt(v,1)} ${unit}</strong><div class="nutrition-goal-track"><div style="width:${width}%"></div></div><div class="nutrition-goal-note">${note}</div></article>`;
  }

  function renderGoalNutrition(){
    const keys=Object.keys(state.nutrition||{}).sort();
    if(keys.length && !keys.includes(selectedNutritionDate)) selectedNutritionDate=keys.at(-1);
    document.getElementById('nutritionDates').innerHTML=keys.slice(-7).map(key=>{ const d=new Date(`${key}T12:00:00`); const day=new Intl.DateTimeFormat('nl-NL',{weekday:'short'}).format(d).replace('.',''); return `<button class="date-button ${key===selectedNutritionDate?'active':''}" data-date="${key}"><small>${day}</small><strong>${d.getDate()}</strong></button>`; }).join('');
    document.querySelectorAll('[data-date]').forEach(b=>b.addEventListener('click',()=>{selectedNutritionDate=b.dataset.date;renderGoalNutrition();}));
    const n=state.nutrition[selectedNutritionDate];
    const cardEl=document.getElementById('calorieCard'), grid=document.getElementById('nutrientGrid');
    if(!n){ cardEl.innerHTML='<div class="empty-state">Nog geen voeding voor deze dag.</div>'; grid.innerHTML=''; }
    else {
      const calTarget=calorieTarget();
      const calPct=Math.max(0,Math.min(100,Number(n.calories||0)/calTarget*100));
      cardEl.innerHTML=`<div class="calorie-main"><span>${formatFullDate(selectedNutritionDate)}</span><strong>${fmt(n.calories)} kcal</strong><div class="nutrition-goal-track" style="margin-top:10px;min-width:180px"><div style="width:${calPct}%"></div></div><small style="display:block;margin-top:6px;color:var(--muted)">Startdoel ${fmt(calTarget)} kcal · geen harde bovengrens</small></div><span class="calorie-badge">${fmt(calPct)}%</span>`;
      const f=fiberRange(), p=proteinRange(), sf=satFatMax();
      const cards=[];
      if(p) cards.push(card('Eiwit',n.protein,'g','band',p,`${fmt1(p.min)}–${fmt1(p.high)} g`,`Sportdoel 1,4–1,8 g/kg · mik rond ${fmt1(p.focus)} g (1,6 g/kg). Algemene ondergrens: ${fmt1(p.basic)} g (0,83 g/kg).`));
      else cards.push(`<article class="nutrition-goal-card"><div class="nutrition-goal-head"><span>Eiwit</span><small>gewicht nodig</small></div><strong>${fmt(n.protein,1)} g</strong><div class="nutrition-goal-note">Vul je lichaamsgewicht in bij Instellingen. Voor jouw sportdoel gebruiken we 1,4–1,8 g/kg met ongeveer 1,6 g/kg als mikwaarde.</div></article>`);
      cards.push(card('Vezels',n.fiber,'g','min',f.min,`min. ${fmt1(f.min)} g`,`Doel schaalt mee met energie-inname; bij ${fmt(calTarget)} kcal is ongeveer ${fmt1(f.min)}–${fmt1(f.high)} g een passende zone.`));
      cards.push(card('Zout',n.salt,'g','max',6,'max. 6 g','Maximum volgens de Nederlandse richtlijn die jij wilt gebruiken.'));
      cards.push(card('Verzadigd vet',n.satFat,'g','max',sf,`max. ${fmt1(sf)} g`,`Minder dan 10 energie%; bij ${fmt(calTarget)} kcal komt dat neer op ongeveer ${fmt1(sf)} g.`));
      cards.push(card('Suiker totaal',n.sugar,'g','reference',90,'referentie 90 g','Niet rood als “te hoog”: gezondheidsrichtlijnen gelden voor vrije/toegevoegde suikers, terwijl Romy Health nu totale suiker bijhoudt.'));
      grid.innerHTML=cards.join('');
    }
    document.getElementById('nutritionHistory').innerHTML=[...keys].reverse().map(key=>{const x=state.nutrition[key]; return `<button class="history-row" data-history-date="${key}"><div><strong>${formatShortDate(key)}</strong><small>${fmt(x.protein)} g eiwit · ${fmt(x.fiber)} g vezels</small></div><strong>${fmt(x.calories)} kcal</strong></button>`;}).join('') || '<div class="empty-state">Nog geen dagen opgeslagen.</div>';
    document.querySelectorAll('[data-history-date]').forEach(b=>b.addEventListener('click',()=>{selectedNutritionDate=b.dataset.historyDate;renderGoalNutrition();}));
  }

  function ensureSettings(){
    const list=document.querySelector('#settingsModal .settings-list');
    if(!list || document.getElementById('nutritionGoalSettings')) return;
    const wrap=document.createElement('div');
    wrap.id='nutritionGoalSettings';
    wrap.className='nutrition-goal-settings';
    wrap.innerHTML=`<strong>🍎 Voedingsdoelen</strong><div class="nutrition-goal-fields"><label>Startdoel kcal/dag<input id="nutritionGoalCalories" type="number" inputmode="decimal" value="${calorieTarget()}"></label><label>Lichaamsgewicht (kg)<input id="nutritionGoalWeight" type="number" step="0.1" inputmode="decimal" value="${bodyWeight()??''}" placeholder="bijv. 70"></label></div><button class="nutrition-goal-save" id="saveNutritionGoals" type="button">Doelen opslaan</button><small style="display:block;margin-top:7px;color:var(--muted);line-height:1.35">Voor prestatie + spierbehoud/-opbouw gebruikt de app 1,4–1,8 g eiwit/kg. Calorieën zijn een startdoel, geen harde limiet; trainingsdagen kunnen hoger uitvallen.</small>`;
    list.prepend(wrap);
    document.getElementById('saveNutritionGoals').addEventListener('click',()=>{
      const calories=Number(document.getElementById('nutritionGoalCalories').value);
      const weight=Number(document.getElementById('nutritionGoalWeight').value);
      state.nutritionGoals={calories:Number.isFinite(calories)&&calories>0?calories:2500, bodyWeightKg:Number.isFinite(weight)&&weight>0?weight:null};
      saveState();
      renderGoalNutrition();
      const btn=document.getElementById('saveNutritionGoals');
      btn.textContent='✓ Opgeslagen'; setTimeout(()=>btn.textContent='Doelen opslaan',1200);
    });
  }

  injectStyles();
  ensureSettings();
  renderNutrition=renderGoalNutrition;
  renderNutrition();
  try{renderDashboard();}catch{}
})();
