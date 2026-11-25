'use strict';

// The stage is a presentation layer: only the verified game state can trigger a return.
const Cinema = (() => {
  const now = () => performance.now();
  let active = {kind:'still', at:now(), cue:'Can you help me?'};
  let typingTimer, voice = false;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cues = {
    body:'The bottle itself…', cap:'Let me think about the cap.', sticker:'Oh, the sticker!', clarify:'Let me be more specific.',
    compare:'Let me think which one.', repeat:'Of course. Listen again.', recap:'Let me check those details.', confirm:'Yes, that’s right!',
    other:'I’m listening.', still:'Can you help me?', arrival:'Can you help me?', return:'That’s my bottle. Thank you!'
  };
  function intent(text) {
    if (/\b(?:again|repeat|pardon)\b/i.test(text)) return 'repeat';
    if (/\b(?:is that right|did i get that|have i got|did i understand|you mean|correct)\b/i.test(text) && !/^\s*what do you mean/i.test(text)) return 'recap';
    if (/\b(?:or|either)\b/i.test(text)) return 'compare';
    if (/\b(?:mean|specific|describe)\b/i.test(text)) return 'clarify';
    if (/\b(?:shape|sticker|decal|label)\b/i.test(text)) return 'sticker';
    if (/\b(?:cap|lid|top)\b/i.test(text)) return 'cap';
    if (/\b(?:bottle|body|colour|color)\b/i.test(text)) return 'body';
    return 'other';
  }
  function play(kind, cue) { active = {kind, at:now(), cue:cue || cues[kind] || cues.other}; }
  function reply(kind, text) { play(kind, text); }
  function speaking(value) {
    voice = value;
    document.querySelector('.cinema[data-cut="counter"]')?.classList.toggle('voicing', value);
  }
  function typing() {
    const el = document.querySelector('.cinema[data-cut="counter"]');
    if (!el) return;
    el.classList.add('typing'); clearTimeout(typingTimer);
    typingTimer = setTimeout(() => el.classList.remove('typing'), 450);
  }
  // Illustrations share the same perspective, lighting and facial/hand rigs in all three acts.
  function school(id) {
    return `<defs>
      <linearGradient id="${id}wall" x2="0" y2="1"><stop stop-color="#213b58"/><stop offset="1" stop-color="#547884"/></linearGradient>
      <linearGradient id="${id}floor" x2="0" y2="1"><stop stop-color="#725d50"/><stop offset="1" stop-color="#303849"/></linearGradient>
      <linearGradient id="${id}sky" x2=".3" y2="1"><stop stop-color="#f5ba76"/><stop offset=".53" stop-color="#db896a"/><stop offset="1" stop-color="#786f83"/></linearGradient>
      <linearGradient id="${id}light" x2="1" y2="1"><stop stop-color="#ffd699" stop-opacity=".68"/><stop offset="1" stop-color="#ffe0bb" stop-opacity="0"/></linearGradient>
      <linearGradient id="${id}desk" x2=".07" y2="1"><stop stop-color="#dca979"/><stop offset=".33" stop-color="#a5674e"/><stop offset=".36" stop-color="#754535"/><stop offset="1" stop-color="#302831"/></linearGradient>
      <radialGradient id="${id}shade"><stop offset=".48" stop-color="#101e35" stop-opacity="0"/><stop offset="1" stop-color="#10172b" stop-opacity=".55"/></radialGradient>
      <pattern id="${id}grain" width="11" height="13" patternUnits="userSpaceOnUse"><path d="M2 3h1m6 5h1m-5 3h1" stroke="#fff3d1" opacity=".18" stroke-width=".6"/></pattern>
    </defs>
    <path fill="#203050" d="M0 0h760v430H0z"/><path fill="url(#${id}wall)" d="M0 0h760v281H0z"/>
    <path fill="url(#${id}floor)" d="M0 286l306-47h151l303 46v145H0z"/>
    <path fill="#34455b" d="M0 0h760L462 91H303z"/><path fill="#21384f" d="M0 0l303 91v148L0 302zm760 0L462 91v148l298 66z"/>
    <path fill="#446679" d="M0 28l296 72v135L0 275zm760 4L469 104v131l291 44z"/>
    <path fill="#283e54" d="M305 89h157v151H305z"/>
    <path fill="#b6a185" d="M319 105h126v135H319z"/><path fill="#425966" d="M325 111h114v129H325z"/>
    <path fill="url(#${id}sky)" d="M334 118h96v119h-96z"/><path d="M335 213q14-15 32-1 26-30 62-10v35h-95" fill="#7e817e"/>
    <path d="M350 118v120m64-120v120m-81-61h98" stroke="#485565" stroke-width="4"/><path d="M330 238h104" stroke="#e4ad7d" stroke-width="4"/>
    <path d="M0 48l275 65v107L0 253z" fill="#b38f77"/><path d="M0 56l267 62v96L0 243z" fill="url(#${id}sky)"/>
    <circle cx="86" cy="134" r="32" fill="#ffdb9c" opacity=".91"/>
    <path d="M0 196q41-20 82 1 36-26 72-2 50-18 113 9v10L0 243" fill="#886c79"/>
    <path d="M0 222q44-36 88-8 30-28 56-6 45-6 76 10L0 243" fill="#45576a"/>
    <path d="M110 78v154m90-135v125m55-111v106M0 160l269 5" stroke="#514f60" stroke-width="6"/>
    <path d="M0 248l271-30L603 349H164z" fill="url(#${id}light)" opacity=".61"/>
    <path d="M0 293l306-54m454 56l-303-56M0 330l341-91M760 334l-339-95M101 352l255-113m298 110L405 239m-24 0v136M0 321h760M73 281h610M199 261h354" stroke="#89908c" opacity=".29" fill="none"/>
    <path d="M28 0l276 89m427-89L459 89" stroke="#829093" opacity=".38" stroke-width="2"/>
    <path d="M320 55h121l-19 11h-82z" fill="#dbb581" opacity=".64"/><path d="M346 78h70l-12 5h-46z" fill="#dcba93" opacity=".6"/>
    <path d="M554 95l155-40v122l-155 8z" fill="#213a46" stroke="#789291" stroke-width="3"/>
    <path d="M570 103l120-28v83l-120 13z" fill="#365961"/>
    <path d="M582 112l31-7v31l-31 5zm68-14 23-5v29l-23 3z" fill="#d5a16d"/><path d="M619 124l23-4v31l-23 3z" fill="#9fb6a9"/>
    <path d="M582 117l21-4m-21 10 16-3m25 9 14-2m-14 7 12-2m22-33 13-3" stroke="#62565a" stroke-width="1.5"/>
    <path d="M705 270l-9-39h-35l-7 39z" fill="#9a705d"/><path d="M678 240q-2-42-26-61 30 4 36 47 5-39 33-48-7 38-32 59m-1-5q-2-46 13-69 12 41-8 73" fill="#658678"/>
    <path d="M0 0h760v430H0z" fill="url(#${id}grain)"/><path d="M0 0h760v430H0z" fill="url(#${id}shade)"/>`;
  }
  function mia(id) {
    return `<defs>
      <linearGradient id="${id}skin" x2=".85" y2="1"><stop stop-color="#ffdcaf"/><stop offset=".62" stop-color="#efad87"/><stop offset="1" stop-color="#bf776b"/></linearGradient>
      <linearGradient id="${id}hair" x2=".8" y2="1"><stop stop-color="#5a3a3b"/><stop offset=".48" stop-color="#332a35"/><stop offset="1" stop-color="#222234"/></linearGradient>
      <linearGradient id="${id}coat" x2=".75" y2="1"><stop stop-color="#ffd38a"/><stop offset=".5" stop-color="#d99648"/><stop offset="1" stop-color="#915c3c"/></linearGradient>
      <radialGradient id="${id}blush"><stop stop-color="#cf6772" stop-opacity=".65"/><stop offset="1" stop-color="#cf6772" stop-opacity="0"/></radialGradient>
    </defs>
    <g class="mia-track"><g class="mia-bob"><g class="mia-pose">
      <ellipse cx="120" cy="355" rx="63" ry="11" fill="#1e242c" opacity=".35"/>
      <g class="mia-leg leg-a"><path d="m83 257 34 1-1 77-28 2z" fill="#343e51"/><path d="m88 329 28 2 2 19H77q-7-12 11-21" fill="#242a3c"/><path d="M76 350h43" stroke="#b99a82" stroke-width="4"/></g>
      <g class="mia-leg leg-b"><path d="M119 257h32l-2 79-28-1z" fill="#3e4b5b"/><path d="m122 330 27-1q19 11 13 21h-44z" fill="#2a3042"/><path d="M118 350h45" stroke="#b99a82" stroke-width="4"/></g>
      <path d="M67 188q-19 16-21 49l8 29 24-3-1-53" fill="#ad7041" stroke="#935c3d" stroke-width="2"/><path d="M50 262q1 19 13 17 10-1 9-17" fill="url(#${id}skin)"/>
      <path d="M79 171q-23 19-21 79l8 27q45 15 100-1l9-21-4-61q-5-17-32-23z" fill="url(#${id}coat)" stroke="#936143" stroke-width="2"/>
      <path d="M70 227q-2 38 1 45m92-49 1 49m-46-73 1 76" fill="none" stroke="#9f603d" opacity=".65" stroke-width="2"/>
      <path d="M95 155v26q19 21 43 1v-26" fill="url(#${id}skin)"/><path d="m94 175 24 22-16 16-23-31m61-7-22 22 13 16 23-31" fill="#ffedc7" stroke="#c99863" stroke-width="1.2"/>
      <path d="M140 225h18v17q-10 6-18 0z" fill="#edb568" stroke="#aa6f48"/><path d="m144 229 10 0" stroke="#fbda95"/>
      <g fill="#7f4f3f"><circle cx="119" cy="217" r="2"/><circle cx="119" cy="236" r="2"/><circle cx="119" cy="255" r="2"/></g>
      <g class="mia-head">
        <path d="M58 74q0-43 34-53 46-20 80 14 25 25 16 75l-7 54q-8 14-27 15l-75-1q-21-9-21-43z" fill="url(#${id}hair)" stroke="#352936" stroke-width="2"/>
        <path d="M67 103q-18-9-11 15 4 12 14 10m97-25q17-11 13 12-2 11-12 14" fill="url(#${id}skin)" stroke="#a86665" stroke-width="1.3"/>
        <path d="M60 111q9-1 9 10m107-10q-7 0-7 10" fill="none" stroke="#b97470" stroke-width="2"/>
        <path d="M69 72q2-36 48-37 49 1 52 44l-3 40q-3 34-29 49-16 9-31 1-36-15-38-52z" fill="url(#${id}skin)" stroke="#af7469" stroke-width="1.5"/>
        <path d="M61 100q-3-40 12-53 37-40 81-14 32 20 26 70-24-2-40-22-9-12-14-27-13 24-38 36-10 4-27 10z" fill="url(#${id}hair)"/>
        <path d="M67 85q29-8 53-42M72 76q23-8 39-30m23-4q32 8 39 46m-33-39q19 8 27 24m-101 43q-3 30 12 42m100-43q0 25-8 41" fill="none" stroke="#a0695d" stroke-linecap="round" opacity=".43" stroke-width="2"/>
        <path d="M75 56q20-25 45-23" stroke="#e3a674" opacity=".32" stroke-width="2" fill="none" stroke-linecap="round"/>
        <circle cx="65" cy="129" r="3.5" fill="#f3d59b"/><circle cx="174" cy="128" r="3.5" fill="#f3d59b"/>
        <g class="mia-brows" fill="none" stroke="#674139" stroke-width="2.9" stroke-linecap="round"><path class="brow-a" d="M81 99q9-6 21-2"/><path class="brow-b" d="M134 97q10-4 20 2"/></g>
        <g class="mia-eyes">
          <path d="M80 111q11-10 24-1-10 9-22 4m51-4q13-10 24 1l-2 3q-12 5-22-4" fill="#fff0dd" stroke="#7b4f47" stroke-width="1.1"/>
          <g class="mia-gaze"><ellipse cx="94" cy="110.6" rx="5" ry="5.6" fill="#754f42"/><ellipse cx="144" cy="110.6" rx="5" ry="5.6" fill="#754f42"/><path d="M94 109v4m50-4v4" stroke="#262431" stroke-width="3.4" stroke-linecap="round"/><path d="M93 108h.3m50 0h.3" stroke="#fff9de" stroke-width="2" stroke-linecap="round"/></g>
          <path d="M80 111q11-10 24-1m29 0q13-10 24 1" fill="none" stroke="#523438" stroke-width="2" stroke-linecap="round"/>
        </g>
        <path class="smile-eyes" d="M80 114q10-11 23-2m30 1q12-10 24 0" fill="none" stroke="#65403b" stroke-width="2.5" stroke-linecap="round"/>
        <g class="mia-cheeks" fill="url(#${id}blush)"><ellipse cx="82" cy="127" rx="18" ry="10"/><ellipse cx="153" cy="127" rx="18" ry="10"/></g>
        <path d="M117 109q0 9-4 16 6 3 11 0" fill="none" stroke="#b9756a" stroke-width="1.65" stroke-linecap="round"/><path d="M118 116l-2 7" stroke="#ffd7ad" stroke-width="1.5" stroke-linecap="round"/>
        <g class="mouth-rest"><path d="M107 141q10-4 22 0" fill="none" stroke="#884c52" stroke-width="2" stroke-linecap="round"/><path d="M114 145q5 2 10 0" fill="none" stroke="#e29283" stroke-width="1.3"/></g>
        <g class="mouth-talk"><path d="M108 140q10-5 21-1-4 12-11 11-7 0-10-10" fill="#71363d"/><path d="M111 140q7-2 15-1l-2 3h-11z" fill="#ffe8d7"/><path d="M115 148q4-3 8-1-4 3-8 1" fill="#dc7a81"/></g>
        <path class="mouth-narrow" d="M111 140q7-4 15 0-3 6-8 6-4 0-7-6z" fill="#80434b"/>
        <g class="mouth-smile"><path d="M101 136q17 7 35-2-4 19-18 20-10 0-17-18" fill="#813e4b"/><path d="M105 138q14 4 26-1l-4 6h-17z" fill="#fff2dd"/><path d="M113 151q7-6 15-3-6 7-15 3" fill="#d98187"/></g>
      </g>
      <g class="mia-arm"><path d="M165 185q21 17 24 54l-11 26-17-8 4-24-11-31" fill="url(#${id}coat)" stroke="#99613d" stroke-width="2"/><path d="M165 256q-2 15 8 20 12 0 8-13l-5-6z" fill="url(#${id}skin)" stroke="#b87562"/></g>
      <g class="mia-point"><path d="M164 218q17 10 27-11l-3-31-18 2-6 17" fill="url(#${id}coat)" stroke="#99613d" stroke-width="2"/><path d="M171 178q-4-14 1-17 3-2 6 8l4-17q4-6 6 0l-1 13q8-4 10 1 1 7-8 13z" fill="url(#${id}skin)" stroke="#ac725e" stroke-width="1.5"/></g>
      <g class="mia-thumb"><path d="M162 205q9 21 29 4 10-11 10-26l-25-3-11 10" fill="url(#${id}coat)" stroke="#99613d" stroke-width="2"/><path d="M179 184q-3-6 1-12l3-8-1-16q1-6 6-4 5 3 6 15l-1 6 13-1q6 3 4 8 3 5-1 9 1 5-5 7l-15 2z" fill="url(#${id}skin)" stroke="#a8695e" stroke-width="1.7"/><path d="m199 172 10 0m-10 7 9 0m-11 5 7 0" stroke="#b77765" stroke-width="1.3" fill="none"/></g>
    </g></g></g>`;
  }
  function hands(id) {
    return `<g class="pov-hands" stroke-linejoin="round">
      <g class="pov-left"><path d="M44 440l25-38 48-19 13 27-29 31" fill="#24394f" stroke="#182b40" stroke-width="3"/><path d="m101 397 19-17 7-15q3-6 7-2 2 3-2 11l15-12q7-4 8 1l-9 10 13-6q7-3 7 3l-15 10 12-2q7 0 5 5l-18 8-14 14-19 6z" fill="url(#${id}skin)" stroke="#9c665c" stroke-width="1.6"/><path d="m121 394 12-7 14-4" stroke="#b77468" opacity=".7" fill="none"/><path d="m64 418 31-18 11 13-22 18" fill="#39536a"/></g>
      <g class="pov-right"><path d="M720 442l-16-46-38-15-20 26 26 36" fill="#24394f" stroke="#182b40" stroke-width="3"/><path d="m675 394-19-18-7-16q-4-7-8-3-3 4 1 12l-15-12q-6-4-8 1l9 11-13-6q-6-2-7 3l16 11-13-2q-7 1-4 6l17 7 13 14 20 8z" fill="url(#${id}skin)" stroke="#9c665c" stroke-width="1.6"/><path d="m645 387-11-6-12-3" stroke="#b77468" opacity=".7" fill="none"/><path d="m683 407 19 10 7 15-17-6" fill="#39536a"/></g>
    </g>`;
  }
  function handoff(id, bottle, item, x) {
    // One travel origin places the sleeve and finger rigs relative to the same bottle.
    return `<g transform="translate(${x+14.5} 246)">
      <g class="handoff" style="--travel:${355-(x+14.5)}px">
        <g class="handoff-hands" stroke-linejoin="round">
          <path d="M-173 215-133 176-73 94-35 49-14 56-21 78-66 155-99 215z" fill="#2a4158" stroke="#162a3e" stroke-width="3"/>
          <path d="m-53 69 18-22 23 12-10 19z" fill="#52728a"/>
          <path d="M-36 48q3-14 11-20l12-4q7 0 6 5l-11 6 9-2q5 1 3 5l-7 4 6 1q4 2 1 5l-8 3-5 9z" fill="url(#${id}skin)" stroke="#a76c63" stroke-width="1.3"/>
          <path d="M173 215h-68l-54-82-37-56-6-20 20-11 35 44 64 81z" fill="#2a4158" stroke="#162a3e" stroke-width="3"/>
          <path d="m12 59 17-13 17 21-19 13z" fill="#52728a"/>
          <path d="M28 47q-4-12-11-18L5 23q-6 0-5 5l10 7-8-2q-5 1-3 5l7 4-7 2q-3 2 0 5l10 3 5 7z" fill="url(#${id}skin)" stroke="#a76c63" stroke-width="1.3"/>
        </g>
        <g class="carry-bottle" transform="translate(-14.5 0)">${bottle(item,'width="29" height="43"')}</g>
        <path class="handoff-fingers" d="m-19 33 11-4q6-1 6 3l-11 9m31-8-11-4q-6-1-6 3l11 9" fill="url(#${id}skin)" stroke="#a76c63" stroke-width="1.3" stroke-linecap="round"/>
        <path class="mia-receive" d="M-19 24q-6 0-8 8l3 7q7 7 18 1L6 34q3-4-1-5l-11 3 8-6q2-4-3-4l-10 5-2-6z" fill="url(#${id}skin)" stroke="#a76c63" stroke-width="1.3"/>
      </g>
    </g>`;
  }
  function stage({cut='counter', item=null, bottle, items=[], caseNo=1, listening=false, settled=false}={}) {
    const id = `act-${cut}-`;
    const kind = cut==='observer'?'observer':cut==='ending'?'return':listening?`listen-${active.kind}`:active.kind;
    const elapsed=Math.max(0, now()-active.at);
    const past=reduced()||settled?10000:Math.min(elapsed,10000);
    const cue=cut==='ending'?cues.return:cut==='observer'?'Listen back. Find the moment it clicked.':listening?'I’m listening…':active.cue;
    const caption=String(cue).length>145?String(cue).slice(0,142)+'…':cue;
    const bottles=items.map((x,i)=>`<g class="diegetic-bottle ${item?.id===x.id?'is-returned':''}" transform="translate(${552+i*36} 246)">${bottle(x, 'width="29" height="43"')}</g>`).join('');
    const pickX=552+items.indexOf(item)*36;
    return `<section class="cinema ${voice?'voicing':''}" data-cut="${cut}" data-beat="${kind}" style="--beat-lag:-${past}ms" aria-label="${cut==='ending'?'Bottle return scene':cut==='observer'?'Reflection worktable':'First-person view of the lost-property counter'}">
      <svg class="cinema-world" viewBox="0 0 760 430" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        ${school(id)}
        <g class="scene-rays" fill="#fff7cc" opacity=".64">${[[91,87],[252,168],[320,66],[61,227],[178,119],[521,140],[467,77],[702,233],[148,259]].map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${i%3===0?1.8:1}" />`).join('')}</g>
        <g transform="translate(235 43)">${mia(id)}</g>
        <path d="M0 296h760v134H0z" fill="url(#${id}desk)"/><path d="M0 297h760m0 45H0" stroke="#f4c78a" stroke-width="3" opacity=".68"/>
        <path d="M0 310h760M0 322h760M0 332h760" stroke="#623a37" opacity=".32"/>
        <path d="M538 293h176l-11 10H531z" fill="#2e2936"/><path d="M542 289h175l-5 6H536z" fill="#dcb58a"/>
        ${cut==='observer'?`<g class="field-props" transform="translate(570 263) rotate(-12)"><path d="M-8 7h95v63H-8z" fill="#4c3331" opacity=".6"/><rect x="-6" width="89" height="63" rx="3" fill="#be8a59"/><path d="M0 5h74v51H0z" fill="#f4e1b8"/><path d="M10 17h54m-54 9h54m-54 9h54m-54 9h54" stroke="#aa8463"/><path d="M45 51l53-32 2 4-52 32-6 1z" fill="#396462"/></g>`:bottles}
        <g transform="translate(39 256)"><path d="M0 42l9-38h82l9 38z" fill="#4b484e" stroke="#e0b886" stroke-width="1.6"/><path d="M14 10h71v25H14z" fill="#d2ac7e"/><text x="49" y="27" text-anchor="middle" style="font:750 8px system-ui;letter-spacing:.9px" fill="#513d3d">COUNTER</text></g>
        ${cut!=='observer'?`<g class="playing-hands">${hands(id)}</g>`:''}
        ${item?handoff(id,bottle,item,pickX):''}
        <g class="return-stars" stroke="#fff0bd" stroke-width="1.65" fill="none"><path d="M433 132v18m-9-9h18m-22 44v11m-6-6h12m28-25v12m-6-6h12"/><circle cx="439" cy="155" r="1.8"/><circle cx="422" cy="165" r="1"/></g>
        <path d="M0 0h760v430H0z" fill="url(#${id}grain)" opacity=".4"/>
      </svg>
      <div class="film-meta"><span class="film-dot"></span>${cut==='observer'?'FIELD NOTES · OBSERVER VIEW':cut==='ending'?'FINAL SHOT · ITEM RETURN':`GREENWOOD SCHOOL · CASE ${String(caseNo).padStart(2,'0')}`}</div>
      <div class="film-caption"><b>${cut==='observer'?'REVIEW CUE':'MIA'}</b><span>${caption.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</span></div>
      <div class="film-footer"><span>${cut==='observer'?'ACT II · THE WORKTABLE':cut==='ending'?'BACK TO ITS OWNER':'ACT I · YOUR VIEW FROM THE COUNTER'}</span>${cut==='ending'?'<div><button class="film-control" type="button" data-cinema-replay="ending">Replay return</button><button class="film-control film-skip" type="button" data-cinema-skip>Skip</button></div>':''}</div>
    </section>`;
  }
  function restart(el, kind) {
    play(kind);
    el.classList.add('scene-reset');
    el.style.setProperty('--beat-lag','0ms');
    el.dataset.beat=kind;
    void getComputedStyle(el.querySelector('.mia-head')).animationName;
    el.classList.remove('scene-reset');
    const caption=el.querySelector('.film-caption span');
    if(caption)caption.textContent=cues[kind];
  }
  function bind(root=document) {
    root.querySelectorAll('[data-cinema-replay]').forEach(button=>button.addEventListener('click',()=>{
      const el=button.closest('.cinema');el.classList.remove('scene-skipped');restart(el,'return');
    }));
    root.querySelector('[data-cinema-skip]')?.addEventListener('click',e=>{
      active.at=now()-10000;e.target.closest('.cinema').classList.add('scene-skipped');
    });
  }
  return {stage,intent,play,reply,speaking,typing,bind,reset:()=>play('still'), state:()=>active.kind};
})();
