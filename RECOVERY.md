# APK recovery notes

Primary source: `Super_Mega_Worm_2.0.0_Android_2.3(1).apk`.
Secondary/damaged reference: `super-mega-worm-lite-1-1-1 2.apk`.

## Full APK status

The 2.0.0 APK is a complete Unity build and passes ZIP integrity checks. Unlike the damaged Lite copy, it contains readable `Assembly-CSharp.dll`, `mainData`, `level0`, `sharedassets0.assets`, `sharedassets1.assets` and their resource streams. The recovered Unity player data identifies the build as Unity 4.3.4f1.

This makes it possible to recover real game classes, serialized scene data, level progression, textures and many audio clips instead of recreating the game only from visual reference.

## Recovered gameplay code/data

Managed metadata and IL were recovered from `Assembly-CSharp.dll`. Important classes include:

- `SMW_Player`
- `SMW_Spawner`
- `SMW_ActorBase`
- `SMW_DataManager`
- `SMW_HUDManager`
- boss, rocket, EMP, ice-attack and vehicle-related classes

Exact player constructor values recovered from `SMW_Player` include:

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

The web port uses these values as its physics reference instead of the earlier guessed constants.

## Recovered enemy FSM / weapon behavior

`SMW_ActorBase` IL and the serialized PlayMaker FSM data were both inspected. The original actor logic alternates walking and idling via `PatrolWalkTime`, `PatrolWalkSpeed` and `PatrolIdleTime`, stops horizontal movement while shooting, and uses `ShootTimer` plus a projectile prefab for ranged attacks.

Exact code-level behavior recovered from `SMW_ActorBase::ShootAtWorm_Action` includes:

- attack-distance comparison against `40.0` game units for turret aiming;
- turret angle limits at `25°`, `90°` and `155°`;
- aiming animation directions at `45°`, `90°` and `135°`;
- `shootAnimTimer = 3.0`;
- movement is stopped while the actor is in the firing state;
- serialized variables include `ProjectilePrefab`, `ShootTimer`, `FireAngle`, `MirrorAngle` and `ShootOffsetY`.

Exact projectile constructor values recovered from managed IL:

- bullet: `damageAmount = 1`;
- tank rocket: `damageAmount = 1`, `fireAtStart = true`;
- homing rocket: `damageAmount = 1`, `homeDamping = 1`, `homeSpeed = 15`, `noHomeTime = 3`, `fireAtStart = true`.

The serialized FSM stream additionally exposes real per-prefab values. Common actor defaults found repeatedly are `PatrolIdleTime = 90`, `PatrolWalkTime = 120`, `PatrolWalkSpeed = 2`, and `PatrolRunSpeed = 10`. These timer values are frame/update counters in the original behavior, not browser seconds. Variants exist: for example some actors use walk speed `0.5` or `1`, and one patrol block uses idle time `45`.

A helicopter-associated FSM block was identified by its original `Helicopter - Idle` SFX data. It contains `PatrolIdleTime = 45`, `PatrolWalkTime = 120`, `PatrolWalkSpeed = 2`, `PatrolRunSpeed = 10`, `RunSpeed = 5`, `ShootTimer = 5`, `ShootOffsetY = -20`, and `Shoot_CloseToWormXDist = 300`. It also periodically spawns a `Mine` with a serialized spawn time of `160`.

Multiple original tank FSM blocks were identified through the `Tank - Idle` SFX. Their recovered `ShootTimer` family is `30, 45, 30, 30, 60` update ticks; the matching blocks use the common `PatrolIdleTime = 90`, `PatrolWalkTime = 120`, `PatrolWalkSpeed = 2` and `PatrolRunSpeed = 10` values. The browser profiles therefore use 30/45/60-tick firing tiers for light/medium/heavier tank behavior while retaining the recovered projectile constants.

Three bomber FSM families were separated by their serialized payload prefab references:

- `Bomber1` drops `Paratrooper`; its spawn-time range is `60–75` update ticks, with a simultaneous payload maximum of `10` and total maximum of `20`;
- `Bomber2` drops `ParaDriller`; it uses the same recovered `60–75` update-tick family and `10 / 20` simultaneous/total limits;
- `Bomber3` drops `Nuke`; its recovered spawn timer is `90` update ticks and its simultaneous/total maximum is `1 / 1`.

Bomber FSM blocks also use `PatrolWalkSpeed = 2`, `PatrolRunSpeed = 10` and `RunSpeed = 5`. In the web port, paratrooper and ParaDriller payloads fall and become ground actors after landing, while the Nuke payload performs a radial explosion.

`app-v11.js` was the first browser build to model the recovered patrol/idle state machine, firing pauses, turret aiming, bullets, tank rockets and homing rockets.

`app-v12.js` keeps original spawn identities from `SMW_Spawner` instead of collapsing them into generic vehicles. Runtime profiles distinguish `TankL`, `TankM`, `Helicopter1`, `Bomber1/3`, `UFO1`, `Satellite2` and soldiers. It also introduced helicopter mine drops and separate bomber payload attacks.

`app-v13.js` maps the recovered tank timing tiers and the three bomber payload families described above instead of using one generic bomb behavior.

## Original level progression and spawn quotas

`SMW_Spawner` contains 8 progression sets. `Standard_Adventure` was parsed into 26 gameplay levels. The compact progression table remains in `assets/original-levels.js`.

The original `LevelProgressionArea1.plist` was also recovered intact from the Unity serialized data. It contains, per actor/prefab and per level, the original `Count`, `Max` and (where present) `SpawnDelay` values. `app-v14.js` embeds this richer table and uses it as the primary runtime spawn source.

The v14 spawn ledger works as follows:

- `Count` determines the initial active population for the specific original prefab;
- `Max` limits how many instances of that prefab may be produced in total during the level;
- `SpawnDelay` controls delayed replenishment where the original data supplies one;
- each prefab is tracked independently, so `TankL`, `Helicopter1`, `Bomber1`, humans, animals, EMP crystals and other actors no longer share a single randomized respawn bucket.

Examples recovered directly from the progression plist include:

- Level 1: `CowCount = 7`, `CowMax = 40`; `Bird1Count = 8`, `Bird1Max = 30`; `UFO1Count = 3`, `UFO1Max = 6`; `UndergroundEMPCrystalCount = 5`, `UndergroundEMPCrystalMax = 10`, `SpawnDelay = 10`;
- Level 7: `Helicopter1Count = 1`, `Helicopter1Max = 3`; `SoldierLCount = 5`, `SoldierLMax = 17`; EMP crystal `SpawnDelay = 15`;
- Level 12: `TankLCount = 1`, `TankLMax = 5`; `SoldierG1Count = 7`, `SoldierG1Max = 20`; EMP crystal maximum `20` with `SpawnDelay = 10`;
- Level 25: `Bomber3Count = 1` and the progression data constrains the heavy bomber/nuke encounter;
- Level 26: `Bomber1Count = 1`, `BuffaloCount = 5`, `UndergroundEMPCrystalCount = 10`, and the EMP learning flags are enabled.

Some boss-stage `Max` values are `1000`; this is preserved as evidence that those stages were designed around continuous replenishment rather than a fixed one-time wave. Across the recovered standard campaign, some levels contain close to ninety initial actor instances when all original `Count` fields are summed.

Recovered growth requirements are:

`15, 25, 25, 30, boss, 20, 25, 30, 35, boss, 20, 30, 35, 40, boss, 40, 45, 45, 45, boss, 45, 75, 90, 100, boss, boss`.

Boss stages are identified at levels 5, 10, 15, 20, 25 and 26.

## Recovered graphics

Original Unity textures recovered from the supplied build include:

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

For the web build, the original classic vehicle artwork was losslessly cropped into separate car, tank, UFO, helicopter and plane sprites. The runtime vehicle atlas was also rebuilt losslessly as an indexed PNG; pixel comparison against the RGBA source is exact. All five recovered boss texture sets are present in the repository.

## Recovered actors / scene content

Serialized scene data contains original actor/object names including Cow, Horse, Emu, Buffalo, multiple humans and soldiers, cars, trucks, tanks, Helicopter, Bomber, UFO, Satellite, Astronaut, parachutists, rockets, lasers, underground mines, EMP crystals, Giant Robot and Mecha Santa.

## Audio status

A large set of original WAV AudioClips is valid and decodes correctly. Verified examples include:

- `EMPPowerup.wav` — 2.73 s
- `PowerUp.wav` — 0.61 s
- `FireExplosion.wav` — 0.66 s
- `Worm_Hit.wav` — 0.33 s
- `Nuke.wav` — 2.15 s
- `Smash.wav` — 1.72 s
- `VehicleHit.wav` — 0.61 s

Several files initially exported with an `.mp3` extension contain Unity/ID3 wrapper data but no valid MPEG audio frames. Those files are intentionally not used by the web build until their underlying AudioClip streams are reconstructed correctly from Unity resource data.

## Current web-port state

The repository currently contains:

- Russian UI;
- iPhone/iPad touch controls and safe-area handling;
- Telegram Mini App integration;
- PWA/offline support;
- recovered Wojira/background/ground graphics;
- recovered 26-level Standard Adventure progression;
- exact per-prefab `Count / Max / SpawnDelay` spawn quota data for the standard campaign in v14;
- verified original classic vehicle sprites and runtime atlas;
- all five recovered boss sprite sheets;
- recovered `SMW_Player` physics reference values;
- recovered actor patrol/shooting state behavior and projectile constants;
- separate tank/helicopter/bomber/UFO/satellite/soldier runtime identities;
- helicopter mine drops;
- `Paratrooper`, `ParaDriller` and `Nuke` bomber payload families;
- boss damage handling, EMP, fire spit and ground-slam mechanics.

## GitHub Pages

GitHub Pages is enabled and the deployment workflow is active. Every push to `main` triggers `.github/workflows/deploy-pages.yml` and republishes the static game.

Public URL: `https://vidalost.github.io/Mega/`
