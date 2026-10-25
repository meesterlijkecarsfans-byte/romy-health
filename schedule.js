const marathonPlan = [
  {key:'2026-44',year:2026,week:44,range:'26 okt – 1 nov',run1:'6 km easy / conversatiesnelheid',run2:'10 km lange duurloop easy',tritanium:'Interval / snelheid — inhoud zie je die week'},
  {key:'2026-45',year:2026,week:45,range:'2 – 8 nov',run1:'6 km easy + 4 × 20 sec ontspannen strides',run2:'12 km lange duurloop easy',tritanium:'Interval / snelheid — inhoud zie je die week'},
  {key:'2026-46',year:2026,week:46,range:'9 – 15 nov',run1:'6 km easy',run2:'13 km lange duurloop easy',tritanium:'Interval / snelheid — inhoud zie je die week'},
  {key:'2026-47',year:2026,week:47,range:'16 – 22 nov',run1:'6 km easy',run2:'14 km lange duurloop easy',tritanium:'Interval / snelheid — inhoud zie je die week'},
  {key:'2026-48',year:2026,week:48,range:'23 – 29 nov',run1:'7 km easy',run2:'15 km lange duurloop easy',tritanium:'Interval / snelheid — inhoud zie je die week'},
  {key:'2026-49',year:2026,week:49,range:'30 nov – 6 dec',run1:'6 km easy',run2:'12 km lange duurloop easy · herstelweek',tritanium:'Interval / snelheid — inhoud zie je die week',cutback:true},
  {key:'2026-50',year:2026,week:50,range:'7 – 13 dec',run1:'5 km easy + 4 × 20 sec strides',run2:'Adventurerun Ameland 10 km · zaterdag 12 dec',tritanium:'Licht houden / geen volle intervalprikkel vanwege 10 km-wedstrijd',race:true},
  {key:'2026-51',year:2026,week:51,range:'14 – 20 dec',run1:'6 km zeer rustig herstel',run2:'17 km lange duurloop easy',tritanium:'Interval / snelheid — inhoud zie je die week'},
  {key:'2026-52',year:2026,week:52,range:'21 – 27 dec',run1:'7 km easy',run2:'19 km lange duurloop easy',tritanium:'Interval / snelheid — inhoud zie je die week'},
  {key:'2026-53',year:2026,week:53,range:'28 dec – 3 jan',run1:'6 km easy',run2:'21 km lange duurloop easy',tritanium:'Interval / snelheid — inhoud zie je die week'},
  {key:'2027-01',year:2027,week:1,range:'4 – 10 jan',run1:'7 km easy',run2:'23 km: 15 km easy + 5 km steady @ 5:50–6:00/km + 3 km easy',tritanium:'Interval / snelheid — inhoud zie je die week',specific:true},
  {key:'2027-02',year:2027,week:2,range:'11 – 17 jan',run1:'6 km easy',run2:'16 km lange duurloop easy · herstelweek',tritanium:'Interval / snelheid — inhoud zie je die week',cutback:true},
  {key:'2027-03',year:2027,week:3,range:'18 – 24 jan',run1:'7 km easy',run2:'25 km: 6 km easy + 6 km @ 5:50/km + 6 km marathonpace @ 5:25/km + 7 km easy',tritanium:'Interval / snelheid — inhoud zie je die week',specific:true},
  {key:'2027-04',year:2027,week:4,range:'25 – 31 jan',run1:'7 km easy',run2:'28 km lange duurloop easy',tritanium:'Interval / snelheid — inhoud zie je die week'},
  {key:'2027-05',year:2027,week:5,range:'1 – 7 feb',run1:'6 km easy',run2:'22 km: 6 km easy + 8 km marathonpace @ 5:25/km + 8 km easy',tritanium:'Interval / snelheid — inhoud zie je die week',specific:true},
  {key:'2027-06',year:2027,week:6,range:'8 – 14 feb',run1:'7 km easy',run2:'30 km lange duurloop easy',tritanium:'Interval / snelheid — inhoud zie je die week'},
  {key:'2027-07',year:2027,week:7,range:'15 – 21 feb',run1:'6 km easy',run2:'18 km lange duurloop easy · herstelweek',tritanium:'Interval / snelheid — inhoud zie je die week',cutback:true},
  {key:'2027-08',year:2027,week:8,range:'22 – 28 feb',run1:'5 km easy + 4 × 20 sec strides',run2:'Halve marathon Langezwaag · zaterdag 27 feb',tritanium:'Licht houden / geen volle intervalprikkel vanwege halve marathon',race:true},
  {key:'2027-09',year:2027,week:9,range:'1 – 7 mrt',run1:'6 km zeer rustig herstel',run2:'18 km lange duurloop easy',tritanium:'Alleen normaal als je goed hersteld bent van de halve marathon',cutback:true},
  {key:'2027-10',year:2027,week:10,range:'8 – 14 mrt',run1:'7 km easy',run2:'32 km: 18 km easy + 10 km marathonpace @ 5:25/km + 4 km easy',tritanium:'Interval / snelheid — inhoud zie je die week; houd extra volume beperkt',specific:true},
  {key:'2027-11',year:2027,week:11,range:'15 – 21 mrt',run1:'7 km easy',run2:'30 km lange duurloop easy',tritanium:'Interval / snelheid — inhoud zie je die week'},
  {key:'2027-12',year:2027,week:12,range:'22 – 28 mrt',run1:'6 km easy',run2:'24 km: 6 km easy + 4 km @ 5:25/km + 2 km easy + 4 km @ 5:25/km + 8 km easy',tritanium:'Interval / snelheid — inhoud zie je die week; laatste stevige marathon-specifieke week',specific:true},
  {key:'2027-13',year:2027,week:13,range:'29 mrt – 4 apr',run1:'6 km easy + 4 × 20 sec ontspannen strides',run2:'16 km lange duurloop easy · taper',tritanium:'Korter / gecontroleerd; geen extra vermoeidheid opbouwen',cutback:true},
  {key:'2027-14',year:2027,week:14,range:'5 – 11 apr',run1:'5 km easy + 4 × 20 sec strides, vroeg in de week',run2:'ENSCHEDE MARATHON · zondag 11 april · 42,2 km',tritanium:'Geen volle intervaltraining; alleen licht meedoen of overslaan',race:true}
];

const marathonLegend = 'Easy = ontspannen conversatiesnelheid (richtlijn ongeveer 6:10–6:50/km, trager mag). MP = beoogd marathonpace 5:25/km. Tritanium is de vaste intensieve looptraining van de week.';

let planFilter = 'all';
let currentPlanIndex = (() => {
  const now = currentIsoWeek();
  let i = marathonPlan.findIndex(p => p.year === now.year && p.week === now.week);
  if (i >= 0) return i;
  i = marathonPlan.findIndex(p => p.year > now.year || (p.year === now.year && p.week > now.week));
  return i >= 0 ? i : marathonPlan.length - 1;
})();

function checklistFor(plan){
  state.trainingV2 ||= {};
  state.trainingV2[plan.key] ||= {tritanium:false,run1:false,run2:false,tweeslag:false,donitas1:false,donitas2:false};
  return state.trainingV2[plan.key];
}

function currentPlan(){ return marathonPlan[currentPlanIndex]; }
function doneCount(plan){ return Object.values(checklistFor(plan)).filter(Boolean).length; }

function togglePlanItem(planKey,id){
  const plan = marathonPlan.find(p => p.key === planKey);
  if(!plan) return;
  const check = checklistFor(plan);
  check[id] = !check[id];
  saveState();
  renderTraining();
  renderRunPlan();
  renderDashboard();
}

const originalDashboard = renderDashboard;
renderDashboard = function(){
  originalDashboard();
  const iso = currentIsoWeek();
  const plan = marathonPlan.find(p => p.year === iso.year && p.week === iso.week) || marathonPlan.find(p => p.year > iso.year || (p.year === iso.year && p.week > iso.week)) || marathonPlan.at(-1);
  const check = checklistFor(plan);
  const done = Object.values(check).filter(Boolean).length;
  document.getElementById('dashTraining').textContent = `${done}/6`;
  document.getElementById('heroTitle').textContent = done >= 5 ? 'Sterke week ✨' : done >= 3 ? 'Mooie basis' : 'Klaar voor je week';
  document.getElementById('heroCopy').textContent = `${done} van 6 vaste trainingen afgevinkt · week ${plan.week}. Tritanium telt als je intensieve loopprikkel.`;
  const next = !check.run1 ? ['Run 1',plan.run1,'run1'] : !check.run2 ? ['Run 2',plan.run2,'run2'] : null;
  const card = document.getElementById('nextRunCard');
  if(next){
    card.innerHTML = `<div class="run-card-top"><span class="run-pill">🏃 ${next[0]}</span><span class="run-date">Week ${plan.week} · ${plan.range}</span></div><h3>${next[1]}</h3><p>${plan.specific ? 'Marathon-specifieke week: deze run bevat bewust een gecontroleerd tempo-element.' : plan.race ? 'Wedstrijdweek: Tritanium bewust lichter houden.' : 'Rustig houden; Tritanium is deze week je snelheidstraining.'}</p>`;
  } else {
    card.innerHTML = `<div class="run-card-top"><span class="run-pill">✓ Hardlopen</span><span class="run-date">Week ${plan.week}</span></div><h3>Beide runs afgevinkt</h3><p>Mooi. Herstel is nu onderdeel van het schema.</p>`;
  }
};

renderTraining = function(){
  const plan = currentPlan();
  const check = checklistFor(plan);
  const items = [
    {id:'tritanium',group:'Hardlopen',name:'Tritanium',hint:plan.tritanium},
    {id:'run1',group:'Hardlopen',name:'Run 1',hint:plan.run1},
    {id:'run2',group:'Hardlopen',name:'Run 2',hint:plan.run2},
    {id:'tweeslag',group:'Volleybal',name:'Tweeslag',hint:'Volleybaltraining'},
    {id:'donitas1',group:'Volleybal',name:'Donitas 1',hint:'Volleybaltraining'},
    {id:'donitas2',group:'Volleybal',name:'Donitas 2',hint:'Volleybaltraining'}
  ];
  const done = doneCount(plan), pct = Math.round(done / items.length * 100);
  document.getElementById('trainingWeekTitle').textContent = `Week ${plan.week} · ${plan.year}`;
  document.getElementById('trainingWeekSubtitle').textContent = plan.range;
  document.getElementById('trainingDoneCount').textContent = done;
  document.getElementById('trainingPercent').textContent = `${pct}%`;
  document.getElementById('trainingProgressBar').style.width = `${pct}%`;
  document.getElementById('trainingGroups').innerHTML = ['Hardlopen','Volleybal'].map(group => `<section class="training-group"><h3>${group}</h3><div class="training-list">${items.filter(x=>x.group===group).map(x=>`<button class="training-row ${check[x.id]?'done':''}" data-plan-item="${x.id}"><span class="check">${check[x.id]?'✓':''}</span><div><strong>${x.name}</strong><small>${x.hint}</small></div></button>`).join('')}</div></section>`).join('');
  document.querySelectorAll('[data-plan-item]').forEach(btn => btn.addEventListener('click',()=>togglePlanItem(plan.key,btn.dataset.planItem)));
};

renderRunPlan = function(){
  const iso = currentIsoWeek();
  let plans = marathonPlan;
  if(planFilter === 'upcoming') plans = plans.filter(p => p.year > iso.year || (p.year === iso.year && p.week >= iso.week));
  if(planFilter === 'race') plans = plans.filter(p => p.race);
  const intro = `<article class="run-week"><div class="run-week-head"><div><h3>Uitgangspunt</h3><p>1 intensieve run per week = Tritanium</p></div></div><div class="run-session"><span>Legenda</span><strong>${marathonLegend}</strong><span></span></div></article>`;
  document.getElementById('runPlan').innerHTML = intro + plans.map(plan => {
    const check = checklistFor(plan);
    const current = plan.year === iso.year && plan.week === iso.week;
    const badge = current ? '<span class="current-tag">Deze week</span>' : plan.race ? '<span class="race-tag">Race</span>' : plan.specific ? '<span class="current-tag">MP-blokken</span>' : plan.cutback ? '<span class="race-tag">Herstel</span>' : '';
    return `<article class="run-week ${current?'current':''}"><div class="run-week-head"><div><h3>Week ${plan.week} · ${plan.year}</h3><p>${plan.range}</p></div>${badge}</div><div class="run-session ${check.run1?'done':''}"><span>Run 1</span><strong>${plan.run1}</strong><button data-run-check="run1" data-plan-key="${plan.key}" aria-label="Run 1 afvinken">${check.run1?'✓':'○'}</button></div><div class="run-session ${check.run2?'done':''}"><span>Run 2</span><strong>${plan.run2}</strong><button data-run-check="run2" data-plan-key="${plan.key}" aria-label="Run 2 afvinken">${check.run2?'✓':'○'}</button></div><div class="run-session"><span>Tritanium</span><strong>${plan.tritanium}</strong><span></span></div></article>`;
  }).join('');
  document.querySelectorAll('[data-run-check]').forEach(btn => btn.addEventListener('click',()=>togglePlanItem(btn.dataset.planKey,btn.dataset.runCheck)));
};

function installScheduleControls(){
  const prevOld = document.getElementById('trainingPrev');
  const nextOld = document.getElementById('trainingNext');
  const prev = prevOld.cloneNode(true), next = nextOld.cloneNode(true);
  prevOld.replaceWith(prev); nextOld.replaceWith(next);
  prev.addEventListener('click',()=>{ if(currentPlanIndex>0){currentPlanIndex--;renderTraining();} });
  next.addEventListener('click',()=>{ if(currentPlanIndex<marathonPlan.length-1){currentPlanIndex++;renderTraining();} });

  const filters = document.getElementById('runFilters');
  filters.innerHTML = '<button class="chip active" data-plan-filter="all">Alles</button><button class="chip" data-plan-filter="upcoming">Komend</button><button class="chip" data-plan-filter="race">Races</button>';
  filters.querySelectorAll('[data-plan-filter]').forEach(btn=>btn.addEventListener('click',()=>{
    planFilter = btn.dataset.planFilter;
    filters.querySelectorAll('.chip').forEach(x=>x.classList.toggle('active',x===btn));
    renderRunPlan();
  }));
}

installScheduleControls();
renderTraining();
renderRunPlan();
renderDashboard();
