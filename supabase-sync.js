const SUPABASE_URL = 'https://mnayfvbxnyalrvnhqakz.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_lAnpGso3qJurz1WA3csA8w_27pfGqRE';
const SYNC_LOCAL_TS = 'romy-health-sync-local-ts';
const SYNC_REMOTE_TS = 'romy-health-sync-remote-ts';
const TREDICT_SYNC_TS = 'romy-health-tredict-sync-ts';
const TREDICT_SYNC_MIN_INTERVAL = 10 * 60 * 1000;

const cloud = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

let currentSession = null;
let uploadTimer = null;
let syncBusy = false;
let tredictBusy = false;

function getStoredState(){
  try { return JSON.parse(localStorage.getItem('romy-health-local-v1')) || {}; }
  catch { return {}; }
}

function hasMeaningfulData(s){
  return Boolean(
    Object.keys(s?.nutrition || {}).length ||
    Object.keys(s?.trainingV2 || {}).length ||
    Object.keys(s?.training || {}).length ||
    (Array.isArray(s?.history) && s.history.length)
  );
}

function mergeState(remoteState, localState){
  const mergedTrainingV2 = {...(remoteState?.trainingV2 || {})};
  Object.entries(localState?.trainingV2 || {}).forEach(([week, values]) => {
    mergedTrainingV2[week] = {...(mergedTrainingV2[week] || {}), ...values};
  });
  return {
    ...(remoteState || {}),
    ...(localState || {}),
    nutrition: {...(remoteState?.nutrition || {}), ...(localState?.nutrition || {})},
    training: {...(remoteState?.training || {}), ...(localState?.training || {})},
    trainingV2: mergedTrainingV2,
    runningDone: {...(remoteState?.runningDone || {}), ...(localState?.runningDone || {})},
    history: (localState?.history?.length ? localState.history : (remoteState?.history || []))
  };
}

function rerenderAll(){
  try { renderDashboard(); } catch {}
  try { renderNutrition(); } catch {}
  try { renderTraining(); } catch {}
  try { renderRunPlan(); } catch {}
  try { renderProgress(); } catch {}
  try { window.romyV38Refresh?.(); } catch {}
}

function setSyncStatus(text, tone='neutral'){
  const el = document.getElementById('cloudSyncStatus');
  if(!el) return;
  const colors = {neutral:'#817a82', ok:'#3f8f68', warn:'#b87927', error:'#c14f5a'};
  el.textContent = text;
  el.style.color = colors[tone] || colors.neutral;
}

function setTredictStatus(text, tone='neutral'){
  const el = document.getElementById('tredictAutoSyncStatus');
  if(!el) return;
  const colors = {neutral:'#817a82', ok:'#3f8f68', warn:'#b87927', error:'#c14f5a'};
  el.textContent = text;
  el.style.color = colors[tone] || colors.neutral;
}

function tredictStatusTime(){
  const ts = Number(localStorage.getItem(TREDICT_SYNC_TS) || 0);
  return ts ? new Intl.DateTimeFormat('nl-NL',{hour:'2-digit',minute:'2-digit'}).format(new Date(ts)) : null;
}

function ensureTredictAutoPanel(){
  const list = document.querySelector('#settingsModal .settings-list');
  if(!list || document.getElementById('tredictAutoSyncPanel')) return;
  const panel = document.createElement('div');
  panel.id = 'tredictAutoSyncPanel';
  panel.style.cssText = 'padding:16px;border:1px solid var(--line);border-radius:18px;background:var(--surface-soft);margin-bottom:12px;';
  const last = tredictStatusTime();
  panel.innerHTML = `<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
    <div><strong style="display:block;font-size:15px;">↗ Tredict sync</strong><small id="tredictAutoSyncStatus" style="display:block;margin-top:4px;color:var(--muted);line-height:1.35;">${last?`Laatst bijgewerkt · ${last}`:'Nog niet automatisch bijgewerkt'}</small></div>
    <button id="tredictSyncNow" type="button" style="border:0;border-radius:12px;padding:9px 11px;background:var(--pink);color:white;font-weight:750;white-space:nowrap;">Vernieuwen</button>
  </div><small style="display:block;margin-top:8px;color:var(--muted);line-height:1.35;">Token blijft veilig in Supabase Secrets. Romy Health ontvangt alleen afgeleide Tredict-data.</small>`;
  list.insertBefore(panel, list.firstChild);
  document.getElementById('tredictSyncNow')?.addEventListener('click', ()=>syncTredict(true));
}

async function syncTredict(force=false){
  if(!currentSession?.user || tredictBusy) return;
  const last = Number(localStorage.getItem(TREDICT_SYNC_TS) || 0);
  if(!force && last && Date.now() - last < TREDICT_SYNC_MIN_INTERVAL) return;

  tredictBusy = true;
  ensureTredictAutoPanel();
  setTredictStatus('Tredict ophalen…');
  try {
    const { data, error } = await cloud.functions.invoke('tredict-sync', { body: { days: 14 } });
    if(error) throw error;
    if(!data?.ok || !data?.snapshot) throw new Error(data?.error || 'Geen Tredict-data ontvangen.');

    const old = state.tredictSnapshot || {};
    state.tredictSnapshot = {
      ...old,
      ...data.snapshot,
      runningIntensity: data.snapshot.allSportIntensity || old.runningIntensity,
      note: 'Automatisch via Tredict Personal API · alle sporten'
    };
    localStorage.setItem('romy-health-local-v1', JSON.stringify(state));
    localStorage.setItem(TREDICT_SYNC_TS, String(Date.now()));
    localStorage.setItem(SYNC_LOCAL_TS, String(Date.now()));
    scheduleUpload();
    rerenderAll();

    const warnings = Array.isArray(data.warnings) ? data.warnings.length : 0;
    setTredictStatus(`Bijgewerkt · ${new Intl.DateTimeFormat('nl-NL',{hour:'2-digit',minute:'2-digit'}).format(new Date())}${warnings?' · deels':''}`, warnings ? 'warn' : 'ok');
  } catch(err){
    console.error('Tredict sync', err);
    const message = err?.context?.body?.hint || err?.message || 'onbekende fout';
    setTredictStatus(`Tredict sync mislukt: ${message}`, 'error');
  } finally {
    tredictBusy = false;
  }
}
window.syncTredictNow = ()=>syncTredict(true);

async function uploadState(){
  if(!currentSession?.user || syncBusy) return;
  syncBusy = true;
  setSyncStatus('Synchroniseren…');
  try {
    const now = new Date().toISOString();
    const localState = getStoredState();
    const { error } = await cloud.from('user_state').upsert({
      user_id: currentSession.user.id,
      data: localState,
      updated_at: now
    }, { onConflict: 'user_id' });
    if(error) throw error;
    const ts = Date.parse(now);
    localStorage.setItem(SYNC_LOCAL_TS, String(ts));
    localStorage.setItem(SYNC_REMOTE_TS, String(ts));
    setSyncStatus(`Gesynchroniseerd · ${new Intl.DateTimeFormat('nl-NL',{hour:'2-digit',minute:'2-digit'}).format(new Date())}`, 'ok');
  } catch(err){
    console.error(err);
    setSyncStatus(`Sync mislukt: ${err.message || 'onbekende fout'}`, 'error');
  } finally {
    syncBusy = false;
  }
}

async function downloadRemote(remote){
  const incoming = remote?.data || {};
  state = {...clone(defaultState), ...incoming};
  localStorage.setItem('romy-health-local-v1', JSON.stringify(state));
  const ts = Date.parse(remote.updated_at || new Date().toISOString());
  localStorage.setItem(SYNC_LOCAL_TS, String(ts));
  localStorage.setItem(SYNC_REMOTE_TS, String(ts));
  rerenderAll();
  setSyncStatus('Cloudgegevens geladen', 'ok');
}

async function smartSync(){
  if(!currentSession?.user || syncBusy) return;
  syncBusy = true;
  setSyncStatus('Cloud controleren…');
  try {
    const { data: remote, error } = await cloud
      .from('user_state')
      .select('data, updated_at')
      .eq('user_id', currentSession.user.id)
      .maybeSingle();
    if(error) throw error;

    const localState = getStoredState();
    const localHasData = hasMeaningfulData(localState);

    if(!remote){
      syncBusy = false;
      if(localHasData) await uploadState();
      else setSyncStatus('Account gekoppeld · nog geen clouddata', 'ok');
      return;
    }

    if(!localHasData){
      await downloadRemote(remote);
      return;
    }

    const localTs = Number(localStorage.getItem(SYNC_LOCAL_TS) || 0);
    const remoteTs = Date.parse(remote.updated_at || 0) || 0;

    if(localTs === 0){
      const merged = mergeState(remote.data || {}, localState);
      state = {...clone(defaultState), ...merged};
      localStorage.setItem('romy-health-local-v1', JSON.stringify(state));
      syncBusy = false;
      await uploadState();
      rerenderAll();
      return;
    }

    if(remoteTs > localTs){
      await downloadRemote(remote);
    } else if(localTs > remoteTs){
      syncBusy = false;
      await uploadState();
    } else {
      setSyncStatus('Alles is bijgewerkt', 'ok');
    }
  } catch(err){
    console.error(err);
    setSyncStatus(`Cloud niet bereikbaar: ${err.message || 'onbekende fout'}`, 'warn');
  } finally {
    syncBusy = false;
  }
}

function scheduleUpload(){
  if(!currentSession?.user) return;
  clearTimeout(uploadTimer);
  uploadTimer = setTimeout(uploadState, 900);
}

const originalSaveStateForSync = saveState;
saveState = function(){
  originalSaveStateForSync();
  localStorage.setItem(SYNC_LOCAL_TS, String(Date.now()));
  scheduleUpload();
};

function cloudPanelHtml(){
  return `<div id="cloudSyncPanel" style="padding:16px;border:1px solid var(--line);border-radius:18px;background:var(--surface-soft);margin-bottom:12px;">
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
      <div><strong style="display:block;font-size:15px;">☁︎ Cloud sync</strong><small id="cloudSyncStatus" style="display:block;margin-top:4px;color:var(--muted);line-height:1.35;">Niet ingelogd</small></div>
      <span id="cloudUserBadge" style="font-size:11px;color:var(--muted);"></span>
    </div>
    <div id="cloudSignedOut" style="margin-top:14px;display:grid;gap:9px;">
      <input id="cloudEmail" type="email" autocomplete="email" placeholder="E-mailadres" style="width:100%;padding:12px 13px;border:1px solid var(--line);border-radius:13px;background:white;" />
      <input id="cloudPassword" type="password" autocomplete="current-password" placeholder="Wachtwoord (min. 6 tekens)" style="width:100%;padding:12px 13px;border:1px solid var(--line);border-radius:13px;background:white;" />
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <button id="cloudSignIn" type="button" style="border:0;border-radius:13px;padding:11px;background:var(--pink);color:white;font-weight:750;">Inloggen</button>
        <button id="cloudSignUp" type="button" style="border:1px solid var(--line);border-radius:13px;padding:11px;background:white;font-weight:750;">Account maken</button>
      </div>
    </div>
    <div id="cloudSignedIn" style="display:none;margin-top:14px;grid-template-columns:1fr 1fr;gap:8px;">
      <button id="cloudSyncNow" type="button" style="border:0;border-radius:13px;padding:11px;background:var(--pink);color:white;font-weight:750;">Nu synchroniseren</button>
      <button id="cloudSignOut" type="button" style="border:1px solid var(--line);border-radius:13px;padding:11px;background:white;font-weight:750;">Uitloggen</button>
    </div>
  </div>`;
}

function ensureCloudPanel(){
  ensureTredictAutoPanel();
  if(document.getElementById('cloudSyncPanel')) return;
  const list = document.querySelector('#settingsModal .settings-list');
  if(!list) return;
  list.insertAdjacentHTML('afterbegin', cloudPanelHtml());

  document.getElementById('cloudSignIn').addEventListener('click', async()=>{
    const email = document.getElementById('cloudEmail').value.trim();
    const password = document.getElementById('cloudPassword').value;
    if(!email || !password){ setSyncStatus('Vul e-mail en wachtwoord in.', 'warn'); return; }
    setSyncStatus('Inloggen…');
    const { error } = await cloud.auth.signInWithPassword({email,password});
    if(error) setSyncStatus(error.message, 'error');
  });

  document.getElementById('cloudSignUp').addEventListener('click', async()=>{
    const email = document.getElementById('cloudEmail').value.trim();
    const password = document.getElementById('cloudPassword').value;
    if(!email || password.length < 6){ setSyncStatus('Gebruik een geldig e-mailadres en minimaal 6 tekens.', 'warn'); return; }
    setSyncStatus('Account maken…');
    const { data, error } = await cloud.auth.signUp({email,password});
    if(error){ setSyncStatus(error.message, 'error'); return; }
    if(data.session) setSyncStatus('Account aangemaakt en ingelogd.', 'ok');
    else setSyncStatus('Account aangemaakt. Controleer je e-mail om te bevestigen.', 'ok');
  });

  document.getElementById('cloudSyncNow').addEventListener('click', async()=>{ await smartSync(); await syncTredict(true); });
  document.getElementById('cloudSignOut').addEventListener('click', ()=>cloud.auth.signOut());
}

function renderAuthState(){
  ensureCloudPanel();
  const signedOut = document.getElementById('cloudSignedOut');
  const signedIn = document.getElementById('cloudSignedIn');
  const badge = document.getElementById('cloudUserBadge');
  if(!signedOut || !signedIn) return;
  if(currentSession?.user){
    signedOut.style.display='none';
    signedIn.style.display='grid';
    badge.textContent=currentSession.user.email || 'ingelogd';
  } else {
    signedOut.style.display='grid';
    signedIn.style.display='none';
    badge.textContent='';
    setSyncStatus('Niet ingelogd');
    setTredictStatus('Log in bij Romy Health voor automatische Tredict-sync');
  }
}

async function initCloudSync(){
  ensureCloudPanel();
  const { data } = await cloud.auth.getSession();
  currentSession = data.session;
  renderAuthState();
  if(currentSession){
    await smartSync();
    await syncTredict(false);
  }

  cloud.auth.onAuthStateChange(async(_event, session)=>{
    currentSession = session;
    renderAuthState();
    if(session) setTimeout(async()=>{ await smartSync(); await syncTredict(false); }, 0);
  });

  window.addEventListener('focus', ()=>{ if(currentSession){ smartSync(); syncTredict(false); } });
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible' && currentSession){ smartSync(); syncTredict(false); } });

  const privacy = document.querySelector('#settingsModal .privacy-note');
  if(privacy) privacy.textContent = 'Zonder account blijven je gegevens lokaal. Als je inlogt, worden je appgegevens via HTTPS naar je eigen Supabase-account gesynchroniseerd. Tredict- en Garmin-tokens blijven uitsluitend als server-side Supabase Secrets opgeslagen.';
}

initCloudSync();
