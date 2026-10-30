// Romy Health nightly review: one simple end-of-day check instead of logging all day.
state.dailyReviews ||= {};

function todayKey(){ return localDateKey(new Date()); }

function getTodayPlan(){
  const iso = currentIsoWeek();
  return marathonPlan.find(p => p.year === iso.year && p.week === iso.week)
    || marathonPlan.find(p => p.year > iso.year || (p.year === iso.year && p.week > iso.week))
    || marathonPlan.at(-1);
}

function nightlyTrainingCount(){
  const plan = getTodayPlan();
  const check = checklistFor(plan);
  const ids = (typeof EXTRA_WEEKLY_ACTIVITIES !== 'undefined')
    ? EXTRA_WEEKLY_ACTIVITIES.map(x => x.id)
    : Object.keys(check);
  return {done: ids.filter(id => check[id]).length, plan};
}

function nightlyStatus(){
  const date = todayKey();
  const nutrition = state.nutrition?.[date] || null;
  const garmin = state.garminDaily?.[date] || null;
  const training = nightlyTrainingCount();
  const completed = state.dailyReviews?.[date] || null;
  return {date,nutrition,garmin,training,completed};
}

function ensureNightlyModal(){
  if(document.getElementById('nightlyModal')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <section class="modal" id="nightlyModal" aria-hidden="true">
      <div class="modal-card">
        <div class="sheet-header">
          <div><p class="eyebrow">Voor het slapen</p><h3>Avondcheck</h3></div>
          <button class="icon-button" id="closeNightly">×</button>
        </div>
        <p style="margin:0 0 16px;color:var(--muted);line-height:1.5;">Even je dag compleet maken. Dit hoeft maar één keer per dag.</p>
        <div id="nightlyChecklist" style="display:grid;gap:10px;"></div>
        <button class="primary-button" id="finishNightly" type="button" style="margin-top:16px;">Dag afronden</button>
        <p id="nightlyHint" class="privacy-note" style="margin-top:10px;"></p>
      </div>
    </section>`);
  document.getElementById('closeNightly').addEventListener('click', closeNightly);
  document.getElementById('finishNightly').addEventListener('click', finishNightly);
}

function checklistRow(icon,title,status,copy,action,label){
  return `<div style="display:flex;gap:12px;align-items:center;padding:13px 14px;border:1px solid var(--line);border-radius:16px;background:var(--surface-soft);">
    <span style="font-size:20px;">${icon}</span>
    <div style="flex:1;min-width:0;"><strong style="display:block;">${title}</strong><small style="display:block;color:var(--muted);margin-top:3px;line-height:1.35;">${copy}</small></div>
    ${action ? `<button type="button" data-nightly-action="${action}" style="border:0;border-radius:11px;padding:8px 10px;background:${status?'#edf8f2':'var(--pink-soft)'};color:${status?'#3f8f68':'var(--pink-dark)'};font-weight:750;">${status?'✓':label}</button>` : `<span style="font-weight:800;color:${status?'#3f8f68':'var(--muted)'};">${status?'✓':'—'}</span>`}
  </div>`;
}

function renderNightly(){
  ensureNightlyModal();
  const s = nightlyStatus();
  const n = s.nutrition;
  const g = s.garmin;
  const nCopy = n ? `${fmt(n.calories)} kcal · ${fmt(n.protein)} g eiwit · ${fmt(n.fiber)} g vezels` : 'Nog geen dagtotaal ingevuld.';
  const gCopy = g ? `${g.sleepHours ?? '—'} u slaap · ${g.totalCalories ?? '—'} kcal verbrand` : 'Nog geen Garmin-data voor vandaag. Dat mag later automatisch binnenkomen.';
  const tCopy = `${s.training.done} sportmoment${s.training.done===1?'':'en'} deze week afgevinkt.`;
  document.getElementById('nightlyChecklist').innerHTML = [
    checklistRow('🍎','Voeding',!!n,nCopy,'nutrition','Invullen'),
    checklistRow('✓','Training',s.training.done>0,tCopy,'training','Bekijken'),
    checklistRow('⌚','Garmin',!!g,gCopy,null,'')
  ].join('');
  document.querySelectorAll('[data-nightly-action]').forEach(btn=>btn.addEventListener('click',()=>{
    const action=btn.dataset.nightlyAction;
    closeNightly();
    if(action==='nutrition'){
      navigate('nutrition');
      setTimeout(()=>openNutritionModal(s.date),120);
    } else if(action==='training') navigate('training');
  }));
  const finish=document.getElementById('finishNightly');
  finish.textContent = s.completed ? 'Dag opnieuw afronden' : 'Dag afronden';
  document.getElementById('nightlyHint').textContent = s.completed
    ? `Afgerond om ${new Intl.DateTimeFormat('nl-NL',{hour:'2-digit',minute:'2-digit'}).format(new Date(s.completed.completedAt))}. Je kunt later nog iets wijzigen.`
    : (!n ? 'Tip: stuur aan het einde van de dag je eten/foto’s in ChatGPT en importeer daarna het dagtotaal.' : 'Alles wat je nu afrondt blijft later nog bewerkbaar.');
}

function openNightly(){
  renderNightly();
  const modal=document.getElementById('nightlyModal');
  modal.classList.add('open'); modal.setAttribute('aria-hidden','false');
}
function closeNightly(){
  const modal=document.getElementById('nightlyModal');
  if(!modal) return;
  modal.classList.remove('open'); modal.setAttribute('aria-hidden','true');
}
function finishNightly(){
  const s=nightlyStatus();
  state.dailyReviews[s.date] = {
    completedAt:new Date().toISOString(),
    nutritionComplete:!!s.nutrition,
    garminAvailable:!!s.garmin,
    weeklyTrainingCount:s.training.done
  };
  saveState();
  renderNightly();
  renderNightlyCard();
}

function ensureNightlyCard(){
  if(document.getElementById('nightlyCard')) return;
  const today=document.getElementById('view-today');
  const firstHeading=today?.querySelector('.section-heading');
  if(!firstHeading) return;
  firstHeading.insertAdjacentHTML('beforebegin', `
    <article id="nightlyCard" class="next-run-card" style="margin-top:18px;cursor:pointer;" role="button" tabindex="0">
      <div class="run-card-top"><span class="run-pill">🌙 Avondcheck</span><span class="run-date" id="nightlyCardStatus">Nog open</span></div>
      <h3 id="nightlyCardTitle">Maak je dag in 1 minuut compleet</h3>
      <p id="nightlyCardCopy">Voeding, trainingen en Garmin op één plek controleren.</p>
    </article>`);
  const card=document.getElementById('nightlyCard');
  card.addEventListener('click',openNightly);
  card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openNightly();}});
}

function renderNightlyCard(){
  ensureNightlyCard();
  const s=nightlyStatus();
  const status=document.getElementById('nightlyCardStatus');
  const title=document.getElementById('nightlyCardTitle');
  const copy=document.getElementById('nightlyCardCopy');
  if(!status) return;
  if(s.completed){
    status.textContent='Afgerond ✓';
    status.style.color='#3f8f68';
    title.textContent='Dag is afgerond';
    copy.textContent=`${s.nutrition?'Voeding ingevuld':'Voeding nog leeg'} · ${s.training.done} sportmomenten deze week · ${s.garmin?'Garmin binnen':'Garmin nog niet binnen'}`;
  } else {
    status.textContent='Nog open';
    status.style.color='var(--muted)';
    title.textContent='Maak je dag in 1 minuut compleet';
    copy.textContent=`${s.nutrition?'Voeding ✓':'Voeding nog invullen'} · training checken · ${s.garmin?'Garmin ✓':'Garmin wacht op sync'}`;
  }
}

// Add Avondcheck to the quick-add menu.
const quickActions=document.querySelector('.quick-actions');
if(quickActions && !document.querySelector('[data-action="nightly"]')){
  quickActions.insertAdjacentHTML('afterbegin','<button data-action="nightly"><span>🌙</span><div><strong>Avondcheck</strong><small>dag in één keer afronden</small></div></button>');
  quickActions.querySelector('[data-action="nightly"]').addEventListener('click',()=>{
    try{ closeSheet(); }catch{}
    openNightly();
  });
}

const nightlyDashboardBase=renderDashboard;
renderDashboard=function(){ nightlyDashboardBase(); renderNightlyCard(); };

ensureNightlyModal();
renderNightlyCard();

// Force the final calm UI layers after every legacy module has finished loading.
window.addEventListener('load',()=>{
  const files=[
    ['minimal-ui.js?v=4','minimalUiDirectV4'],
    ['schema-list.js?v=4','schemaListDirectV4'],
    ['dashboard-insights-v2.js?v=4','dashboardInsightsDirectV4']
  ];
  function next(i){
    if(i>=files.length){setTimeout(()=>window.romyMinimalRefresh?.(),100);return;}
    const [src,id]=files[i];
    if(document.getElementById(id)){next(i+1);return;}
    const s=document.createElement('script');s.id=id;s.src=src;s.async=false;s.onload=()=>next(i+1);s.onerror=()=>next(i+1);document.body.appendChild(s);
  }
  setTimeout(()=>next(0),50);
});