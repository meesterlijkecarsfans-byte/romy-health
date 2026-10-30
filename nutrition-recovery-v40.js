// Romy Health v40 — safe nutrition recovery + future backups.
// Recovers missing nutrition from localStorage/cloud without overwriting existing days.
(function(){
  'use strict';
  const MAIN_KEY='romy-health-local-v1';
  const BACKUP_KEY='romy-health-nutrition-backups-v1';
  const RECOVERY_MARK='romy-health-nutrition-recovery-v40';
  const FALLBACK={
    '2026-10-30':{calories:3200,protein:130,fiber:35,sugar:120,salt:10.5,satFat:50,carbs:350,_source:'chat-recovery'}
  };

  function clone(v){try{return JSON.parse(JSON.stringify(v));}catch{return v;}}
  function validNutritionMap(x){return x&&typeof x==='object'&&!Array.isArray(x);}
  function looksLikeDay(v){return v&&typeof v==='object'&&['calories','protein','fiber','sugar','salt','satFat','carbs'].some(k=>v[k]!=null);}
  function normalizeMap(map){
    const out={};
    if(!validNutritionMap(map))return out;
    Object.entries(map).forEach(([date,v])=>{if(/^\d{4}-\d{2}-\d{2}$/.test(date)&&looksLikeDay(v))out[date]=clone(v);});
    return out;
  }
  function readJSON(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
  function currentStored(){return readJSON(MAIN_KEY)||{};}

  function snapshotNutrition(label='auto'){
    try{
      const cur=normalizeMap((typeof state!=='undefined'?state?.nutrition:null)||currentStored().nutrition||{});
      if(!Object.keys(cur).length)return;
      const arr=Array.isArray(readJSON(BACKUP_KEY))?readJSON(BACKUP_KEY):[];
      const json=JSON.stringify(cur);
      if(arr[0]?.json===json)return;
      arr.unshift({at:new Date().toISOString(),label,json,nutrition:cur});
      localStorage.setItem(BACKUP_KEY,JSON.stringify(arr.slice(0,12)));
    }catch{}
  }

  function collectLocalCandidates(){
    const maps=[];
    const main=currentStored();
    if(main?.nutrition)maps.push({source:MAIN_KEY,map:normalizeMap(main.nutrition)});

    const backups=readJSON(BACKUP_KEY);
    if(Array.isArray(backups))backups.forEach((b,i)=>{if(b?.nutrition)maps.push({source:`backup-${i+1}`,map:normalizeMap(b.nutrition)});});

    // Search any older Romy Health JSON blobs without knowing their historic key names.
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key||key===MAIN_KEY||key===BACKUP_KEY)continue;
      const obj=readJSON(key);
      if(obj?.nutrition)maps.push({source:key,map:normalizeMap(obj.nutrition)});
      // Some old exports may directly be a date -> nutrition map.
      if(validNutritionMap(obj)&&Object.keys(obj).some(k=>/^\d{4}-\d{2}-\d{2}$/.test(k))){
        const direct=normalizeMap(obj);if(Object.keys(direct).length)maps.push({source:key,map:direct});
      }
    }
    return maps;
  }

  function mergeMissing(base, incoming){
    const out={...(base||{})};let added=0;
    Object.entries(incoming||{}).forEach(([date,v])=>{if(!out[date]){out[date]=clone(v);added++;}});
    return {map:out,added};
  }

  function writeNutrition(map, reason='recovery'){
    if(typeof state!=='undefined')state.nutrition={...(state.nutrition||{}),...map};
    const stored=currentStored();
    stored.nutrition={...(stored.nutrition||{}),...map};
    localStorage.setItem(MAIN_KEY,JSON.stringify(stored));
    snapshotNutrition(reason);
    try{if(typeof renderNutrition==='function')renderNutrition();}catch{}
    try{if(typeof renderDashboard==='function')renderDashboard();}catch{}
    try{if(typeof window.romyStableRefresh==='function')window.romyStableRefresh();}catch{}
  }

  async function recoverAll({includeFallback=true}={}){
    snapshotNutrition('voor-herstel');
    let merged=normalizeMap((typeof state!=='undefined'?state?.nutrition:null)||currentStored().nutrition||{});
    const sources=[];
    collectLocalCandidates().forEach(c=>{
      const r=mergeMissing(merged,c.map);merged=r.map;if(r.added)sources.push(`${c.source}: +${r.added}`);
    });

    // Recover from the signed-in user's cloud row when available. Existing local days always win.
    try{
      if(typeof cloud!=='undefined'&&typeof currentSession!=='undefined'&&currentSession?.user){
        const {data:remote,error}=await cloud.from('user_state').select('data, updated_at').eq('user_id',currentSession.user.id).maybeSingle();
        if(!error&&remote?.data?.nutrition){
          const r=mergeMissing(merged,normalizeMap(remote.data.nutrition));merged=r.map;if(r.added)sources.push(`cloud: +${r.added}`);
        }
      }
    }catch{}

    if(includeFallback&&!merged['2026-10-30']){
      merged['2026-10-30']=clone(FALLBACK['2026-10-30']);
      sources.push('30 okt uit chat: +1');
    }

    writeNutrition(merged,'na-herstel');
    try{localStorage.setItem(RECOVERY_MARK,new Date().toISOString());}catch{}
    return {days:Object.keys(merged).sort(),sources};
  }

  // Make cloud downloads non-destructive for local nutrition from now on.
  try{
    if(typeof downloadRemote==='function'&&!downloadRemote._romyNutritionSafe){
      const oldDownload=downloadRemote;
      const safe=async function(remote){
        const localBefore=normalizeMap(currentStored().nutrition||{});
        await oldDownload(remote);
        const after=normalizeMap((typeof state!=='undefined'?state?.nutrition:null)||currentStored().nutrition||{});
        const restored=mergeMissing(after,localBefore).map;
        writeNutrition(restored,'cloud-merge');
      };
      safe._romyNutritionSafe=true;
      downloadRemote=safe;
    }
  }catch{}

  // Keep rotating nutrition snapshots whenever the app saves state.
  try{
    if(typeof saveState==='function'&&!saveState._romyNutritionBackup){
      const oldSave=saveState;
      const wrapped=function(){snapshotNutrition('save');return oldSave.apply(this,arguments);};
      wrapped._romyNutritionBackup=true;
      saveState=wrapped;
    }
  }catch{}

  function addRecoveryButton(){
    const list=document.querySelector('#settingsModal .settings-list');
    if(!list||document.getElementById('restoreNutritionData'))return;
    const btn=document.createElement('button');
    btn.id='restoreNutritionData';
    btn.innerHTML='<span>↺</span><div><strong>Eetdata herstellen</strong><small>Zoek oude lokale backups en clouddata en voeg ontbrekende dagen terug</small></div>';
    btn.addEventListener('click',async()=>{
      btn.disabled=true;const old=btn.innerHTML;btn.innerHTML='<span>…</span><div><strong>Bezig met herstellen</strong><small>Lokale opslag en cloud worden gecontroleerd</small></div>';
      const result=await recoverAll({includeFallback:true});
      btn.innerHTML=`<span>✓</span><div><strong>${result.days.length} voedingsdag${result.days.length===1?'':'en'} beschikbaar</strong><small>${result.sources.length?result.sources.join(' · '):'Geen extra oude dagen gevonden; huidige data is behouden'}</small></div>`;
      btn.disabled=false;
      setTimeout(()=>{btn.innerHTML=old;},5000);
    });
    list.insertBefore(btn,list.firstChild);
  }

  window.romyRecoverNutrition=recoverAll;
  window.romyNutritionBackup=()=>snapshotNutrition('handmatig');

  function init(){
    addRecoveryButton();
    snapshotNutrition('v40-start');
    // User explicitly requested recovery: run once automatically, safely merging only missing dates.
    setTimeout(()=>recoverAll({includeFallback:true}),700);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  window.addEventListener('load',()=>setTimeout(addRecoveryButton,1000));
})();