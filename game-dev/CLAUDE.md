# Ember Road — project context

This file carries the context of the design conversation that produced this
game, so a new session (local or cloud) starts with the same understanding.
Read it before changing anything in `game-dev/`.

## What the game is

An **isometric camper-van survival game**: tense days, cozy nights.

- Camera and readability come from **Desperados III** (high isometric view,
  vision cones, crouch-safe outer zone, silent takedowns). Nothing else from
  that genre: no squad, no Hitman-style disguises (an early idea, dropped).
- The player drives a camper van from stop to stop toward **the lighthouse on
  the coast** (6 stops). At each stop: scavenge by day, build a camp and relax
  at the van by night, then choose to **stay** (keep the camp, loot runs dry)
  or **drive on** (fresh loot, costs fuel, camp left behind). That choice is
  the heart of the game.
- **No killer hordes.** Danger is hunger, thirst, fuel, and the few zombies the
  player attracts with light and noise. Survival depends on preparation, not
  reflexes.
- The emotional target is **earned coziness**: the campfire, guitar and sleep
  only feel good because the day was tense. Don't remove the tension to make
  it "more relaxing".

## Files

| File | Role |
| --- | --- |
| `ember-road-3d.html` | **The game.** Single file, Three.js from CDN (importmap, r160). Has a pixel-art render mode (P). All new work goes here. |
| `ember-road.html` | The original 2D canvas prototype. Frozen; reference only. |
| `README.md` | Player-facing description, controls, systems. Keep it current. |

Inside `ember-road-3d.html` the order is: CSS/HTML → **simulation** (state,
map generation, pathfinding, time, inventory, perception, update loop,
actions, camp, travel, tutorial, HUD) → **renderer** (Three.js scene,
models built from primitives, sync functions, lighting, camera, input) →
audio → main loop. The simulation never touches Three.js; the renderer only
reads simulation state. Keep that boundary.

## Decisions already made (don't re-litigate without reason)

- **3D is the real version.** 2D and the separate pixel file were dropped;
  pixel art is a toggle inside the 3D build (low-res render target + post
  pass: outlines, screen-space cel shading, ordered dither, pixel-snapped
  camera).
- **Models are built in code from primitives**, no external assets. Free CC0
  packs (Quaternius, Kenney, KayKit) were surveyed; the plan if assets are
  ever used: keep the van (its upgrades are drawn on it), replace characters,
  zombies, trees and cars, and pick **one** pack family for a consistent look.
- **No content from other games.** A request to analyse a *Last Day on Earth*
  APK was declined; only mechanics were borrowed (crafting, durability,
  thirst, locked loot, lures). Never copy art, text, names or code from
  commercial games.
- **WASD moves the player** (relative to the screen), arrow keys pan the
  camera, Q/Z rotate. Click-to-move also works.
- **Noise is the core currency.** Walking (faint), running (loud), driving
  (loud; ~70% louder off-road; quiet-exhaust upgrade −45%), searching,
  fighting and the guitar all make noise; zombies investigate it.
- **The tutorial ("The Last Campsite") is the opening**, ten story chapters
  at Willowhaven Lake that unlock one mechanic each. Crafting, building,
  lures and pets are deliberately NOT taught; they surface with a one-time
  tip. Keep new mechanics out of the tutorial unless they're fundamental.
- The player is **voiceless**; story comes through the radio, notes and the
  environment.
- A guaranteed stray **dog** appears at stop 1 (the first stop after the
  tutorial), not at the lake.

## Systems in place

Hunger, thirst (clean vs dirty water, boiling), comfort → rest quality,
day/night with sun shadows and firelight, vision cones and suspicion,
silent takedowns, weapons that wear out (hatchet, spear, crowbar, molotov;
fists do a triple-damage sneak attack but no takedown), workbench with
level-gated blueprints and XP, locked crates, tin-can lures, backpack screen
(I) with van storage transfer, parts and cloth as resources, fruit trees and
berry bushes, drivable van with fuel use and roadkill, 10 van upgrades drawn
on the model, camp building (barricade, campfire, spike trap), dog (fights,
growls at night) and cat (comfort, finds food), travel with danger ratings,
graphics quality toggle (G), pixel mode (P).

## Known risks to watch in playtesting

These were flagged during design and are **unverified**; real play decides.

1. The **dog may be too strong** (killed a chaser before the player was
   touched). If fights become "let the dog win", give it a cooldown.
2. **Driving around a location** may remove the walk-back-with-a-full-pack
   tension. Noise is the counterweight; check whether players ever walk.
3. **Four meters** (health, hunger, thirst, comfort) may be one too many.
4. **Balance numbers are first guesses**: drain rates, durability, XP
   thresholds, zombie counts.
5. **Frame rate has never been measured on a real GPU.** All testing ran in
   a headless software renderer (~2 fps). ~220k triangles, ~530 draw calls.

## Not built yet (ideas that were agreed as worth doing)

Keycard bunker (one optional high-risk building per region), radio events
(one-day opportunities at a nearby stop), rare van parts only in dangerous
stops, loot tiers matched to danger ratings, a gentler difficulty curve over
the run, roof/wall fading when the player is inside a building.

## How to test

There is no test framework. The pattern used so far: Playwright headless
Chromium with Three.js served from a local `node_modules` via a route
intercept (the CDN is blocked in the cloud sandbox), `window.G` exposes the
simulation (`G.S`, `G.M`, `G.P`, `G.update`, `G.loadLocation`, etc.), and
tests drive `G.update(1/60)` in a loop and assert on state. Always:

1. Syntax-check the module script with `node --check` after editing.
2. Run a scripted scenario for the mechanic you touched.
3. Take screenshots at day, dusk and night and look at them.
4. Note that `requestAnimationFrame` runs ~2 fps headless, so anything that
   depends on real time needs polling, not fixed waits.

## Conventions

- Commit messages: short imperative title, body explains the why. Push to the
  working branch, then fast-forward `main` when asked (the user plays from
  `main` / Vercel).
- Keep `README.md` in sync with controls and systems.
- Prefer adding to the existing data tables (`UPGRADES`, `RECIPES`, `WEAPONS`,
  `BUILD`, `LOC`, `CHAPTERS`) over new branches of logic.
- The person building this likes honest pushback, fun facts and analogies.
  Point out assumptions and risks; don't just agree.
