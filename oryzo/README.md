# ORYZO AI — recreation

A faithful, self-contained recreation of the **oryzo.ai** experience: a dark,
cinematic, single-page "AI product launch" for ORYZO-1 — an open-weight 3D model
of a cork coaster — with a live WebGL render and all the scroll/pointer
interactions of the original.

> The original is a self-initiated satire project by the studio **Lusion**
> (Awwwards SOTD / CSS Design Awards). This is an independent rebuild for
> learning purposes — copy and 3D geometry are original, matched to the
> original's design system.

## Run

No build step. Serve the folder over HTTP (modules + importmap need it):

```bash
cd oryzo
python3 -m http.server 8000
# open http://localhost:8000
```

## Design system (matched to the original)

| Token        | Value     |
| ------------ | --------- |
| Background   | `#100904` |
| Cream text   | `#ffedd7` |
| Accent       | `#dc5000` |
| Type         | halyard-display → Hanken Grotesk fallback |

## What's recreated

- **Live WebGL coaster** (Three.js) — procedurally modelled cork coaster
  (lathe geometry + procedural cork texture), idle inertia spin, **drag to
  rotate** with momentum, scroll-driven framing/float.
- **Preloader** with animated weight-loading counter.
- **Custom cursor** with blend mode, hover/drag states, magnetic buttons.
- **Split-text** headline reveals, word-by-word lit manifesto, scroll reveals.
- **Sections**: hero, manifesto, marquee, capabilities/specs, stat counters,
  WoodenBench results table with animated bars, open-research terminal,
  download CTA, footer.
- Hide-on-scroll nav, mobile menu, reduced-motion support, responsive layout.

## Files

- `index.html` — structure
- `styles.css` — design system + layout + animations
- `app.js` — Three.js scene + all interactions
