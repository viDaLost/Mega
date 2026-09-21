# APK recovery notes

Primary source: `Super_Mega_Worm_2.0.0_Android_2.3(1).apk`.
Secondary/damaged reference: `super-mega-worm-lite-1-1-1 2.apk`.

## Source status

The 2.0.0 APK is a complete Unity 4.3.4f1 build. It contains readable `Assembly-CSharp.dll`, `mainData`, `level0`, `sharedassets0.assets`, `sharedassets1.assets` and resource streams. This allowed recovery of managed metadata/IL, serialized PlayMaker FSM data, progression plists, textures and audio.

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

The v16 browser build uses these values as its movement reference.

## Enemy FSM / weapons

Recovered `SMW_ActorBase` and PlayMaker data show walk/idle patrol states, movement stopping during firing and per-prefab shooting timers.

Recovered values used by the browser reconstruction include:

- common patrol: `PatrolIdleTime = 90`, `PatrolWalkTime = 120`, `PatrolWalkSpeed = 2`, `PatrolRunSpeed = 10`;
- turret distance comparison: `40.0` game units;
- aim angles: `25° / 90° / 155°`, animation directions `45° / 90° / 135°`;
- bullet damage: `1`;
- tank rocket damage: `1`;
- homing rocket: damage `1`, `homeDamping = 1`, `homeSpeed = 15`, `noHomeTime = 3`;
- helicopter: idle `45`, walk `120`, run speed `5`, shoot timer `5`, shoot offset Y `-20`, close-X distance `300`, Mine timer `160`;
- tank firing families: `30 / 45 / 60` ticks;
- Bomber1 → `Paratrooper`, 60–75 ticks, max 10 simultaneous / 20 total;
- Bomber2 → `ParaDriller`, 60–75 ticks, max 10 / 20;
- Bomber3 → `Nuke`, 90 ticks, max 1 / 1.

Where exact prefab-to-FSM identity is not proven, v16 preserves the recovered value family but adapts browser timing/scale rather than claiming byte-exact Unity behavior.

## Standard Adventure

Source: `LevelProgressionArea1.plist`.

The v16 bundle preserves per-prefab `Count`, `Max`, `SpawnDelay`, level `GrowthRequired` and flags.

Important corrected behavior:

- Levels 5, 10, 15 and 20 are `BonusMode`, **not bosses**;
- managed IL confirms a 30-second bonus timer;
- Level 24 is a normal growth level (`GrowthRequired = 100`);
- Level 25 is the final normally reachable record and contains the Bomber3/Nuke encounter;
- Level 26 exists in serialized data but normal recovered progression does not reach it, so it remains hidden/special data.

## Xmas2 / Santa campaign

Source: `LevelProgressionXMAS2.plist`.

The v16 bundle preserves Levels 1–17 with original actor quotas and flags.

Key recovered structure:

- Levels 5, 10 and 15: `BonusMode`;
- Level 16: `GrowthRequired = 1`, `CutsceneBoss = true`, no ordinary population;
- Level 17: `GiantRobot Count = 1, Max = 1`, plus Bird3, PolarBear, EMP crystals and UndergroundRock.

This is the campaign where the recovered Santa/Giant Robot boss resources belong. v16 therefore uses the real Level 16 boss transition and Giant Robot final stage instead of attaching boss sheets to Standard Adventure.

## Graphics and audio

Recovered original assets include Wojira, classic actor/vehicle atlases, Xmas2 atlases, ground/sky/HUD/FX, cutscene sheets and `Actor_Bosses_Tex` plus `Actor_Bosses1..4_Tex`. The repository contains the original classic vehicle crops and all five recovered boss texture sets.

Verified audio used by the browser build includes EMP, power-up, explosion, tank/rocket, laser and worm-hit clips. Events whose original browser-safe stream has not yet been reconstructed use a verified recovered clip from the same APK as an explicit fallback.

## Current browser build

`app-v16.js` is the active published bundle. It contains:

- Standard Adventure and Xmas2 campaign selection;
- exact recovered progression data for both campaigns;
- 30-second BonusMode handling;
- correct Standard final-level interpretation;
- Xmas2 CutsceneBoss and Giant Robot stages;
- recovered player physics values;
- tank/helicopter/bomber/UFO/satellite/soldier identities;
- bullets, rockets, homing rockets, mines and bomber payloads;
- EMP, fire spit and ground slam;
- Russian UI, iOS/PWA controls and Telegram Mini App integration.

## Scope / limitations

This is a browser reconstruction grounded in the recovered APK, not the original Unity project. Serialized progression and many managed-code constants are exact source data. Canvas rendering, collision dimensions and some timing conversions remain browser adaptations where the original prefab hierarchy/runtime behavior cannot be reproduced byte-for-byte without the Unity project.

## GitHub Pages

Deployment is handled by `.github/workflows/deploy-pages.yml` on pushes to `main`.

Public URL: `https://vidalost.github.io/Mega/`
