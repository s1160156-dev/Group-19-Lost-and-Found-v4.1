'use strict';
const $ = (s) => document.querySelector(s);
const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const items = {
  bottle: [{id:'A',colour:'blue',detail:'black',mark:'star'},{id:'B',colour:'blue',detail:'white',mark:'star'},{id:'C',colour:'blue',detail:'white',mark:'cat'},{id:'D',colour:'black',detail:'white',mark:'star'}],
};
const strategies = [
  ['details','Detail detective','Asked for a missing feature.','“What colour is the cap?”'],
  ['clarify','Meaning maker','Asked for a more specific clue when Mia was unclear.','“What do you mean by a little shape?”'],
  ['options','Option explorer','Asked Mia to distinguish between two plausible features.','“Is the cap black or white?”'],
  ['confirm','Careful confirmer','Put all three clues together and waited for Mia to confirm.','“So the bottle is …, the cap is … and the sticker is shaped like a …. Is that right?”']
];
const FEATURE = {body:'Bottle body colour',cap:'Cap colour',sticker:'Sticker shape'};
const HELP = [
  ['Bottle body',['What colour is the bottle itself?','Could you tell me the colour of the bottle body?','Is the bottle blue or black?']],
  ['Cap',['What colour is the cap?','What colour is the lid?','Is the cap black or white?']],
  ['Sticker shape',['Does it have a sticker?','What shape is the sticker?','Is the sticker shaped like a star or a cat?']],
  ['Clarify & confirm',['What do you mean by a little shape?','Could you say that again?','So the bottle is [colour], the cap is [colour], and the sticker is shaped like a [shape]. Is that right?']]
];
const REFLECTION = ['At first we were unsure about ___. Asking ___ helped us find out ___.','Mia said ___. That was too vague, so we asked ___.','The clue about ___ helped us tell two similar bottles apart.'];
const NEXT = ['Next time, we will ask about ___ before choosing.','If the answer is unclear, we will ask “___?”','Before returning the item, we will repeat ___ and wait for confirmation.'];
const S = {stage:0, active:false, mode:'',kind:'bottle',level:'guided',pair:'Pair 01',round:1,session:null,selected:null,messages:[],busy:false,emotion:'worried',error:'',hints:false,sound:false,status:null,model:'',target:null,clues:{},confirmation:'',returned:false,feedback:'',feedbackBusy:false,exported:false,journal:[],notes:{strategies:[],question:'',confirmation:'',reflection:'',next:'',verified:false,balanced:false}};
const unlocked=()=>Object.keys(S.clues).length===3&&Boolean(S.confirmation);
function clueBoard(){
  const n=Object.keys(S.clues).length, open=unlocked();
  return `<section class="clue-board" aria-label="Case progress"><div class="clue-heading"><div><div class="eyebrow">Case file · 3 clues to collect</div><h2>${open?'The shelf is unlocked!':'Build your bottle profile'}</h2></div><span class="clue-count" aria-live="polite">${n} / 3</span></div>
  <div class="clue-grid">${Object.entries(FEATURE).map(([key,label],i)=>`<div class="clue-ticket ${S.clues[key]?'found':''}"><span class="clue-no">${S.clues[key]?'✓':`0${i+1}`}</span><strong>${label}</strong><span>${S.clues[key]?esc(S.clues[key]):'Still unknown'}</span></div>`).join('')}</div>
  <p class="clue-instruction">${open?'Mia confirmed your summary. Match the clues to a bottle below.':n===3?'Now put all three clues in one sentence and ask Mia: “Is that right?”':'Ask Mia about each feature. A vague answer, such as “a little shape”, does not count yet.'}</p></section>`;
}
let toastTimer;
function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.display='none',3200)}
function art(item,dimensions=''){
  const palette={blue:'#6c9eb1',black:'#455753',white:'#fcf6df',green:'#7e9a72',cream:'#f0dfb6',yellow:'#e3b558',orange:'#c87b57'};
  const mark=item.mark==='star'
    ? '<path d="m50 84 5 10 11 1-8 8 2 11-10-5-10 5 2-11-8-8 11-1z" fill="#f0bd55" stroke="#b58838" stroke-width="1.3"/>'
    : '<path d="m39 95-1-10 10 5 8-1 8-5-1 13c8 18-28 20-24-2" fill="#f2c58f" stroke="#9d764e" stroke-width="1.3"/><circle cx="46" cy="99" r="1.5"/><circle cx="57" cy="99" r="1.5"/><path d="m50 102 2 2 2-2" fill="none" stroke="#5b5145"/>';
  return `<svg ${dimensions} viewBox="0 0 100 150" role="img" aria-label="${esc(item.colour)} bottle, ${esc(item.detail)} cap, ${esc(item.mark)} sticker"><ellipse cx="50" cy="140" rx="29" ry="5" fill="#273c3520"/><rect x="34" y="12" width="32" height="25" rx="6" fill="${palette[item.detail]}" stroke="#405e5733" stroke-width="2"/><path d="M35 35h30v9c0 6 12 10 12 23v61q0 10-10 10H33q-10 0-10-10V67c0-13 12-17 12-23z" fill="${palette[item.colour]}" stroke="#405e5744" stroke-width="2"/><path d="M33 70v48" stroke="white" stroke-width="5" opacity=".25" stroke-linecap="round"/><path d="M39 18h22" stroke="#405e5733" stroke-width="3"/><rect x="30" y="79" width="40" height="44" rx="16" fill="#fff9e8" opacity=".85"/>${mark}</svg>`;
}
function modeLabel(){return S.mode==='live'?'LIVE GENERATIVE AI':S.mode==='rehearsal'?'SCRIPTED REHEARSAL':'CHOOSE YOUR MODE'}
function setNavigation(){
  document.body.dataset.act=S.stage;
  [0,1,2].forEach(i=>$('#nav'+i).classList.toggle('active',S.stage===i));
  $('#footerMode').textContent=S.mode?`${modeLabel()} · ${S.pair} · Case ${String(S.round).padStart(2,'0')}`:'Group 19 · Classroom prototype v4.1';
}
function banner(){return S.mode==='rehearsal'?'<div class="banner">Rehearsal mode · Scripted replies, not generative AI. Practice the flow; do not present these as live AI responses.</div>':''}
function render(){
  setNavigation();
  $('#app').innerHTML=S.stage===0?counter():S.stage===1?observer():journal();
  bind();Cinema.bind();updateObserverChecklist();
}
const stageArt=(cut='counter',item=null,settled=false)=>Cinema.stage({cut,item,bottle:art,items:items.bottle,caseNo:S.round,listening:S.active&&S.busy,settled});
const matchesClues=x=>unlocked()&&x.colour===S.clues.body&&x.detail===S.clues.cap&&x.mark===S.clues.sticker;
function counter(){
  return `<div class="headline"><div><div class="eyebrow">Act I · The lost-property counter</div><h1>Every lost thing has a story.</h1><p class="sub">Ask for clues. Clear up uncertainty. Help Mia find what belongs to her.</p></div><span class="chip ${S.mode==='rehearsal'?'warn':''}">${S.active?'CASE '+String(S.round).padStart(2,'0'):'THE BOTTLE CASE'}</span></div>
  ${banner()}<div class="workspace fade-in ${S.active?'is-playing':''}"><section class="panel counter-panel">${stageArt()}${clueBoard()}
  <div class="shelf"><div class="section-label"><h2>The lost-property shelf</h2><span class="shelf-sign ${unlocked()?'open':''}">${unlocked()?'Ready to select':'Locked until confirmed'}</span></div><div class="items">
  ${items.bottle.map(x=>`<button class="item ${S.selected===x.id?'selected':''}" data-item="${x.id}" ${!unlocked()||S.busy?'disabled':''} aria-label="Select item ${x.id}: ${x.colour} body, ${x.detail} cap, ${x.mark} sticker" aria-pressed="${S.selected===x.id}"><span class="letter">${x.id}</span>${S.selected===x.id?'<span class="picked">✓</span>':''}${art(x)}<span class="desc">Bottle ${x.id}</span></button>`).join('')}</div>
  <p class="shelf-feedback" role="status" ${S.shelfFeedback?'':'hidden'}>${esc(S.shelfFeedback||'')}</p>
  <div class="return-row"><small>${S.selected?`Bottle ${S.selected} selected. Hand over to your observer.`:'No rush. Understanding matters more than speed.'}</small><button class="primary" id="goObserver" ${!unlocked()||!S.selected||S.busy?'disabled':''}>Review selection →</button></div></div></section>
  <section class="panel chat-panel">${S.active?chat():setup()}</section></div>`;
}
function setup(){
  return `<div class="setup"><div><div class="eyebrow">Your next small adventure</div><h2>Meet your first visitor.</h2><p class="sub">One questioner. One observer. Take turns helping.</p></div>
  <div class="pair-fields"><div><label for="pair">Anonymous pair code</label><input id="pair" maxlength="24" value="${esc(S.pair)}"></div><div><div class="mission-label">Mission</div><div class="mission-fixed">The missing water bottle</div></div></div>
  <div><label for="level">Conversation support</label><select id="level"><option value="guided" ${S.level==='guided'?'selected':''}>Guided · start with the phrasebook open</option><option value="challenge" ${S.level==='challenge'?'selected':''}>Challenge · try before opening the phrasebook</option></select></div>
  <div class="setup-note"><strong>${S.status?.preview?'Online preview':'Live AI connection'}</strong><div id="configStatus">${S.status?.preview?'Try rehearsal here. For live AI, run the downloaded local Python server.':S.status?S.status.configured?'API key detected. Start a case to test the connection.':'No API key configured. Follow the Chinese setup guide.':'Checking local server…'}</div><div class="status-line">No names or personal details. Live messages go to the AI provider.</div></div>
  <div id="error" class="error" role="alert">${esc(S.error)}</div><div class="setup-actions"><button class="primary" id="startLive" ${S.busy||S.status?.preview?'disabled':''}>${S.busy?'Connecting…':'Start with live AI →'}</button><button class="${S.status?.preview?'primary':'secondary'}" id="startRehearsal" ${S.busy?'disabled':''}>Try rehearsal</button></div>
  <small>Rehearsal uses scripted responses. A failed AI connection never silently switches to simulation.</small>
  <div class="flow-line"><span>01 Ask</span>→<span>02 Observe</span>→<span>03 Keep the evidence</span></div></div>`;
}
function chat(){
  return `<div class="chat-head"><div><h2>A conversation with Mia</h2><p><span class="status-dot"></span>${modeLabel()} · Water bottle</p></div><label class="sound-label"><input id="sound" type="checkbox" ${S.sound?'checked':''}>Read aloud</label></div>
  <div class="messages" id="messages" role="log" aria-live="polite">${S.messages.map((m,i)=>`<div class="message ${m.role}"><div class="bubble">${esc(m.content)}</div><small>${m.role==='user'?'You · questioner':'Mia · '+(S.mode==='live'?'AI role':'scripted role')}${m.role==='assistant'?` · <button class="msg-action" data-speak="${i}" aria-label="Read Mia's message aloud">Listen</button>`:''}</small></div>`).join('')}${S.busy?'<div class="message"><div class="bubble"><span class="busy-dot">Mia is thinking…</span></div></div>':''}</div>
  <div class="chat-bottom"><div class="support-head"><button class="linkbutton" id="hintBtn" aria-expanded="${S.hints}">${S.hints?'Hide':'Show'} language support</button><small>${S.messages.filter(m=>m.role==='user').length} learner turns · no score</small></div>
  ${S.hints?`<div class="phrasebook" aria-label="Conversation phrasebook">${HELP.map(([label,phrases],i)=>`<details ${i===S.helpGroup?'open':''} data-help="${i}"><summary>${label}</summary><div class="hints">${phrases.map(t=>`<button data-hint="${esc(t)}">${esc(t)}</button>`).join('')}</div></details>`).join('')}</div><small>Choose a sentence to put it in the box. Replace any words in [brackets] before sending.</small>`:''}
  <div id="error" class="error" role="alert">${esc(S.error)}</div><form id="chatForm" class="composer"><input id="chatInput" maxlength="600" placeholder="Ask Mia a question…" aria-label="Your question to Mia" autocomplete="off" ${S.busy?'disabled':''}><button class="primary" type="submit" ${S.busy?'disabled':''}>Send ↗</button></form><div class="status-line">Speak your question first, then type it. No speech recognition.</div><button class="linkbutton" id="saveDraft">Save dialogue so far (.txt)</button></div>`;
}
function writingPrompts(kind, examples){
  return `<details class="writing-guide"><summary>Show sentence starters</summary><p class="small">Choose one, then replace the blanks with what happened in this case.</p>${examples.map(t=>`<button type="button" data-starter="${kind}" data-template="${esc(t)}">${esc(t)}</button>`).join('')}</details>`;
}
function updateObserverChecklist(){
  const n=S.notes;
  const check={question:n.question.trim()&&S.messages.some(m=>m.role==='user'&&m.content===n.question.trim()),confirmation:!!S.confirmation,reflection:n.reflection.trim()&&n.next.trim()&&!/___/.test(n.reflection+n.next)};
  Object.entries(check).forEach(([key,value])=>{const el=$(`[data-checklist="${key}"]`);if(el){el.dataset.done=Boolean(value);el.firstElementChild.textContent=value?'Ready: ':'To add: ';}});
}
function observer(){
  const n=S.notes;
  const confirmedIndex=S.messages.findLastIndex(m=>m.role==='user'&&m.content===S.confirmation&&m.checked);
  return `<div class="headline"><div><div class="eyebrow">Act II · The observer’s worktable</div><h1>Good conversations leave clues.</h1><p class="sub">The observer takes over. Capture what actually happened, not what you hoped happened.</p></div><span class="chip">OBSERVER STUDIO</span></div>${banner()}
  <div class="review-grid fade-in"><aside class="review-side panel">${stageArt('observer')}<div class="observer-checklist" aria-label="Observer checklist"><span data-checklist="question"><b></b>Exact question</span><span data-checklist="confirmation"><b></b>Readback</span><span data-checklist="reflection"><b></b>Reflection &amp; next step</span></div><div class="shelf"><h2>Your conversation trail</h2><p class="sub">Find the question that led to a clearer clue. Click to quote it exactly.</p><div class="transcript">${S.messages.map((m,i)=>`<p class="${i===confirmedIndex?'confirmed-turn':''}"><strong>${m.role==='user'?'Questioner':'Mia'}:</strong> ${esc(m.content)}${m.role==='user'&&i!==confirmedIndex?`<button class="linkbutton" data-quote="${i}">Use as effective question</button>`:''}${i===confirmedIndex?'<small class="verified-tag">Confirmed readback</small>':''}</p>`).join('')}</div></div></aside>
  <section class="notebook"><div class="form-section"><div class="number-title"><span>01</span><h2>What did your partner do?</h2></div><p class="sub">Tick only the strategies you actually observed. Not every case needs every strategy. The examples show what to listen for.</p><div class="strategy-grid">${strategies.map(([key,title,desc,example])=>`<label class="strategy"><input type="checkbox" data-strategy="${key}" ${n.strategies.includes(key)?'checked':''}><span><strong>${title}</strong><small>${desc}</small><span class="strategy-example">${example}</span></span></label>`).join('')}</div></div>
  <div class="form-section"><div class="number-title"><span>02</span><h2>Keep their words, not a guess.</h2></div><label class="label" for="questionQuote">One effective question · exact quotation</label><p class="field-hint">Look for a question that uncovered a missing detail, turned a vague clue into a specific one, or ruled out an option. Copy the learner’s words, not the example above.</p><textarea id="questionQuote" data-note="question" maxlength="600" placeholder="Select a learner message in the conversation trail, or copy it exactly.">${esc(n.question)}</textarea><label class="label" for="confirmationQuote">The final confirmation · exact quotation</label><p class="field-hint">This is the exact readback that unlocked the shelf. Check that it includes the body colour, cap colour and sticker shape, and that Mia replied to confirm it.</p><textarea id="confirmationQuote" readonly>${esc(S.confirmation)}</textarea></div>
  <div class="form-section"><div class="number-title"><span>03</span><h2>A little reflection goes further.</h2></div><div class="field-pair"><div><label class="label" for="reflection">What helped you understand?</label><p class="field-hint">Name what was unclear and explain how a question helped you resolve it.</p><textarea id="reflection" data-note="reflection" maxlength="600" placeholder="We were unsure about…">${esc(n.reflection)}</textarea>${writingPrompts('reflection',REFLECTION)}</div><div><label class="label" for="next">One next step</label><p class="field-hint">Pick one action your pair can try in the next conversation.</p><textarea id="next" data-note="next" maxlength="400" placeholder="Next time, we will…">${esc(n.next)}</textarea>${writingPrompts('next',NEXT)}</div></div></div>
  <div class="form-section"><label class="strategy"><input id="verified" type="checkbox" ${n.verified?'checked':''}><span><strong>I heard an accurate paraphrase and the owner's confirmation.</strong><small>Observer judgement, not automatic language scoring.</small></span></label><label class="sound-label" style="margin-top:12px"><input id="balanced" type="checkbox" ${n.balanced?'checked':''}>Both partners had a meaningful role.</label><small>Selected item: <strong>${S.selected}</strong>. The server checks the item; a person checks the language.</small></div>
  <div class="error" id="error" role="alert">${esc(S.error)}</div><div class="review-actions"><button class="quiet" id="backChat" ${S.busy?'disabled':''}>← Back to conversation</button><button class="primary" id="sealCase" ${S.busy?'disabled':''}>${S.busy?'Checking…':'Return & create evidence →'}</button></div></section></div>`;
}
function journal(){
  const n=S.notes,x=items[S.kind].find(i=>i.id===S.selected);
  return `<div class="headline"><div><div class="eyebrow">Act III · The case journal</div><h1>The item is home. Keep the learning.</h1><p class="sub">Your evidence belongs to the conversation, not to a score.</p></div><span class="chip">CASE JOURNAL</span></div>${banner()}
  <div class="final-screen">${stageArt('ending',x,true)}<div class="ending-copy"><div class="eyebrow">Bottle ${esc(x.id)} · Match verified</div><h2>Back where it belongs.</h2><p>Three details and a final check helped you return the right bottle to Mia.</p></div></div>
  <div class="receipt-layout fade-in"><article class="receipt"><div class="selected-art">${art(x)}</div><div class="stamp">RETURN RECORDED</div><h2>We understood each other.</h2><p class="sub">Lost & Found · conversation evidence</p><div class="receipt-meta"><span>${esc(S.pair)} · Case ${String(S.round).padStart(2,'0')}</span><span>${new Date().toLocaleDateString('en-GB')}</span></div>
  <div class="eyebrow">The question that helped</div><div class="quote">“${esc(n.question)}”</div><div class="eyebrow" style="margin-top:20px">The moment we checked</div><p>“${esc(n.confirmation)}”</p>
  <div class="tags">${n.strategies.map(k=>`<span class="tag">${strategies.find(x=>x[0]===k)[1]}</span>`).join('')}</div>
  <div class="soft-rule"></div><h3>What we noticed</h3><p>${esc(n.reflection)}</p><h3>Our next small step</h3><p>${esc(n.next)}</p><div class="receipt-meta"><span>Bottle ${esc(S.selected)} · Water bottle</span><span>${n.balanced?'Shared participation noted':'Participation to review'}</span></div>
  <small>Strategies are observer-reported. Item match is program-checked. Teacher moderation is still required. ${S.mode==='rehearsal'?'SCRIPTED REHEARSAL: not live AI evidence.':''}</small></article>
  <aside><div class="side-note"><h2>A note from the practice coach</h2><p id="feedbackText">${esc(S.feedback||'Optional: ask for one strength and one next step based on the dialogue.')}</p><small>${S.mode==='live'?'AI feedback is a suggestion, not a grade. Check every quoted phrase.':'Rehearsal advice is scripted, not AI-generated.'}</small><button class="secondary full-width" id="feedbackBtn" ${S.feedbackBusy||S.feedback?'disabled':''}>${S.feedbackBusy?'Reviewing dialogue…':S.feedback?'Feedback received':S.mode==='live'?'Request AI feedback':'Show rehearsal advice'}</button><div id="error" class="error" role="alert">${esc(S.error)}</div></div>
  <div class="panel" style="padding:24px"><h2>Take your evidence with you.</h2><p class="sub">Download before starting another case.</p><div class="export-buttons"><button class="primary" id="exportCard">Download illustrated evidence card</button><button class="quiet" id="exportText">Download full record (.txt)</button><button class="quiet" id="exportJson">Download structured record (.json)</button></div><div class="journal-count"><small>${S.journal.length} case${S.journal.length===1?'':'s'} recorded in this tab. Not a leaderboard.</small><button class="secondary full-width" style="margin-top:12px" id="nextRound">Swap roles & start another case →</button><div id="nextWarning" class="hidden"><p class="small caution" style="margin-top:12px">This record has not been exported. Download it first, or explicitly continue.</p><button class="quiet full-width" id="continueAnyway">Continue without exporting</button></div></div></div></aside></div>`;
}
function saveSetup(){
  if($('#pair'))S.pair=$('#pair').value.trim()||'Pair 01';
  if($('#level'))S.level=$('#level').value;
}
function openObserver(){
  if(!unlocked()||!S.selected||S.busy)return;
  if(S.notes.confirmation!==S.confirmation)S.notes.verified=false;
  S.notes.confirmation=S.confirmation;S.stage=1;S.error='';render();window.scrollTo(0,0);
}
function playHandoff(item){
  stopVoice();
  Cinema.play('return');
  const dialog=$('#handoffDialog');
  dialog.innerHTML=`<div class="handoff-top"><h2 id="handoffTitle" tabindex="-1">Bottle ${esc(item.id)} matches</h2></div>${stageArt('ending',item)}<div class="handoff-actions"><p class="sub">Now record what helped you find it.</p><button class="primary" id="handoffContinue" type="button">Continue to observer →</button></div>`;
  Cinema.bind(dialog);
  dialog.showModal();$('#handoffTitle').focus({preventScroll:true});
  $('#handoffContinue').onclick=()=>{dialog.close();openObserver()};
}
function bind(){
  document.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>{
    if(!unlocked()||S.busy)return;
    const item=items.bottle.find(x=>x.id===b.dataset.item);
    if(!item)return;
    const draft=$('#chatInput')?.value||'',correct=matchesClues(item);
    S.selected=correct?item.id:null;
    S.shelfFeedback=correct?'':'This bottle does not match all three clues. Check the details and try again.';
    S.error='';render();if($('#chatInput'))$('#chatInput').value=draft;scrollMessages();
    $(`[data-item="${item.id}"]`)?.focus({preventScroll:true});
    if(correct)playHandoff(item);
  });
  if($('#level'))$('#level').onchange=saveSetup;
  if($('#pair'))$('#pair').oninput=saveSetup;
  if($('#startLive'))$('#startLive').onclick=()=>start('live');
  if($('#startRehearsal'))$('#startRehearsal').onclick=()=>start('rehearsal');
  if($('#chatForm'))$('#chatForm').onsubmit=e=>{e.preventDefault();send()};
  if($('#chatInput'))$('#chatInput').oninput=Cinema.typing;
  if($('#saveDraft'))$('#saveDraft').onclick=()=>download(recordText(),'text/plain;charset=utf-8',`case-${S.round}-draft.txt`);
  if($('#hintBtn'))$('#hintBtn').onclick=()=>{const draft=$('#chatInput').value;S.hints=!S.hints;render();$('#chatInput').value=draft;scrollMessages()};
  document.querySelectorAll('[data-help]').forEach(el=>el.ontoggle=()=>{if(el.open&&Number(el.dataset.help)!==S.helpGroup){S.helpGroup=Number(el.dataset.help);document.querySelectorAll('[data-help]').forEach(other=>{if(other!==el)other.open=false});}});
  document.querySelectorAll('[data-hint]').forEach(b=>b.onclick=()=>{const input=$('#chatInput');if(input.disabled)return;input.value=b.dataset.hint;input.focus();Cinema.typing();const pos=input.value.indexOf('[');if(pos>=0)input.setSelectionRange(pos,input.value.indexOf(']',pos)+1)});
  document.querySelectorAll('[data-speak]').forEach(b=>b.onclick=()=>speak(S.messages[+b.dataset.speak].content));
  if($('#sound'))$('#sound').onchange=e=>{S.sound=e.target.checked;if(!S.sound)stopVoice()};
  if($('#goObserver'))$('#goObserver').onclick=openObserver;
  document.querySelectorAll('[data-note]').forEach(t=>t.oninput=()=>{S.notes[t.dataset.note]=t.value;updateObserverChecklist()});
  document.querySelectorAll('[data-strategy]').forEach(t=>t.onchange=()=>{S.notes.strategies=[...document.querySelectorAll('[data-strategy]:checked')].map(e=>e.dataset.strategy)});
  document.querySelectorAll('[data-quote]').forEach(b=>b.onclick=()=>{S.notes.question=S.messages[+b.dataset.quote].content;$('#questionQuote').value=S.notes.question;updateObserverChecklist();toast('Exact quotation added to your evidence.')});
  document.querySelectorAll('[data-starter]').forEach(b=>b.onclick=()=>{const t=$('#'+b.dataset.starter);if(t.value.trim()&&!t.value.includes('___')){toast('Keep your existing notes. Clear the field if you want a new starter.');return;}t.value=b.dataset.template;S.notes[b.dataset.starter]=t.value;updateObserverChecklist();t.focus();const at=t.value.indexOf('___');if(at>=0)t.setSelectionRange(at,at+3)});
  if($('#verified'))$('#verified').onchange=e=>S.notes.verified=e.target.checked;
  if($('#balanced'))$('#balanced').onchange=e=>S.notes.balanced=e.target.checked;
  if($('#backChat'))$('#backChat').onclick=()=>{S.stage=0;S.error='';render();scrollMessages();window.scrollTo(0,0)};
  if($('#sealCase'))$('#sealCase').onclick=seal;
  if($('#feedbackBtn'))$('#feedbackBtn').onclick=feedback;
  if($('#exportText'))$('#exportText').onclick=()=>download(recordText(),'text/plain;charset=utf-8',`case-${S.round}-evidence.txt`);
  if($('#exportJson'))$('#exportJson').onclick=()=>download(JSON.stringify(record(),null,2),'application/json',`case-${S.round}-evidence.json`);
  if($('#exportCard'))$('#exportCard').onclick=()=>download(evidenceSvg(),'image/svg+xml',`case-${S.round}-evidence-card.svg`);
  if($('#nextRound'))$('#nextRound').onclick=()=>{if(!S.exported)$('#nextWarning').classList.remove('hidden');else nextRound()};
  if($('#continueAnyway'))$('#continueAnyway').onclick=nextRound;
}
async function api(path,body){
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),75000);
  try{
    const r=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
    const type=r.headers.get('content-type')||'';
    if(!type.includes('application/json'))throw new Error('Open the game through python server.py at http://127.0.0.1:8765, not by double-clicking HTML.');
    const data=await r.json();
    if(!r.ok)throw new Error(data.error||'Request failed.');
    return data;
  }catch(e){if(e.name==='AbortError')throw new Error('The request timed out. No simulated answer was substituted. Please retry manually.');throw e}
  finally{clearTimeout(timer)}
}
async function start(mode){
  if(S.busy)return;saveSetup();S.mode=mode;S.busy=true;S.error='';render();
  try{
    let reply;
    if(mode==='live'){
      const r=await api('start',{kind:S.kind,level:S.level});S.session=r.session;S.model=r.model;reply=r.reply;
    }else{
      S.target=items.bottle[(S.round%4)];S.model='Scripted rehearsal (not AI)';reply='Hi! I lost my water bottle. Can you help me?';
    }
    S.messages=[{role:'assistant',content:reply}];S.active=true;S.hints=S.level==='guided';S.helpGroup=0;Cinema.play('arrival');openingVoice();
  }catch(e){S.error=e.message;S.active=false}
  finally{S.busy=false;render();if(S.active&&matchMedia('(max-width:720px)').matches)$('.cinema')?.scrollIntoView({block:'nearest',behavior:'instant'});scrollMessages()}
}
async function send(){
  const input=$('#chatInput'),text=input.value.trim();if(!text||S.busy)return;
  if(/\[[^\]]+\]/.test(text)){$('#error').textContent='Replace all the words in brackets with your own clues first.';return}
  stopVoice();const intent=Cinema.intent(text);Cinema.play(intent);
  S.busy=true;S.error='';render();scrollMessages();
  try{
    let reply;
    if(S.mode==='live'){
      const r=await api('chat',{session:S.session,text});reply=r.reply;S.model=r.model;S.clues=r.clues;S.confirmation=r.confirmation;
    }else reply=rehearse(text);
    S.messages.push({role:'user',content:text,checked:S.confirmation===text},{role:'assistant',content:reply});
    if(!unlocked())S.selected=null;
    S.shelfFeedback='';
    Cinema.reply(S.confirmation===text?'confirm':intent,reply);
    if(S.sound)speak(reply);
  }catch(e){S.error=e.message;Cinema.play('other','Please try that again.')}
  finally{S.busy=false;render();scrollMessages();if($('#chatInput')){$('#chatInput').value=S.error?text:'';$('#chatInput').focus({preventScroll:true})}}
}
function rehearse(text){
  const t=text.toLowerCase().replaceAll('’',"'").replace(/[-–—]/g,' '),x=S.target;
  const body='(?:bottle\\s+body|body(?:\\s+of\\s+the\\s+bottle)?|(?:water\\s+)?bottle)';
  const cap='(?:bottle\\s+cap|cap|lid|top)', sticker='(?:sticker|shape|design)';
  const colours=t.match(/\b(?:blue|black|white|green|red|yellow|orange|purple|pink|brown|grey|gray|silver|navy|cream|beige|teal|gold|clear|transparent|turquoise|violet)\b/g)||[];
  const shapes=t.match(/\b(?:star|cat|heart|circle|square|triangle|flower|moon|dog|rabbit|bear|diamond|oval|sun|round|crescent|rectangle|dinosaur|smiley)\b/g)||[];
  if(/\b(?:ignore|system\s+prompt|answer\s+key|tell\s+me\s+the\s+letter|which\s+(?:letter|number)|option\s+[abcd]|item\s+[abcd])\b|\b(?:is it|guess)\s+[abcd]\s*\?/.test(t))return 'Please describe the bottle rather than naming a letter.';
  const hasCap=new RegExp(`\\b${cap}\\b`).test(t),hasSticker=new RegExp(`\\b${sticker}\\b`).test(t);
  const hasBody=/\b(?:body|main\s+colou?r|bottle\s+itself|side\s+of)\b/.test(t);
  const readback=/\b(?:so\s+(?:your|the|it)|let me (?:check|confirm)|is (?:that|this) (?:right|correct)|am i right|do i have (?:that|it) right|let me make sure)\b/.test(t)||(hasCap&&hasSticker&&shapes.length&&colours.length);
  if(readback){
    if(Object.keys(S.clues).length!==3)return 'We still need to check each clue separately. Ask about the missing details first.';
    const paired=(noun,value)=>new RegExp(`\\b(?:${noun}\\s*(?:is|looks|:|=)?\\s*(?:a\\s+)?(?:colou?r(?:\\s+is|:)?\\s*)?${value}|${value}\\s+${noun})\\b`).test(t);
    const valid=!/\b(?:not|never|no|or|maybe|might|probably|either|except|without)\b|n't\b/.test(t)
      &&(/\b(?:right|correct|confirm|is\s+it|is\s+that|does\s+that)\b|\?/.test(t))
      &&[...colours,...shapes].every(v=>[x.colour,x.detail,x.mark].includes(v))
      &&(paired(body,x.colour)||new RegExp(`\\b(?:so\\s+)?(?:your\\s+)?it(?:'s|\\s+is)\\s+${x.colour}\\b`).test(t))
      &&paired(cap,x.detail)&&(paired(sticker,x.mark)||new RegExp(`\\b${x.mark}\\s+shaped\\s+sticker\\b|\\bsticker\\s+is\\s+shaped\\s+like\\s+(?:a\\s+)?${x.mark}\\b`).test(t));
    if(valid){S.confirmation=text;return 'Yes, all three details are right!'}
    S.confirmation='';S.selected=null;
    return 'Not quite. Check the bottle colour, cap colour and sticker shape, then ask me to confirm again.';
  }
  if(/\b(?:repeat|again|pardon)\b/.test(t)&&!(hasCap||hasSticker||hasBody))return S.messages.at(-1)?.content||'Sure. Which detail would you like me to repeat?';
  if(Number(hasCap)+Number(hasSticker)+Number(hasBody)>1)return 'Let’s take one clue at a time. Which detail would you like to check first?';
  if(!t.includes('?')&&!/\b(?:what|which|does|is|can|could|would|tell|describe|how)\b/.test(t))return 'Could you ask me a question about the bottle, cap or sticker?';
  if(hasSticker){
    if(!/\b(?:shape|look like|kind|design|mean|what\s+(?:is|does|sticker)|which\s+sticker)\b/.test(t)&&!shapes.length)return 'Yes, there’s a sticker with a little shape on it.';
    S.clues.sticker=x.mark;return `The sticker is shaped like a ${x.mark}.`;
  }
  if(hasCap){
    if(!/\b(?:colou?r|look|describe|what|which|mean)\b/.test(t)&&!colours.length)return 'What would you like to know about the cap?';
    S.clues.cap=x.detail;return `The cap is ${x.detail}.`;
  }
  if(hasBody||/\bcolou?r\b/.test(t)||(/\bbottle\b/.test(t)&&colours.length)){S.clues.body=x.colour;return `The bottle itself is ${x.colour}.`}
  return 'Try asking about the bottle colour, the cap colour or the shape on the sticker.';
}
function scrollMessages(){requestAnimationFrame(()=>{const el=$('#messages');if(el)el.scrollTo({top:el.scrollHeight,behavior:'instant'})})}
let voiceEpoch=0,openingTimer;
function stopVoice(){
  clearTimeout(openingTimer);voiceEpoch++;Cinema.speaking(false);
  if('speechSynthesis'in window)window.speechSynthesis.cancel();
}
function openingVoice(){
  if(!S.sound)return;
  stopVoice();
  openingTimer=setTimeout(()=>{if(S.stage===0&&S.sound&&Cinema.state()==='arrival')speak(S.messages[0].content);},1700);
}
function speak(text){
  if(!('speechSynthesis'in window)){toast('Read-aloud is unavailable in this browser.');return}
  stopVoice();const thisVoice=voiceEpoch;const u=new SpeechSynthesisUtterance(text);u.lang='en-GB';u.rate=.88;
  u.onstart=()=>{if(thisVoice===voiceEpoch)Cinema.speaking(true)};
  u.onend=()=>{if(thisVoice===voiceEpoch)Cinema.speaking(false)};
  u.onerror=()=>{if(thisVoice===voiceEpoch){Cinema.speaking(false);toast('Read-aloud could not start. Please read the message aloud yourself.')}};
  window.speechSynthesis.speak(u);
}
async function seal(){
  if(S.busy||!unlocked()||!S.selected)return;
  const n=S.notes,user=S.messages.filter(m=>m.role==='user').map(m=>m.content.trim());
  let error='';
  if(!n.question.trim()||!n.confirmation.trim()||!n.reflection.trim()||!n.next.trim())error='Add both quotations, your reflection, and one next step before creating the record.';
  else if(/___/.test(n.reflection)||/___/.test(n.next))error='Replace the blanks in the reflection and next step with your own ideas.';
  else if(!user.includes(n.question.trim())||!user.includes(n.confirmation.trim()))error='Both quotations must match a learner message exactly. Use the quote buttons in the conversation trail.';
  else if(!n.verified)error='The observer must verify an accurate paraphrase and the owner’s confirmation. Return to the conversation if needed.';
  if(error){S.error=error;render();$('#error').scrollIntoView({block:'center',behavior:'smooth'});return}
  S.busy=true;S.error='';render();
  try{
    const correct=S.mode==='live'?(await api('return',{session:S.session,item:S.selected,confirmed:n.verified})).correct:S.selected===S.target.id;
    if(!correct){S.error='This item does not match the owner’s record. Keep your notes, return to the counter, and clarify the uncertain detail.'}
    else{stopVoice();Cinema.play('return');S.returned=true;S.exported=false;S.stage=2;S.journal.push({round:S.round,item:S.selected,mode:S.mode});window.scrollTo(0,0)}
  }catch(e){S.error=e.message}
  finally{S.busy=false;render()}
}
async function feedback(){
  if(S.feedbackBusy||S.feedback)return;S.feedbackBusy=true;S.error='';render();
  try{
    if(S.mode==='live')S.feedback=(await api('feedback',{session:S.session})).reply;
    else S.feedback=`Rehearsal note: You recorded “${S.notes.question}”.\nNext step: ask your teacher whether this question resolved the missing information. This scripted note is not an AI evaluation.`;
  }catch(e){S.error=e.message}
  finally{S.feedbackBusy=false;render()}
}
function record(){
  return {title:'lost and found(group 19) · Conversation evidence',version:'3.0',timestamp:new Date().toISOString(),pair:S.pair,case:S.round,mode:S.mode,model:S.model,mission:S.kind,level:S.level,selectedItem:S.selected,itemMatch:S.returned,clues:{...S.clues},confirmedReadback:S.confirmation,observerNotes:{...S.notes},feedback:S.feedback,transcript:S.messages,moderation:'Pending teacher review. Observer strategy reports and AI feedback are not automatic language scores.',privacy:'No audio was recorded. Expressions are UI states, not emotion analysis.'};
}
function recordText(){
  const r=record();return `${r.title}\n${r.timestamp}\nPair: ${r.pair} | Case: ${r.case}\nMode: ${r.mode} | Model: ${r.model}\nMission: ${r.mission} | Selected: ${r.selectedItem}\nItem match: ${r.itemMatch}\n\nOBSERVER EVIDENCE\nStrategies: ${r.observerNotes.strategies.join(', ')}\nEffective question: ${r.observerNotes.question}\nConfirmation: ${r.observerNotes.confirmation}\nReflection: ${r.observerNotes.reflection}\nNext step: ${r.observerNotes.next}\nHuman verification: ${r.observerNotes.verified}\nBalanced participation: ${r.observerNotes.balanced}\n\nFEEDBACK (REQUIRES REVIEW)\n${r.feedback||'Not requested'}\n\nTRANSCRIPT\n${r.transcript.map(m=>`${m.role==='user'?'LEARNER':'OWNER'}: ${m.content}`).join('\n\n')}\n\n${r.moderation}\n${r.privacy}`;
}
function wrap(text,len=66){
  const lines=[];let current='';
  for(const word of String(text).split(/\s+/)){
    if(word.length>len){if(current){lines.push(current);current=''}for(let i=0;i<word.length;i+=len)lines.push(word.slice(i,i+len));continue}
    if((current+' '+word).trim().length>len){lines.push(current);current=word}else current+=(current?' ':'')+word;
  }if(current)lines.push(current);return lines;
}
function evidenceSvg(){
  let y=212,blocks='';
  const write=(label,text)=>{blocks+=`<text x="60" y="${y}" font-size="14" fill="#426b59" font-weight="bold">${esc(label.toUpperCase())}</text>`;y+=30;for(const line of wrap(text)){blocks+=`<text x="60" y="${y}" font-size="18" fill="#243c35">${esc(line)}</text>`;y+=27}y+=28;};
  write('The question that helped',S.notes.question);
  write('The moment we checked',S.notes.confirmation);
  write('Observer-noted strategies',S.notes.strategies.map(k=>strategies.find(v=>v[0]===k)[1]).join(' · ')||'No strategies selected');
  write('What we noticed',S.notes.reflection);write('Our next small step',S.notes.next);
  write('Mode & review status',`${modeLabel()}. Item ${S.selected} matched. Observer evidence; teacher review pending.`);
  const height=y+60;
  const objectArt=art(items[S.kind].find(x=>x.id===S.selected)).replace('<svg ','<svg x="660" y="60" width="75" height="115" ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${height}" viewBox="0 0 800 ${height}"><rect width="800" height="${height}" fill="#e3eee3"/><rect x="24" y="24" width="752" height="${height-48}" rx="20" fill="#fffefa"/>${objectArt}<g font-family="Trebuchet MS, Arial, sans-serif"><text x="60" y="80" fill="#2b6353" font-size="16" font-weight="bold">LOST &amp; FOUND · CONVERSATION JOURNAL</text><text x="60" y="128" fill="#243c35" font-size="30" font-weight="bold">We understood each other.</text><text x="60" y="165" fill="#64736a" font-size="15">${esc(S.pair)} · Case ${S.round} · ${esc(new Date().toLocaleDateString('en-GB'))}</text>${blocks}<text x="60" y="${height-45}" font-size="13" fill="#64736a">Progress is a conversation, not a race. No automatic language score.</text></g></svg>`;
}
function download(content,type,filename){
  const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);S.exported=true;toast('Download requested. Keep the file with your project evidence.');
}
function nextRound(){
  stopVoice();Cinema.reset();
  S.stage=0;S.active=false;S.selected=null;S.messages=[];S.session=null;S.target=null;S.error='';S.shelfFeedback='';S.returned=false;S.feedback='';S.exported=false;S.emotion='worried';S.round++;S.mode='';S.clues={};S.confirmation='';
  S.notes={strategies:[],question:'',confirmation:'',reflection:'',next:'',verified:false,balanced:false};render();window.scrollTo(0,0);
}
$('#helpBtn').onclick=()=>$('#helpDialog').showModal();
$('#closeHelp').onclick=()=>$('#helpDialog').close();
$('#handoffDialog').addEventListener('close',()=>{Cinema.play('confirm');$('#handoffDialog').replaceChildren()});
window.render_game_to_text=()=>JSON.stringify({act:S.stage+1,mode:S.mode,beat:Cinema.state(),case:S.round,clues:S.clues,confirmed:unlocked(),selection:S.selected,returned:S.returned});
render();
if(location.protocol==='file:'){S.status={configured:false,preview:true};render()}
else fetch('/api/status').then(r=>{if(!r.ok)throw Error('No local backend');return r.json()}).then(data=>{if(data.version!=='3.0')throw Error('No compatible local backend');S.status=data;if(!S.active&&!S.busy)render()}).catch(()=>{S.status={configured:false,preview:true};if(!S.active&&!S.busy)render()});
