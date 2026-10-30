// Attendance + lecture-content layer for Romy Study.
(function(){
  if(typeof state==='undefined'||typeof renderAll!=='function') return;

  state.attendance ||= {};
  state.eventNotes ||= {};
  if(state.courses?.ba2 && !state.courses.ba2.examDate) state.courses.ba2.examDate='2027-01-13';

  const eventKey=e=>[e.course,e.date,e.start,e.type,e.group||''].join('|');
  const trackable=e=>['lecture','tutorial','practical'].includes(e.type);
  save=function(){ localStorage.setItem(KEY,JSON.stringify(state)); renderAll(); };

  const style=document.createElement('style');
  style.textContent=`
    .schedule-event{grid-template-columns:52px 1fr auto}.schedule-main{min-width:0}.schedule-actions{grid-column:2/-1;display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.mini-action{border:1px solid var(--line);background:#fff;border-radius:999px;padding:7px 10px;font-size:11px;font-weight:800;color:var(--muted)}.mini-action.done{background:#eaf7ee;border-color:#cfe8d6;color:#39844b}.mini-action.content{background:var(--pinksoft);border-color:#f5d9e6;color:#b64579}.topic-bank{display:grid;gap:10px}.topic-block{border:1px solid var(--line);border-radius:16px;padding:13px;background:#fff}.topic-block h3{font-size:14px;margin:0 0 8px}.topic-chips{display:flex;gap:6px;flex-wrap:wrap}.topic-chip{display:inline-flex;padding:6px 8px;border-radius:999px;background:var(--pinksoft);color:#a94475;font-size:10px;font-weight:800}.lecture-note{width:100%;min-height:110px;border:1px solid var(--line);border-radius:14px;padding:12px;resize:vertical;font:inherit}.attendance-summary{font-size:12px;color:var(--muted);margin:5px 0 0}.event-meta{color:var(--muted);font-size:12px;margin-bottom:14px}.info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}.info-mini{background:#faf7f9;border:1px solid var(--line);border-radius:13px;padding:10px}.info-mini small{display:block;color:var(--muted);font-size:10px;margin-bottom:3px}.info-mini strong{font-size:12px;line-height:1.35}.warning-box{background:#fff7e8;border:1px solid #f1d7a6;border-radius:14px;padding:11px;margin-top:10px;font-size:12px;line-height:1.45;color:#75511d}.structure-list{margin:8px 0 0;padding-left:18px;color:var(--muted);font-size:12px;line-height:1.55}@media(max-width:480px){.info-grid{grid-template-columns:1fr}}`;
  document.head.appendChild(style);

  const modal=document.createElement('section');
  modal.className='modal'; modal.id='eventModal';
  modal.innerHTML=`<div class="sheet"><div class="sheettop"><div><p class="eyebrow" id="eventEyebrow">College</p><h2 id="eventTitle">Onderwijsactiviteit</h2></div><button class="close" id="eventClose">×</button></div><p class="event-meta" id="eventMeta"></p><div id="eventSummary"></div><div class="section"><p class="eyebrow">Jouw inhoud</p><h3>Notities bij dit college</h3><textarea class="lecture-note" id="eventNote" placeholder="Bijv. belangrijkste begrippen, wat nog onduidelijk is, welke opgaven erbij horen..."></textarea><button class="primary" id="eventSave" style="width:100%;margin-top:10px">Notities opslaan</button></div></div>`;
  document.body.appendChild(modal);
  document.getElementById('eventClose').onclick=()=>modal.classList.remove('open');
  modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('open')});

  let currentEvent=null;
  function overviewHtml(bank){
    if(!bank.overview && !bank.currentWeek && !bank.structure) return '';
    const o=bank.overview||{};
    return `<div class="card"><p class="eyebrow">Vakoverzicht</p>${o.purpose?`<h3>${esc(o.purpose)}</h3>`:''}${Object.keys(o).length?`<div class="info-grid">${o.language?`<div class="info-mini"><small>Taal</small><strong>${esc(o.language)}</strong></div>`:''}${o.coding?`<div class="info-mini"><small>Programmeren</small><strong>${esc(o.coding)}</strong></div>`:''}${o.math?`<div class="info-mini"><small>Wiskunde</small><strong>${esc(o.math)}</strong></div>`:''}${o.teaching?`<div class="info-mini"><small>Onderwijs</small><strong>${esc(o.teaching)}</strong></div>`:''}</div>`:''}${o.assessment?`<div class="topic-block" style="margin-top:10px"><h3>Beoordeling</h3><p class="empty">${esc(o.assessment)}</p></div>`:''}${o.aiRule?`<div class="warning-box"><b>AI-regel tutorialopdrachten</b><br>${esc(o.aiRule)}</div>`:''}${bank.structure?`<div class="topic-block" style="margin-top:10px"><h3>Opbouw cursus</h3><ol class="structure-list">${bank.structure.map(x=>`<li>${esc(x.replace(/^\d+\.\s*/,''))}</li>`).join('')}</ol></div>`:''}${bank.currentWeek?`<div class="topic-block" style="margin-top:10px"><h3>${esc(bank.currentWeek.title)}</h3><p class="empty"><b>Leerdoelen:</b> ${bank.currentWeek.objectives.map(esc).join(' · ')}</p><div class="topic-chips" style="margin-top:8px">${bank.currentWeek.topics.map(t=>`<span class="topic-chip">${esc(t)}</span>`).join('')}</div></div>`:''}</div>`;
  }
  function summaryHtml(courseId){
    const bank=window.ROMY_STUDY_CONTENT?.[courseId];
    if(!bank) return '<p class="empty">Nog geen samenvatting gekoppeld. Je eigen notities kun je hier al wel bewaren.</p>';
    return `${overviewHtml(bank)}<div class="card"><p class="eyebrow">Samenvattingsbank</p><h3>${esc(bank.sourceLabel)}</h3>${bank.note?`<p class="empty">${esc(bank.note)}</p>`:''}<div class="topic-bank">${bank.blocks.map(b=>`<div class="topic-block"><h3>${esc(b.title)}</h3><div class="topic-chips">${b.topics.map(t=>`<span class="topic-chip">${esc(t)}</span>`).join('')}</div></div>`).join('')}</div></div>`;
  }
  function openEvent(e){
    currentEvent=e; const c=course(e.course); const k=eventKey(e);
    document.getElementById('eventEyebrow').textContent=typeLabel(e.type);
    document.getElementById('eventTitle').textContent=`${c?.name||e.course} · ${e.title}`;
    document.getElementById('eventMeta').textContent=`${new Date(`${e.date}T12:00:00`).toLocaleDateString('nl-NL',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · ${e.start}–${e.end}${e.location?` · ${e.location}`:''}`;
    document.getElementById('eventSummary').innerHTML=summaryHtml(e.course);
    document.getElementById('eventNote').value=state.eventNotes[k]||'';
    modal.classList.add('open');
  }
  document.getElementById('eventSave').onclick=()=>{
    if(!currentEvent)return; state.eventNotes[eventKey(currentEvent)]=document.getElementById('eventNote').value.trim(); modal.classList.remove('open'); save();
  };

  renderSchedule=function(){
    const el=$('#upcomingSchedule'); if(!el)return;
    const items=upcomingTimetable(); window.RS_EVENT_MAP={};
    if(!items.length){el.innerHTML='<p class="empty">Nog geen komende roosteritems gevonden.</p>';return}
    el.innerHTML=items.map((e,i)=>{
      const d=new Date(`${e.date}T12:00:00`),c=course(e.course),k=eventKey(e),done=!!state.attendance[k]; window.RS_EVENT_MAP[i]=e;
      return `<article class="card schedule-event"><div class="schedule-date"><small>${d.toLocaleDateString('nl-NL',{month:'short'}).replace('.','')}</small><strong>${d.getDate()}</strong></div><div class="schedule-main"><h3>${esc(c?.name||e.course)} · ${esc(e.title)}</h3><p>${e.start}–${e.end}${e.location?` · ${esc(e.location)}`:''}</p>${trackable(e)?`<p class="attendance-summary">${done?'✓ Aanwezigheid afgevinkt':'Nog niet afgevinkt'}</p>`:''}</div><span class="typepill">${esc(typeLabel(e.type))}</span><div class="schedule-actions">${trackable(e)?`<button class="mini-action ${done?'done':''}" data-attend="${i}">${done?'✓ Geweest':'○ Geweest?'}</button>`:''}<button class="mini-action content" data-event-content="${i}">Inhoud & samenvatting</button></div></article>`;
    }).join('');
  };

  function bindAttendance(){
    document.querySelectorAll('[data-attend]').forEach(b=>b.onclick=()=>{const e=window.RS_EVENT_MAP?.[b.dataset.attend];if(!e)return;const k=eventKey(e);state.attendance[k]=!state.attendance[k];save()});
    document.querySelectorAll('[data-event-content]').forEach(b=>b.onclick=()=>{const e=window.RS_EVENT_MAP?.[b.dataset.eventContent];if(e)openEvent(e)});
  }
  const originalBindDynamic=bindDynamic;
  bindDynamic=function(){ originalBindDynamic(); bindAttendance(); };
  const originalRenderAll=renderAll;
  renderAll=function(){ originalRenderAll(); bindAttendance(); };

  localStorage.setItem(KEY,JSON.stringify(state));
  renderAll();
})();