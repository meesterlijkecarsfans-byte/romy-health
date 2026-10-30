// Romy Health stable add-on loader.
// Only loads non-competing helpers; the main UI is rendered by romy-ui-v38/v39.
(function(){
  const modules=[
    ['./strength-config.js?v=4','strengthConfigScript'],
    ['./nutrition-goals.js?v=4','nutritionGoalsScript'],
    ['./energy-sync-fix.js?v=2','energySyncFixScript']
  ];
  function loadNext(i){
    if(i>=modules.length)return;
    const [src,id]=modules[i];
    if(document.getElementById(id)){loadNext(i+1);return;}
    const s=document.createElement('script');s.id=id;s.src=src;s.async=false;
    s.onload=()=>loadNext(i+1);s.onerror=()=>loadNext(i+1);document.body.appendChild(s);
  }
  loadNext(0);
})();