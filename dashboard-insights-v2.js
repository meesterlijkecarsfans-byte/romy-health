// Stable Romy Health v42 UI loader. This file is last in index.html.
(function(){
  function load(src,id,next){
    const existing=document.getElementById(id);
    if(existing){next?.();return;}
    const s=document.createElement('script');s.id=id;s.src=src;s.async=false;
    if(next)s.onload=next;document.body.appendChild(s);
  }
  load('./romy-ui-v38.js?v=42','romyUiV42',()=>{
    load('./romy-compat-v39.js?v=42','romyCompatV42',()=>{
      load('./dashboard-focus-v42.js?v=42','dashboardFocusV42');
    });
  });
})();