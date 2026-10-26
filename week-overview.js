// Compatibility loader: the live page historically referenced week-overview.js.
// Keep that URL working while the actual module lives in week-summary.js.
if(!document.getElementById('weekSummaryScript')){
  const script=document.createElement('script');
  script.id='weekSummaryScript';
  script.src='./week-summary.js?v=2';
  script.async=false;
  document.body.appendChild(script);
}
