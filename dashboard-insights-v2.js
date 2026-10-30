// Stable Romy Health v47 UI loader. Existing files only, so GitHub Pages/PWA caching stays reliable.
(function(){
  function load(src,id,next){
    const existing=document.getElementById(id);
    if(existing){next?.();return;}
    const s=document.createElement('script');s.id=id;s.src=src;s.async=false;
    if(next)s.onload=next;document.body.appendChild(s);
  }
  load('./romy-ui-v38.js?v=47','romyUiV47',()=>{
    load('./romy-compat-v39.js?v=47','romyCompatV47');
  });
})();