# vibes

Vibe coding projects.

---

## ORYZO AI — recreation

A faithful, self-contained recreation of the **oryzo.ai** experience: a dark,
cinematic, single-page "AI product launch" for ORYZO-1 — an open-weight 3D model
of a cork coaster — with a live WebGL render and all the scroll/pointer
interactions of the original.

> The original is a self-initiated satire project by the studio **Lusion**
> (Awwwards SOTD / CSS Design Awards). This is an independent rebuild for
> learning purposes — copy and 3D geometry are original, matched to the
> original's design system.

### Run

No build step. Serve over HTTP (ES modules + importmap need it):

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

### Deploy (Vercel)

The site is the repo root, so no Root Directory setting is needed.

- **Dashboard:** import the repo, Framework Preset = "Other", leave build/output empty, Deploy.
- **CLI:** `npx vercel` (preview) / `npx vercel --prod` (production).

`vercel.json` provides clean URLs and cache headers; no build step runs.

### Design system (matched to the original)

| Token      | Value     |
| ---------- | --------- |
| Background | `#100904` |
| Cream text | `#ffedd7` |
| Accent     | `#dc5000` |
| Type       | halyard-display → Hanken Grotesk fallback |

### What's recreated

- **Live WebGL coaster** (Three.js) — loads the released `ORYZO-1` OBJ mesh
  (procedural cork texture, with in-engine lathe geometry as a fallback if the
  file can't be fetched), idle inertia spin, **drag to rotate** with momentum,
  scroll-driven framing/float.
- **Preloader** with animated weight-loading counter.
- **Custom cursor** with blend mode, hover/drag states, magnetic buttons.
- **Split-text** headline reveals, word-by-word lit manifesto, scroll reveals.
- **Sections**: hero, manifesto, marquee, capabilities/specs, stat counters,
  WoodenBench results table with animated bars, open-research terminal,
  download CTA, footer.
- Hide-on-scroll nav, mobile menu, reduced-motion support, responsive layout.

### The 3D model

`ORYZO-1` is a real OBJ mesh, generated as a surface of revolution rather than
sculpted by hand, so the geometry is reproducible from source.

| Variant               | Verts | Faces | Raw     | Gzipped |
| --------------------- | ----- | ----- | ------- | ------- |
| `oryzo-1.obj`         | 1,826 | 1,920 | 244 KB  | 46 KB   |
| `oryzo-1-q4.obj`      | 322   | 352   | 40 KB   | 8 KB    |

The meridian profile carries a filleted outer edge, a flat top rim, and an eased
dish into the well floor. Scale is normalised so the outer radius is 1.0 unit
(= 47 mm, giving a 94 mm diameter and 8 mm profile height). Positions, UVs and
vertex normals are all written out; tangent-continuous joins share averaged
normals, so the mesh shades smoothly without a separate smoothing pass.

Regenerate and verify:

```bash
python3 tools/make_coaster.py assets                       # write the OBJ + MTL
python3 tools/check_obj.py assets/oryzo-1.obj assets/oryzo-1-q4.obj
```

`check_obj.py` re-parses the written file and asserts what a loader cares about:
every face index resolves, no zero-area faces, unit-length normals, UVs in
[0,1], a closed 2-manifold surface (every edge shared by exactly two faces), and
outward winding via a positive signed volume.

### Files

- `index.html` — structure
- `styles.css` — design system + layout + animations
- `app.js` — Three.js scene + all interactions
- `assets/oryzo-1.obj`, `oryzo-1-q4.obj`, `oryzo-1.mtl` — the released model
- `tools/make_coaster.py` — mesh generator
- `tools/check_obj.py` — mesh validator
- `preview-hero.svg` — static design mockup of the hero
- `vercel.json` — static deploy config
