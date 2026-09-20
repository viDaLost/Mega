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

The web port now uses these values as its physics reference instead of the earlier guessed constants.

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

For the web build, the original classic vehicle artwork was losslessly cropped into separate car, tank, UFO, helicopter and plane sprites. The runtime vehicle atlas was also rebuilt losslessly as an indexed PNG; pixel comparison against the RGBA source is exact.

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
- verified first boss sprite sheets, with fallback rendering for boss sheets that have not yet passed binary-integrity verification;
- recovered `SMW_Player` physics reference values;
- boss damage handling, EMP, fire spit and ground-slam mechanics.

## GitHub Pages note

The deployment workflow is present. The connected GitHub integration can push workflow changes but cannot create the repository's initial GitHub Pages site. Pages must be enabled once in repository Settings → Pages with **GitHub Actions** selected as the source; subsequent pushes can deploy automatically.
