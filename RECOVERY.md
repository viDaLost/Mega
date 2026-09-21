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

Multiple original tank FSM blocks were identified through the `Tank - Idle` SFX and contain distinct `ShootTimer` values (`30`, `45`, `30`, `30`, `60`) for different tank variants. Bomber FSM blocks use `PatrolWalkSpeed = 2`, `PatrolRunSpeed = 10`, `RunSpeed = 5` and spawn paratrooper/bomb payloads through serialized `Move_Spawn*` variables.

`app-v11.js` was the first browser build to model the recovered patrol/idle state machine, firing pauses, turret aiming, bullets, tank rockets and homing rockets.

`app-v12.js` keeps original spawn identities from `SMW_Spawner` instead of collapsing them into generic vehicles. Runtime profiles now distinguish `TankL`, `TankM`, `Helicopter1`, `Bomber1/3`, `UFO1`, `Satellite2` and soldiers. The common `90/120/2` patrol values are converted from update ticks, the helicopter uses its recovered `45/120/2` patrol block and `300` close-to-worm distance, and its serialized `Mine` spawn interval `160` is represented by falling/armed mines. Bomber payload attacks and tank-variant fire cadence are modeled separately. Where a prefab-to-FSM timer unit is still ambiguous, the browser value remains an explicitly documented adaptation rather than being claimed as an exact original timing.

## Original level progression

`SMW_Spawner` contains 8 progression sets. `Standard_Adventure` was parsed into 26 gameplay levels and is stored in `assets/original-levels.js`.

Recovered growth requirements are:

`15, 25, 25, 30, boss, 20, 25, 30, 35, boss, 20, 30, 35, 40, boss, 40, 45, 45, 45, boss, 45, 75, 90, 100, boss, boss`.

The original serialized counts for actors such as cows, humans, soldiers, cars, tanks, helicopters, bombers, UFOs, satellites, buffalo, horses and EMP crystals are preserved per level. Boss stages are identified at levels 5, 10, 15, 20, 25 and 26.

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
- exact recovered 26-level Standard Adventure data;
- verified original classic vehicle sprites and runtime atlas;
- all five recovered boss sprite sheets;
- recovered `SMW_Player` physics reference values;
- recovered actor patrol/shooting state behavior and projectile constants;
- separate `TankL`/`TankM`/helicopter/bomber/UFO/satellite runtime identities;
- helicopter mine drops and bomber payload attacks;
- boss damage handling, EMP, fire spit and ground-slam mechanics.

## GitHub Pages

GitHub Pages is enabled and the deployment workflow is active. Every push to `main` triggers `.github/workflows/deploy-pages.yml` and republishes the static game.

Public URL: `https://vidalost.github.io/Mega/`
