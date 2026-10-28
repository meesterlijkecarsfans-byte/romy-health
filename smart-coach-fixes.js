// Small compatibility fixes for legacy nutrition days in the smart coaching layer.
(function(){
  function fixLegacyNutrition(){
    try{
      const n=state.nutrition?.[selectedNutritionDate];
      const carbCard=document.querySelector('#nutrientGrid [data-smart-carbs] strong');
      if(carbCard && (n?.carbs===null || n?.carbs===undefined || n?.carbs==='')) carbCard.textContent='—';

      const todayKey=(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;})();
      const today=state.nutrition?.[todayKey];
      if(today && (today.protein===null || today.protein===undefined || today.protein==='')){
        const energyMini=[...document.querySelectorAll('#dailyPerformanceSummary .performance-mini')].find(x=>x.querySelector('small')?.textContent.includes('FUELING'));
        if(energyMini){
          const span=energyMini.querySelector('span');
          if(span){
            const carbs=Number(today.carbs);
            span.textContent=Number.isFinite(carbs)&&today.carbs!==null&&today.carbs!==''?`${carbs.toLocaleString('nl-NL',{maximumFractionDigits:0})} g koolhydraten`:'Voeding invullen geeft gerichter advies';
          }
        }
      }
    }catch{}
  }

  if(typeof renderNutrition==='function'){
    const base=renderNutrition;
    renderNutrition=function(){const r=base();setTimeout(fixLegacyNutrition,0);return r;};
  }
  if(typeof renderDashboard==='function'){
    const base=renderDashboard;
    renderDashboard=function(){const r=base();setTimeout(fixLegacyNutrition,0);return r;};
  }
  fixLegacyNutrition();
})();