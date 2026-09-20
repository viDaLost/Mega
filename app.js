(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const canvas = $('#gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const tg = window.Telegram?.WebApp;
  if (tg) { try { tg.ready(); tg.expand(); tg.setHeaderColor('#08111c'); tg.setBackgroundColor('#08111c'); } catch {} }

  const ui = {
    menu: $('#menu'), game: $('#game'), modal: $('#modal'), title: $('#modalTitle'), body: $('#modalBody'), modalBtn: $('#modalBtn'),
    score: $('#scoreText'), eaten: $('#eatenText'), level: $('#levelText'), health: $('#hungerFill'), play: $('#playBtn'), how: $('#howBtn'), sound: $('#soundBtn'),
    emp: $('#empText')
  };

  const ASSET_PATH = './assets/original/';
  const embedded = window.RECOVERED_ASSETS || {};
  const assetFiles = {
    ground: 'GroundStrip_Tex.png', background: 'Background_Classic_Tex.png', worm: 'Wojira_Tex.png',
    actors: 'Actors_Classic_Tex.png', fx: 'FX_Tex.png', hud: 'HUD_Tex.png',
    boss0: 'Actor_Bosses_Tex.png', boss1: 'Actor_Bosses1_Tex.png', boss2: 'Actor_Bosses2_Tex.png', boss3: 'Actor_Bosses3_Tex.png', boss4: 'Actor_Bosses4_Tex.png'
  };
  // Values recovered from the original SMW_Player constructor (Unity 4.3.4f1).
  const ORIGINAL_PHYSICS = Object.freeze({
    topSpeed:15, lowSpeed:6, acceleration:.4, groundFriction:.4, launchBoost:3,
    turnAcceleration:5, turnMax:10, jumpTurnMax:4, jumpTurnAcceleration:.2,
    gravity:.35, downwardTopSpeed:40, healthMaxStart:100, healthPerSegment:4,
    startLength:5, startLengthMax:8, empDist:128, pileDriverSpeed:40
  });
  // Original game units are converted to CSS pixels for the web canvas.
  const WORLD_UNIT = 12;
  const images = {};
  let assetsReady = false;
  async function loadAssets() {
    const jobs = Object.entries(assetFiles).map(([key, file]) => new Promise((resolve) => {
      const im = new Image(); im.onload = () => { images[key] = im; resolve(); }; im.onerror = () => resolve(); im.src = embedded[file.replace(/\.png$/, '')] || (ASSET_PATH + file);
    }));
    await Promise.all(jobs); assetsReady = true; ui.play.textContent = 'Играть'; ui.play.disabled = false;
  }
  ui.play.disabled = true; ui.play.textContent = 'Загрузка…'; loadAssets();

  let W=0,H=0,groundY=0,last=0,running=false,paused=false,sound=true,frame=0;
  const keys={left:false,right:false,boost:false};
  const state={score:0,level:1,eaten:0,target:10,health:100,combo:0,spitCooldown:0,slamCooldown:0,empCharge:0};
  const worm={x:160,y:320,vx:ORIGINAL_PHYSICS.lowSpeed*WORLD_UNIT,vy:0,angle:-0.25,speed:ORIGINAL_PHYSICS.topSpeed*WORLD_UNIT,radius:15,segments:ORIGINAL_PHYSICS.startLength,trail:[],airborne:false};
  let entities=[],particles=[],shots=[],shockwaves=[];

  function resize(){
    const r=canvas.getBoundingClientRect(); W=Math.max(320,r.width); H=Math.max(480,r.height); canvas.width=Math.round(W*DPR); canvas.height=Math.round(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0); ctx.imageSmoothingEnabled=false; groundY=H*.52; if(!running){worm.x=W*.35;worm.y=groundY+80;}
  }
  addEventListener('resize',resize,{passive:true}); resize();

  function reset(){
    Object.assign(state,{score:0,level:1,eaten:0,target:10,health:100,combo:0,spitCooldown:0,slamCooldown:0,empCharge:0});
    Object.assign(worm,{x:W*.25,y:groundY+90,vx:ORIGINAL_PHYSICS.lowSpeed*WORLD_UNIT,vy:-40,angle:-.25,speed:ORIGINAL_PHYSICS.topSpeed*WORLD_UNIT,radius:15,segments:ORIGINAL_PHYSICS.startLength,trail:[],airborne:false});
    entities=[];particles=[];shots=[];shockwaves=[];
    for(let i=0;i<18;i++) spawnEntity(i*W/8+W*.45);
    for(let i=0;i<5;i++) spawnCrystal(W*.6+i*W*.4);
    updateHud();
  }
  function spawnEntity(x=W+Math.random()*W){
    const r=Math.random(); const type=r<.46?'human':r<.66?'cow':r<.82?'car':r<.92?'bird':'tank';
    const y=type==='bird'?groundY-70-Math.random()*150:groundY-10;
    entities.push({type,x,y,vx:type==='bird'?-35-Math.random()*35:-10-Math.random()*18,w:type==='car'||type==='tank'?34:20,h:type==='cow'?22:18,alive:true});
  }
  function spawnCrystal(x=W+Math.random()*W){ entities.push({type:'crystal',x,y:groundY+65+Math.random()*(H-groundY-120),vx:0,w:16,h:16,alive:true}); }
  function start(){ if(!assetsReady)return; ui.menu.classList.remove('active'); ui.game.classList.add('active'); running=true;paused=false;reset();last=performance.now();requestAnimationFrame(loop); }
  function showModal(title,html,button='Понятно',cb=null){ui.title.textContent=title;ui.body.innerHTML=html;ui.modalBtn.textContent=button;ui.modal.classList.remove('hidden');ui.modalBtn.onclick=()=>{ui.modal.classList.add('hidden'); if(cb)cb();};}
  function updateHud(){
    ui.score.textContent=Math.floor(state.score).toLocaleString('ru-RU');ui.eaten.textContent=`${state.eaten} / ${state.target}`;ui.level.textContent=state.level;
    ui.health.style.width=`${Math.max(0,state.health)}%`;ui.health.style.background=state.health<30?'#ef5350':'#75e34f'; if(ui.emp)ui.emp.textContent=`${state.empCharge}/3`;
  }
  function vibrate(ms=20){try{tg?.HapticFeedback?.impactOccurred(ms>30?'medium':'light'); if(!tg&&navigator.vibrate)navigator.vibrate(ms);}catch{}}

  function eat(e){
    if(e.type==='crystal') { e.alive=false; state.empCharge=Math.min(3,state.empCharge+1); state.score+=75; burst(e.x,e.y,'#b46cff'); vibrate(); updateHud(); return; }
    e.alive=false; const edible=e.type!=='tank';
    if(edible){
      state.eaten++; state.health=Math.min(100,state.health+(e.type==='cow'?24:14)); state.combo++; const mult=1+Math.min(4,state.combo*.15);
      state.score+=Math.round((e.type==='car'?180:e.type==='cow'?130:e.type==='bird'?100:90)*mult); worm.segments=Math.min(28,worm.segments+.08); burst(e.x,e.y,e.type==='car'?'#ffb347':'#ef5350'); vibrate();
    } else { state.health-=10; state.combo=0; burst(e.x,e.y,'#ff9d2e'); }
    if(state.eaten>=state.target){
      state.level++;state.eaten=0;state.target=Math.min(40,10+state.level*3);worm.radius=Math.min(24,worm.radius+1.1);worm.speed=Math.min(270,worm.speed+7);state.health=100;
      showModal(`Уровень ${state.level}`,`<p>Воджира становится больше и быстрее.</p><p>Новая цель: съесть <b>${state.target}</b> людей и существ.</p><p>${state.level>=2?'🔥 Плевок и удар о землю готовы к использованию.':'Продолжайте охоту.'}</p>`,'Продолжить');
    }
  }
  function burst(x,y,color){for(let i=0;i<10;i++)particles.push({x,y,vx:(Math.random()-.5)*180,vy:(Math.random()-.8)*170,life:.65,color});}
  function spit(){if(state.spitCooldown>0||state.level<2)return;state.spitCooldown=1.15;const a=worm.angle;shots.push({x:worm.x+Math.cos(a)*24,y:worm.y+Math.sin(a)*24,vx:Math.cos(a)*460,vy:Math.sin(a)*460,life:1.15});vibrate(30);}
  function slam(){if(state.slamCooldown>0||worm.y>groundY-8||state.level<2)return;state.slamCooldown=2.2;worm.angle=Math.PI/2;worm.vy=520;worm.vx*=.35;vibrate(45);}
  function emp(){
    if(state.empCharge<3)return; state.empCharge=0; shockwaves.push({x:worm.x,y:worm.y,r:10,life:.75});
    for(const e of entities){ if(e.alive && ['tank','car'].includes(e.type) && Math.hypot(e.x-worm.x,e.y-worm.y)<W*.7){e.alive=false;state.score+=220;burst(e.x,e.y,'#a9d8ff');}}
    vibrate(60); updateHud();
  }

  function update(dt){
    frame+=dt; state.health-=dt*(3.2+state.level*.11);state.spitCooldown=Math.max(0,state.spitCooldown-dt);state.slamCooldown=Math.max(0,state.slamCooldown-dt);
    if(state.health<=0){state.health=0;running=false;showModal('Воджира истощена',`<p>Счёт: <b>${Math.floor(state.score).toLocaleString('ru-RU')}</b></p><p>Постоянно ешьте людей и животных, чтобы поддерживать здоровье.</p>`,'Играть снова',start);updateHud();return;}
    const underground=worm.y>groundY; worm.airborne=!underground;
    const turn=(keys.left?-1:0)+(keys.right?1:0); worm.angle+=turn*dt*(underground?2.25:1.35);
    if(underground) worm.angle += Math.sin(frame*.8)*dt*.07;
    const boost=keys.boost&&underground?1.7:1; const sp=worm.speed*boost;
    worm.vx=Math.cos(worm.angle)*sp; worm.vy=Math.sin(worm.angle)*sp + (underground?0:185*dt);
    worm.x+=worm.vx*dt;worm.y+=worm.vy*dt;
    if(!underground) worm.angle=Math.atan2(worm.vy,worm.vx);
    if(worm.x<-60)worm.x=W+50;if(worm.x>W+60)worm.x=-50;if(worm.y>H+70){worm.y=H-30;worm.angle=-Math.PI/2+(.3*(Math.random()-.5));}
    if(worm.y<20){worm.y=20;worm.angle=Math.abs(worm.angle)+.4;}
    if(worm.y>=groundY && worm.vy>300){ shockwaves.push({x:worm.x,y:groundY,r:8,life:.55}); for(const e of entities){if(e.alive&&e.type!=='crystal'&&Math.abs(e.x-worm.x)<100&&Math.abs(e.y-groundY)<60){e.alive=false;state.score+=140;burst(e.x,e.y,'#ff7043');}} }
    worm.trail.unshift({x:worm.x,y:worm.y,a:worm.angle}); if(worm.trail.length>worm.segments*4)worm.trail.pop();

    for(const e of entities){
      e.x+=e.vx*dt; if(e.type!=='crystal'&&e.x<-70){e.x=W+Math.random()*300;e.alive=true;} if(!e.alive)continue;
      const dx=e.x-worm.x,dy=e.y-worm.y;if(dx*dx+dy*dy<(worm.radius+e.w*.5)**2)eat(e);
    }
    if(entities.filter(e=>e.alive&&e.type!=='crystal'&&e.x>0&&e.x<W+100).length<9)spawnEntity();
    if(entities.filter(e=>e.alive&&e.type==='crystal').length<3)spawnCrystal();
    for(const s of shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;for(const e of entities){if(e.alive&&e.type!=='crystal'&&Math.hypot(e.x-s.x,e.y-s.y)<30){e.alive=false;state.score+=120;burst(e.x,e.y,'#ff6f32');s.life=0;}}}
    shots=shots.filter(s=>s.life>0&&s.x>-30&&s.x<W+30&&s.y>-30&&s.y<H+30);
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;p.life-=dt;}particles=particles.filter(p=>p.life>0);
    for(const s of shockwaves){s.r+=dt*430;s.life-=dt;}shockwaves=shockwaves.filter(s=>s.life>0);
    state.score+=dt*5;updateHud();
  }

  function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function tileImage(im, sx, sy, sw, sh, x, y, w, h, tileW=sw, tileH=sh){
    if(!im){return;} for(let yy=y; yy<y+h; yy+=tileH){for(let xx=x;xx<x+w;xx+=tileW){ctx.drawImage(im,sx,sy,sw,sh,xx,yy,tileW,tileH);}}
  }
  function drawBackground(){
    rect(0,0,W,groundY,'#183c70');
    if(images.background){
      const iw=220; for(let x=-20;x<W+iw;x+=iw)ctx.drawImage(images.background,0,0,128,128,x,groundY-150,iw,150);
    }
    rect(0,groundY,W,H-groundY,'#3b1d18');
    if(images.ground){
      for(let x=0;x<W;x+=256) ctx.drawImage(images.ground,0,0,256,256,x,groundY,256,34);
    }
    for(let y=groundY+34;y<H;y+=42){
      rect(0,y,W,42, y<groundY+120 ? '#542621' : y<groundY+240 ? '#3b1d19' : '#241315');
      ctx.globalAlpha=.16; rect(0,y,W,2,'#9b4632'); ctx.globalAlpha=1;
    }
  }
  function drawEntity(e){
    if(e.type==='crystal'){
      ctx.save();ctx.translate(e.x,e.y);ctx.rotate(Math.PI/4);rect(-6,-6,12,12,'#c98cff');rect(-3,-3,6,6,'#f5ddff');ctx.restore();return;
    }
    const a=images.actors;
    if(a){
      const src={
        human:[48,178,16,30],
        cow:[112,194,32,22],
        car:[32,210,48,23],
        bird:[128,166,20,15],
        tank:[48,210,32,30]
      }[e.type];
      if(src){const [sx,sy,sw,sh]=src;const scale=e.type==='car'?1.1:e.type==='tank'?1.0:1.15;ctx.drawImage(a,sx,sy,sw,sh,e.x-sw*scale/2,e.y-sh*scale,sw*scale,sh*scale);return;}
    }
    ctx.font='22px serif';ctx.textAlign='center';ctx.textBaseline='middle';const icon={human:'🏃',cow:'🐄',car:'🚗',bird:'🐦',tank:'🛡️'}[e.type];ctx.fillText(icon,e.x,e.y-8);
  }
  function drawWorm(){
    const pts=worm.trail; const sheet=images.worm;
    for(let i=Math.min(Math.floor(worm.segments)-1,Math.floor(pts.length/4)-1);i>=0;i--){
      const p=pts[i*4];if(!p)continue;const sc=(worm.radius*2.15)*(1-i/(worm.segments*2.7));
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);
      if(sheet){ const variant=i%3; ctx.drawImage(sheet,variant*16,48,16,16,-sc/2,-sc/2,sc,sc); }
      else {ctx.beginPath();ctx.arc(0,0,sc/2,0,Math.PI*2);ctx.fillStyle='#75513f';ctx.fill();}
      ctx.restore();
    }
    ctx.save();ctx.translate(worm.x,worm.y);ctx.rotate(worm.angle);
    if(sheet){ctx.drawImage(sheet,16,32,32,16,-worm.radius*1.25,-worm.radius*.72,worm.radius*2.6,worm.radius*1.45);} else {ctx.beginPath();ctx.arc(0,0,worm.radius+3,0,Math.PI*2);ctx.fillStyle='#7b5141';ctx.fill();}
    ctx.restore();
  }
  function draw(){
    drawBackground();
    for(const e of entities){if(e.alive)drawEntity(e);}
    for(const s of shots){ctx.beginPath();ctx.arc(s.x,s.y,7,0,Math.PI*2);ctx.fillStyle='#aaf7ff';ctx.fill();ctx.strokeStyle='#fff';ctx.stroke();}
    drawWorm();
    for(const s of shockwaves){ctx.globalAlpha=Math.max(0,s.life/.75);ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.strokeStyle='#b9e6ff';ctx.lineWidth=4;ctx.stroke();}ctx.globalAlpha=1;
    for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/.65);rect(p.x,p.y,4,4,p.color);}ctx.globalAlpha=1;
  }
  function loop(t){if(!running)return;const dt=Math.min(.033,(t-last)/1000||.016);last=t;if(!paused)update(dt);draw();requestAnimationFrame(loop);}

  function bindHold(el,key){const on=e=>{e.preventDefault();keys[key]=true;};const off=e=>{e.preventDefault();keys[key]=false;};el.addEventListener('pointerdown',on);el.addEventListener('pointerup',off);el.addEventListener('pointercancel',off);el.addEventListener('pointerleave',off);}
  bindHold($('#leftBtn'),'left');bindHold($('#rightBtn'),'right');bindHold($('#boostBtn'),'boost');
  $('#abilityBtn').addEventListener('pointerdown',e=>{e.preventDefault();spit();});
  $('#slamBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();slam();});
  $('#empBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();emp();});
  addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='a')keys.left=true;if(e.key==='ArrowRight'||e.key==='d')keys.right=true;if(e.key===' '){keys.boost=true;e.preventDefault();}if(e.key==='f')spit();if(e.key==='s')slam();if(e.key==='e')emp();});
  addEventListener('keyup',e=>{if(e.key==='ArrowLeft'||e.key==='a')keys.left=false;if(e.key==='ArrowRight'||e.key==='d')keys.right=false;if(e.key===' ')keys.boost=false;});
  $('#pauseBtn').onclick=()=>{paused=!paused;$('#pauseBtn').textContent=paused?'▶':'Ⅱ';};
  ui.play.onclick=start;
  ui.how.onclick=()=>showModal('Как играть',`<p><b>Механики восстановлены по оригинальным экранам обучения из APK:</b></p><ul><li>Ешьте постоянно: метаболизм Воджиры непрерывно снижает здоровье.</li><li>Чтобы пройти уровень, нужно съесть всех требуемых людей; быстрые серии дают множитель/комбо.</li><li>⚡ Удерживайте ускорение под землёй — так Воджира выпрыгивает выше.</li><li>🔥 Плевок — отдельная открываемая способность.</li><li>💥 Удар-метеорит выполняется в падении.</li><li>💎 Фиолетовые кристаллы заряжают EMP; при полной шкале EMP активируется отдельной кнопкой.</li></ul><p class="recovery-note">Графика Воджиры и поверхности в этой сборке извлечена непосредственно из Unity-ресурсов APK.</p>`);
  ui.sound.onclick=()=>{sound=!sound;ui.sound.textContent=`${sound?'🔊':'🔇'} Звук: ${sound?'вкл.':'выкл.'}`;};

  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  if(tg) $('#platformNote').textContent='Telegram Mini App · Русская восстановленная версия';
})();