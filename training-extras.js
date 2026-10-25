const EXTRA_WEEKLY_ACTIVITIES = [
  {id:'tritanium', group:'Hardlopen', name:'Tritanium', hint: plan => plan.tritanium},
  {id:'run1', group:'Hardlopen', name:'Run 1', hint: plan => plan.run1},
  {id:'run2', group:'Hardlopen', name:'Run 2', hint: plan => plan.run2},
  {id:'tweeslag', group:'Volleybal', name:'Tweeslag', hint: () => 'Volleybaltraining'},
  {id:'donitas1', group:'Volleybal', name:'Donitas 1', hint: () => 'Volleybaltraining'},
  {id:'donitas2', group:'Volleybal', name:'Donitas 2', hint: () => 'Volleybaltraining'},
  {id:'kracht1', group:'Kracht', name:'Kracht 1', hint: () => 'Krachttraining'},
  {id:'kracht2', group:'Kracht', name:'Kracht 2', hint: () => 'Tweede / extra krachttraining'},
  {id:'zwemmen', group:'Conditie & overig', name:'Zwemmen', hint: () => 'Zwemtraining / herstel'},
  {id:'spinning', group:'Conditie & overig', name:'Spinning', hint: () => 'Spinning / indoor cycling'},
  {id:'fietsen', group:'Conditie & overig', name:'Fietsen', hint: () => 'Buitenrit / wielrennen'},
  {id:'extra', group:'Conditie & overig', name:'Extra sport', hint: () => 'Andere sport of extra sessie'}
];

const baseChecklistForAllSports = checklistFor;
checklistFor = function(plan){
  const check = baseChecklistForAllSports(plan);
  EXTRA_WEEKLY_ACTIVITIES.forEach(item => {
    if(typeof check[item.id] !== 'boolean') check[item.id] = false;
  });
  return check;
};

doneCount = function(plan){
  const check = checklistFor(plan);
  return EXTRA_WEEKLY_ACTIVITIES.reduce((count,item)=>count + (check[item.id] ? 1 : 0), 0);
};

renderTraining = function(){
  const plan = currentPlan();
  const check = checklistFor(plan);
  const done = doneCount(plan);

  document.getElementById('trainingWeekTitle').textContent = `Week ${plan.week} · ${plan.year}`;
  document.getElementById('trainingWeekSubtitle').textContent = plan.range;
  document.getElementById('trainingDoneCount').textContent = done;
  document.getElementById('trainingPercent').textContent = `${done} afgevinkt`;
  document.getElementById('trainingProgressBar').style.width = `${Math.min(100, Math.round(done / EXTRA_WEEKLY_ACTIVITIES.length * 100))}%`;

  const groups = [...new Set(EXTRA_WEEKLY_ACTIVITIES.map(x=>x.group))];
  document.getElementById('trainingGroups').innerHTML = groups.map(group => `
    <section class="training-group">
      <h3>${group}</h3>
      <div class="training-list">
        ${EXTRA_WEEKLY_ACTIVITIES.filter(x=>x.group===group).map(item=>`
          <button class="training-row ${check[item.id]?'done':''}" data-plan-item="${item.id}">
            <span class="check">${check[item.id]?'✓':''}</span>
            <div><strong>${item.name}</strong><small>${item.hint(plan)}</small></div>
          </button>`).join('')}
      </div>
    </section>`).join('');

  document.querySelectorAll('[data-plan-item]').forEach(btn => btn.addEventListener('click',()=>togglePlanItem(plan.key,btn.dataset.planItem)));
};

const scheduleDashboardWithRuns = renderDashboard;
renderDashboard = function(){
  scheduleDashboardWithRuns();
  const iso = currentIsoWeek();
  const plan = marathonPlan.find(p => p.year === iso.year && p.week === iso.week) || marathonPlan.find(p => p.year > iso.year || (p.year === iso.year && p.week > iso.week)) || marathonPlan.at(-1);
  const done = doneCount(plan);
  document.getElementById('dashTraining').textContent = String(done);
  document.getElementById('heroTitle').textContent = done >= 7 ? 'Actieve week ✨' : done >= 4 ? 'Mooie basis' : 'Klaar voor je week';
  document.getElementById('heroCopy').textContent = `${done} sportmomenten afgevinkt · week ${plan.week}. Niet alles is een doel: vink alleen af wat je echt hebt gedaan.`;
};

renderTraining();
renderDashboard();

// Load the Garmin-ready automation layer separately so the core training UI stays simple.
const healthAutomationScript = document.createElement('script');
healthAutomationScript.src = './health-automation.js?v=1';
healthAutomationScript.async = false;
document.head.appendChild(healthAutomationScript);
