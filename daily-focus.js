// Daily Covey-inspired focus for the Romy Health hero.
(function(){
  const DAILY_FOCUS={
    1:{title:'Wees proactief',copy:'Kies wat vandaag binnen jouw invloed ligt: training, voeding en herstel. Eén goede keuze is genoeg om te beginnen.'},
    2:{title:'Begin met het einde voor ogen',copy:'Train vandaag voor het lichaam dat straks sterk, fit en belastbaar moet zijn — niet alleen voor een afgevinkt vakje.'},
    3:{title:'Belangrijke zaken eerst',copy:'Slaap, eten en de belangrijkste training gaan vóór extra volume. Meer is niet altijd beter.'},
    4:{title:'Denk win-win',copy:'Prestatie en herstel zijn geen tegenpolen. De beste trainingsdag helpt je vandaag én morgen.'},
    5:{title:'Eerst begrijpen, dan begrepen worden',copy:'Lees eerst je lichaam: slaap, energie en gevoel. Bepaal daarna wat het schema vandaag nodig heeft.'},
    6:{title:'Synergie',copy:'Slaap, voeding, kracht en conditie versterken elkaar. Je hoeft niet één onderdeel perfect te doen.'},
    0:{title:'Houd de zaag scherp',copy:'Herstel is onderdeel van trainen. Laad op zodat je volgende week weer kwaliteit kunt leveren.'}
  };

  function renderDailyFocus(){
    const hero=document.querySelector('#view-today .hero-card');
    if(!hero) return;
    const focus=DAILY_FOCUS[new Date().getDay()] || DAILY_FOCUS[1];
    const eyebrow=hero.querySelector('.eyebrow.light');
    const title=document.getElementById('heroTitle');
    const copy=document.getElementById('heroCopy');
    if(eyebrow) eyebrow.textContent='Focus van vandaag';
    if(title) title.textContent=focus.title;
    if(copy) copy.textContent=focus.copy;
  }

  if(typeof renderDashboard==='function'){
    const baseRenderDashboard=renderDashboard;
    renderDashboard=function(){ baseRenderDashboard(); renderDailyFocus(); };
  }

  renderDailyFocus();
})();