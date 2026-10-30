// Final uniform bottom navigation icons for Romy Health.
(function(){
  const ICON_VERSION='6';
  const icons={
    today:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.8 12 3.5l9 7.3"/><path d="M5.5 9.8V20h13V9.8"/><path d="M9.5 20v-6h5v6"/></svg>',
    training:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6h10M10 12h10M10 18h10"/><path d="m3.5 6 1.5 1.5L7.8 4.7M3.5 12l1.5 1.5 2.8-2.8M3.5 18l1.5 1.5 2.8-2.8"/></svg>',
    running:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="14.5" cy="4.5" r="1.6"/><path d="m10.2 8 3-1.4 2.3 3 3 .8"/><path d="m12.6 8.6-2.1 4 3.4 2.4 1.7 4.5"/><path d="m10.5 12.5-3.1 2.4-2.7 4.2"/></svg>',
    strength:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8v8M5.2 9.5v5M16 8v8M18.8 9.5v5M8 12h8M3 10.8v2.4M21 10.8v2.4"/></svg>',
    nutrition:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7.2c-1.4-2-4.7-2-6.2.3-2.2 3.5 0 11.3 3.8 12.5 1.1.3 1.7-.5 2.4-.5s1.3.8 2.4.5c3.8-1.2 6-9 3.8-12.5-1.5-2.3-4.8-2.3-6.2-.3Z"/><path d="M12.1 6.2c.3-2 1.7-3.3 3.8-3.7"/></svg>',
    progress:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V12M10 20V8M16 20v-5M22 20V5"/><path d="m4 9 6-5 6 6 6-6"/></svg>'
  };
  const labels={today:'Vandaag',training:'Schema',running:'Hardlopen',strength:'Kracht',nutrition:'Voeding',progress:'Inzichten'};

  function applyUniformNav(){
    document.querySelectorAll('.bottom-nav .nav-item').forEach(btn=>{
      const key=btn.dataset.target;
      if(!icons[key]) return;
      const hasIcon=!!btn.querySelector(':scope > .uniform-nav-icon');
      const label=btn.querySelector(':scope > small')?.textContent;
      if(!hasIcon || label!==labels[key] || btn.dataset.iconVersion!==ICON_VERSION){
        btn.innerHTML=`<span class="uniform-nav-icon">${icons[key]}</span><small>${labels[key]}</small>`;
        btn.dataset.iconVersion=ICON_VERSION;
      }
    });
  }

  if(!document.getElementById('uniformNavStyles')){
    const style=document.createElement('style');
    style.id='uniformNavStyles';
    document.head.appendChild(style);
  }
  document.getElementById('uniformNavStyles').textContent=`
    .bottom-nav{grid-template-columns:repeat(6,1fr)!important;padding-left:4px!important;padding-right:4px!important}
    .nav-item{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:4px!important;min-width:0!important;padding:6px 1px!important;color:#989198!important}
    .uniform-nav-icon{width:34px!important;height:34px!important;border-radius:11px!important;display:grid!important;place-items:center!important;line-height:1!important;font-size:0!important;transition:background .18s ease,color .18s ease!important}
    .uniform-nav-icon svg{display:block!important;width:21px!important;height:21px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.9!important;stroke-linecap:round!important;stroke-linejoin:round!important;vector-effect:non-scaling-stroke}
    .nav-item.active{color:var(--rh-pink,var(--pink,#f25b9d))!important}
    .nav-item.active .uniform-nav-icon{background:var(--rh-soft,var(--pink-soft,#fff0f6))!important}
    .nav-item small{font-size:9px!important;line-height:1.1!important;font-weight:700!important;white-space:nowrap!important;color:inherit!important}
    @media(min-width:500px){.nav-item small{font-size:10px!important}}
  `;

  applyUniformNav();
  const nav=document.querySelector('.bottom-nav');
  if(nav && !nav.dataset.uniformObserverV6){
    nav.dataset.uniformObserverV6='1';
    const observer=new MutationObserver(()=>applyUniformNav());
    observer.observe(nav,{childList:true,subtree:true,characterData:true});
  }
  window.addEventListener('load',()=>setTimeout(applyUniformNav,0));
  window.addEventListener('pageshow',applyUniformNav);
  setTimeout(applyUniformNav,250);
  setTimeout(applyUniformNav,1200);
})();