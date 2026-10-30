// Romy Health: turn the minimal Schema screen into a flexible week checklist.
// Sessions remain checkable, but are no longer visually tied to a fixed weekday.
(function(){
  let applying=false;

  function installStyle(){
    if(document.getElementById('romySchemaListStyle')) return;
    const style=document.createElement('style');
    style.id='romySchemaListStyle';
    style.textContent=`
      #view-training .rh-schema-list{display:grid;gap:9px}
      #view-training .rh-schema-list .rh-toggle{
        display:flex;align-items:center;gap:12px;width:100%;
        border:1px solid var(--rh-line);background:#fff;border-radius:18px;
        padding:13px 14px;text-align:left;color:inherit;
        box-shadow:0 5px 18px rgba(47,31,41,.025)
      }
      #view-training .rh-schema-list .rh-toggle.done{
        background:#fff8fb;border-color:#f5d3e2
      }
      #view-training .rh-schema-list .rh-toggle-icon{
        width:42px;height:42px;border-radius:14px
      }
      #view-training .rh-schema-list .rh-toggle-copy strong{font-size:15px}
      #view-training .rh-schema-list .rh-toggle-copy small{
        font-size:12px;white-space:normal;overflow:visible;text-overflow:clip;
        line-height:1.35
      }
      #view-training .rh-schema-note{
        margin:-2px 2px 10px;color:var(--rh-muted);font-size:12px;line-height:1.4
      }
    `;
    document.head.appendChild(style);
  }

  function simplifySchema(){
    if(applying) return;
    const root=document.querySelector('#view-training .rh-clean-root');
    const oldList=root?.querySelector('.rh-day-list');
    if(!root || !oldList || root.querySelector('.rh-schema-list')) return;

    applying=true;
    installStyle();

    const buttons=[...oldList.querySelectorAll('.rh-toggle')];
    const list=document.createElement('div');
    list.className='rh-schema-list';
    buttons.forEach(button=>list.appendChild(button));

    const note=document.createElement('p');
    note.className='rh-schema-note';
    note.textContent='Je weeklijst is bewust niet aan vaste dagen gekoppeld. Vink af wat je deze week hebt gedaan.';

    oldList.replaceWith(list);
    list.before(note);
    applying=false;
  }

  const view=document.getElementById('view-training');
  if(view){
    const observer=new MutationObserver(()=>{
      if(applying) return;
      requestAnimationFrame(simplifySchema);
    });
    observer.observe(view,{childList:true,subtree:true});
  }

  const previousRefresh=window.romyMinimalRefresh;
  if(typeof previousRefresh==='function'){
    window.romyMinimalRefresh=function(){
      const result=previousRefresh.apply(this,arguments);
      setTimeout(simplifySchema,0);
      return result;
    };
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(simplifySchema,400));
  else setTimeout(simplifySchema,100);
  window.addEventListener('load',()=>{setTimeout(simplifySchema,500);setTimeout(simplifySchema,1400);});
})();