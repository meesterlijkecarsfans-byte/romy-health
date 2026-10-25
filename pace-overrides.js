const paceOverrides = {
  '2026-44': ['6 km easy · 6:45–7:00/km · Z2 140–154 bpm','10 km lange duurloop · 6:45–7:00/km · Z2 140–154 bpm'],
  '2026-45': ['6 km easy · 6:45–7:00/km · Z2 140–154 bpm + 4 × 20 sec ontspannen strides','12 km lange duurloop · 6:45–7:00/km · Z2 140–154 bpm'],
  '2026-46': ['6 km easy · 6:45–7:00/km · Z2 140–154 bpm','13 km lange duurloop · 6:45–7:00/km · Z2 140–154 bpm'],
  '2026-47': ['6 km easy · 6:45–7:00/km · Z2 140–154 bpm','14 km lange duurloop · 6:45–7:00/km · Z2 140–154 bpm'],
  '2026-48': ['7 km easy · 6:45–7:00/km · Z2 140–154 bpm','15 km lange duurloop · 6:45–7:00/km · Z2 140–154 bpm'],
  '2026-49': ['6 km easy · 6:45–7:00/km · Z2 140–154 bpm','12 km herstelduurloop · 6:50–7:15/km · liefst HR ≤150'],
  '2026-50': ['5 km easy · 6:45–7:00/km · Z2 + 4 × 20 sec ontspannen strides','Adventurerun Ameland 10 km · wedstrijdtempo · zaterdag 12 dec'],
  '2026-51': ['6 km herstel · 6:50–7:20/km · liefst HR <145','17 km lange duurloop · 6:45–7:00/km · Z2 140–154 bpm'],
  '2026-52': ['7 km easy · 6:45–7:00/km · Z2 140–154 bpm','19 km lange duurloop · 6:45–7:00/km · Z2 140–154 bpm'],
  '2026-53': ['6 km easy · 6:45–7:00/km · Z2 140–154 bpm','21 km lange duurloop · 6:45–7:00/km · Z2 140–154 bpm'],
  '2027-01': ['7 km easy · 6:45–7:00/km · Z2 140–154 bpm','23 km: 15 km easy @ 6:45–7:00 + 5 km steady @ 5:55–6:05 + 3 km easy @ 6:45–7:00'],
  '2027-02': ['6 km easy · 6:45–7:00/km · Z2 140–154 bpm','16 km herstelduurloop · 6:50–7:15/km · liefst HR ≤150'],
  '2027-03': ['7 km easy · 6:45–7:00/km · Z2 140–154 bpm','25 km: 6 km easy @ 6:45–7:00 + 6 km steady @ 5:55–6:05 + 6 km MP @ 5:45–5:50 + 7 km easy @ 6:45–7:00'],
  '2027-04': ['7 km easy · 6:45–7:00/km · Z2 140–154 bpm','28 km lange duurloop · 6:45–7:05/km · Z2; hartslag leidend'],
  '2027-05': ['6 km easy · 6:45–7:00/km · Z2 140–154 bpm','22 km: 6 km easy @ 6:45–7:00 + 8 km MP @ 5:45–5:50 + 8 km easy @ 6:45–7:00'],
  '2027-06': ['7 km easy · 6:45–7:00/km · Z2 140–154 bpm','30 km lange duurloop · 6:45–7:05/km · Z2; hartslag leidend'],
  '2027-07': ['6 km easy · 6:45–7:00/km · Z2 140–154 bpm','18 km herstelduurloop · 6:50–7:15/km · liefst HR ≤150'],
  '2027-08': ['5 km easy · 6:45–7:00/km · Z2 + 4 × 20 sec ontspannen strides','Halve marathon Langezwaag · wedstrijdtempo · zaterdag 27 feb'],
  '2027-09': ['6 km herstel · 6:50–7:20/km · liefst HR <145','18 km lange duurloop · 6:45–7:05/km · Z2 140–154 bpm'],
  '2027-10': ['7 km easy · 6:45–7:00/km · Z2 140–154 bpm','32 km: 18 km easy @ 6:45–7:05 + 10 km MP @ 5:45–5:50 + 4 km easy @ 6:50–7:10'],
  '2027-11': ['7 km easy · 6:45–7:00/km · Z2 140–154 bpm','30 km lange duurloop · 6:45–7:05/km · Z2; hartslag leidend'],
  '2027-12': ['6 km easy · 6:45–7:00/km · Z2 140–154 bpm','24 km: 6 km easy @ 6:45–7:00 + 4 km MP @ 5:45–5:50 + 2 km easy + 4 km MP @ 5:45–5:50 + 8 km easy @ 6:45–7:00'],
  '2027-13': ['6 km easy · 6:45–7:00/km · Z2 + 4 × 20 sec ontspannen strides','16 km taperduurloop · 6:50–7:05/km · rustig Z2'],
  '2027-14': ['5 km easy · 6:50–7:05/km + 4 × 20 sec ontspannen strides · vroeg in de week','ENSCHEDE MARATHON · 42,2 km · zondag 11 april · definitief wedstrijdtempo later bepalen']
};

marathonPlan.forEach(plan => {
  const override = paceOverrides[plan.key];
  if (!override) return;
  plan.run1 = override[0];
  plan.run2 = override[1];
});

if (typeof marathonLegend !== 'undefined') {
  // marathonLegend is a const in schedule.js; display text is overridden by renderRunPlan below.
}

const renderRunPlanWithPaces = renderRunPlan;
renderRunPlan = function(){
  renderRunPlanWithPaces();
  const intro = document.querySelector('#runPlan .run-week .run-session strong');
  if (intro) intro.textContent = 'Easy = meestal 6:45–7:00/km in Z2 (140–154 bpm); recovery = 6:50–7:20/km; MP voorlopig 5:45–5:50/km. Hartslag en gevoel gaan voor tempo.';
};

renderTraining();
renderRunPlan();
renderDashboard();
