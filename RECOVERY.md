# APK recovery notes

Primary source: `Super_Mega_Worm_2.0.0_Android_2.3(1).apk`.
Secondary/damaged reference: `super-mega-worm-lite-1-1-1 2.apk`.

## Source status

The 2.0.0 APK is a complete Unity 4.3.4f1 build. It contains readable `Assembly-CSharp.dll`, `mainData`, `level0`, `sharedassets0.assets`, `sharedassets1.assets` and resource streams. This allowed recovery of managed metadata/IL, serialized data, progression plists, textures and audio.

## Player constants recovered from `SMW_Player`

- `topSpeed = 15`
- `lowSpeed = 6`
- `acceleration = 0.4`
- `groundFriction = 0.4`
- `launchBoost = 3`
- `turnAcceleration = 5`
- `turnMax = 10`
- `jumpTurnMax = 4`
- `jumpTurnAcceleration = 0.2`
- `gravity = 0.35`
- `downwardTopSpeed = 40`
- `healthMaxStart = 100`
- `healthPerSegment = 4`
- `startLength = 5`
- `startLengthMax = 8`
- `empDist = 128`
- `pileDriverSpeed = 40`

## Standard Adventure

Source: `LevelProgressionArea1.plist` plus recovered `SMW_Spawner` behavior.

- Levels 5, 10, 15 and 20 are 30-second `BonusMode` levels, not bosses.
- Level 24 is a normal growth level.
- Level 25 is the final normally reachable encounter.
- Level 26 exists in recovered serialized data but is excluded from the ordinary campaign route.

`assets/campaign-selector.js` corrects the older compatibility table before it reaches the browser runtime.

## Xmas2 / Santa

Source: `LevelProgressionXMAS2.plist`.

- Levels 1–17 are preserved in `assets/xmas2-levels.js`.
- Levels 5, 10 and 15 are `BonusMode`.
- Level 16 is `CutsceneBoss` with no normal population.
- Level 17 contains the final Giant Robot encounter plus the recovered supporting population.

The browser selector normalizes these records into the same format used by the stable Canvas runtime.

## Graphics and audio

Recovered assets include Wojira, classic actor/vehicle atlases, Xmas-related data, ground/background/HUD/FX resources and `Actor_Bosses_Tex` plus `Actor_Bosses1..4_Tex`. Verified browser audio includes EMP, power-up, explosion, laser, tank/rocket and worm-hit clips.

## Current browser build

The active build is **`app-v17.js`**.

It is intentionally uncompressed and contains no embedded gzip/base64 runtime payload. GitHub Actions validates:

- `app-v17.js` syntax;
- campaign selector syntax;
- Standard and Xmas2 data files;
- Service Worker syntax;
- the exact script references in `index.html`.

The active UI exposes Standard Adventure and Xmas2 campaign selection, touch controls, Russian interface, PWA support and Telegram Mini App integration.

## v16 failure and repair

The former `app-v16.js` wrapper contained a malformed/truncated base64/gzip stream. Browser execution failed before event listeners were installed, which produced a visible menu that did not react to taps or clicks.

The damaged v16 runtime and its salvage artifact were removed. `v17` was regenerated from the known-working uncompressed runtime, checked with Node before commit, and the Service Worker cache namespace was bumped so clients replace the broken cached build.

## Scope / limitations

This remains a browser reconstruction grounded in the recovered APK, not the original Unity project. Progression data and many constants are exact recovered source values. Canvas collision sizes, rendering, some prefab relationships and some timing conversions are browser adaptations where the original Unity scene/prefab runtime cannot be reproduced byte-for-byte.

## GitHub Pages

Deployment is handled by `.github/workflows/deploy-pages.yml` on pushes to `main`.

Public URL: `https://vidalost.github.io/Mega/`
