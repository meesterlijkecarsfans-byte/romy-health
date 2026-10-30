const COURSE_DATA=[
  {id:'ssp',period:'1B',name:'Statistical Signal Processing'},
  {id:'insp',period:'1B',name:'Inspanningsfysiologie'},
  {id:'ba2',period:'1B',name:'Bewegingsanalyse 2'},
  {id:'ism',period:'2A',name:'Interstellair Medium'},
  {id:'ah',period:'2A',name:'Astrophysical Hydrodynamics'},
  {id:'aed',period:'2A',name:'Advanced Electrodynamics'}
];
const KEY='romyStudyStateV1';
let state=JSON.parse(localStorage.getItem(KEY)||'{}');
state.courses ||= {};
state.sessions ||= [];
state.reviews ||= [];
COURSE_DATA.forEach(c=>state.courses[c.id] ||= {examDate:'',mastery:0,focus:''});
let activePeriod='1B';

const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
function save(){localStorage.setItem(KEY,JSON.stringify(state));renderAll();}
function course(id){return COURSE_DATA.find(c=>c.id===id)}
function courseState(id){return state.courses[id]}
function fmtMin(m){m=Number(m)||0;return m>=60?`${Math.floor(m/60)}u ${m%60?`${m%60}m`:''}`.trim():`${m}m`}
function isoDate(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function daysBetween(a,b){return Math.ceil((new Date(`${b}T12:00:00`)-new Date(`${a}T12:00:00`))/86400000)}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function startOfWeek(){const d=new Date();const day=d.getDay()||7;d.setHours(0,0,0,0);d.setDate(d.getDate()-day+1);return d}
function todaySessions(){const k=isoDate();return state.sessions.filter(s=>s.date===k)}
function weekSessions(){const start=startOfWeek();return state.sessions.filter(s=>new Date(`${s.date}T12:00:00`)>=start)}
function dueReviews(){const t=isoDate();return state.reviews.filter(r=>!r.mastered&&r.next<=t)}
function examItems(){return COURSE_DATA.map(c=>({c,s:courseState(c.id)})).filter(x=>x.s.examDate).sort((a,b)=>a.s.examDate.localeCompare(b.s.examDate))}
function nextExam(){const today=isoDate();return examItems().find(x=>x.s.examDate>=today)||null}
function streak(){let count=0;let d=new Date();const days=new Set(state.sessions.map(s=>s.date));while(days.has(isoDate(d))){count++;d.setDate(d.getDate()-1)}return count}

function focusCourse(){
  const due=dueReviews();if(due.length)return course(due[0].course);
  const exams=examItems().filter(x=>x.s.examDate>=isoDate());if(exams.length)return exams[0].c;
  return COURSE_DATA.filter(c=>c.period==='1B').sort((a,b)=>(courseState(a.id).mastery||0)-(courseState(b.id).mastery||0))[0];
}
function renderToday(){
  const next=nextExam();
  $('#nextExam').textContent=next?`${daysBetween(isoDate(),next.s.examDate)}d`:'—';
  $('#nextExamCourse').textContent=next?next.c.name:'Nog niet ingesteld';
  $('#weekMinutes').textContent=fmtMin(weekSessions().reduce((a,s)=>a+Number(s.minutes||0),0));
  $('#reviewDue').textContent=dueReviews().length;$('#streak').textContent=streak();
  const fc=focusCourse(); const fs=courseState(fc.id); const due=dueReviews().filter(r=>r.course===fc.id);
  $('#heroTitle').textContent=todaySessions().length?'Mooie start — kies je volgende blok':`Begin met ${fc.name}`;
  $('#heroCopy').textContent=due.length?`${due.length} onderwerp${due.length===1?'':'en'} van dit vak ${due.length===1?'staat':'staan'} klaar om te herhalen.`:fs.focus||'Kies één concreet onderdeel en werk daar 30–60 minuten geconcentreerd aan.';
  $('#focusCard').innerHTML=`<article class="card focus"><div class="icon">🎯</div><div><span class="pill">${esc(fc.period)}</span><h3>${esc(fc.name)}</h3><p>${esc(fs.focus||'Stel bij het vak een volgende focus in, of log direct een studieblok.')}</p></div></article>`;
  $('#todayCourses').innerHTML=COURSE_DATA.filter(c=>c.period==='1B').map(renderCourseCard).join('');
  renderRecent();
}
function renderCourseCard(c){const s=courseState(c.id);return `<button class="card course" data-course="${c.id}" style="width:100%;text-align:left"><div><span class="pill">${c.period}</span><h3>${esc(c.name)}</h3><small>${s.examDate?`Tentamen ${new Date(`${s.examDate}T12:00:00`).toLocaleDateString('nl-NL',{day:'numeric',month:'short'})}`:'Tentamendatum nog instellen'}</small><div class="progress"><span style="width:${Math.max(0,Math.min(100,s.mastery||0))}%"></span></div></div><strong>${s.mastery||0}%</strong></button>`}
function renderCourses(){
  $('#periodLabel').textContent=`Periode ${activePeriod}`;
  $('#courseList').innerHTML=COURSE_DATA.filter(c=>c.period===activePeriod).map(renderCourseCard).join('');
}
function renderRecent(){const a=[...state.sessions].sort((x,y)=>(y.date+y.created).localeCompare(x.date+x.created)).slice(0,5);$('#recentSessions').innerHTML=a.length?a.map(s=>`<article class="card session"><div><strong>${esc(course(s.course)?.name||s.course)}</strong><small>${new Date(`${s.date}T12:00:00`).toLocaleDateString('nl-NL',{weekday:'short',day:'numeric',month:'short'})} · ${fmtMin(s.minutes)}${s.note?` · ${esc(s.note)}`:''}</small></div>${s.score!==''&&s.score!=null?`<span class="score">${s.score}%</span>`:''}</article>`).join(''):'<p class="empty">Nog geen studieblokken gelogd. Tik op + om je eerste sessie toe te voegen.</p>'}
function renderReviews(){const due=dueReviews();$('#reviewList').innerHTML=due.length?due.map(r=>`<article class="card focus"><div class="icon">↻</div><div style="flex:1"><span class="pill">${esc(course(r.course)?.name||r.course)}</span><h3>${esc(r.topic)}</h3><p>Vandaag opnieuw ophalen uit je geheugen.</p><div style="display:flex;gap:7px;margin-top:10px;flex-wrap:wrap"><button class="chip" data-review="${r.id}" data-days="1">Morgen</button><button class="chip" data-review="${r.id}" data-days="3">3 dagen</button><button class="chip" data-review="${r.id}" data-days="7">7 dagen</button><button class="chip" data-master="${r.id}">✓ Beheerst</button></div></div></article>`).join(''):'<p class="empty">Niets gepland voor vandaag. Voeg onderwerpen toe die je met spaced repetition wilt blijven ophalen.</p>'}
function renderProgress(){
  $('#sessionCount').textContent=state.sessions.length;
  const total=state.sessions.reduce((a,s)=>a+Number(s.minutes||0),0);$('#totalTime').textContent=fmtMin(total);
  const scored=state.sessions.filter(s=>s.score!==''&&s.score!=null&&!Number.isNaN(Number(s.score)));$('#avgScore').textContent=scored.length?`${Math.round(scored.reduce((a,s)=>a+Number(s.score),0)/scored.length)}%`:'—';
  $('#masteredCount').textContent=state.reviews.filter(r=>r.mastered).length;
  $('#progressCourses').innerHTML=COURSE_DATA.filter(c=>c.period==='1B').map(renderCourseCard).join('');
}
function renderAll(){renderToday();renderCourses();renderReviews();renderProgress();fillSelects();bindDynamic()}
function fillSelects(){const opts=COURSE_DATA.map(c=>`<option value="${c.id}">${c.period} · ${esc(c.name)}</option>`).join('');$('#sessionCourse').innerHTML=opts;$('#reviewCourse').innerHTML=opts}
function bindDynamic(){
  $$('[data-course]').forEach(b=>b.onclick=()=>openCourse(b.dataset.course));
  $$('[data-review]').forEach(b=>b.onclick=()=>{const r=state.reviews.find(x=>x.id===b.dataset.review);if(!r)return;const d=new Date();d.setDate(d.getDate()+Number(b.dataset.days));r.next=isoDate(d);save()});
  $$('[data-master]').forEach(b=>b.onclick=()=>{const r=state.reviews.find(x=>x.id===b.dataset.master);if(r){r.mastered=true;save()}})
}
function openModal(id){$(id).classList.add('open')}function closeModals(){$$('.modal').forEach(m=>m.classList.remove('open'))}
function openCourse(id){const c=course(id),s=courseState(id);$('#coursePeriod').textContent=`Periode ${c.period}`;$('#courseName').textContent=c.name;const f=$('#courseForm');f.course.value=id;f.examDate.value=s.examDate||'';f.mastery.value=s.mastery||0;f.focus.value=s.focus||'';openModal('#courseModal')}

$$('.nav button').forEach(b=>b.onclick=()=>{const t=b.dataset.target;$$('.nav button').forEach(x=>x.classList.toggle('active',x===b));$$('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===t));$('#pageTitle').textContent={today:'Vandaag',courses:'Vakken',review:'Herhalen',progress:'Voortgang'}[t]});
$$('[data-go]').forEach(b=>b.onclick=()=>document.querySelector(`.nav button[data-target="${b.dataset.go}"]`).click());
$$('#periodTabs .chip').forEach(b=>b.onclick=()=>{activePeriod=b.dataset.period;$$('#periodTabs .chip').forEach(x=>x.classList.toggle('active',x===b));renderCourses();bindDynamic()});
$('#fab').onclick=()=>openModal('#sessionModal');$('#addReviewBtn').onclick=()=>openModal('#reviewModal');$('#settingsBtn').onclick=()=>openModal('#settingsModal');$$('.close').forEach(b=>b.onclick=closeModals);$$('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModals()}));
$('#sessionForm').onsubmit=e=>{e.preventDefault();const d=new FormData(e.target);state.sessions.push({id:crypto.randomUUID?.()||String(Date.now()),date:isoDate(),created:new Date().toISOString(),course:d.get('course'),minutes:Number(d.get('minutes')),score:d.get('score'),note:d.get('note')});closeModals();e.target.reset();e.target.minutes.value=45;save()};
$('#reviewForm').onsubmit=e=>{e.preventDefault();const d=new FormData(e.target),next=new Date();next.setDate(next.getDate()+Number(d.get('days')));state.reviews.push({id:crypto.randomUUID?.()||String(Date.now()),course:d.get('course'),topic:d.get('topic'),next:isoDate(next),mastered:false});closeModals();e.target.reset();save()};
$('#courseForm').onsubmit=e=>{e.preventDefault();const d=new FormData(e.target),s=courseState(d.get('course'));s.examDate=d.get('examDate');s.mastery=Number(d.get('mastery')||0);s.focus=d.get('focus');closeModals();save()};
$('#resetBtn').onclick=()=>{if(confirm('Alle lokale Romy Study-data wissen?')){localStorage.removeItem(KEY);location.reload()}};

renderAll();
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
