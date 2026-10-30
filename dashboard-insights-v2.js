// Stable Romy Health v39 UI loader. This file is last in index.html.
(function(){
  function load(src,id,next){
    const existing=document.getElementById(id);
    if(existing){next?.();return;}
    const s=document.createElement('script');s.id=id;s.src=src;s.async=false;
    if(next)s.onload=next;document.body.appendChild(s);
  }
  load('./romy-ui-v38.js?v=39','romyUiV39',()=>{
    load('./romy-compat-v39.js?v=39','romyCompatV39');
  });
})();