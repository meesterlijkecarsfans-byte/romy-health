// Romy Health marathon plan override: Tritanium + Friday easy + Sunday long/specific.
(function(){
  if(typeof marathonPlan==='undefined'||!Array.isArray(marathonPlan)) return;

  const replacement=[
    {key:'2026-46',year:2026,week:46,range:'9 – 15 nov',run1:'7,5 km rustige loop · conversatiesnelheid · richtlijn niet sneller dan 6:05/km',run2:'13 km lange duurloop · volledig rustig op conversatiesnelheid',tritanium:'Tritanium · kwaliteitstraining van de week'},
    {key:'2026-47',year:2026,week:47,range:'16 – 22 nov',run1:'8 km rustige loop · conversatiesnelheid · richtlijn niet sneller dan 6:05/km',run2:'14 km progressief · 4 km rustig + 4,5 km @ 5:45/km + 4 km @ 5:25/km + 1,5 km rustig',tritanium:'Tritanium gecontroleerd · zondag is progressief',specific:true},
    {key:'2026-48',year:2026,week:48,range:'23 – 29 nov',run1:'9 km rustige loop · conversatiesnelheid · richtlijn niet sneller dan 6:05/km',run2:'15 km lange duurloop · volledig rustig/conversationeel',tritanium:'Tritanium · kwaliteitstraining van de week'},
    {key:'2026-49',year:2026,week:49,range:'30 nov – 6 dec',run1:'7 km rustige loop · conversatiesnelheid · richtlijn niet sneller dan 6:00/km',run2:'12 km lange duurloop · rustig en constant op conversatiesnelheid',tritanium:'Tritanium · kwaliteit beheerst in herstelweek',cutback:true},
    {key:'2026-50',year:2026,week:50,range:'7 – 13 dec',run1:'Rust / optioneel 20–30 min zeer rustig loslopen',run2:'Adventurerun Ameland 10 km · zaterdag 12 dec · streeftempo 5:30/km · beheerst starten',tritanium:'Tritanium licht · geen volle prikkel in wedstrijdweek',race:true},
    {key:'2026-51',year:2026,week:51,range:'14 – 20 dec',run1:'8 km rustige loop · conversatiesnelheid',run2:'17 km progressief · 5 km rustig + 2 km @ 5:35 + 2 km @ 5:30 + 4 km @ 5:50 + 2 km @ 5:35 + 2 km @ 5:30',tritanium:'Tritanium gecontroleerd · niet maximaal door progressieve lange run',specific:true},
    {key:'2026-52',year:2026,week:52,range:'21 – 27 dec',run1:'8 km rustige loop · conversatiesnelheid · richtlijn niet sneller dan 5:55/km',run2:'19 km lange duurloop · volledig rustig/conversationeel',tritanium:'Tritanium · kwaliteitstraining van de week'},
    {key:'2026-53',year:2026,week:53,range:'28 dec – 3 jan',run1:'10 km rustige loop · conversatiesnelheid · richtlijn niet sneller dan 5:55/km',run2:'21,1 km progressief · 10 km rustig + 4 km @ 5:45 + 4 km @ 5:35 + 3,1 km @ 5:25',tritanium:'Tritanium gecontroleerd · laat ruimte voor progressieve lange run',specific:true},
    {key:'2027-01',year:2027,week:1,range:'4 – 10 jan',run1:'11 km rustige loop · conversatiesnelheid · richtlijn niet sneller dan 5:55/km',run2:'23 km progressief · 6,5 km rustig + 4 km @ 5:40 + 3 km @ 5:25 + 4 km @ 5:40 + 3 km @ 5:25 + 2,5 km rustig',tritanium:'Tritanium · kwaliteitstraining van de week',specific:true},
    {key:'2027-02',year:2027,week:2,range:'11 – 17 jan',run1:'9 km rustige loop · conversatiesnelheid · richtlijn niet sneller dan 5:50/km',run2:'11 km lange duurloop · rustig/conversationeel',tritanium:'Tritanium gecontroleerd · rustiger week',cutback:true},
    {key:'2027-03',year:2027,week:3,range:'18 – 24 jan',run1:'10 km rustige loop · conversatiesnelheid · richtlijn niet sneller dan 5:50/km',run2:'25 km marathon-specifiek · 6 km rustig + 6 km @ 5:45 + 11 km @ 5:20 + 2 km rustig',tritanium:'Tritanium · kwaliteitstraining van de week',specific:true},
    {key:'2027-04',year:2027,week:4,range:'25 – 31 jan',run1:'9 km rustige loop · conversatiesnelheid · echt easy',run2:'28 km lange duurloop · rustig/conversationeel · hartslag en gevoel leidend',tritanium:'Tritanium gecontroleerd · geen extra volume toevoegen'},
    {key:'2027-05',year:2027,week:5,range:'1 – 7 feb',run1:'10 km rustige loop · conversatiesnelheid · richtlijn niet sneller dan 5:45/km',run2:'22 km marathon-specifiek · 6 km rustig + 10 km @ 5:20 + 6 km rustig',tritanium:'Tritanium · kwaliteitstraining van de week',specific:true},
    {key:'2027-06',year:2027,week:6,range:'8 – 14 feb',run1:'9 km rustige loop · conversatiesnelheid · richtlijn niet sneller dan 5:45/km',run2:'31 km lange duurloop · rustig/conversationeel · geen extra snelle blokken',tritanium:'Tritanium gecontroleerd · belasting bewaken'},
    {key:'2027-07',year:2027,week:7,range:'15 – 21 feb',run1:'8 km rustige loop · conversatiesnelheid · richtlijn niet sneller dan 5:45/km',run2:'17 km hotspot lange duur · 6,5 km rustig + 1 km @ 4:50 + 4 km rustig + 1 km @ 4:50 + 4,5 km rustig',tritanium:'Tritanium licht · snelheid beperkt houden',specific:true},
    {key:'2027-08',year:2027,week:8,range:'22 – 28 feb',run1:'Rust / optioneel 20 min zeer rustig loslopen',run2:'Halve marathon Langezwaag · zaterdag 27 feb · streeftempo 5:15/km · eerste kilometers beheerst',tritanium:'Tritanium zeer licht / overslaan · frisse benen eerst',race:true},
    {key:'2027-09',year:2027,week:9,range:'1 – 7 mrt',run1:'8 km rustige loop · conversatiesnelheid · echt ontspannen',run2:'15 km lange duurloop · volledig rustig/conversationeel',tritanium:'Tritanium licht · herstel na halve marathon staat voorop',cutback:true},
    {key:'2027-10',year:2027,week:10,range:'8 – 14 mrt',run1:'12 km rustige loop · conversatiesnelheid · richtlijn niet sneller dan 5:40/km',run2:'34 km marathon-specifiek · 16 km rustig + 18 km @ 5:20/km · 32 km is ook prima bij vermoeidheid',tritanium:'Tritanium gecontroleerd · geen hero-session in piekweek',specific:true},
    {key:'2027-11',year:2027,week:11,range:'15 – 21 mrt',run1:'12 km rustige loop · conversatiesnelheid · richtlijn niet sneller dan 5:40/km',run2:'31 km lange duurloop · rustig/conversationeel · geen extra kwaliteit toevoegen',tritanium:'Tritanium gecontroleerd · belasting bewaken na piekweek'},
    {key:'2027-12',year:2027,week:12,range:'22 – 28 mrt',run1:'11 km rustige loop · conversatiesnelheid · richtlijn niet sneller dan 5:35/km',run2:'24 km marathon-specifiek · 7 km rustig + 7 km @ 5:25 + 8 km @ 5:20 + 2 km rustig',tritanium:'Tritanium · laatste stevige kwaliteit, geen extra volume',specific:true},
    {key:'2027-13',year:2027,week:13,range:'29 mrt – 4 apr',run1:'10 km rustige loop · conversatiesnelheid · richtlijn niet sneller dan 5:35/km; langzamer is prima',run2:'15 km taperduurloop · volledig rustig · frisheid vasthouden',tritanium:'Tritanium licht · kort en gecontroleerd',cutback:true},
    {key:'2027-14',year:2027,week:14,range:'5 – 11 apr',run1:'Optioneel 20–25 min easy · eventueel 4 × 20 sec ontspannen versnellen met veel herstel',run2:'ENSCHEDE MARATHON · 42,2 km · zondag 11 april · streeftempo 5:30/km · start rond 5:30–5:35/km',tritanium:'Geen normale Tritanium · alleen zeer licht meedoen of overslaan',race:true}
  ];

  const start=marathonPlan.findIndex(p=>p.key==='2026-46');
  if(start>=0) marathonPlan.splice(start,marathonPlan.length-start,...replacement);
  else marathonPlan.push(...replacement);

  window.ROMY_RACE_TARGETS={tenK:'5:30/km',half:'5:15/km',marathon:'5:30/km'};
  window.ROMY_MARATHON_LEGEND='Rustige loop = conversatiesnelheid; tempo is een bovengrens, geen verplichting. Wedstrijddoelen: 10 km 5:30/km · halve marathon 5:15/km · marathon 5:30/km. De 5:20/km-blokken zijn bewust snellere marathon-specifieke trainingsblokken. Hartslag, herstel en gevoel gaan voor tempo. Tritanium is de vaste kwaliteitstraining op woensdag.';

  function replaceLegacyLegend(){
    const root=document.getElementById('view-running');
    if(!root) return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      if((node.nodeValue||'').includes('MP = voorlopig 5:45–5:50/km')) node.nodeValue=window.ROMY_MARATHON_LEGEND;
    });
  }

  if(typeof renderRunPlan==='function'){
    const base=renderRunPlan;
    renderRunPlan=function(){const r=base.apply(this,arguments);setTimeout(replaceLegacyLegend,0);return r;};
  }
  if(typeof renderTraining==='function'){
    const base=renderTraining;
    renderTraining=function(){return base.apply(this,arguments);};
  }

  try{renderRunPlan();}catch{}
  try{renderTraining();}catch{}
  try{renderDashboard();}catch{}
  setTimeout(replaceLegacyLegend,50);
})();