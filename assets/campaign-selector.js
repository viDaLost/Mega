(() => {
  'use strict';

  const standardRaw = Array.isArray(window.SMW_LEVELS) ? window.SMW_LEVELS : [];
  const xmasRaw = Array.isArray(window.SMW_XMAS2_LEVELS) ? window.SMW_XMAS2_LEVELS : [];
  const STANDARD_BONUS = new Set([5, 10, 15, 20]);

  const standard = standardRaw
    .filter(level => level.number <= 25)
    .map(level => ({
      ...level,
      bonusMode: STANDARD_BONUS.has(level.number),
      bossStage: level.number === 25,
      cutsceneBoss: false
    }));

  const xmas = xmasRaw.map(level => {
    const counts = {};
    for (const [name, entry] of Object.entries(level.entries || {})) {
      if (level.number === 17 && name === 'GiantRobot') continue;
      counts[name] = Number(entry?.count || 0);
    }
    return {
      number: level.number,
      name: `Xmas${level.number}`,
      growthRequired: Number(level.growthRequired || 1),
      counts,
      bonusMode: Boolean(level.bonusMode),
      cutsceneBoss: Boolean(level.cutsceneBoss),
      bossStage: level.number === 17,
      learn: []
    };
  });

  // app-v17 keeps this exact array reference and we swap its contents in-place.
  const active = [];
  window.SMW_LEVELS = active;

  const configs = {
    standard: { id: 'standard', name: 'Standard Adventure', icon: '🌎', levels: standard, maxLevel: 25 },
    xmas: { id: 'xmas', name: 'Xmas2 / Santa', icon: '🎄', levels: xmas, maxLevel: 17 }
  };

  function applyCampaign(id) {
    const cfg = configs[id] || configs.standard;
    active.splice(0, active.length, ...cfg.levels);
    window.SMW_CAMPAIGN = { id: cfg.id, name: cfg.name, icon: cfg.icon, maxLevel: cfg.maxLevel };
    try { localStorage.setItem('smw-campaign', cfg.id); } catch {}

    const label = document.querySelector('#campaignText');
    const standardBtn = document.querySelector('#standardBtn');
    const xmasBtn = document.querySelector('#xmasBtn');
    if (label) label.textContent = `${cfg.icon} ${cfg.name}`;
    standardBtn?.classList.toggle('selected', cfg.id === 'standard');
    xmasBtn?.classList.toggle('selected', cfg.id === 'xmas');
  }

  let saved = 'standard';
  try { saved = localStorage.getItem('smw-campaign') || 'standard'; } catch {}
  applyCampaign(saved);

  document.querySelector('#standardBtn')?.addEventListener('click', () => applyCampaign('standard'));
  document.querySelector('#xmasBtn')?.addEventListener('click', () => applyCampaign('xmas'));

  window.SMW_SELECT_CAMPAIGN = applyCampaign;
})();
