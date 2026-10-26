// Compatibility/bootstrap loader for Romy Health add-on modules.
// Loads the newer modules in a stable order after the core app has initialized.
(function(){
  const modules=[
    ['./strength-config.js?v=3','strengthConfigScript'],
    ['./nav-icons.js?v=2','navIconsScript'],
    ['./nutrition-goals.js?v=3','nutritionGoalsScript'],
    ['./week-summary.js?v=3','weekSummaryScript'],
    ['./sleep-insights.js?v=1','sleepInsightsScript']
  ];
  function loadNext(i){
    if(i>=modules.length) return;
    const [src,id]=modules[i];
    if(document.getElementById(id)){ loadNext(i+1); return; }
    const script=document.createElement('script');
    script.id=id;
    script.src=src;
    script.async=false;
    script.onload=()=>loadNext(i+1);
    script.onerror=()=>loadNext(i+1);
    document.body.appendChild(script);
  }
  loadNext(0);
})();
