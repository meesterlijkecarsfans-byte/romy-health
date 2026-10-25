// Romy Health automation layer: Garmin-ready wellness metrics and activity matching.
// Garmin credentials never belong in this browser file. Supabase stores the imported Garmin rows.

state.garminDaily ||= {};
state.garminActivities ||= [];

function latestGarminDay(){
  const keys = Object.keys(state.garminDaily || {}).sort();
  return keys.length ? {date: keys.at(-1), ...state.garminDaily[keys.at(-1)]} : null;
}
function healthValue(value, suffix=''){
  return value === null || value === undefined || value === '' ? '—' : `${value}${suffix}`;
}
function ensureHealthDashboard(){
  if(document.getElementById('garminHealthSection')) return;
  const todayView = document.getElementById('view-today');
  const nutritionHeading = [...todayView.querySelectorAll('.section-heading')].find(x => x.textContent.includes('Voeding'));
  if(!nutritionHeading) return;
  nutritionHeading.insertAdjacentHTML('beforebegin', `
    <section id="garminHealthSection" style="margin-top:28px;">
      <div class="section-heading compact">
        <div><p class="eyebrow">Automatisch</p><h2>Garmin & herstel</h2></div>
        <span id="garminConnectionBadge" style="font-size:12px;font-weight:750;color:var(--muted);">Nog niet gekoppeld</span>
      </div>
      <div class="summary-grid" id="garminMetricGrid">
        <div class="metric-card"><span class="metric-icon">😴</span><span class="metric-value" id="garminSleep">—</span><span class="metric-label">slaap</span></div>
        <div class="metric-card"><span class="metric-icon">🔥</span><span class="metric-value" id="garminBurned">—</span><span class="metric-label">verbrand</span></div>
        <div class="metric-card"><span class="metric-icon">♥</span><span class="metric-value" id="garminRestingHr">—</span><span class="metric-label">rusthartslag</span></div>
        <div class="metric-card"><span class="metric-icon">〽</span><span class="metric-value" id="garminHrv">—</span><span class="metric-label">HRV</span></div>
        <div class="metric-card"><span class="metric-icon">⚡</span><span class="metric-value" id="garminBodyBattery">—</span><span class="metric-label">Body Battery</span></div>
        <div class="metric-card"><span class="metric-icon">◌</span><span class="metric-value" id="garminSteps">—</span><span class="metric-label">stappen</span></div>
      </div>
      <article id="recoveryCard" class="next-run-card" style="margin-top:12px;"></article>
    </section>`);
}
function recoveryMessage(day){
  if(!day) return {title:'Garmin staat klaar', copy:'Zodra de Garmin-serverfunctie data heeft opgehaald verschijnen hier automatisch slaap, calorieverbruik, HRV, rusthartslag, Body Battery en stappen.'};
  const signals=[];
  if(day.sleepHours != null && day.sleepHours < 6.5) signals.push('weinig slaap');
  if(day.bodyBattery != null && day.bodyBattery < 35) signals.push('lage Body Battery');
  if(day.hrv != null && day.hrv < 30) signals.push('relatief lage HRV');
  if(signals.length) return {title:'Herstel wat lager', copy:`Signalen: ${signals.join(', ')}. Gebruik dit als trainingssignaal; gevoel en herstel blijven leidend.`};
  return {title:'Herstel ziet er rustig uit', copy:'Geen duidelijke herstelwaarschuwingen in de beschikbare Garmin-data. Dit is een trainingssignaal, geen medische beoordeling.'};
}
function renderGarminHealth(){
  ensureHealthDashboard();
  const d = latestGarminDay();
  const badge = document.getElementById('garminConnectionBadge');
  if(!badge) return;
  badge.textContent = d ? `Bijgewerkt ${formatShortDate(d.date)}` : 'Wacht op eerste sync';
  badge.style.color = d ? '#3f8f68' : 'var(--muted)';
  document.getElementById('garminSleep').textContent = healthValue(d?.sleepHours, ' u');
  document.getElementById('garminBurned').textContent = healthValue(d?.totalCalories, ' kcal');
  document.getElementById('garminRestingHr').textContent = healthValue(d?.restingHeartRate, ' bpm');
  document.getElementById('garminHrv').textContent = healthValue(d?.hrv, ' ms');
  document.getElementById('garminBodyBattery').textContent = healthValue(d?.bodyBattery);
  document.getElementById('garminSteps').textContent = d?.steps == null ? '—' : Number(d.steps).toLocaleString('nl-NL');
  const msg = recoveryMessage(d);
  document.getElementById('recoveryCard').innerHTML = `<div class="run-card-top"><span class="run-pill">♡ Herstel</span><span class="run-date">${d ? formatFullDate(d.date) : 'Garmin'}</span></div><h3>${msg.title}</h3><p>${msg.copy}</p>`;
}
function parsePlannedKm(text){
  const m = String(text || '').match(/(\d+(?:[,.]\d+)?)\s*km/i);
  return m ? Number(m[1].replace(',','.')) : null;
}
function matchActivityToPlan(activity, plan){
  const title = String(activity.name || activity.title || '').toLowerCase();
  const type = String(activity.type || activity.activityType || '').toLowerCase();
  const distance = Number(activity.distanceKm ?? activity.distance ?? 0);
  if(title.includes('tritanium')) return 'tritanium';
  if(title.includes('tweeslag')) return 'tweeslag';
  if(title.includes('donitas')) return title.includes('2') ? 'donitas2' : 'donitas1';
  if(type.includes('strength') || type.includes('kracht')) return 'kracht1';
  if(type.includes('swim') || type.includes('zwem')) return 'zwemmen';
  if(type.includes('spinning') || title.includes('spinning')) return 'spinning';
  if(type.includes('cycling') || type.includes('bike') || type.includes('fiets')) return 'fietsen';
  if(type.includes('run') || type.includes('hardloop')){
    const km1=parsePlannedKm(plan.run1), km2=parsePlannedKm(plan.run2);
    const d1=km1 ? Math.abs(distance-km1)/km1 : 99;
    const d2=km2 ? Math.abs(distance-km2)/km2 : 99;
    if(Math.min(d1,d2) <= .20) return d1 <= d2 ? 'run1' : 'run2';
  }
  return null;
}
function ensureActivitySuggestions(){
  const groups = document.getElementById('trainingGroups');
  if(!groups) return;
  let box = document.getElementById('garminActivitySuggestions');
  if(!box){ groups.insertAdjacentHTML('afterend','<section id="garminActivitySuggestions" class="training-group" style="margin-top:18px;"></section>'); box=document.getElementById('garminActivitySuggestions'); }
  const plan = typeof currentPlan === 'function' ? currentPlan() : null;
  if(!plan || !(state.garminActivities || []).length){
    box.innerHTML = '<h3>Garmin-activiteiten</h3><div class="empty-state">Na de eerste Garmin-sync kunnen activiteiten hier aan Run 1, Run 2, Tritanium of andere sporten worden gekoppeld.</div>';
    return;
  }
  const recent = state.garminActivities.slice(-6).reverse();
  box.innerHTML = `<h3>Garmin-activiteiten</h3><div class="training-list">${recent.map((a,i)=>{
    const suggested=matchActivityToPlan(a,plan);
    const km=a.distanceKm!=null?` · ${Number(a.distanceKm).toFixed(1).replace('.',',')} km`:'';
    return `<div class="training-row" style="cursor:default;"><span class="check">⌁</span><div style="flex:1"><strong>${a.name||a.type||'Activiteit'}</strong><small>${a.date||''}${km}${suggested?` · voorstel: ${suggested}`:''}</small></div>${suggested?`<button data-link-garmin="${i}" data-suggested="${suggested}" style="border:0;background:var(--pink-soft);color:var(--pink-dark);border-radius:10px;padding:7px 9px;font-weight:750;">Koppelen</button>`:''}</div>`;
  }).join('')}</div>`;
  box.querySelectorAll('[data-link-garmin]').forEach(btn=>btn.addEventListener('click',()=>{
    const check=checklistFor(plan); check[btn.dataset.suggested]=true; saveState(); renderTraining();
  }));
}
function ensureAutomationSettings(){
  const list=document.querySelector('#settingsModal .settings-list');
  if(!list || document.getElementById('automationSettingsCard')) return;
  list.insertAdjacentHTML('beforeend', `<div id="automationSettingsCard" style="padding:14px 16px;border:1px solid var(--line);border-radius:16px;background:var(--surface-soft);"><strong style="display:block;">⚡ Automatiseringen</strong><small id="garminAutomationStatus" style="display:block;margin-top:6px;line-height:1.45;color:var(--muted);">Cloud sync beschikbaar. Garmin-serverkoppeling wordt voorbereid.</small></div>`);
}
window.ingestGarminData = function(payload){
  if(payload?.daily){ Object.entries(payload.daily).forEach(([date,value])=>{ state.garminDaily[date]={...(state.garminDaily[date]||{}),...value}; }); }
  if(Array.isArray(payload?.activities)){
    const existing=new Map((state.garminActivities||[]).map(a=>[String(a.id||`${a.date}-${a.name}`),a]));
    payload.activities.forEach(a=>existing.set(String(a.id||`${a.date}-${a.name}`),a));
    state.garminActivities=[...existing.values()].slice(-100);
  }
  saveState(); renderGarminHealth(); ensureActivitySuggestions();
};
const _automationRenderDashboard = renderDashboard;
renderDashboard = function(){ _automationRenderDashboard(); renderGarminHealth(); };
const _automationRenderTraining = renderTraining;
renderTraining = function(){ _automationRenderTraining(); ensureActivitySuggestions(); };
ensureAutomationSettings(); renderGarminHealth(); ensureActivitySuggestions();
