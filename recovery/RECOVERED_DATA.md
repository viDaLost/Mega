# Super Mega Worm 2.0.0 — восстановленные данные

Источник: `Super_Mega_Worm_2.0.0_Android_2.3(1).apk`.

- Unity: **4.3.4f1**
- Managed logic: `assets/bin/Data/Managed/Assembly-CSharp.dll`
- Основная сцена/сериализованные данные: `level0`, `mainData`, `sharedassets0`, `sharedassets1`
- В `SMW_Spawner` восстановлено **76 spawn-object definitions** и **8 progressions**.

## Реальные параметры SMW_Player

Значения извлечены из IL конструктора `SMW_Player`:

```json
{
  "maxPosHistory": 10,
  "pileDriverSpeed": 40.0,
  "pileDriverEngageSpeed": 8.0,
  "pileDriverEngageHeight": 128.0,
  "visualScale": 1.0,
  "length": 5,
  "lengthMax": 8,
  "acceleration": 0.4,
  "groundFriction": 0.4,
  "topSpeed": 15.0,
  "lowSpeed": 6.0,
  "topSegmentThatAffectsSpeed": 23.0,
  "launchBoost": 3.0,
  "dashTopSpeed": 14.0,
  "dashDelay": 45,
  "dashLength": 15,
  "dashLowSpeed": 9.0,
  "landTopSpeed": 20.0,
  "turnAcceleration": 5.0,
  "turnMax": 10.0,
  "jumpTurnMax": 4.0,
  "jumpTurnAcceleration": 0.2,
  "spitSpeed": 12,
  "gravity": 0.35,
  "crustThickness": 15.0,
  "downwardForceMax": 3.0,
  "downwardForceAccel": 0.1,
  "downwardTopSpeed": 40.0,
  "minBounceSpeed": 10.0,
  "maxBounceSpeed": 35.0,
  "healthMaxStart": 100,
  "healthPerSegment": 4,
  "heartBeatSpeed": 45,
  "heartBeatDamage": 4,
  "heartBeatDamageSpace": 20,
  "screenShakeMinSpeed": 8.0,
  "screenShakeMaxSpeed": 24.0,
  "headSizeAgainstTail": 5,
  "empDist": 128.0
}
```

Дополнительные константы: `SPACELEVEL = 1120`, `CORELEVEL = -768`, стартовое здоровье `100`, `empActiveMaxTime = 5.0`, `styleMaxBuildupForMult = 100.0`.

## Восстановленные кампании

| Progression | BGM | Уровней |
|---|---|---:|
| Standard_Adventure | BGM - Gameplay - Main | 28 |
| Standard_TimeAttack | BGM - Gameplay - Main | 3 |
| Xmas2_Adventure | BGM - Gameplay - Xmas2 | 20 |
| Xmas2_TimeAttack | BGM - Boss Fight | 5 |
| Xmas2_Demo | BGM - Gameplay - Xmas2 | 6 |
| Standard_Demo | BGM - Gameplay - Main | 8 |
| Xmas1_Adventure | BGM - Gameplay - Xmas1 | 20 |
| Xmas1_TimeAttack | BGM - Gameplay - Xmas1 | 4 |

## 76 spawn-объектов

`Cow`, `Bird1`, `Penguin`, `PenguinMine`, `Bird2`, `Elf_Gun`, `Reindeer_Air`, `Elf_Rocket`, `PolarBear`, `Reindeer`, `Snowman`, `XmasFemale`, `MiniSleigh`, `MechaSanta`, `NutCracker`, `ToyTank`, `ToyTankSpiked`, `Mine`, `PresentBomb`, `GingerBreadMan`, `UndergroundEMPCrystal`, `UndergroundRock`, `BalloonElf`, `Elf_Worker`, `SleighGround`, `PlowTruck`, `Bird3`, `BalloonElfHigh`, `GiantRobot`, `GingerBreadHouse`, `UndergroundTimeClock`, `CandyCane`, `UndergroundCandy`, `ElfHouse`, `MiniSleighBonus`, `UFO1`, `BouncyBomb`, `HumanMale1`, `HumanMale2`, `HumanFemale1`, `Buffalo`, `Bomber1`, `Car1`, `Car2`, `Helicopter1`, `Emu`, `Horse1`, `Plane2`, `Plane3`, `Satellite2`, `SoldierG1`, `SoldierL`, `SoldierR1`, `TankL`, `TankM`, `TankH`, `Astronaut1`, `Bomber2`, `BalloonKid`, `BalloonBoy`, `Moon`, `ParaBomber`, `Paratrooper`, `ParaDriller`, `ParaDrillerMissile`, `TruckCS`, `RedNeck1`, `RedNeck2`, `Nuke`, `Bomber3`, `Truck2`, `Truck1`, `Santa`, `Elf_Disabled`, `SuperPresentBomb`, `Snowman2`.

В каждом определении восстановлены ссылка на prefab и диапазон высоты спавна; для воздушных/космических/подземных объектов также восстановлены random/space-level флаги.

## Найденные механики и классы

В `Assembly-CSharp.dll` присутствуют реальные классы `SMW_Player`, `SMW_Spawner`, `SMW_ActorBase`, `SMW_DataManager`, `SMW_HUDManager`, `SMW_BossSanta`, `SMW_GiantRobot`, `SMW_EMPCrystal`, `SMW_Beam`, `SMW_TailGem` и projectile-классы для bullet, homing rocket, ice spike, mecha missile, mine, spit и tank rocket.

Методы игрока включают `Beam`, `PileDriver`, `Spit`, `ShootIceSpike`, `ShootMechaMissile`, `ShootEMP`, `AddHealth`, `SubHealth`, `AddMultiplier`, `AddScorePoints`, `AdjustHealthMax` и `Rescale`.

## Прогрессия Standard Adventure

`SMW_Spawner` содержит 28 сериализованных уровней с исходными `Count`, `Max`, `SpawnDelay`, `GrowthRequired` и обучающими флагами. Среди восстановленных unlock-флагов присутствуют `LearnEMP1`, `LearnEMP2`, `LearnEMP3`, `LearnDash`, `LearnSpitAcid`, `LearnSpitFire`, `LearnSpitIce`.

Полный машинно-разобранный JSON хранится в рабочем архиве восстановления; при переносе уровней в Web-версию эти таблицы используются как источник истины.
