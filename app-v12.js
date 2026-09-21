(() => {
  'use strict';

  const $ = s => document.querySelector(s);
  const canvas = $('#gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const tg = window.Telegram?.WebApp;
  if (tg) {
    try {
      tg.ready(); tg.expand();
      tg.setHeaderColor('#08111c');
      tg.setBackgroundColor('#08111c');
    } catch {}
  }

  const ui = {
    menu: $('#menu'), game: $('#game'), modal: $('#modal'), title: $('#modalTitle'), body: $('#modalBody'), modalBtn: $('#modalBtn'),
    score: $('#scoreText'), eaten: $('#eatenText'), level: $('#levelText'), health: $('#hungerFill'), play: $('#playBtn'), how: $('#howBtn'), sound: $('#soundBtn'),
    emp: $('#empText'), pause: $('#pauseBtn')
  };

  const ASSET_PATH = './assets/original/';
  const embedded = window.RECOVERED_ASSETS || {};
  const recoveredAudio = window.RECOVERED_AUDIO || {};
  const LEVELS = Array.isArray(window.SMW_LEVELS) ? window.SMW_LEVELS : [];

  const assetFiles = {
    ground: 'GroundStrip_Tex.png', background: 'Background_Classic_Tex.png', worm: 'Wojira_Tex.png',
    actors: 'Actors_Web_Tex.png', fx: 'FX_Tex.png', hud: 'HUD_Tex.png',
    boss0: 'Actor_Bosses_Tex.png', boss1: 'Actor_Bosses1_Tex.png', boss2: 'Actor_Bosses2_Tex.png', boss3: 'Actor_Bosses3_Tex.png', boss4: 'Actor_Bosses4_Tex.png'
  };

  const ORIGINAL = Object.freeze({
    topSpeed: 15, lowSpeed: 6, acceleration: .4, groundFriction: .4, launchBoost: 3,
    turnAcceleration: 5, turnMax: 10, jumpTurnMax: 4, jumpTurnAcceleration: .2,
    gravity: .35, downwardTopSpeed: 40, healthMaxStart: 100, healthPerSegment: 4,
    startLength: 5, startLengthMax: 8, empDist: 128, pileDriverSpeed: 40,
    turretRange: 40, turretAngleMinLeft: 25, turretAngleMaxLeft: 90,
    turretAngleMinRight: 90, turretAngleMaxRight: 155,
    homingDamage: 1, homingSpeed: 15, homingDamping: 1, homingNoHomeTime: 3
  });
  const WORLD_UNIT = 12;
  const DAMAGE_UNIT = ORIGINAL.healthPerSegment;
  const TICK = 1 / 60;

  const AI = Object.freeze({
    human: { speed: 20, idleMin: .5, idleMax: 1.8, walkMin: 1.1, walkMax: 3.2 },
    soldier: { speed: 24, idleMin: .75, idleMax: 1.5, walkMin: 1.5, walkMax: 2.2, range: 320, fireMin: 1.2, fireMax: 2.0, projectile: 'bullet' },
    cow: { speed: 16, idleMin: .8, idleMax: 2.4, walkMin: 1.3, walkMax: 3.7 },
    car: { speed: 42, idleMin: .15, idleMax: .55, walkMin: 2.4, walkMax: 5.2 },
    bird: { speed: 45, bob: 15 },
    tankL: { speed: 2 * WORLD_UNIT, idleMin: 90*TICK, idleMax: 90*TICK, walkMin: 120*TICK, walkMax: 120*TICK, range: ORIGINAL.turretRange*WORLD_UNIT, fireMin: 30*TICK, fireMax: 45*TICK, projectile: 'tankRocket' },
    tankM: { speed: 2 * WORLD_UNIT, idleMin: 90*TICK, idleMax: 90*TICK, walkMin: 120*TICK, walkMax: 120*TICK, range: ORIGINAL.turretRange*WORLD_UNIT, fireMin: 45*TICK, fireMax: 60*TICK, projectile: 'tankRocket' },
    helicopter: { speed: 2*WORLD_UNIT, attackSpeed: 5*WORLD_UNIT, idleMin: 45*TICK, idleMax: 45*TICK, walkMin: 120*TICK, walkMax: 120*TICK, bob: 20, range: 300, fireMin: 2.5, fireMax: 5, projectile: 'bullet', mineEvery: 160*TICK },
    bomber: { speed: 2*WORLD_UNIT, attackSpeed: 5*WORLD_UNIT, bob: 7, range: 520, fireMin: 120*TICK, fireMax: 180*TICK, projectile: 'bomb' },
    ufo: { speed: 48, bob: 26, range: 50*WORLD_UNIT, fireMin: 2.8, fireMax: 4.8, projectile: 'homingRocket' },
    satellite: { speed: 34, bob: 4 },
    boss: { speed: 18, range: 52*WORLD_UNIT, fireMin: 1.2, fireMax: 2.1, projectile: 'homingRocket' }
  });

  const images = {};
  let assetsReady = false;
  async function loadAssets() {
    const jobs = Object.entries(assetFiles).map(([key, file]) => new Promise(resolve => {
      const im = new Image();
      im.onload = () => { images[key] = im; resolve(); };
      im.onerror = () => resolve();
      im.src = embedded[file.replace(/\.png$/, '')] || (ASSET_PATH + file);
    }));
    await Promise.all(jobs);
    assetsReady = true;
    ui.play.textContent = 'Играть';
    ui.play.disabled = false;
  }
  ui.play.disabled = true;
  ui.play.textContent = 'Загрузка…';
  loadAssets();

  let W = 0, H = 0, groundY = 0, last = 0, running = false, paused = false, sound = true, frame = 0;
  const keys = { left: false, right: false, boost: false };
  const state = { score: 0, level: 1, eaten: 0, target: 10, health: 100, combo: 0, spitCooldown: 0, slamCooldown: 0, empCharge: 0 };
  const worm = { x: 160, y: 320, vx: ORIGINAL.lowSpeed * WORLD_UNIT, vy: 0, angle: -.25, speed: ORIGINAL.topSpeed * WORLD_UNIT, radius: 15, segments: ORIGINAL.startLength, trail: [], airborne: false, hitFlash: 0 };
  let entities = [], particles = [], shots = [], shockwaves = [], enemyProjectiles = [];

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function playSfx(name, volume = .55) {
    if (!sound || !recoveredAudio[name]) return;
    try { const a = new Audio(recoveredAudio[name]); a.volume = volume; a.play().catch(() => {}); } catch {}
  }
  function vibrate(ms = 20) {
    try {
      tg?.HapticFeedback?.impactOccurred(ms > 30 ? 'medium' : 'light');
      if (!tg && navigator.vibrate) navigator.vibrate(ms);
    } catch {}
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(320, r.width); H = Math.max(480, r.height);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.imageSmoothingEnabled = false;
    groundY = H * .52;
    if (!running) { worm.x = W * .35; worm.y = groundY + 80; }
  }
  addEventListener('resize', resize, { passive: true });
  resize();

  function levelDef() { return LEVELS.find(l => l.number === state.level) || null; }
  function levelTarget(def = levelDef()) { return def ? (def.bossStage ? 1 : Math.max(1, def.growthRequired)) : Math.min(40, 10 + state.level * 3); }
  function originalNameToSpec(name) {
    if (/EMP.*Crystal/i.test(name)) return {type:'crystal',variant:name};
    if (/Soldier/i.test(name)) return {type:'soldier',variant:name};
    if (/Cow|Horse|Emu|Buffalo|Penguin|Reindeer|PolarBear/i.test(name)) return {type:'cow',variant:name};
    if (/Human|Astronaut|Elf|Santa/i.test(name)) return {type:'human',variant:name};
    if (/Bird|Balloon/i.test(name)) return {type:'bird',variant:name};
    if (/TankL/i.test(name)) return {type:'tankL',variant:name};
    if (/TankM/i.test(name)) return {type:'tankM',variant:name};
    if (/Robot/i.test(name)) return {type:'tankM',variant:name};
    if (/Car|Truck|Plow/i.test(name)) return {type:'car',variant:name};
    if (/Helicopter/i.test(name)) return {type:'helicopter',variant:name};
    if (/Bomber|Plane/i.test(name)) return {type:'bomber',variant:name};
    if (/Satellite/i.test(name)) return {type:'satellite',variant:name};
    if (/UFO/i.test(name)) return {type:'ufo',variant:name};
    return null;
  }
  function levelSpawnPool() {
    const def = levelDef();
    if (!def) return [{type:'human',variant:'HumanMale1'},{type:'cow',variant:'Cow'},{type:'car',variant:'Car1'}];
    const pool = [];
    for (const [name, count] of Object.entries(def.counts || {})) {
      const spec = originalNameToSpec(name);
      if (!spec || spec.type === 'crystal') continue;
      const weight = Math.max(1, Math.min(12, Math.ceil(count / 2)));
      for (let i = 0; i < weight; i++) pool.push(spec);
    }
    return pool.length ? pool : [{type:'human',variant:'HumanMale1'},{type:'cow',variant:'Cow'}];
  }

  function initActorAI(e) {
    const cfg = AI[e.type] || AI.human;
    e.aiState = 'walk';
    e.aiTimer = rand(cfg.walkMin || 1, cfg.walkMax || 3);
    e.shootTimer = rand(cfg.fireMin || 2, cfg.fireMax || 4);
    e.walkDirection = e.vx <= 0 ? -1 : 1;
    e.baseY = e.y;
    e.phase = Math.random() * Math.PI * 2;
    e.turretAngle = e.walkDirection < 0 ? Math.PI * .25 : Math.PI * .75;
    return e;
  }

  function spawnEntity(x = W + Math.random() * W, pool = levelSpawnPool()) {
    const pick = pool[(Math.random() * pool.length) | 0] || {type:'human',variant:'HumanMale1'};
    const type = typeof pick === 'string' ? pick : pick.type;
    const variant = typeof pick === 'string' ? pick : (pick.variant || type);
    const air = ['bird','helicopter','bomber','ufo','satellite'].includes(type);
    const y = air ? groundY - 70 - Math.random() * Math.min(190, groundY - 30) : groundY - 10;
    const dims = {human:[18,24],soldier:[20,24],cow:[30,22],car:[42,24],bird:[22,16],tankL:[40,28],tankM:[42,30],helicopter:[54,28],bomber:[62,30],ufo:[42,24],satellite:[40,22]}[type] || [20,20];
    const speed = AI[type]?.speed || 24;
    const hp = {tankL:2,tankM:3,helicopter:2,bomber:2,ufo:2,satellite:2}[type] || 1;
    const e = initActorAI({type,variant,x,y,vx:-speed,w:dims[0],h:dims[1],alive:true,hp});
    if (type === 'helicopter') e.mineTimer = AI.helicopter.mineEvery;
    entities.push(e);
  }
  function spawnCrystal(x = W + Math.random() * W) {
    entities.push({ type: 'crystal', x, y: groundY + 65 + Math.random() * Math.max(20, H - groundY - 120), vx: 0, w: 16, h: 16, alive: true });
  }

  function applyLevel(resetPopulation = true) {
    const def = levelDef(); state.target = levelTarget(def); state.eaten = 0;
    if (resetPopulation) {
      entities = []; enemyProjectiles = [];
      const pool = levelSpawnPool();
      for (let i = 0; i < 18; i++) spawnEntity(i * W / 8 + W * .45, pool);
      const crystals = def ? Math.max(2, Math.min(6, Math.ceil((def.counts.UndergroundEMPCrystal || 3) / 2))) : 3;
      for (let i = 0; i < crystals; i++) spawnCrystal(W * .6 + i * W * .4);
      if (def?.bossStage) {
        const bossIndex = Math.max(0, Math.min(4, Math.floor((state.level - 1) / 5)));
        entities.push(initActorAI({ type: 'boss', bossIndex, x: W * .82, y: groundY - 42, vx: -AI.boss.speed, w: 72, h: 72, alive: true, hp: 8 + bossIndex * 2 }));
      }
    }
    updateHud();
  }

  function reset() {
    Object.assign(state, { score: 0, level: 1, eaten: 0, target: levelTarget(LEVELS[0]), health: ORIGINAL.healthMaxStart, combo: 0, spitCooldown: 0, slamCooldown: 0, empCharge: 0 });
    Object.assign(worm, { x: W * .25, y: groundY + 90, vx: ORIGINAL.lowSpeed * WORLD_UNIT, vy: -40, angle: -.25, speed: ORIGINAL.topSpeed * WORLD_UNIT, radius: 15, segments: ORIGINAL.startLength, trail: [], airborne: false, hitFlash: 0 });
    particles = []; shots = []; shockwaves = []; enemyProjectiles = [];
    applyLevel(true);
  }

  function start() {
    if (!assetsReady) return;
    ui.menu.classList.remove('active'); ui.game.classList.add('active');
    running = true; paused = false; reset(); last = performance.now(); requestAnimationFrame(loop);
  }
  function showModal(title, html, button = 'Понятно', cb = null) {
    ui.title.textContent = title; ui.body.innerHTML = html; ui.modalBtn.textContent = button; ui.modal.classList.remove('hidden');
    ui.modalBtn.onclick = () => { ui.modal.classList.add('hidden'); if (cb) cb(); };
  }
  function updateHud() {
    ui.score.textContent = Math.floor(state.score).toLocaleString('ru-RU');
    ui.eaten.textContent = `${state.eaten} / ${state.target}`;
    ui.level.textContent = state.level;
    ui.health.style.width = `${Math.max(0, state.health)}%`;
    ui.health.style.background = state.health < 30 ? '#ef5350' : '#75e34f';
    if (ui.emp) ui.emp.textContent = `${state.empCharge}/3`;
  }

  function completeLevelIfReady() {
    if (state.eaten < state.target) return false;
    if (state.level >= 26) {
      running = false; playSfx('wmd_level_up');
      showModal('Кампания пройдена', `<p>Восстановленные 26 уровней Standard_Adventure завершены.</p><p>Счёт: <b>${Math.floor(state.score).toLocaleString('ru-RU')}</b></p>`, 'Играть снова', start);
      return true;
    }
    state.level++;
    worm.radius = Math.min(24, worm.radius + 1.1);
    worm.speed = Math.min(ORIGINAL.topSpeed * WORLD_UNIT * 1.35, worm.speed + ORIGINAL.acceleration * WORLD_UNIT);
    state.health = ORIGINAL.healthMaxStart;
    applyLevel(true); playSfx('wmd_level_up');
    const def = levelDef();
    showModal(`Уровень ${state.level}`, `<p>Загружена таблица <b>${def?.name || ('Level' + state.level)}</b> из оригинального SMW_Spawner.</p><p>${def?.bossStage ? '⚠️ Босс-этап.' : 'Нужно набрать рост: <b>' + state.target + '</b>.'}</p>`, 'Продолжить');
    return true;
  }

  function burst(x, y, color) {
    for (let i = 0; i < 10; i++) particles.push({ x, y, vx: (Math.random() - .5) * 180, vy: (Math.random() - .8) * 170, life: .65, color });
  }

  function damageWorm(amount, source = 'enemy') {
    if (!running || amount <= 0) return;
    state.health = Math.max(0, state.health - amount);
    worm.hitFlash = .18;
    burst(worm.x, worm.y, source === 'rocket' ? '#ff7043' : '#fff08a');
    playSfx('Worm_Hit', .5);
    vibrate(30);
    updateHud();
  }

  function hitBoss(e, damage = 1, playerContact = false) {
    if (!e.alive) return;
    e.hp = Math.max(0, (e.hp || 1) - damage); state.score += 250 * damage;
    burst(e.x, e.y, e.hp > 0 ? '#ff9d2e' : '#ff4a2e');
    if (e.hp > 0) { if (playerContact) damageWorm(5, 'boss'); return; }
    e.alive = false; state.eaten = state.target; completeLevelIfReady();
  }

  function eat(e) {
    if (e.type === 'crystal') {
      e.alive = false; state.empCharge = Math.min(3, state.empCharge + 1); state.score += 75;
      burst(e.x, e.y, '#b46cff'); playSfx('pickup_emp'); vibrate(); updateHud(); return;
    }
    if (e.type === 'boss') { hitBoss(e, 1, true); return; }
    if (['tankL','tankM'].includes(e.type) && (e.hp || 1) > 1) {
      e.hp--; state.score += 100; damageWorm(ORIGINAL.healthPerSegment, 'vehicle'); burst(e.x, e.y, '#ff9d2e'); return;
    }
    e.alive = false;
    const edible = !['tankL','tankM'].includes(e.type);
    if (edible) {
      state.eaten++; state.health = Math.min(100, state.health + (e.type === 'cow' ? 24 : 14)); state.combo++;
      const mult = 1 + Math.min(4, state.combo * .15);
      const points = { car: 180, cow: 130, bird: 100, human: 90, soldier: 120, helicopter: 240, bomber: 300, ufo: 320, satellite: 220 }[e.type] || 120;
      state.score += Math.round(points * mult);
      worm.segments = Math.min(ORIGINAL.startLengthMax + 20, worm.segments + .08);
      burst(e.x, e.y, e.type === 'car' ? '#ffb347' : '#ef5350'); if (e.type === 'cow') playSfx('cow_death'); vibrate();
    } else {
      damageWorm(10, 'vehicle'); state.combo = 0; burst(e.x, e.y, '#ff9d2e');
    }
    completeLevelIfReady();
  }

  function burst(x, y, color) {
    for (let i = 0; i < 10; i++) particles.push({ x, y, vx: (Math.random() - .5) * 180, vy: (Math.random() - .8) * 170, life: .65, color });
  }
  function spit() {
    if (state.spitCooldown > 0 || state.level < 2) return;
    state.spitCooldown = 1.15;
    const a = worm.angle;
    shots.push({ x: worm.x + Math.cos(a) * 24, y: worm.y + Math.sin(a) * 24, vx: Math.cos(a) * 460, vy: Math.sin(a) * 460, life: 1.15 });
    playSfx('worm_fire_spit'); vibrate(30);
  }
  function slam() {
    if (state.slamCooldown > 0 || worm.y > groundY - 8 || state.level < 2) return;
    state.slamCooldown = 2.2; worm.angle = Math.PI / 2; worm.vy = 520; worm.vx *= .35; vibrate(45);
  }
  function emp() {
    if (state.empCharge < 3) return;
    state.empCharge = 0; shockwaves.push({ x: worm.x, y: worm.y, r: 10, life: .75 });
    const radius = Math.min(W * .7, ORIGINAL.empDist * WORLD_UNIT);
    for (const e of entities) {
      if (!e.alive || !['tankL','tankM','car','helicopter','bomber','ufo','satellite'].includes(e.type) || dist(e, worm) >= radius) continue;
      e.alive = false; state.score += 220; burst(e.x, e.y, '#a9d8ff');
    }
    for (const p of enemyProjectiles) if (Math.hypot(p.x - worm.x, p.y - worm.y) < radius) p.life = 0;
    playSfx('pickup_emp', .7); vibrate(60); updateHud();
  }

  function aimAngle(e) {
    const raw = Math.atan2(worm.y - e.y, worm.x - e.x);
    let deg = raw * 180 / Math.PI;
    if (deg < 0) deg += 360;
    if (worm.x < e.x) deg = clamp(deg, ORIGINAL.turretAngleMinLeft, ORIGINAL.turretAngleMaxLeft);
    else deg = clamp(deg, ORIGINAL.turretAngleMinRight, ORIGINAL.turretAngleMaxRight);
    return deg * Math.PI / 180;
  }

  function fireEnemy(e, projectileType) {
    const angle = aimAngle(e);
    const x = e.x + Math.cos(angle) * (e.w * .45);
    const y = e.y - e.h * .5 + Math.sin(angle) * 6;
    if (projectileType === 'bullet') {
      const sp = 360;
      enemyProjectiles.push({ type: 'bullet', x, y, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp, life: 2.4, damage: DAMAGE_UNIT });
      return;
    }
    if (projectileType === 'bomb') {
      enemyProjectiles.push({ type: 'bomb', x: e.x, y: e.y, vx: e.vx * .35, vy: 25, life: 4, damage: DAMAGE_UNIT * 2 });
      return;
    }
    if (projectileType === 'homingRocket') {
      const sp = ORIGINAL.homingSpeed * WORLD_UNIT;
      enemyProjectiles.push({ type: 'homingRocket', x, y, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp, speed: sp, life: 8, age: 0, noHomeTime: ORIGINAL.homingNoHomeTime, damping: ORIGINAL.homingDamping, damage: ORIGINAL.homingDamage * DAMAGE_UNIT });
      playSfx('wpn_rocket_lp', .35);
      return;
    }
    const sp = 260;
    enemyProjectiles.push({ type: 'tankRocket', x, y, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp, life: 4.5, damage: DAMAGE_UNIT * 2 });
    playSfx('TankfireORpowerdown', .4);
  }

  function updateActorAI(e, dt) {
    if (!e.alive || e.type === 'crystal') return;
    const cfg = AI[e.type] || AI.human;

    if (['bird','helicopter','bomber','ufo','satellite'].includes(e.type)) {
      const dir = e.walkDirection || -1;
      e.vx = dir * cfg.speed;
      e.y = e.baseY + Math.sin(frame * (e.type === 'ufo' ? 1.7 : 2.4) + e.phase) * (cfg.bob || 8);
    } else if (e.type === 'boss') {
      e.vx = (worm.x < e.x ? -1 : 1) * cfg.speed;
    } else {
      e.aiTimer -= dt;
      if (e.aiState === 'idle') {
        e.vx = 0;
        if (e.aiTimer <= 0) {
          e.aiState = 'walk';
          e.walkDirection = Math.random() < .5 ? -1 : 1;
          e.aiTimer = rand(cfg.walkMin || 1, cfg.walkMax || 3);
        }
      } else {
        e.vx = e.walkDirection * cfg.speed;
        if (e.aiTimer <= 0) {
          e.aiState = 'idle'; e.aiTimer = rand(cfg.idleMin || .5, cfg.idleMax || 1.8); e.vx = 0;
        }
      }
    }

    if (cfg.projectile) {
      const d = dist(e, worm);
      e.shootTimer -= dt;
      const wormVisible = worm.y < groundY + 20;
      if (wormVisible && d <= cfg.range) {
        e.turretAngle = aimAngle(e);
        if (!['helicopter','bomber','ufo','satellite','boss'].includes(e.type)) e.vx = 0;
        if (e.shootTimer <= 0) {
          fireEnemy(e, cfg.projectile);
          e.shootTimer = rand(cfg.fireMin, cfg.fireMax);
        }
      }
    }
    if (e.type === 'helicopter') {
      e.mineTimer -= dt;
      if (e.mineTimer <= 0) {
        enemyProjectiles.push({type:'mine',x:e.x,y:e.y+8,vx:e.vx*.2,vy:35,life:8,damage:DAMAGE_UNIT*2,armed:false});
        e.mineTimer = AI.helicopter.mineEvery;
      }
    }

    e.x += e.vx * dt;
    if (e.x < -90) { e.x = W + rand(80, 320); e.alive = true; e.walkDirection = -1; }
    if (e.x > W + 120) { e.x = -60; e.walkDirection = 1; }
  }

  function updateEnemyProjectiles(dt) {
    for (const p of enemyProjectiles) {
      p.age = (p.age || 0) + dt;
      if (p.type === 'bomb' || p.type === 'mine') p.vy += 190 * dt;
      if (p.type === 'mine' && p.y >= groundY - 5) { p.y = groundY - 5; p.vx = 0; p.vy = 0; p.armed = true; }
      if (p.type === 'homingRocket' && p.age >= p.noHomeTime) {
        const desired = Math.atan2(worm.y - p.y, worm.x - p.x);
        const current = Math.atan2(p.vy, p.vx);
        let delta = desired - current;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        const turn = clamp(delta, -p.damping * dt, p.damping * dt);
        const a = current + turn;
        p.vx = Math.cos(a) * p.speed; p.vy = Math.sin(a) * p.speed;
      }
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (Math.hypot(p.x - worm.x, p.y - worm.y) < worm.radius + ((p.type === 'bomb' || p.type === 'mine') ? 12 : 7)) {
        p.life = 0; damageWorm(p.damage, p.type.includes('Rocket') || p.type === 'homingRocket' ? 'rocket' : 'enemy');
        burst(p.x, p.y, '#ff7a38'); playSfx('wpn_rocket_exp', .4);
      }
      if (p.y > H + 40 || p.x < -100 || p.x > W + 100) p.life = 0;
    }
    enemyProjectiles = enemyProjectiles.filter(p => p.life > 0);
  }

  function update(dt) {
    frame += dt; worm.hitFlash = Math.max(0, worm.hitFlash - dt);
    state.health -= dt * (3.2 + state.level * .11);
    state.spitCooldown = Math.max(0, state.spitCooldown - dt); state.slamCooldown = Math.max(0, state.slamCooldown - dt);
    if (state.health <= 0) {
      state.health = 0; running = false;
      showModal('Воджира истощена', `<p>Счёт: <b>${Math.floor(state.score).toLocaleString('ru-RU')}</b></p><p>Постоянно ешьте людей и животных, чтобы поддерживать здоровье.</p>`, 'Играть снова', start);
      updateHud(); return;
    }

    const underground = worm.y > groundY; worm.airborne = !underground;
    const turn = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
    worm.angle += turn * dt * (underground ? 2.25 : 1.35);
    if (underground) worm.angle += Math.sin(frame * .8) * dt * .07;
    const boost = keys.boost && underground ? 1.7 : 1; const sp = worm.speed * boost;
    worm.vx = Math.cos(worm.angle) * sp;
    worm.vy = Math.sin(worm.angle) * sp + (underground ? 0 : 185 * dt);
    worm.x += worm.vx * dt; worm.y += worm.vy * dt;
    if (!underground) worm.angle = Math.atan2(worm.vy, worm.vx);
    if (worm.x < -60) worm.x = W + 50; if (worm.x > W + 60) worm.x = -50;
    if (worm.y > H + 70) { worm.y = H - 30; worm.angle = -Math.PI / 2 + (.3 * (Math.random() - .5)); }
    if (worm.y < 20) { worm.y = 20; worm.angle = Math.abs(worm.angle) + .4; }

    if (worm.y >= groundY && worm.vy > 300) {
      shockwaves.push({ x: worm.x, y: groundY, r: 8, life: .55 });
      for (const e of [...entities]) {
        if (!e.alive || e.type === 'crystal' || Math.abs(e.x - worm.x) >= 100 || Math.abs(e.y - groundY) >= 60) continue;
        if (e.type === 'boss') hitBoss(e, 2, false);
        else { e.alive = false; state.score += 140; burst(e.x, e.y, '#ff7043'); }
      }
    }

    worm.trail.unshift({ x: worm.x, y: worm.y, a: worm.angle });
    if (worm.trail.length > worm.segments * 4) worm.trail.pop();

    for (const e of entities) {
      updateActorAI(e, dt);
      if (!e.alive) continue;
      const dx = e.x - worm.x, dy = e.y - worm.y;
      if (dx * dx + dy * dy < (worm.radius + e.w * .5) ** 2) eat(e);
    }
    if (entities.filter(e => e.alive && e.type !== 'crystal' && e.type !== 'boss' && e.x > 0 && e.x < W + 100).length < 9) spawnEntity();
    if (entities.filter(e => e.alive && e.type === 'crystal').length < 3) spawnCrystal();

    for (const s of shots) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      for (const e of [...entities]) {
        if (!e.alive || e.type === 'crystal' || Math.hypot(e.x - s.x, e.y - s.y) >= 30) continue;
        if (e.type === 'boss') hitBoss(e, 1, false);
        else if (['tankL','tankM'].includes(e.type) && (e.hp || 1) > 1) { e.hp--; state.score += 80; burst(e.x, e.y, '#ff9d2e'); }
        else { e.alive = false; state.score += 120; burst(e.x, e.y, '#ff6f32'); }
        s.life = 0; break;
      }
    }
    shots = shots.filter(s => s.life > 0 && s.x > -30 && s.x < W + 30 && s.y > -30 && s.y < H + 30);
    updateEnemyProjectiles(dt);

    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 180 * dt; p.life -= dt; }
    particles = particles.filter(p => p.life > 0);
    for (const s of shockwaves) { s.r += dt * 430; s.life -= dt; }
    shockwaves = shockwaves.filter(s => s.life > 0);
    state.score += dt * 5; updateHud();
  }

  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function drawBackground() {
    rect(0, 0, W, groundY, '#183c70');
    if (images.background) { const iw = 220; for (let x = -20; x < W + iw; x += iw) ctx.drawImage(images.background, 0, 0, 128, 128, x, groundY - 150, iw, 150); }
    rect(0, groundY, W, H - groundY, '#3b1d18');
    if (images.ground) for (let x = 0; x < W; x += 256) ctx.drawImage(images.ground, 0, 0, 256, 256, x, groundY, 256, 34);
    for (let y = groundY + 34; y < H; y += 42) {
      rect(0, y, W, 42, y < groundY + 120 ? '#542621' : y < groundY + 240 ? '#3b1d19' : '#241315');
      ctx.globalAlpha = .16; rect(0, y, W, 2, '#9b4632'); ctx.globalAlpha = 1;
    }
  }

  function drawEntity(e) {
    if (e.type === 'crystal') {
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(Math.PI / 4); rect(-6, -6, 12, 12, '#c98cff'); rect(-3, -3, 6, 6, '#f5ddff'); ctx.restore(); return;
    }
    if (e.type === 'boss') {
      const b = images['boss' + (e.bossIndex || 0)] || images.boss1;
      if (b) { const dw = 90, dh = Math.min(130, dw * b.height / b.width); ctx.drawImage(b, e.x - dw / 2, e.y - dh, dw, dh); }
      const hpW = 76; rect(e.x - hpW / 2, e.y - 116, hpW, 5, '#331316'); rect(e.x - hpW / 2, e.y - 116, hpW * clamp(e.hp / (8 + (e.bossIndex || 0) * 2), 0, 1), 5, '#ff5d43');
      return;
    }
    const a = images.actors;
    if (a) {
      const src = {car:[192,0,48,28],tankL:[128,32,48,30],tankM:[128,32,48,30],helicopter:[176,32,64,32],bomber:[0,0,128,64],ufo:[128,0,64,32],satellite:[128,0,64,32]}[e.type];
      if (src) {
        const [sx, sy, sw, sh] = src; const scale = e.type === 'bomber' ? .55 : e.type === 'helicopter' ? .8 : e.type === 'satellite' ? .65 : 1;
        ctx.save(); if (e.walkDirection > 0) { ctx.translate(e.x * 2, 0); ctx.scale(-1, 1); }
        ctx.drawImage(a, sx, sy, sw, sh, e.x - sw * scale / 2, e.y - sh * scale, sw * scale, sh * scale); ctx.restore();
        if (['tankL','tankM'].includes(e.type)) {
          const len = 18; ctx.strokeStyle = '#20242b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(e.x, e.y - 20); ctx.lineTo(e.x + Math.cos(e.turretAngle || 0) * len, e.y - 20 + Math.sin(e.turretAngle || 0) * len); ctx.stroke();
        }
        return;
      }
    }
    ctx.font = '22px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const icon = {human:'🏃',soldier:'🪖',cow:'🐄',car:'🚗',bird:'🐦',tankL:'🛡️',tankM:'🛡️',helicopter:'🚁',bomber:'✈️',ufo:'🛸',satellite:'🛰️'}[e.type] || '•';
    ctx.fillText(icon, e.x, e.y - 8);
  }

  function drawWorm() {
    const pts = worm.trail, sheet = images.worm;
    for (let i = Math.min(Math.floor(worm.segments) - 1, Math.floor(pts.length / 4) - 1); i >= 0; i--) {
      const p = pts[i * 4]; if (!p) continue; const sc = (worm.radius * 2.15) * (1 - i / (worm.segments * 2.7));
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      if (sheet) { const variant = i % 3; ctx.drawImage(sheet, variant * 16, 48, 16, 16, -sc / 2, -sc / 2, sc, sc); }
      else { ctx.beginPath(); ctx.arc(0, 0, sc / 2, 0, Math.PI * 2); ctx.fillStyle = '#75513f'; ctx.fill(); }
      ctx.restore();
    }
    ctx.save(); ctx.translate(worm.x, worm.y); ctx.rotate(worm.angle);
    if (worm.hitFlash > 0) ctx.globalAlpha = .55;
    if (sheet) ctx.drawImage(sheet, 16, 32, 32, 16, -worm.radius * 1.25, -worm.radius * .72, worm.radius * 2.6, worm.radius * 1.45);
    else { ctx.beginPath(); ctx.arc(0, 0, worm.radius + 3, 0, Math.PI * 2); ctx.fillStyle = '#7b5141'; ctx.fill(); }
    ctx.restore(); ctx.globalAlpha = 1;
  }

  function drawEnemyProjectiles() {
    for (const p of enemyProjectiles) {
      if (p.type === 'bullet') { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fillStyle = '#ffe681'; ctx.fill(); continue; }
      if (p.type === 'bomb' || p.type === 'mine') { ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fillStyle = '#2d3035'; ctx.fill(); ctx.strokeStyle = '#ffb347'; ctx.stroke(); continue; }
      const a = Math.atan2(p.vy, p.vx); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); rect(-8, -3, 16, 6, '#d9d9d9'); rect(-10, -2, 4, 4, '#ff7a38'); ctx.restore();
    }
  }

  function draw() {
    drawBackground();
    for (const e of entities) if (e.alive) drawEntity(e);
    drawEnemyProjectiles();
    for (const s of shots) { ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, Math.PI * 2); ctx.fillStyle = '#aaf7ff'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke(); }
    drawWorm();
    for (const s of shockwaves) { ctx.globalAlpha = Math.max(0, s.life / .75); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.strokeStyle = '#b9e6ff'; ctx.lineWidth = 4; ctx.stroke(); }
    ctx.globalAlpha = 1;
    for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life / .65); rect(p.x, p.y, 4, 4, p.color); }
    ctx.globalAlpha = 1;
  }

  function loop(t) {
    if (!running) return;
    const dt = Math.min(.033, (t - last) / 1000 || .016); last = t;
    if (!paused) update(dt); draw(); requestAnimationFrame(loop);
  }

  function bindHold(el, key) {
    if (!el) return;
    const on = e => { e.preventDefault(); keys[key] = true; };
    const off = e => { e.preventDefault(); keys[key] = false; };
    el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
  }
  bindHold($('#leftBtn'), 'left'); bindHold($('#rightBtn'), 'right'); bindHold($('#boostBtn'), 'boost');
  $('#abilityBtn')?.addEventListener('pointerdown', e => { e.preventDefault(); spit(); });
  $('#slamBtn')?.addEventListener('pointerdown', e => { e.preventDefault(); slam(); });
  $('#empBtn')?.addEventListener('pointerdown', e => { e.preventDefault(); emp(); });
  addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
    if (e.key === ' ') { keys.boost = true; e.preventDefault(); }
    if (e.key === 'f') spit(); if (e.key === 's') slam(); if (e.key === 'e') emp();
  });
  addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
    if (e.key === ' ') keys.boost = false;
  });
  ui.pause.onclick = () => { paused = !paused; ui.pause.textContent = paused ? '▶' : 'Ⅱ'; };
  ui.play.onclick = start;
  ui.how.onclick = () => showModal('Как играть', `<p><b>Восстановленная механика версии 2.0.0:</b></p><ul><li>Ешьте постоянно — здоровье постепенно уменьшается.</li><li>Кампания использует 26 уровней из оригинального SMW_Spawner.</li><li>Наземные враги используют восстановленные PatrolIdleTime/PatrolWalkTime; вооружённые останавливаются для прицеливания.</li><li>TankL/TankM стреляют ракетами, Helicopter1 ведёт огонь и сбрасывает мины, Bomber1/3 сбрасывает бомбы, UFO1 запускает самонаводящиеся ракеты, Satellite2 летит отдельным типом.</li><li>⚡ Ускорение под землёй помогает выше выпрыгивать.</li><li>🔥 Плевок, 💥 удар-метеорит и 💎 EMP используются отдельными кнопками.</li></ul><p class="recovery-note">Числовые параметры игрока и ракет взяты из Assembly-CSharp.dll; веб-масштаб переведён в CSS-пиксели.</p>`);
  ui.sound.onclick = () => { sound = !sound; ui.sound.textContent = `${sound ? '🔊' : '🔇'} Звук: ${sound ? 'вкл.' : 'выкл.'}`; };

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  if (tg) $('#platformNote').textContent = 'Telegram Mini App · Русская восстановленная версия v12';
})();