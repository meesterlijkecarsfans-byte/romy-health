// User-specific strength templates and initial Hevy history for Romy Health.
// Loaded after strength-workouts.js so the workout engine stays generic.

STRENGTH_TEMPLATES.kracht1 = {
  name: 'Kracht onderhoud 1',
  exercises: [
    {id:'box-jump', name:'Box Jump', sets:3, target:'3 × 10 reps', noWeight:true},
    {id:'hang-clean', name:'Hang Clean', sets:4, target:'4 sets · 8 / 10 / 7 / 7 reps'},
    {id:'incline-db-bench', name:'Incline Bench Press (Dumbbell)', sets:4, target:'4 sets · 10 / 10 / 8 / 8 reps'},
    {id:'front-squat', name:'Front Squat', sets:4, target:'4 sets · 8 / 9 / 9 / 9 reps'},
    {id:'lat-pulldown', name:'Lat Pulldown (Cable)', sets:4, target:'4 sets · 12 / 8 / 8 / 8 reps'},
    {id:'single-arm-row', name:'Seated Row Single Arm', sets:3, target:'3 × 7 reps'},
    {id:'copenhagen-plank', name:'Copenhagen Plank', sets:3, target:'3 × 30 reps', noWeight:true}
  ]
};

STRENGTH_TEMPLATES.kracht2 = {
  name: 'Kracht onderhoud 2',
  exercises: [
    {id:'pogo', name:'Pogo', sets:3, target:'3 × 6 reps', noWeight:true},
    {id:'db-snatch', name:'Dumbbell Snatch', sets:4, target:'4 × 8 reps'},
    {id:'seated-row', name:'Seated Row (Machine)', sets:4, target:'4 × 10 reps'},
    {id:'db-overhead-press', name:'Overhead Press (Dumbbell)', sets:3, target:'3 × 10 reps'},
    {id:'bulgarian-split-squat', name:'Bulgarian Split Squat (Dumbbell)', sets:3, target:'3 × 8 reps'},
    {id:'copenhagen-plank', name:'Copenhagen Plank', sets:3, target:'3 × 30 reps', noWeight:true},
    {id:'seated-calf-raise', name:'Seated Calf Raise', sets:3, target:'3 × 10 reps'},
    {id:'trap-bar-deadlift', name:'Deadlift (Trap bar)', sets:3, target:'3 × 10 reps'}
  ]
};

const HEVY_STRENGTH_IMPORTS = [
  {
    sourceId:'hevy-rDlyeytJV8Q',
    type:'kracht1',
    name:'Kracht onderhoud 1',
    date:'2026-10-21',
    startedAt:'2026-10-21T13:13:00+02:00',
    completedAt:'2026-10-21T14:15:00+02:00',
    exercises:[
      {id:'box-jump',name:'Box Jump',sets:[{weight:'',reps:'10',done:true},{weight:'',reps:'10',done:true},{weight:'',reps:'10',done:true}]},
      {id:'hang-clean',name:'Hang Clean',sets:[{weight:'20',reps:'8',done:true},{weight:'25',reps:'10',done:true},{weight:'30',reps:'7',done:true},{weight:'30',reps:'7',done:true}]},
      {id:'incline-db-bench',name:'Incline Bench Press (Dumbbell)',sets:[{weight:'8',reps:'10',done:true},{weight:'10',reps:'10',done:true},{weight:'10',reps:'8',done:true},{weight:'10',reps:'8',done:true}]},
      {id:'front-squat',name:'Front Squat',sets:[{weight:'20',reps:'8',done:true},{weight:'30',reps:'9',done:true},{weight:'30',reps:'9',done:true},{weight:'30',reps:'9',done:true}]},
      {id:'lat-pulldown',name:'Lat Pulldown (Cable)',sets:[{weight:'32',reps:'12',done:true},{weight:'39',reps:'8',done:true},{weight:'39',reps:'8',done:true},{weight:'39',reps:'8',done:true}]},
      {id:'single-arm-row',name:'Seated Row Single Arm',sets:[{weight:'18',reps:'7',done:true},{weight:'18',reps:'7',done:true},{weight:'18',reps:'7',done:true}]},
      {id:'copenhagen-plank',name:'Copenhagen Plank',sets:[{weight:'',reps:'30',done:true},{weight:'',reps:'30',done:true},{weight:'',reps:'30',done:true}]}
    ]
  },
  {
    sourceId:'hevy-192d1eee-5373-49c3-9e4c-b2184f2d82b6',
    type:'kracht2',
    name:'Kracht onderhoud 2',
    date:'2026-10-26',
    startedAt:'2026-10-26T10:19:00+01:00',
    completedAt:'2026-10-26T11:15:00+01:00',
    exercises:[
      {id:'pogo',name:'Pogo',sets:[{weight:'',reps:'6',done:true},{weight:'',reps:'6',done:true},{weight:'',reps:'6',done:true}]},
      {id:'db-snatch',name:'Dumbbell Snatch',sets:[{weight:'10',reps:'8',done:true},{weight:'12',reps:'8',done:true},{weight:'14',reps:'8',done:true},{weight:'14',reps:'8',done:true}]},
      {id:'seated-row',name:'Seated Row (Machine)',sets:[{weight:'32',reps:'10',done:true},{weight:'32',reps:'10',done:true},{weight:'32',reps:'10',done:true},{weight:'32',reps:'10',done:true}]},
      {id:'db-overhead-press',name:'Overhead Press (Dumbbell)',sets:[{weight:'10',reps:'10',done:true},{weight:'10',reps:'10',done:true},{weight:'10',reps:'10',done:true}]},
      {id:'bulgarian-split-squat',name:'Bulgarian Split Squat (Dumbbell)',sets:[{weight:'12',reps:'8',done:true},{weight:'12',reps:'8',done:true},{weight:'12',reps:'8',done:true}]},
      {id:'copenhagen-plank',name:'Copenhagen Plank',sets:[{weight:'',reps:'30',done:true},{weight:'',reps:'30',done:true},{weight:'',reps:'30',done:true}]},
      {id:'seated-calf-raise',name:'Seated Calf Raise',sets:[{weight:'16',reps:'10',done:true},{weight:'16',reps:'10',done:true},{weight:'16',reps:'10',done:true}]},
      {id:'trap-bar-deadlift',name:'Deadlift (Trap bar)',sets:[{weight:'40',reps:'10',done:true},{weight:'50',reps:'10',done:true},{weight:'50',reps:'10',done:true}]}
    ]
  }
];

state.strengthSessions ||= [];
let importedStrengthHistory = false;
for (const session of HEVY_STRENGTH_IMPORTS) {
  if (!state.strengthSessions.some(existing => existing.sourceId === session.sourceId)) {
    state.strengthSessions.push(session);
    importedStrengthHistory = true;
  }
}
state.strengthSessions.sort((a,b)=>String(a.completedAt || a.date).localeCompare(String(b.completedAt || b.date)));

// An old draft may have been created with the previous template. Discard only if its exercise layout no longer matches.
if (state.strengthDraft) {
  const template = STRENGTH_TEMPLATES[state.strengthDraft.type];
  const expected = template?.exercises?.map(x=>`${x.id}:${x.sets}`).join('|');
  const actual = state.strengthDraft.exercises?.map(x=>`${x.id}:${x.sets?.length || 0}`).join('|');
  if (expected && actual !== expected) state.strengthDraft = null;
}

// Keep names in the general Training overview consistent with the workout tab.
if (typeof EXTRA_WEEKLY_ACTIVITIES !== 'undefined') {
  const k1 = EXTRA_WEEKLY_ACTIVITIES.find(x=>x.id==='kracht1');
  const k2 = EXTRA_WEEKLY_ACTIVITIES.find(x=>x.id==='kracht2');
  if (k1) { k1.name='Kracht onderhoud 1'; k1.hint=()=> 'Krachttraining · Hevy-schema 1'; }
  if (k2) { k2.name='Kracht onderhoud 2'; k2.hint=()=> 'Krachttraining · Hevy-schema 2'; }
}

if (importedStrengthHistory || !state.strengthDraft) saveState();
selectedStrengthType = state.strengthDraft?.type || selectedStrengthType;
try { renderStrengthView(); } catch {}
try { renderTraining(); } catch {}
try { renderDashboard(); } catch {}
