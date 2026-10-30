// Romy Health v39 compatibility bridge.
// Routes legacy render calls to the unified v38/v39 presentation layer.
(function(){
  function refresh(){try{window.romyV38Refresh?.();}catch(e){console.error('Romy refresh',e);}}
  try{renderDashboard=function(){refresh();};}catch{}
  try{renderTraining=function(){refresh();};}catch{}
  try{renderRunPlan=function(){refresh();};}catch{}
  try{renderProgress=function(){refresh();};}catch{}
  try{renderChart=function(){};}catch{}

  // Re-render after state saves so old modules cannot leave stale/blank screens behind.
  try{
    const baseSave=saveState;
    if(typeof baseSave==='function'&&!baseSave._romyV39Wrapped){
      const wrapped=function(){const out=baseSave.apply(this,arguments);setTimeout(refresh,0);return out;};
      wrapped._romyV39Wrapped=true;
      saveState=wrapped;
    }
  }catch{}

  // Navigation itself stays managed by app.js; refresh after a tab switch.
  document.querySelectorAll('.bottom-nav .nav-item').forEach(btn=>{
    btn.addEventListener('click',()=>setTimeout(refresh,0));
  });
  window.addEventListener('pageshow',()=>setTimeout(refresh,0));
  setTimeout(refresh,0);
})();