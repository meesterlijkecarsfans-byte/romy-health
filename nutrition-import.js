// Fast nutrition import for Romy Health.
// Preferred code: RH|YYYY-MM-DD|kcal|satFat|salt|protein|sugar|fiber|carbs
// Legacy 7-value codes without carbs remain supported.
// Deep link: #food=YYYY-MM-DD,kcal,satFat,salt,protein,sugar,fiber,carbs

function nutritionImportValues(parts){
  if(!Array.isArray(parts) || parts.length < 7) return null;
  const [date, calories, satFat, salt, protein, sugar, fiber, carbs] = parts;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return null;
  const num = value => {
    if(value === undefined || value === null || String(value).trim()==='') return null;
    const normalized = String(value).trim().replace(',','.');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  };
  return {
    date:String(date),
    calories:num(calories),
    satFat:num(satFat),
    salt:num(salt),
    protein:num(protein),
    sugar:num(sugar),
    fiber:num(fiber),
    carbs:num(carbs)
  };
}

function parseNutritionCode(text){
  const raw=String(text||'').trim();
  if(!raw) return null;
  if(raw.toUpperCase().startsWith('RH|')) return nutritionImportValues(raw.split('|').slice(1));
  if(raw.toLowerCase().startsWith('food=')) return nutritionImportValues(raw.slice(5).split(','));
  return null;
}

function fillNutritionForm(values){
  if(!values) return false;
  navigate('nutrition');
  openNutritionModal(values.date);
  const form=document.getElementById('nutritionForm');
  if(!form) return false;
  form.elements.date.value=values.date;
  form.elements.calories.value=values.calories ?? '';
  form.elements.satFat.value=values.satFat ?? '';
  form.elements.salt.value=values.salt ?? '';
  form.elements.protein.value=values.protein ?? '';
  form.elements.sugar.value=values.sugar ?? '';
  form.elements.fiber.value=values.fiber ?? '';
  if(form.elements.carbs) form.elements.carbs.value=values.carbs ?? '';
  let notice=document.getElementById('nutritionImportNotice');
  if(!notice){
    form.insertAdjacentHTML('afterbegin','<div id="nutritionImportNotice" style="padding:10px 12px;margin-bottom:12px;border-radius:12px;background:var(--pink-soft);color:var(--text);font-size:13px;line-height:1.4;"></div>');
    notice=document.getElementById('nutritionImportNotice');
  }
  notice.textContent=values.carbs==null
    ? 'Oude Romy Health-code herkend. Koolhydraten ontbreken nog; de andere waarden zijn ingevuld.'
    : 'Geïmporteerd uit je Romy Health-code. Controleer de waarden en tik daarna op Opslaan.';
  return true;
}

function ensureNutritionPasteImport(){
  const form=document.getElementById('nutritionForm');
  if(!form || document.getElementById('nutritionQuickImport')) return;
  form.insertAdjacentHTML('beforebegin', `
    <div id="nutritionQuickImport" style="margin-bottom:16px;padding:14px;border:1px solid var(--line);border-radius:16px;background:var(--surface-soft);">
      <strong style="display:block;margin-bottom:4px;">✨ Snel importeren</strong>
      <small style="display:block;color:var(--muted);line-height:1.4;margin-bottom:10px;">Plak een Romy Health-code die je van ChatGPT krijgt. Nieuwe codes bevatten ook koolhydraten.</small>
      <div style="display:flex;gap:8px;">
        <input id="nutritionImportInput" type="text" placeholder="RH|2026-10-28|2900|40|7.5|145|55|48|300" style="min-width:0;flex:1;padding:11px 12px;border:1px solid var(--line);border-radius:12px;background:white;" />
        <button id="nutritionImportButton" type="button" style="border:0;border-radius:12px;padding:10px 13px;background:var(--pink);color:white;font-weight:750;">Vullen</button>
      </div>
      <small id="nutritionImportError" style="display:none;margin-top:8px;color:#c14f5a;"></small>
    </div>`);
  document.getElementById('nutritionImportButton').addEventListener('click',()=>{
    const input=document.getElementById('nutritionImportInput');
    const error=document.getElementById('nutritionImportError');
    const parsed=parseNutritionCode(input.value);
    if(!parsed){
      error.textContent='Deze code herken ik niet. Gebruik de volledige RH-code uit de chat.';
      error.style.display='block';
      return;
    }
    error.style.display='none';
    fillNutritionForm(parsed);
  });
}

function importFromHash(){
  const hash=decodeURIComponent(location.hash||'');
  if(!hash.startsWith('#food=')) return;
  const parsed=parseNutritionCode(hash.slice(1));
  if(parsed){
    fillNutritionForm(parsed);
    history.replaceState(null,'',location.pathname+location.search);
  }
}

ensureNutritionPasteImport();
setTimeout(importFromHash,150);
window.addEventListener('hashchange',importFromHash);

// Load the nutrition target layer after the basic nutrition UI is ready.
if(!document.querySelector('script[data-romy-nutrition-goals]')){
  const goalsScript=document.createElement('script');
  goalsScript.src='./nutrition-goals.js?v=3';
  goalsScript.async=false;
  goalsScript.dataset.romyNutritionGoals='true';
  document.head.appendChild(goalsScript);
}

// Recovery is attached here because nutrition-import.js is always loaded by the app.
if(!document.getElementById('nutritionRecoveryDirectV41')){
  const recoveryScript=document.createElement('script');
  recoveryScript.id='nutritionRecoveryDirectV41';
  recoveryScript.src='./nutrition-recovery-v40.js?v=43';
  recoveryScript.async=false;
  document.body.appendChild(recoveryScript);
}

// v43: load the focused Today/Insights layer after all normal app scripts have started.
function loadDashboardFocusV43(){
  if(document.getElementById('dashboardFocusDirectV43')) return;
  const focusScript=document.createElement('script');
  focusScript.id='dashboardFocusDirectV43';
  focusScript.src='./dashboard-focus-v42.js?v=43';
  focusScript.async=false;
  document.body.appendChild(focusScript);
}
if(document.readyState==='complete') setTimeout(loadDashboardFocusV43,300);
else window.addEventListener('load',()=>setTimeout(loadDashboardFocusV43,300),{once:true});
