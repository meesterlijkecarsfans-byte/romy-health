// Compatibility/bootstrap loader for Romy Health add-on modules.
// Loads the newer modules in a stable order after the core app has initialized.
(function(){
  const modules=[
    ['./marathon-plan-2027.js?v=1','marathonPlan2027Script'],
    ['./strength-config.js?v=3','strengthConfigScript'],
    ['./nutrition-goals.js?v=3','nutritionGoalsScript'],
    ['./week-summary.js?v=3','weekSummaryScript'],
    ['./sleep-insights.js?v=2','sleepInsightsScript'],
    ['./performance-insights.js?v=2','performanceInsightsScript'],
    ['./daily-focus.js?v=1','dailyFocusScript'],
    ['./dashboard-overview.js?v=1','dashboardOverviewScript'],
    ['./nav-icons.js?v=4','navIconsScript'],
    ['./energy-sync-fix.js?v=1','energySyncFixScript'],
    ['./progress-charts.js?v=1','progressChartsScript'],
    ['./smart-coach.js?v=1','smartCoachScript'],
    ['./smart-coach-fixes.js?v=1','smartCoachFixesScript'],
    ['./smart-features-v2.js?v=1','smartFeaturesV2Script'],
    ['./tredict-intelligence.js?v=2','tredictIntelligenceScript'],
    ['./weekly-routine.js?v=2','weeklyRoutineScript'],
    ['./insights-reorg.js?v=1','insightsReorgScript'],
    ['./progress-motivation.js?v=1','progressMotivationScript'],
    ['./today-cockpit.js?v=1','todayCockpitScript'],
    ['./minimal-ui.js?v=1','minimalUiScript']
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