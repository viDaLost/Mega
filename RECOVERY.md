# APK recovery notes

Primary source: `Super_Mega_Worm_2.0.0_Android_2.3(1).apk`.
Secondary/damaged reference: `super-mega-worm-lite-1-1-1 2.apk`.

## Full APK status

The 2.0.0 APK is a complete Unity build and passes ZIP integrity checks. Unlike the damaged Lite copy, it contains readable `Assembly-CSharp.dll`, `mainData`, `level0`, `sharedassets0.assets`, `sharedassets1.assets` and their resource streams. The recovered Unity player data identifies the build as Unity 4.3.4f1.

This makes it possible to recover real managed code, serialized scene data, level progression, textures, FSM data and many audio clips instead of recreating the game only from visual reference.

## Recovered player code

Managed metadata and IL were recovered from `Assembly-CSharp.dll`. Important classes include `SMW_Player`, `SMW_Spawner`, `SMW_ActorBase`, `SMW_DataManager`, `SMW_HUDManager`, vehicle/projectile classes and boss-related classes.

Exact `SMW_Player` constructor values recovered from IL include:

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

The browser port uses these recovered values as its physics reference.

## Recovered enemy FSM / weapon behavior

`SMW_ActorBase` IL and serialized PlayMaker FSM data were inspected. The original actor logic alternates walking and idling via `PatrolWalkTime`, `PatrolWalkSpeed` and `PatrolIdleTime`, stops horizontal movement while shooting, and uses `ShootTimer` plus projectile prefabs for ranged attacks.

Recovered code-level behavior includes:

- turret attack-distance comparison against `40.0` game units;
- turret limits at `25°`, `90°` and `155°`;
- aiming animation directions at `45°`, `90°` and `135°`;
- `shootAnimTimer = 3.0`;
- movement stopped while firing;
- serialized `ProjectilePrefab`, `ShootTimer`, `FireAngle`, `MirrorAngle` and `ShootOffsetY` variables.

Exact projectile constructor values recovered from managed IL:

- bullet: `damageAmount = 1`;
- tank rocket: `damageAmount = 1`, `fireAtStart = true`;
- homing rocket: `damageAmount = 1`, `homeDamping = 1`, `homeSpeed = 15`, `noHomeTime = 3`, `fireAtStart = true`.

Common actor FSM defaults found repeatedly are `PatrolIdleTime = 90`, `PatrolWalkTime = 120`, `PatrolWalkSpeed = 2` and `PatrolRunSpeed = 10`. These are original update/frame counters, not browser seconds.

A helicopter-associated FSM block contains `PatrolIdleTime = 45`, `PatrolWalkTime = 120`, `PatrolWalkSpeed = 2`, `PatrolRunSpeed = 10`, `RunSpeed = 5`, `ShootTimer = 5`, `ShootOffsetY = -20`, `Shoot_CloseToWormXDist = 300`, plus a serialized `Mine` spawn timer of `160`.

Original tank FSM blocks contain `ShootTimer` values `30, 45, 30, 30, 60`. Browser profiles therefore use the recovered 30/45/60-tick firing tiers while preserving the original projectile constants.

Three bomber FSM families were separated by their serialized payload prefab references:

- `Bomber1` drops `Paratrooper`; spawn range `60–75` update ticks, simultaneous maximum `10`, total maximum `20`;
- `Bomber2` drops `ParaDriller`; same `60–75` family and `10 / 20` limits;
- `Bomber3` drops `Nuke`; spawn timer `90`, simultaneous/total maximum `1 / 1`.

Bomber blocks also use `PatrolWalkSpeed = 2`, `PatrolRunSpeed = 10` and `RunSpeed = 5`. In the browser port Paratrooper and ParaDriller payloads become ground actors after landing, while Nuke performs a radial explosion.

`app-v11.js` introduced the recovered actor state machine and projectiles. `app-v12.js` preserved original spawn identities such as `TankL`, `TankM`, `Helicopter1`, `Bomber1/3`, `UFO1`, `Satellite2` and soldiers. `app-v13.js` added the recovered tank timing tiers and distinct bomber payload families.

## Standard Adventure progression

`SMW_Spawner` contains multiple progression sets. The standard Area 1 progression was recovered from `LevelProgressionArea1.plist` and contains `Level1` through `Level26`, plus test/object-list data.

The original plist stores per-prefab `Count`, `Max` and, where present, `SpawnDelay`. `app-v14.js` introduced a per-prefab spawn ledger:

- `Count` is the initial population for that prefab;
- `Max` is the total production cap for that prefab during the level;
- `SpawnDelay` controls delayed replenishment where supplied;
- each original prefab is tracked independently instead of sharing one randomized respawn pool.

Examples recovered directly from the plist:

- Level 1: `CowCount = 7`, `CowMax = 40`; `Bird1Count = 8`, `Bird1Max = 30`; `UFO1Count = 3`, `UFO1Max = 6`; `UndergroundEMPCrystalCount = 5`, `UndergroundEMPCrystalMax = 10`, `SpawnDelay = 10`;
- Level 7: `Helicopter1Count = 1`, `Helicopter1Max = 3`; `SoldierLCount = 5`, `SoldierLMax = 17`; EMP crystal `SpawnDelay = 15`;
- Level 12: `TankLCount = 1`, `TankLMax = 5`; `SoldierG1Count = 7`, `SoldierG1Max = 20`; EMP crystal maximum `20` with `SpawnDelay = 10`;
- Level 25: `Bomber3Count = 1` and `GrowthRequired = 100000`;
- Level 26: `Bomber1Count = 1`, `BuffaloCount = 5`, `UndergroundEMPCrystalCount = 10`, with EMP learning flags.

### Correct BonusMode behavior

Earlier reconstruction incorrectly treated Levels 5, 10, 15 and 20 as boss stages because their growth requirements are extremely large. Further plist and IL recovery proved that this was wrong.

`LevelProgressionArea1.plist` marks Levels **5, 10, 15 and 20** with `BonusMode = true`. `SMW_Spawner.Update()` contains direct floating-point comparisons/updates against **`30.0`**, establishing the original BonusMode timer as 30 seconds/time units. `app-v15.js` therefore implements these four stages as 30-second bonus waves and no longer injects synthetic bosses into Standard Adventure.

The standard Area 1 plist contains no `CutsceneBoss` flag for those levels. Boss textures/classes remain recovered from the APK, but they must not be used as evidence that the four standard bonus stages are bosses.

### Final standard progression

Caller analysis of the managed IL found that normal `SMW_Spawner.IncreaseProgressionLevel()` is invoked from `SMW_Player.PumpUpdate` after the player-growth / `humansCurrent` versus `humansBeforeGrow` logic. `IncreaseProgressionLevelPastCap()` is tied to a manual/debug button path rather than normal play.

That changes the interpretation of the final records:

- Level 24 has a normal `GrowthRequired = 100` and a regular actor population;
- Level 25 has `GrowthRequired = 100000`, contains `Bomber3`/Nuke encounter data, and contains no ordinary humans capable of satisfying normal growth progression;
- Level 26 exists in the plist but is not reachable through the recovered normal progression path. It is preserved as hidden/special/debug progression data rather than exposed as a normal campaign level.

`app-v15.js` models this result: Levels 5/10/15/20 are timed BonusMode stages, Level 25 is the final non-auto-advancing Standard Adventure stage, and Level 26 stays preserved in recovered data but outside ordinary progression.

Recovered growth requirements remain useful as source data, but huge values on BonusMode/final records are no longer interpreted as boss-health substitutes.

## Recovered graphics

Recovered Unity textures include:

- `Wojira_Tex`
- `Actors_Classic_Tex`
- `Actors_Xmas2_Tex`
- `Ground_Tex` / `GroundStrip_Tex`
- `Sky_Tex` / `Background_Classic_Tex`
- `HUD_Tex` / `HUD_Menu_Tex`
- `FX_Tex` / `Additive_FX_Tex` / `FXBelowWojira_Tex`
- `Fog_Tex`
- `Actor_Bosses_Tex` and `Actor_Bosses1..4_Tex`
- `Help1_Tex` / `Help2_Tex`
- `Cutscene_Classic_Tex` / `Cutscene_Xmas2_Tex`
- `Wojira_Egg_Tex` / `Worm_Trail1`

For the web build, classic vehicle artwork was losslessly cropped into separate car, tank, UFO, helicopter and plane sprites. The runtime vehicle atlas was rebuilt losslessly as an indexed PNG. All five recovered boss texture sets remain in the repository for the campaign/boss data to which they actually belong.

## Recovered scene content

Serialized scene data contains original actors/objects including Cow, Horse, Emu, Buffalo, humans and soldiers, cars, trucks, tanks, Helicopter, Bomber, UFO, Satellite, Astronaut, parachutists, rockets, lasers, underground mines, EMP crystals, Giant Robot and Mecha Santa.

## Audio status

A large set of original AudioClips is valid. Verified examples include:

- `EMPPowerup.wav` — 2.73 s
- `PowerUp.wav` — 0.61 s
- `FireExplosion.wav` — 0.66 s
- `Worm_Hit.wav` — 0.33 s
- `Nuke.wav` — 2.15 s
- `Smash.wav` — 1.72 s
- `VehicleHit.wav` — 0.61 s

Several files initially exported with an `.mp3` extension contain Unity/ID3 wrapper data but no valid MPEG frames. Those events are not treated as exact audio until their underlying streams are reconstructed correctly.

## Current web-port state

The current browser build contains:

- Russian UI;
- iPhone/iPad touch controls and safe-area handling;
- Telegram Mini App integration;
- PWA/offline support;
- recovered Wojira/background/ground graphics;
- Standard Adventure per-prefab `Count / Max / SpawnDelay` data;
- corrected 30-second BonusMode stages at Levels 5/10/15/20;
- corrected Level25 final-stage behavior and hidden Level26 data handling;
- recovered classic vehicle sprites and all boss sheets;
- recovered `SMW_Player` physics reference values;
- recovered actor patrol/shooting behavior and projectile constants;
- separate tank/helicopter/bomber/UFO/satellite/soldier identities;
- helicopter mine drops;
- Paratrooper, ParaDriller and Nuke bomber payload families;
- EMP, fire spit and ground-slam mechanics.

## Next recovery target

The next separate progression to restore is the Xmas/Santa campaign. Its serialized progression has its own boss flags (including real `CutsceneBoss` data) and is the correct place to connect Mecha Santa / Giant Robot behavior and the recovered boss sheets rather than attaching them to Standard Adventure.

## GitHub Pages

GitHub Pages is enabled and `.github/workflows/deploy-pages.yml` republishes the static game on pushes to `main`.

Public URL: `https://vidalost.github.io/Mega/`
