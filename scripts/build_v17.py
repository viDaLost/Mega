from pathlib import Path

src = Path('app.js').read_text()

src = src.replace(
    "const state={score:0,level:1,eaten:0,target:10,health:100,combo:0,spitCooldown:0,slamCooldown:0,empCharge:0};",
    "const state={score:0,level:1,eaten:0,target:10,health:100,combo:0,spitCooldown:0,slamCooldown:0,empCharge:0,bonusTimer:null};"
)

src = src.replace(
    "function levelTarget(def=levelDef()){ return def ? (def.bossStage ? 1 : Math.max(1,def.growthRequired)) : Math.min(40,10+state.level*3); }",
    "function levelTarget(def=levelDef()){ return def ? (def.bossStage ? 1 : def.bonusMode ? 10000 : Math.max(1,def.growthRequired)) : Math.min(40,10+state.level*3); }"
)

src = src.replace(
    "const def=levelDef(); state.target=levelTarget(def); state.eaten=0;",
    "const def=levelDef(); state.target=levelTarget(def); state.eaten=0; state.bonusTimer=def?.bonusMode?30:null;"
)

start = src.index("  function updateHud(){")
end = src.index("  function vibrate", start)
src = src[:start] + r'''  function updateHud(){
    ui.score.textContent=Math.floor(state.score).toLocaleString('ru-RU');
    ui.eaten.textContent=state.bonusTimer!==null?`БОНУС ${Math.ceil(state.bonusTimer)}с`:`${state.eaten} / ${state.target}`;
    ui.level.textContent=state.level;
    ui.health.style.width=`${Math.max(0,state.health)}%`;
    ui.health.style.background=state.health<30?'#ef5350':'#75e34f';
    if(ui.emp)ui.emp.textContent=`${state.empCharge}/3`;
  }
''' + src[end:]

start = src.index("  function completeLevelIfReady(){")
end = src.index("  function hitBoss", start)
src = src[:start] + r'''  function campaignMaxLevel(){
    return window.SMW_CAMPAIGN?.maxLevel || Math.max(1,...LEVELS.map(level=>level.number||1));
  }
  function campaignName(){ return window.SMW_CAMPAIGN?.name || 'Standard Adventure'; }
  function completeLevelIfReady(force=false){
    const current=levelDef();
    if(current?.bonusMode && !force) return false;
    if(!force && state.eaten<state.target) return false;
    const maxLevel=campaignMaxLevel();
    if(state.level>=maxLevel){
      running=false;
      state.bonusTimer=null;
      playSfx('wmd_level_up');
      showModal('Кампания пройдена',`<p><b>${campaignName()}</b> завершена.</p><p>Счёт: <b>${Math.floor(state.score).toLocaleString('ru-RU')}</b></p>`,'Играть снова',start);
      return true;
    }
    state.level++;
    worm.radius=Math.min(24,worm.radius+1.1);
    worm.speed=Math.min(ORIGINAL_PHYSICS.topSpeed*WORLD_UNIT*1.35,worm.speed+ORIGINAL_PHYSICS.acceleration*WORLD_UNIT);
    state.health=ORIGINAL_PHYSICS.healthMaxStart;
    const next=levelDef();
    if(next?.cutsceneBoss){
      state.eaten=0; state.target=1; state.bonusTimer=null; entities=[]; updateHud();
      playSfx('wmd_level_up');
      showModal('Финальная битва',`<p>Уровень ${next.number}: восстановленный <b>CutsceneBoss</b>.</p><p>Впереди Giant Robot.</p>`,'К битве',()=>{
        state.level=Math.min(campaignMaxLevel(),state.level+1);
        applyLevel(true);
      });
      return true;
    }
    applyLevel(true);
    playSfx('wmd_level_up');
    const modeText=next?.bonusMode?'🎁 Бонусный режим: 30 секунд.':next?.bossStage?'⚠️ Финальный босс.':`Нужно набрать рост: <b>${state.target}</b>.`;
    showModal(`Уровень ${state.level}`,`<p><b>${campaignName()}</b> · ${next?.name||('Level'+state.level)}</p><p>${modeText}</p>`,'Продолжить');
    return true;
  }
''' + src[end:]

src = src.replace(
    "frame+=dt; state.health-=dt*(3.2+state.level*.11);state.spitCooldown=Math.max(0,state.spitCooldown-dt);state.slamCooldown=Math.max(0,state.slamCooldown-dt);",
    "frame+=dt; if(state.bonusTimer!==null){state.bonusTimer=Math.max(0,state.bonusTimer-dt);if(state.bonusTimer<=0){state.bonusTimer=null;completeLevelIfReady(true);}} state.health-=dt*(3.2+state.level*.11);state.spitCooldown=Math.max(0,state.spitCooldown-dt);state.slamCooldown=Math.max(0,state.slamCooldown-dt);"
)

src = src.replace(
    "Object.assign(state,{score:0,level:1,eaten:0,target:levelTarget(LEVELS[0]),health:ORIGINAL_PHYSICS.healthMaxStart,combo:0,spitCooldown:0,slamCooldown:0,empCharge:0});",
    "Object.assign(state,{score:0,level:1,eaten:0,target:levelTarget(LEVELS[0]),health:ORIGINAL_PHYSICS.healthMaxStart,combo:0,spitCooldown:0,slamCooldown:0,empCharge:0,bonusTimer:null});"
)

src = src.replace(
    "<li>У основной кампании восстановлено 26 уровней Standard_Adventure.</li>",
    "<li>Доступны восстановленные кампании Standard Adventure и Xmas2 / Santa.</li>"
)

Path('app-v17.js').write_text('// v17: validated uncompressed Standard + Xmas2 runtime.\n' + src)
