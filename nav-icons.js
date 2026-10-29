// Uniform bottom navigation icons for Romy Health.
(function(){
  const icons={
    today:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/></svg>',
    training:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1.4 1.4L7.5 4.8M3.5 12l1.4 1.4 2.6-2.6M3.5 18l1.4 1.4 2.6-2.6"/></svg>',
    running:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="14.5" cy="4.5" r="1.7"/><path d="m10 8 3-1.5 2.5 3 3 .8M12.5 8.5l-2 4 3.5 2.5 1.5 4.5M10.5 12.5 7 15l-2.5 4"/></svg>',
    strength:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8v8M4.5 9.5v5M17 8v8M19.5 9.5v5M7 12h10M2.5 11v2M21.5 11v2"/></svg>',
    nutrition:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.5 7c-1.6-2-4.8-1.7-6.2.4C4 11 6.2 19 10 20c1 .3 1.5-.4 2-.4s1 .7 2 .4c3.8-1 6-9 3.7-12.6-1.3-2.1-4.3-2.4-5.2-.4Z"/><path d="M12 6c.2-2 1.5-3.3 3.5-3.8M12 5.5c-1.2-1.5-2.5-2-4-1.8"/></svg>',
    progress:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V10M10 19V5M16 19v-7M22 19V3"/><path d="m4 8 6-5 6 6 6-6"/></svg>'
  };
  const labels={today:'Vandaag',training:'Schema',running:'Hardlopen',strength:'Kracht',nutrition:'Voeding',progress:'Inzichten'};

  function applyUniformNav(){
    document.querySelectorAll('.bottom-nav .nav-item').forEach(btn=>{
      const key=btn.dataset.target;
      if(!icons[key]) return;
      const icon=btn.querySelector('.uniform-nav-icon');
      const label=btn.querySelector('small');
      if(!icon || label?.textContent!==labels[key]) btn.innerHTML=`<span class="uniform-nav-icon">${icons[key]}</span><small>${labels[key]}</small>`;
    });
  }

  if(!document.getElementById('uniformNavStyles')){
    const style=document.createElement('style');
    style.id='uniformNavStyles';
    style.textContent=`
      .bottom-nav{grid-template-columns:repeat(6,1fr)!important;padding-left:4px!important;padding-right:4px!important}
      .nav-item{gap:5px!important;min-width:0;padding-inline:1px!important}
      .uniform-nav-icon{width:32px!important;height:32px!important;border-radius:11px;display:grid!important;place-items:center;transition:.18s ease}
      .uniform-nav-icon svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .nav-item.active .uniform-nav-icon{background:var(--pink-soft)}
      .nav-item small{font-size:9px!important;white-space:nowrap}
      @media(min-width:500px){.nav-item small{font-size:10px!important}}
    `;
    document.head.appendChild(style);
  }

  applyUniformNav();
  const nav=document.querySelector('.bottom-nav');
  if(nav && !nav.dataset.uniformObserver){
    nav.dataset.uniformObserver='1';
    const observer=new MutationObserver(()=>{
      if([...nav.querySelectorAll('.nav-item')].some(btn=>!btn.querySelector('.uniform-nav-icon'))) applyUniformNav();
    });
    observer.observe(nav,{childList:true,subtree:true});
  }
  window.addEventListener('pageshow',applyUniformNav);
})();