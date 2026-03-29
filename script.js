/* ════════════════════════════════════════════════════════════
   CORE STATE
════════════════════════════════════════════════════════════ */
const slides = Array.from(document.querySelectorAll('.slide'));
const N = slides.length;
let cur = 0;
let inTrans = false;
let audioOn = false;
let curAudio = null;
let mediaUnlocked = false;

const meta = slides.map(s => ({
  i: +s.dataset.i,
  w: s.dataset.w,
  ch: s.dataset.ch
}));

const TLOU_FIRST = 1;
const MC_FIRST   = 7;

/* ════════════════════════════════════════════════════════════
   CURSOR
════════════════════════════════════════════════════════════ */
const cd = document.getElementById('cd');
const cr = document.getElementById('cr');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove', e => {
  mx=e.clientX; my=e.clientY;
  cd.style.left=mx+'px'; cd.style.top=my+'px';
});
(function loop(){
  rx+=(mx-rx)*0.1; ry+=(my-ry)*0.1;
  cr.style.left=rx+'px'; cr.style.top=ry+'px';
  requestAnimationFrame(loop);
})();
document.querySelectorAll('button').forEach(b=>{
  b.addEventListener('mouseenter',()=>{cd.style.width='16px';cd.style.height='16px';cr.style.width='48px';cr.style.height='48px';});
  b.addEventListener('mouseleave',()=>{cd.style.width='8px';cd.style.height='8px';cr.style.width='34px';cr.style.height='34px';});
});

/* ════════════════════════════════════════════════════════════
   BUILD DOTS + APPLE-DOCK MAGNIFICATION
════════════════════════════════════════════════════════════ */
const dotNav = document.getElementById('dotNav');
slides.forEach((s,i)=>{
  const d = document.createElement('div');
  d.className='dnav'+(i===0?' on':'');
  d.dataset.lbl = s.dataset.ch || '';
  d.onclick = ()=>go(i);
  dotNav.appendChild(d);
});

// Scale tiers: index 0 = hovered dot, 1 = immediate neighbour, 2 = next neighbour
const DOCK_SCALES = [2.6, 1.7, 1.25];

function applyDockMag(hoveredIdx) {
  const dots = Array.from(dotNav.querySelectorAll('.dnav'));
  dots.forEach((dot, i) => {
    const dist = Math.abs(i - hoveredIdx);
    const scale = dist < DOCK_SCALES.length ? DOCK_SCALES[dist] : 1;
    dot.style.setProperty('--dot-scale', scale);
    dot.classList.toggle('dock-hover', i === hoveredIdx);
  });
}

function resetDockMag() {
  const dots = Array.from(dotNav.querySelectorAll('.dnav'));
  dots.forEach(dot => {
    // restore to 1 for normal dots, 1.45 for the active dot (set via CSS)
    dot.style.removeProperty('--dot-scale');
    dot.classList.remove('dock-hover');
  });
}

dotNav.addEventListener('mouseleave', resetDockMag);

// Attach dock listeners after dots are built (use event delegation on the container)
dotNav.addEventListener('mousemove', e => {
  const dot = e.target.closest('.dnav');
  if (!dot) return;
  const dots = Array.from(dotNav.querySelectorAll('.dnav'));
  const idx  = dots.indexOf(dot);
  if (idx !== -1) applyDockMag(idx);
});

/* ════════════════════════════════════════════════════════════
   GO TO SLIDE
════════════════════════════════════════════════════════════ */
function go(idx){
  if(inTrans || idx===cur || idx<0 || idx>=N) return;

  const fromW = meta[cur].w;
  const toW   = meta[idx].w;
  const cross  = (fromW==='tlou'&&toW==='mc')||(fromW==='mc'&&toW==='tlou');

  if(cross && fromW!=='divider' && toW!=='divider'){
    doWipe(idx, toW);
  } else {
    crossFade(cur, idx);
  }
}

function crossFade(from, to){
  const fEl = slides[from];
  const tEl = slides[to];

  fEl.style.transition = 'opacity 0.45s ease';
  fEl.style.opacity = '0';

  setTimeout(()=>{
    fEl.classList.remove('on');
    fEl.style.opacity='';
    fEl.style.transition='';

    cur = to;
    tEl.classList.add('on');
    updateTheme(to);
    updateUI(to);
    handleVideos(to);
    playAudio(to);
  }, 420);
}

/* ════════════════════════════════════════════════════════════
   CINEMATIC WIPE
════════════════════════════════════════════════════════════ */
function doWipe(targetIdx, toWorld){
  inTrans=true;
  const ov = document.getElementById('wipeOverlay');
  const fill = document.getElementById('wipeFill');
  const msg  = document.getElementById('wipeMsg');

  msg.textContent = toWorld==='mc'
    ? 'Entering the world of Minecraft…'
    : 'Returning to The Last of Us II…';

  ov.style.opacity='1';
  ov.classList.add('active');

  /* fill down */
  fill.style.transition='transform 0.65s cubic-bezier(0.76,0,0.24,1)';
  fill.style.transformOrigin='bottom';
  fill.style.transform='scaleY(1)';

  setTimeout(()=>{ msg.style.opacity='1'; msg.style.transition='opacity 0.35s'; },250);

  setTimeout(()=>{
    /* swap slides */
    slides.forEach(s=>s.classList.remove('on'));
    cur=targetIdx;
    slides[cur].classList.add('on');
    updateTheme(cur);
    updateUI(cur);
    handleVideos(cur);
    seedParticles();
  }, 720);

  /* wipe up */
  setTimeout(()=>{
    msg.style.opacity='0';
    fill.style.transformOrigin='top';
    fill.style.transition='transform 0.65s cubic-bezier(0.76,0,0.24,1)';
    fill.style.transform='scaleY(0)';
    setTimeout(()=>{
      ov.style.opacity='0';
      ov.classList.remove('active');
      fill.style.transformOrigin='bottom';
      fill.style.transition='none';
      fill.style.transform='scaleY(0)';
      inTrans=false;
      playAudio(cur);
    },680);
  },1250);
}

/* ════════════════════════════════════════════════════════════
   WORLD JUMP HELPERS
════════════════════════════════════════════════════════════ */
function jumpWorld(w){
  go(w==='mc' ? MC_FIRST : TLOU_FIRST);
}
function switchMC(){ go(MC_FIRST); }

/* ════════════════════════════════════════════════════════════
   THEME + UI UPDATE
════════════════════════════════════════════════════════════ */
function updateTheme(idx){
  const w = meta[idx].w;
  document.body.classList.toggle('mc-world',  w==='mc');
  document.body.classList.toggle('tlou-world', w!=='mc');
  document.getElementById('ptlou').classList.toggle('on', w!=='mc');
  document.getElementById('pmc').classList.toggle('on',  w==='mc');
}

function updateUI(idx){
  const m = meta[idx];
  /* dots */
  document.querySelectorAll('.dnav').forEach((d,i)=>d.classList.toggle('on',i===idx));
  /* chapter tag */
  document.getElementById('chapTag').textContent = m.ch||'';
  /* progress line */
  document.getElementById('progLine').style.width = (idx/(N-1)*100)+'%';
  /* brand */
  document.getElementById('brand').textContent =
    m.w==='mc' ? 'Home' : m.w==='tlou' ? 'Home' : 'Home';
}

/* ════════════════════════════════════════════════════════════
   VIDEO MANAGEMENT
════════════════════════════════════════════════════════════ */
function handleVideos(idx){
  slides.forEach((s,i)=>{
    const v = s.querySelector('video');
    if(!v) return;

    if(i===idx){
      v.muted = !audioOn;
      v.volume = audioOn ? 1 : 0;
      v.play().catch(()=>{});
    } else {
      v.pause();
      v.currentTime = 0;
      v.muted = true;
      v.volume = 0;
    }
  });
}

/* ════════════════════════════════════════════════════════════
   AUDIO NARRATION
════════════════════════════════════════════════════════════ */
function playAudio(idx){
  if(curAudio){
    curAudio.pause();
    curAudio.currentTime = 0;
  }
  if(!audioOn || !mediaUnlocked) return;
  const a = document.getElementById('a' + idx);
  if(a){
    a.volume = 0.75;
    a.play().catch(()=>{});
    curAudio = a;
  }
}

function syncVideoAudio(){
  const activeVideo = slides[cur]?.querySelector('video');
  slides.forEach((s, i) => {
    const v = s.querySelector('video');
    if(!v) return;
    const isActive = i === cur;
    v.muted = !(audioOn && mediaUnlocked && isActive);
    v.volume = audioOn && mediaUnlocked && isActive ? 1 : 0;
  });
  if(activeVideo){
    activeVideo.play().catch(()=>{});
  }
}

function unlockMedia(){
  if(mediaUnlocked) return;
  mediaUnlocked = true;
  syncVideoAudio();
  if(audioOn) playAudio(cur);
}

function toggleAudio(){
  audioOn = !audioOn;
  const btn = document.getElementById('audioBtn');
  btn.textContent = audioOn ? '🔊' : '🔇';
  btn.classList.toggle('off', !audioOn);

  if(!audioOn && curAudio){
    curAudio.pause();
    curAudio.currentTime = 0;
  }

  syncVideoAudio();

  if(audioOn && mediaUnlocked) playAudio(cur);
}

/* ════════════════════════════════════════════════════════════
   MC PARTICLES
════════════════════════════════════════════════════════════ */
function seedParticles(){
  const cols=['rgba(78,184,58,0.5)','rgba(249,199,79,0.4)','rgba(135,206,235,0.4)','rgba(139,94,60,0.4)','rgba(255,255,255,0.2)'];
  const szs=[8,10,14,18,12];
  ['mcp7','mcp8','mcp9','mcp10','mcp11','mcp12'].forEach(id=>{
    const c=document.getElementById(id);
    if(!c||c.childElementCount>0) return;
    for(let i=0;i<20;i++){
      const p=document.createElement('div');
      p.className='mcp';
      p.style.left=Math.random()*100+'%';
      p.style.top=Math.random()*100+'%';
      p.style.setProperty('--sz',szs[Math.floor(Math.random()*szs.length)]+'px');
      p.style.setProperty('--c',cols[Math.floor(Math.random()*cols.length)]);
      p.style.setProperty('--d',(5+Math.random()*8)+'s');
      p.style.setProperty('--dl',(Math.random()*4)+'s');
      p.style.setProperty('--op',(0.2+Math.random()*0.4)+'');
      c.appendChild(p);
    }
  });
}

/* ════════════════════════════════════════════════════════════
   POLL
════════════════════════════════════════════════════════════ */
const VKEY='two_worlds_v3';
function getVotes(){ try{return JSON.parse(localStorage.getItem(VKEY))||{tlou:4,mc:6};}catch{return{tlou:4,mc:6};} }
function saveVotes(v){ try{localStorage.setItem(VKEY,JSON.stringify(v));}catch{} }

function castVote(ch){
  const v=getVotes(); v[ch]++;
  saveVotes(v); showPoll(v,ch);
}
function showPoll(v,chose){
  const tot=v.tlou+v.mc;
  const tp=Math.round((v.tlou/tot)*100);
  const mp=100-tp;
  document.getElementById('tpct').textContent=tp+'%';
  document.getElementById('mpct').textContent=mp+'%';
  document.getElementById('pvote').textContent=tot+' total votes';
  document.getElementById('pthanks').textContent=
    chose==='tlou'?'You chose The Last of Us':'You chose Minecraft!';

  /* Update the re-explore button to match the voted game */
  const reBtn   = document.getElementById('reExploreBtn');
  const reLabel = document.getElementById('reExploreLabel');
  if(chose==='tlou'){
    reLabel.textContent = 'Re-explore The Last of Us';
    reBtn.onclick = () => jumpWorld('tlou');
  } else {
    reLabel.textContent = 'Re-explore Minecraft';
    reBtn.onclick = () => jumpWorld('mc');
  }

  const g=document.getElementById('pollGrid');
  g.style.opacity='0'; g.style.transform='scale(0.95)'; g.style.transition='all 0.4s';
  setTimeout(()=>{
    g.style.display='none';
    const r=document.getElementById('pollRes');
    r.style.display='flex'; r.classList.add('show');
    document.getElementById('tbar').style.width=tp+'%';
    document.getElementById('mbar').style.width=mp+'%';
    setTimeout(()=>{
      document.getElementById('tbar').classList.add('go');
      document.getElementById('mbar').classList.add('go');
    },100);
  },400);
}

/* ════════════════════════════════════════════════════════════
   INPUT — KEYBOARD & WHEEL & TOUCH
════════════════════════════════════════════════════════════ */
document.addEventListener('keydown',e=>{
  if(e.key==='ArrowRight'||e.key==='ArrowDown') go(cur+1);
  if(e.key==='ArrowLeft'||e.key==='ArrowUp')    go(cur-1);
});

let wt=0;
document.addEventListener('wheel',e=>{
  const now=Date.now();
  if(now-wt<850) return; wt=now;
  if(e.deltaY>20) go(cur+1);
  else if(e.deltaY<-20) go(cur-1);
},{passive:true});

let ty=0;
document.addEventListener('touchstart',e=>{ty=e.touches[0].clientY;},{passive:true});
document.addEventListener('touchend',e=>{
  const dy=ty-e.changedTouches[0].clientY;
  if(Math.abs(dy)>50) go(dy>0?cur+1:cur-1);
},{passive:true});


document.addEventListener('pointerdown', unlockMedia, { once: true });
document.addEventListener('keydown', unlockMedia, { once: true });
document.addEventListener('touchstart', unlockMedia, { once: true, passive: true });

/* ════════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════════ */
window.addEventListener('load',()=>{
  slides[0].classList.add('on');
  updateUI(0);
  handleVideos(0);
  syncVideoAudio();
  seedParticles();
  /* seed votes */
  try{ if(!localStorage.getItem(VKEY)) localStorage.setItem(VKEY,JSON.stringify({tlou:4,mc:6})); }catch{}
});