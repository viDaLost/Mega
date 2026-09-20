# APK recovery notes

Source inspected: `super-mega-worm-lite-1-1-1 2.apk`.

## What was found

- The game data is from **Unity 4.2.0f4** (Android target).
- The APK central directory advertises `Assembly-CSharp.dll`, `level0`, `mainData` and `sharedassets0.assets.split0`, but the byte ranges where those files should live have been overwritten by payload from another APK. Their original local ZIP headers and compressed streams are not present in this copy.
- The beginning of the file contains a different Android package (a game/catalog-style APK), while the original Mega Worm payload resumes later, starting around the later `sharedassets0` split files.
- `sharedassets1.assets.split0..3` is complete and was reassembled into a valid Unity serialized file (format version 9).
- `sharedassets0.assets.resS` is intact. The first 1 MiB of `sharedassets0.assets` is missing, so its serialized-file header/object table cannot be reconstructed byte-for-byte from this APK alone.

## Recovered original content

The recovery pass reconstructed/exported original textures including:

- `Wojira_Tex` — original worm sprite atlas.
- `Ground_Tex` / `GroundStrip_Tex` — original soil/ground artwork.
- `Sky_Tex` / `Background_Classic_Tex` — background art.
- `HUD_Tex` — HUD atlas.
- `FX_Tex` / `Additive_FX_Tex` / `Fog_Tex` — visual effects.
- `Actors_Xmas2_Tex` — actor/vehicle sprite atlas.
- `Actor_Bosses*_Tex` — boss sprite atlases.
- `Help1_Tex` / `Help2_Tex` — original gameplay instruction screens.
- `SalePage_Tex`, cutscene textures and Wojira egg/trail textures.

The web port currently embeds the recovered original Wojira, classic background and ground-strip textures so they work on GitHub Pages without requiring a binary-asset upload step.

## Mechanics reconstructed from the original help artwork

The recovered instruction screens document these mechanics:

1. Health/metabolism drains continuously and is restored by eating.
2. Eating humans progresses the level and rapid eating creates combo/multiplier points.
3. Underground acceleration is used to jump higher.
4. Spit attack is an unlockable ability.
5. Meteor/ground slam is triggered while falling.
6. Purple crystals charge EMP; EMP is activated separately when charged.

## Missing bytes in this APK copy

The supplied APK no longer contains the original bytes for:

- `Assembly-CSharp.dll` and other managed assemblies from the overwritten range.
- `level0` and `mainData`.
- `sharedassets0.assets.split0` (first 1 MiB, including the serialized-file header/object table).

Because those bytes are absent rather than merely compressed or obfuscated, exact C# IL and exact original scene hierarchy cannot be recovered from this particular copy alone. A clean copy of the same APK/build or the original Unity project would allow a much more complete reconstruction.
