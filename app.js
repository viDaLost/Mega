(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const canvas = $('#gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const tg = window.Telegram?.WebApp;
  if (tg) { try { tg.ready(); tg.expand(); tg.setHeaderColor('#08111c'); tg.setBackgroundColor('#08111c'); } catch {} }

  const ui = {
    menu: $('#menu'), game: $('#game'), modal: $('#modal'), title: $('#modalTitle'), body: $('#modalBody'), modalBtn: $('#modalBtn'),
    score: $('#scoreText'), eaten: $('#eatenText'), level: $('#levelText'), hunger: $('#hungerFill'), play: $('#playBtn'), how: $('#howBtn'), sound: $('#soundBtn')
  };

  let W=0,H=0,groundY=0,last=0,running=false,paused=false,sound=true,frame=0;
  const keys={left:false,right:false,boost:false};
  const state={score:0,level:1,eaten:0,target:10,hunger:100,combo:0,abilityCooldown:0};
  const worm={x:160,y:320,vx:130,vy:0,angle:-0.25,speed:175,radius:15,segments:12,trail:[]};
  let entities=[],particles=[],shots=[];

  function resize(){
    const r=canvas.getBoundingClientRect(); W=Math.max(320,r.width); H=Math.max(480,r.height); canvas.width=Math.round(W*DPR); canvas.height=Math.round(H*DPR); ctx.setTransform(DPR,0,0,DPR,0,0); groundY=H*.55; if(!running){worm.x=W*.35;worm.y=groundY+80;}
  }
  addEventListener('resize',resize,{passive:true}); resize();

  function reset(){
    Object.assign(state,{score:0,level:1,eaten:0,target:10,hunger:100,combo:0,abilityCooldown:0});
    Object.assign(worm,{x:W*.25,y:groundY+90,vx:150,vy:-40,angle:-.25,speed:175,radius:15,segments:12,trail:[]});
    entities=[];particles=[];shots=[]; for(let i=0;i<16;i++) spawnEntity(i*W/8+W*.5); updateHud();
  }
  function spawnEntity(x=W+Math.random()*W){
    const r=Math.random();
    const type=r<.50?'human':r<.68?'cow':r<.83?'car':r<.94?'bird':'tank';
    const y=type==='bird'?groundY-80-Math.random()*120:groundY-10;
    entities.push({type,x,y,vx:type==='bird'?-35-Math.random()*35:-10-Math.random()*18,w:type==='car'||type==='tank'?34:20,h:type==='cow'?22:18,alive:true});
  }
  function start(){ ui.menu.classList.remove('active'); ui.game.classList.add('active'); running=true;paused=false;reset();last=performance.now();requestAnimationFrame(loop); }
  function showModal(title,html,button='Понятно',cb=null){ui.title.textContent=title;ui.body.innerHTML=html;ui.modalBtn.textContent=button;ui.modal.classList.remove('hidden');ui.modalBtn.onclick=()=>{ui.modal.classList.add('hidden'); if(cb)cb();};}
  function updateHud(){ui.score.textContent=Math.floor(state.score).toLocaleString('ru-RU');ui.eaten.textContent=`${state.eaten} / ${state.target}`;ui.level.textContent=state.level;ui.hunger.style.width=`${Math.max(0,state.hunger)}%`;ui.hunger.style.background=state.hunger<30?'#ef5350':'#65d46e';}
  function vibrate(ms=20){try{tg?.HapticFeedback?.impactOccurred('light'); if(!tg&&navigator.vibrate)navigator.vibrate(ms);}catch{}}

  function eat(e){
    e.alive=false; const edible=e.type!=='tank';
    if(edible){state.eaten++;state.hunger=Math.min(100,state.hunger+(e.type==='cow'?24:14));state.combo++;const mult=1+Math.min(4,state.combo*.15);state.score+=Math.round((e.type==='car'?180:e.type==='cow'?130:e.type==='bird'?100:90)*mult);worm.segments=Math.min(28,worm.segments+.08);burst(e.x,e.y,e.type==='car'?'#ffb347':'#ef5350');vibrate();}
    else{state.hunger-=10;state.combo=0;burst(e.x,e.y,'#ff9d2e');}
    if(state.eaten>=state.target){state.level++;state.eaten=0;state.target=Math.min(35,10+state.level*3);worm.radius=Math.min(25,worm.radius+1.2);worm.speed=Math.min(260,worm.speed+7);state.hunger=100;showModal(`Уровень ${state.level}`,`<p>Воджира становится больше и быстрее.</p><p>Новая цель: съесть <b>${state.target}</b> существ.</p>`,'Продолжить');}
  }
  function burst(x,y,color){for(let i=0;i<8;i++)particles.push({x,y,vx:(Math.random()-.5)*170,vy:(Math.random()-.8)*170,life:.6,color});}
  function fire(){if(state.abilityCooldown>0)return;state.abilityCooldown=1.4;const a=worm.angle;shots.push({x:worm.x+Math.cos(a)*22,y:worm.y+Math.sin(a)*22,vx:Math.cos(a)*420,vy:Math.sin(a)*420,life:1.2});vibrate(35);}

  function update(dt){
    frame+=dt; state.hunger-=dt*(3.3+state.level*.12);state.abilityCooldown=Math.max(0,state.abilityCooldown-dt);
    if(state.hunger<=0){state.hunger=0;running=false;showModal('Червь проголодался',`<p>Счёт: <b>${Math.floor(state.score).toLocaleString('ru-RU')}</b></p><p>Ешьте людей и животных, чтобы пополнять шкалу голода.</p>`,'Играть снова',start);updateHud();return;}
    const underground=worm.y>groundY;
    const turn=(keys.left?-1:0)+(keys.right?1:0); worm.angle+=turn*dt*(underground?2.15:1.35);
    if(underground){ worm.angle += Math.sin(frame*.8)*dt*.08; worm.vy*=.96; }
    const boost=keys.boost&&underground?1.65:1; const sp=worm.speed*boost;
    worm.vx=Math.cos(worm.angle)*sp; worm.vy=Math.sin(worm.angle)*sp + (underground?0:170*dt);
    worm.x+=worm.vx*dt;worm.y+=worm.vy*dt;
    if(!underground) worm.angle=Math.atan2(worm.vy,worm.vx);
    if(worm.x<-50)worm.x=W+40;if(worm.x>W+50)worm.x=-40;if(worm.y>H+70){worm.y=H-30;worm.angle=-Math.PI/2+(.35*(Math.random()-.5));}
    if(worm.y<25){worm.y=25;worm.angle=Math.abs(worm.angle)+.4;}
    worm.trail.unshift({x:worm.x,y:worm.y,a:worm.angle}); if(worm.trail.length>worm.segments*4)worm.trail.pop();

    for(const e of entities){e.x+=e.vx*dt;if(e.x<-60){e.x=W+Math.random()*240;e.alive=true;} if(!e.alive)continue; const dx=e.x-worm.x,dy=e.y-worm.y;if(dx*dx+dy*dy<(worm.radius+e.w*.5)**2)eat(e);}
    if(entities.filter(e=>e.alive&&e.x>0&&e.x<W+100).length<9)spawnEntity();
    for(const s of shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;for(const e of entities){if(e.alive&&Math.hypot(e.x-s.x,e.y-s.y)<28){e.alive=false;state.score+=120;burst(e.x,e.y,'#ff6f32');s.life=0;}}}
    shots=shots.filter(s=>s.life>0&&s.x>-20&&s.x<W+20&&s.y>-20&&s.y<H+20);
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;p.life-=dt;}particles=particles.filter(p=>p.life>0);
    state.score+=dt*5;updateHud();
  }

  function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function draw(){
    rect(0,0,W,groundY,'#16375d');
    for(let i=0;i<24;i++){const x=(i*131+frame*4)%W;rect(x,45+(i*53)%220,2,2,'#bfd7ea');}
    for(let i=0;i<Math.ceil(W/70)+1;i++){const x=i*70-10;const h=35+(i%4)*18;rect(x,groundY-h,55,h,'#24455b');for(let j=0;j<3;j++)rect(x+8+j*14,groundY-h+10,5,6,'#e4c86b');}
    rect(0,groundY-14,W,14,'#497a3d');rect(0,groundY,W,H-groundY,'#563820');
    for(let y=groundY+18;y<H;y+=38){for(let x=((y/38)%2)*20;x<W;x+=52)rect(x,y,22,4,'#68452a');}

    ctx.font='22px serif';ctx.textAlign='center';ctx.textBaseline='middle';
    for(const e of entities){if(!e.alive)continue;const icon={human:'🏃',cow:'🐄',car:'🚗',bird:'🐦',tank:'🛡️'}[e.type];ctx.fillText(icon,e.x,e.y-8);}
    for(const s of shots){ctx.beginPath();ctx.arc(s.x,s.y,7,0,Math.PI*2);ctx.fillStyle='#ff7b35';ctx.fill();}
    const pts=worm.trail;for(let i=Math.min(worm.segments-1,Math.floor(pts.length/4)-1);i>=0;i--){const p=pts[i*4];if(!p)continue;const r=worm.radius*(1-i/(worm.segments*2.3));ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=i%2?'#b52f28':'#df4939';ctx.fill();ctx.strokeStyle='#63231d';ctx.lineWidth=2;ctx.stroke();}
    ctx.save();ctx.translate(worm.x,worm.y);ctx.rotate(worm.angle);ctx.fillStyle='#ef5942';ctx.beginPath();ctx.arc(0,0,worm.radius+3,0,Math.PI*2);ctx.fill();rect(5,-7,5,5,'#fff');rect(8,-6,2,2,'#111');ctx.restore();
    for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/.6);rect(p.x,p.y,4,4,p.color);}ctx.globalAlpha=1;
  }
  function loop(t){if(!running)return;const dt=Math.min(.033,(t-last)/1000||.016);last=t;if(!paused)update(dt);draw();requestAnimationFrame(loop);}

  function bindHold(el,key){const on=e=>{e.preventDefault();keys[key]=true;};const off=e=>{e.preventDefault();keys[key]=false;};el.addEventListener('pointerdown',on);el.addEventListener('pointerup',off);el.addEventListener('pointercancel',off);el.addEventListener('pointerleave',off);}
  bindHold($('#leftBtn'),'left');bindHold($('#rightBtn'),'right');bindHold($('#boostBtn'),'boost');
  $('#abilityBtn').addEventListener('pointerdown',e=>{e.preventDefault();fire();});
  addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='a')keys.left=true;if(e.key==='ArrowRight'||e.key==='d')keys.right=true;if(e.key===' '){keys.boost=true;e.preventDefault();}if(e.key==='f')fire();});
  addEventListener('keyup',e=>{if(e.key==='ArrowLeft'||e.key==='a')keys.left=false;if(e.key==='ArrowRight'||e.key==='d')keys.right=false;if(e.key===' ')keys.boost=false;});
  $('#pauseBtn').onclick=()=>{paused=!paused;$('#pauseBtn').textContent=paused?'▶':'Ⅱ';};
  ui.play.onclick=start;
  ui.how.onclick=()=>showModal('Как играть','<ul><li>◀ ▶ — меняют направление червя.</li><li>⚡ — ускоряет его под землёй.</li><li>🔥 — огненный плевок.</li><li>Ешьте людей и животных, чтобы не умереть от голода.</li><li>Выпрыгивайте из земли и собирайте комбо.</li></ul>');
  ui.sound.onclick=()=>{sound=!sound;ui.sound.textContent=`${sound?'🔊':'🔇'} Звук: ${sound?'вкл.':'выкл.'}`;};

  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  if(tg) $('#platformNote').textContent='Telegram Mini App · Русская версия';
})();
