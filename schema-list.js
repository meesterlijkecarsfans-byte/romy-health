// Romy Health: flexible, day-free weekly sport checklist with uniform naming/icons.
(function(){
  let applying=false;
  const DESIRED=[
    ['tweeslag','Beachvolleybal','volley'],
    ['donitas1','Donitas 1','volley'],
    ['donitas2','Donitas 2','volley'],
    ['kracht1','Gym 1','gym'],
    ['kracht2','Gym 2','gym'],
    ['tritanium','Tritanium Run','run'],
    ['run1','Run 2','run'],
    ['run2','Run 3','run']
  ];
  const ICONS={
    run:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="14.5" cy="4.5" r="1.6"/><path d="m10.2 8 3-1.4 2.3 3 3 .8"/><path d="m12.6 8.6-2.1 4 3.4 2.4 1.7 4.5"/><path d="m10.5 12.5-3.1 2.4-2.7 4.2"/></svg>',
    gym:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8v8M5.2 9.5v5M16 8v8M18.8 9.5v5M8 12h8M3 10.8v2.4M21 10.8v2.4"/></svg>',
    volley:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3c2.2 2.4 3.1 5 2.6 7.7M5.2 6.2c3.1-.3 5.8.7 7.8 3M3.3 13.7c2.7-1.7 5.5-2.2 8.3-1.3M8.6 20c-.1-3.1 1-5.7 3.2-7.8M17.8 18.4c-2.4-2.1-3.7-4.6-3.6-7.4M20.7 10.4c-3 .8-5.8.5-8.2-.9"/></svg>'
  };

  function installStyle(){
    if(document.getElementById('romySchemaListStyle')) return;
    const style=document.createElement('style');
    style.id='romySchemaListStyle';
    document.head.appendChild(style);
  }
  function refreshStyle(){
    installStyle();
    document.getElementById('romySchemaListStyle').textContent=`
      #view-training .rh-schema-list{display:grid;gap:9px}
      #view-training .rh-schema-list .rh-toggle{display:flex;align-items:center;gap:12px;width:100%;border:1px solid var(--rh-line);background:#fff;border-radius:18px;padding:13px 14px;text-align:left;color:inherit;box-shadow:0 5px 18px rgba(47,31,41,.025)}
      #view-training .rh-schema-list .rh-toggle.done{background:#fff8fb;border-color:#f5d3e2}
      #view-training .rh-schema-list .rh-toggle-icon{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:var(--rh-soft,#fff0f6);color:var(--rh-pink,#f25b9d);flex:0 0 auto}
      #view-training .rh-schema-list .rh-toggle-icon svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
      #view-training .rh-schema-list .rh-toggle-copy strong{font-size:15px}
      #view-training .rh-schema-list .rh-toggle-copy small{font-size:12px;white-space:normal;overflow:visible;text-overflow:clip;line-height:1.35}
      #view-training .rh-schema-note{margin:-2px 2px 10px;color:var(--rh-muted);font-size:12px;line-height:1.4}
    `;
  }

  function simplifySchema(){
    if(applying) return;
    const root=document.querySelector('#view-training .rh-clean-root');
    if(!root) return;
    applying=true;
    refreshStyle();

    let source=root.querySelector('.rh-day-list');
    let existing=root.querySelector('.rh-schema-list');
    const sourceButtons=[...(source||existing||root).querySelectorAll('.rh-toggle')];
    const byId=new Map(sourceButtons.map(b=>[b.dataset.rhToggle,b]));

    const list=document.createElement('div');
    list.className='rh-schema-list';
    DESIRED.forEach(([id,name,type])=>{
      const button=byId.get(id); if(!button) return;
      const strong=button.querySelector('.rh-toggle-copy strong'); if(strong) strong.textContent=name;
      const icon=button.querySelector('.rh-toggle-icon'); if(icon) icon.innerHTML=ICONS[type];
      list.appendChild(button);
    });

    if(source) source.replaceWith(list);
    else if(existing) existing.replaceWith(list);
    else root.appendChild(list);

    root.querySelectorAll('.rh-schema-note').forEach(n=>n.remove());
    const note=document.createElement('p');note.className='rh-schema-note';note.textContent='Vink af wat je deze week hebt gedaan. De trainingen zijn bewust niet aan vaste dagen gekoppeld.';
    list.before(note);
    applying=false;
  }

  const view=document.getElementById('view-training');
  if(view){
    const observer=new MutationObserver(()=>{if(!applying)requestAnimationFrame(simplifySchema);});
    observer.observe(view,{childList:true,subtree:true});
  }

  function loadFinalScripts(){
    if(!document.getElementById('runningFullPlanFinal')){
      const s=document.createElement('script');s.id='runningFullPlanFinal';s.src='./running-full-plan.js?v=1';s.async=false;document.body.appendChild(s);
    }
    if(!document.getElementById('navIconsFinalScript')){
      const s=document.createElement('script');s.id='navIconsFinalScript';s.src='./nav-icons.js?v=6';s.async=false;document.body.appendChild(s);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(simplifySchema,400));
  else setTimeout(simplifySchema,100);
  window.addEventListener('load',()=>{setTimeout(simplifySchema,500);setTimeout(simplifySchema,1400);setTimeout(loadFinalScripts,1550);});
})();