// Reorganise Romy Health analytics into one clear Insights tab.
(function(){
  const TAB_KEY='romy-health-insights-tab';
  const VALID_TABS=['overview','recovery','load','trends'];
  let organising=false;
  let scheduled=null;

  function injectStyles(){
    if(document.getElementById('insightsReorgStyles')) return;
    const style=document.createElement('style');
    style.id='insightsReorgStyles';
    style.textContent=`
      .insights-tabs{display:flex;gap:7px;overflow-x:auto;padding:2px 0 12px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
      .insights-tabs::-webkit-scrollbar{display:none}
      .insights-tab{flex:0 0 auto;border:1px solid var(--line);background:var(--surface);color:var(--muted);border-radius:999px;padding:9px 12px;font-size:11px;font-weight:760}
      .insights-tab.active{background:var(--text);border-color:var(--text);color:white}
      .insights-panels{display:block}
      .insights-panel{display:grid;gap:12px}
      .insights-panel[hidden]{display:none!important}
      .insights-panel>*{margin-top:0!important;margin-bottom:0!important}
      .settings-data-quality{margin-top:6px;padding-top:12px;border-top:1px solid var(--line)}
      .settings-data-quality .smart-card{margin:0!important}
      #tredictTodayCard.tredict-today-compact{padding:14px 16px!important;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center}
      #tredictTodayCard.tredict-today-compact .tredict-compact-copy{min-width:0}
      #tredictTodayCard.tredict-today-compact h3{font-size:16px;margin:2px 0 0}
      #tredictTodayCard.tredict-today-compact p{margin:4px 0 0}
      .insights-link-button{border:1px solid var(--line);background:var(--surface-soft);color:var(--text);border-radius:12px;padding:9px 10px;font-size:10px;font-weight:780;white-space:nowrap}
      @media(max-width:520px){#tredictTodayCard.tredict-today-compact{grid-template-columns:1fr}.insights-link-button{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function renameProgress(){
    const navLabel=document.querySelector('.bottom-nav .nav-item[data-target="progress"] small');
    if(navLabel) navLabel.textContent='Inzichten';
    const view=document.getElementById('view-progress');
    const heading=view?.querySelector('.page-heading');
    if(!heading) return;
    const eyebrow=heading.querySelector('.eyebrow');
    const title=heading.querySelector('h2');
    const copy=[...heading.querySelectorAll('p')].find(p=>!p.classList.contains('eyebrow'));
    if(eyebrow) eyebrow.textContent='Analyse';
    if(title) title.textContent='Inzichten';
    if(copy) copy.textContent='Je weekcoach, herstel, trainingsbelasting en trends op één plek.';
  }

  function ensureInsightsShell(){
    const view=document.getElementById('view-progress');
    const heading=view?.querySelector('.page-heading');
    if(!view||!heading) return null;

    let tabs=document.getElementById('insightsSubnav');
    if(!tabs){
      tabs=document.createElement('div');
      tabs.id='insightsSubnav';
      tabs.className='insights-tabs';
      tabs.setAttribute('role','tablist');
      tabs.innerHTML=`
        <button class="insights-tab" type="button" data-insights-tab="overview">Overzicht</button>
        <button class="insights-tab" type="button" data-insights-tab="recovery">Herstel</button>
        <button class="insights-tab" type="button" data-insights-tab="load">Belasting</button>
        <button class="insights-tab" type="button" data-insights-tab="trends">Trends</button>`;
      heading.insertAdjacentElement('afterend',tabs);
      tabs.querySelectorAll('[data-insights-tab]').forEach(btn=>btn.addEventListener('click',()=>setActiveTab(btn.dataset.insightsTab,true)));
    }

    let panels=document.getElementById('insightsPanels');
    if(!panels){
      panels=document.createElement('div');
      panels.id='insightsPanels';
      panels.className='insights-panels';
      panels.innerHTML=`
        <section class="insights-panel" data-insights-panel="overview"></section>
        <section class="insights-panel" data-insights-panel="recovery" hidden></section>
        <section class="insights-panel" data-insights-panel="load" hidden></section>
        <section class="insights-panel" data-insights-panel="trends" hidden></section>`;
      tabs.insertAdjacentElement('afterend',panels);
    }
    return {view,tabs,panels};
  }

  function moveTo(id,panel){
    const el=document.getElementById(id);
    if(el&&panel&&el.parentElement!==panel) panel.appendChild(el);
    return el;
  }

  function organiseTrendNodes(panel){
    if(!panel) return;
    const metricTabs=document.getElementById('metricTabs');
    const chart=document.getElementById('progressChart')?.closest('.chart-card');
    const stats=document.getElementById('progressStats');
    const milestones=document.getElementById('milestones');
    const milestoneHeading=milestones?.previousElementSibling?.classList?.contains('section-heading')?milestones.previousElementSibling:null;
    [metricTabs,chart,stats,milestoneHeading,milestones].forEach(el=>{if(el&&el.parentElement!==panel) panel.appendChild(el);});
  }

  function moveDataQualityToSettings(){
    const data=document.getElementById('dataQualitySection');
    const list=document.querySelector('#settingsModal .settings-list');
    if(!data||!list) return;
    let wrap=document.getElementById('settingsDataQuality');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.id='settingsDataQuality';
      wrap.className='settings-data-quality';
      list.appendChild(wrap);
    }
    if(data.parentElement!==wrap) wrap.appendChild(data);
    data.style.marginBottom='0';
  }

  function setActiveTab(name,refresh=false){
    if(!VALID_TABS.includes(name)) name='overview';
    try{localStorage.setItem(TAB_KEY,name);}catch{}
    document.querySelectorAll('[data-insights-tab]').forEach(btn=>{
      const active=btn.dataset.insightsTab===name;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-selected',active?'true':'false');
    });
    document.querySelectorAll('[data-insights-panel]').forEach(panel=>{panel.hidden=panel.dataset.insightsPanel!==name;});
    if(refresh&&name==='trends') setTimeout(()=>{try{renderChart();}catch{}},50);
  }

  function compactTodayTredict(){
    const card=document.getElementById('tredictTodayCard');
    if(!card) return;
    const minis=[...card.querySelectorAll('.tredict-mini')];
    if(!minis.length) return;
    const values={};
    minis.forEach(mini=>{
      const key=mini.querySelector('small')?.textContent?.trim().toUpperCase()||'';
      values[key]={value:mini.querySelector('strong')?.textContent?.trim()||'—',detail:mini.querySelector('span')?.textContent?.trim()||''};
    });
    const effort=Object.entries(values).find(([key])=>key.includes('EFFORT'))?.[1];
    const fatigue=Object.entries(values).find(([key])=>key==='FATIGUE')?.[1];
    const deltaMatch=effort?.detail?.match(/([+-]?\d+(?:[,.]\d+)?)%/);
    const delta=deltaMatch?Number(deltaMatch[1].replace(',','.')):null;
    let title='Tredict-status beschikbaar';
    if(Number.isFinite(delta)){
      if(delta>=20) title='Trainingsbelasting duidelijk hoger';
      else if(delta>=5) title='Trainingsbelasting wat hoger';
      else if(delta<=-20) title='Trainingsbelasting duidelijk lager';
      else if(delta<=-5) title='Trainingsbelasting wat lager';
      else title='Trainingsbelasting redelijk stabiel';
    }
    const parts=[];
    if(effort?.value&&effort.value!=='—') parts.push(`Effort ${effort.value}${effort.detail?` · ${effort.detail}`:''}`);
    if(fatigue?.value&&fatigue.value!=='—') parts.push(`fatigue ${fatigue.value}`);
    card.classList.add('tredict-today-compact');
    card.innerHTML=`<div class="tredict-compact-copy"><p class="eyebrow">Trainingstatus</p><h3>${title}</h3><p>${parts.join(' · ')||'Bekijk je Tredict-belasting en trend bij Inzichten.'}</p></div><button type="button" class="insights-link-button" data-open-insights="load">Bekijk belasting</button>`;
    card.querySelector('[data-open-insights]')?.addEventListener('click',()=>{
      document.querySelector('.bottom-nav .nav-item[data-target="progress"]')?.click();
      setTimeout(()=>setActiveTab('load',true),30);
    });
  }

  function organiseInsights(){
    if(organising) return;
    organising=true;
    try{
      injectStyles();
      renameProgress();
      const shell=ensureInsightsShell();
      if(shell){
        const overview=shell.panels.querySelector('[data-insights-panel="overview"]');
        const recovery=shell.panels.querySelector('[data-insights-panel="recovery"]');
        const load=shell.panels.querySelector('[data-insights-panel="load"]');
        const trends=shell.panels.querySelector('[data-insights-panel="trends"]');

        moveTo('weekSummarySection',overview);
        moveTo('weeklyCoachCard',overview);
        moveTo('energyBalanceSection',overview);

        moveTo('recoveryTrendSection',recovery);

        moveTo('tredictProgressCard',load);
        moveTo('trainingLoadSection',load);

        organiseTrendNodes(trends);
      }
      moveDataQualityToSettings();
      compactTodayTredict();
      let saved='overview';
      try{saved=localStorage.getItem(TAB_KEY)||'overview';}catch{}
      setActiveTab(saved,false);
    } finally {
      organising=false;
    }
  }

  function scheduleOrganise(){
    if(organising) return;
    clearTimeout(scheduled);
    scheduled=setTimeout(organiseInsights,30);
  }

  function observeDynamicContent(){
    ['view-progress','view-today','settingsModal'].forEach(id=>{
      const root=document.getElementById(id);
      if(!root||root.dataset.insightsObserved) return;
      root.dataset.insightsObserved='1';
      new MutationObserver(()=>scheduleOrganise()).observe(root,{childList:true,subtree:true});
    });
  }

  if(typeof renderProgress==='function'&&!renderProgress._insightsWrapped){
    const base=renderProgress;
    const wrapped=function(){const r=base.apply(this,arguments);setTimeout(organiseInsights,0);return r;};
    wrapped._insightsWrapped=true;renderProgress=wrapped;
  }
  if(typeof renderDashboard==='function'&&!renderDashboard._insightsWrapped){
    const base=renderDashboard;
    const wrapped=function(){const r=base.apply(this,arguments);setTimeout(organiseInsights,0);return r;};
    wrapped._insightsWrapped=true;renderDashboard=wrapped;
  }
  if(typeof window.renderSmartCoach==='function'&&!window.renderSmartCoach._insightsWrapped){
    const base=window.renderSmartCoach;
    const wrapped=function(){const r=base.apply(this,arguments);setTimeout(organiseInsights,0);return r;};
    wrapped._insightsWrapped=true;window.renderSmartCoach=wrapped;
  }

  organiseInsights();
  observeDynamicContent();
  setTimeout(()=>{organiseInsights();observeDynamicContent();},500);
})();