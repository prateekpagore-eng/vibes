# Ember Road — camper-van survival prototype

Three builds of the same game live in this folder:

| File | Look |
| --- | --- |
| `ember-road.html` | 2D isometric, no dependencies |
| `ember-road-3d.html` | Real 3D (Three.js) |
| `ember-road-pixel.html` | Pixel art (low-resolution 3D) |

`ember-road.html` — a single-file, no-dependency grey-box prototype of an
isometric camper-van survival game: **tense days, cozy nights**.

Open a file directly in a browser, or use `/game-dev/ember-road`, `/game-dev/ember-road-3d` and `/game-dev/ember-road-pixel` on the Vercel deploy.

## What it tests

| Question | Mechanic in the prototype |
| --- | --- |
| Can relaxing and survival coexist? | They alternate: day = scavenging under threat, night = camp activities |
| Does being cozy actually matter? | **Comfort** sets how well you rest → next day's speed and healing |
| What's the threat without hordes? | Hunger, fuel, and the few zombies *you* attract with light and noise |
| Base-building vs a van? | Each morning: **stay** (keep your barricades, loot runs dry) or **drive on** (fresh loot, costs fuel, camp left behind) |
| Is stealth readable from a high isometric camera? | Vision cones with a striped far zone (crouch-safe), tall grass, suspicion meters, noise rings |

## Controls

Click to move / search / attack (silent takedown on unaware zombies) · **C** crouch ·
**E** eat · **B** build (barricade, campfire, spike trap) · **R** camp activities ·
**T** drive on · **F** time speed · right-drag/WASD pan · wheel zoom · Space re-center.

## 3D version

`ember-road-3d.html` is the same game drawn in real 3D with Three.js (loaded from
a CDN, so it needs an internet connection). The simulation code is shared with
the 2D file; only the renderer and mouse picking differ.

- Every model is built in code from primitives: the van and its upgrades, cars,
  houses, props, trees, and articulated player and zombie figures.
- Real lights and shadows: a sun that moves through the day, moonlight, a
  flickering campfire that casts shadows, van and string lights at night.
- Rotatable camera (**Q / Z**, or middle-drag to orbit) and a graphics quality
  toggle (**G**).

## Pixel-art version

`ember-road-pixel.html` draws the same game as modern pixel art. It reuses the
3D scene and renders it at low resolution, then adds stepped (cel) lighting,
dark outlines, a dithered limited palette and hard-pixel upscaling. The camera
snaps to the pixel grid so panning doesn't shimmer.

- **G** changes the pixel size (2× to 6×); **Q / Z** rotate the camera.
- Needs an internet connection for Three.js and the pixel font.

## Survival systems (3D version only)

The 3D build is the main version and has gameplay the other two don't:

- **Thirst and water.** Clean water from shelves and cars; dirty water from rain
  barrels and lakes, which should be boiled at a campfire. A rain-catcher van
  upgrade collects clean water every dawn.
- **Weapons that wear out.** Hatchet, spear (long reach, shoves zombies back),
  crowbar (opens locked crates) and molotov. Bare hands can't do a silent
  takedown, only a triple-damage sneak attack.
- **Workbench and blueprints.** Craft weapons, first-aid wraps and tin-can
  lures at the van. Recipes unlock as you gain levels from scavenging,
  takedowns and surviving nights.
- **Locked crates** with better loot, and a **throwable lure** to pull zombies
  toward a noise.

Extra keys: **X** drink · **V** switch weapon · **H** heal · **N** throw lure.
