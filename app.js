import * as THREE from "three";

/* ============================================================
   ORYZO AI — interactions + live WebGL cork coaster
   ============================================================ */

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------
   1. PRELOADER
------------------------------------------------------------ */
const preloader = document.querySelector("[data-preloader]");
const bar = document.querySelector("[data-preloader-bar]");
const count = document.querySelector("[data-preloader-count]");

function runPreloader(done) {
  let p = 0;
  const tick = () => {
    p += Math.random() * 12 + 3;
    p = Math.min(100, p);
    bar.style.width = p + "%";
    count.textContent = String(Math.floor(p)).padStart(2, "0");
    if (p < 100) {
      setTimeout(tick, 90 + Math.random() * 120);
    } else {
      setTimeout(() => {
        preloader.classList.add("is-done");
        document.body.classList.add("is-ready");
        done && done();
      }, 350);
    }
  };
  tick();
}

/* ------------------------------------------------------------
   2. CUSTOM CURSOR
------------------------------------------------------------ */
const cursor = document.querySelector("[data-cursor]");
const cMouse = { x: innerWidth / 2, y: innerHeight / 2 };
const cPos = { x: cMouse.x, y: cMouse.y };

addEventListener("mousemove", (e) => { cMouse.x = e.clientX; cMouse.y = e.clientY; });

function cursorLoop() {
  cPos.x = lerp(cPos.x, cMouse.x, 0.2);
  cPos.y = lerp(cPos.y, cMouse.y, 0.2);
  if (cursor) cursor.style.transform = `translate(${cPos.x}px, ${cPos.y}px) translate(-50%,-50%)`;
  requestAnimationFrame(cursorLoop);
}
cursorLoop();

document.querySelectorAll("a, button, [data-magnetic]").forEach((el) => {
  el.addEventListener("mouseenter", () => cursor?.classList.add("is-hover"));
  el.addEventListener("mouseleave", () => cursor?.classList.remove("is-hover"));
});

/* magnetic buttons */
document.querySelectorAll("[data-magnetic]").forEach((el) => {
  el.addEventListener("mousemove", (e) => {
    const r = el.getBoundingClientRect();
    const mx = e.clientX - (r.left + r.width / 2);
    const my = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${mx * 0.25}px, ${my * 0.35}px)`;
  });
  el.addEventListener("mouseleave", () => { el.style.transform = ""; });
});

/* ------------------------------------------------------------
   3. NAV (hide on scroll-down) + mobile menu
------------------------------------------------------------ */
const nav = document.querySelector("[data-nav]");
const burger = document.querySelector("[data-burger]");
const menu = document.querySelector("[data-menu]");
let lastY = 0;

addEventListener("scroll", () => {
  const y = scrollY;
  if (y > lastY && y > 200) nav.classList.add("is-hidden");
  else nav.classList.remove("is-hidden");
  lastY = y;
});

burger?.addEventListener("click", () => {
  nav.classList.toggle("is-open");
  menu.classList.toggle("is-open");
});
menu?.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    nav.classList.remove("is-open");
    menu.classList.remove("is-open");
  })
);

/* ------------------------------------------------------------
   4. SPLIT TEXT (chars) for [data-split] + hero
------------------------------------------------------------ */
document.querySelectorAll("[data-split]").forEach((el) => {
  const text = el.textContent;
  el.textContent = "";
  [...text].forEach((ch, i) => {
    const s = document.createElement("span");
    s.className = "split-char";
    s.textContent = ch === " " ? " " : ch;
    s.style.transitionDelay = i * 0.022 + "s";
    el.appendChild(s);
  });
});

/* word-by-word lit reveal for [data-words] */
document.querySelectorAll("[data-words]").forEach((el) => {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = "";
  words.forEach((w) => {
    const s = document.createElement("span");
    s.className = "word";
    s.textContent = w + " ";
    el.appendChild(s);
  });
});

/* ------------------------------------------------------------
   5. INTERSECTION REVEALS
------------------------------------------------------------ */
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add("is-in");
      el.querySelectorAll(".split-char").forEach((c) => c.classList.add("is-in"));
      io.unobserve(el);
    });
  },
  { threshold: 0.18 }
);
document.querySelectorAll("[data-reveal], [data-hero-title], [data-section]").forEach((el) => io.observe(el));

/* hero title chars in on load handled after preloader */
function revealHero() {
  document.querySelectorAll(".hero .split-char").forEach((c) => c.classList.add("is-in"));
  document.querySelectorAll(".hero [data-reveal]").forEach((c) => c.classList.add("is-in"));
}

/* bench bars */
const benchIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); benchIO.unobserve(e.target); } });
}, { threshold: 0.4 });
document.querySelectorAll("[data-bench]").forEach((el) => benchIO.observe(el));

/* counters */
const counterIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const to = parseFloat(el.dataset.to);
    const span = el.querySelector("span");
    let cur = 0;
    const step = () => {
      cur += to / 38;
      if (cur >= to) { span.textContent = to; }
      else { span.textContent = Math.floor(cur); requestAnimationFrame(step); }
    };
    step();
    counterIO.unobserve(el);
  });
}, { threshold: 0.6 });
document.querySelectorAll("[data-counter]").forEach((el) => counterIO.observe(el));

/* manifesto word-lighting on scroll */
const wordEls = document.querySelectorAll("[data-words]");
function litWords() {
  wordEls.forEach((el) => {
    const words = el.querySelectorAll(".word");
    const r = el.getBoundingClientRect();
    const start = innerHeight * 0.85;
    const end = innerHeight * 0.35;
    const prog = clamp((start - r.top) / (start - end), 0, 1);
    const n = Math.floor(prog * words.length);
    words.forEach((w, i) => w.classList.toggle("is-lit", i < n));
  });
}

/* ------------------------------------------------------------
   6. MARQUEE
------------------------------------------------------------ */
const track = document.querySelector("[data-marquee] .marquee__track");
let marqX = 0;
function marquee() {
  if (track) {
    marqX -= 0.6;
    const w = track.scrollWidth / 2;
    if (-marqX >= w) marqX = 0;
    track.style.transform = `translateX(${marqX}px)`;
  }
}

/* ------------------------------------------------------------
   7. THREE.JS — procedural cork coaster
------------------------------------------------------------ */
const canvas = document.querySelector("[data-webgl]");
let renderer, scene, camera, coaster, raf;
const drag = { active: false, px: 0, py: 0 };
const rot = { x: -0.35, y: 0, vx: 0, vy: 0.004, tx: -0.35, ty: 0 };
const scroll = { progress: 0 };

function corkTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const x = c.getContext("2d");
  x.fillStyle = "#9a6a3c";
  x.fillRect(0, 0, 512, 512);
  // cork speckle
  for (let i = 0; i < 9000; i++) {
    const r = Math.random() * 3 + 0.5;
    const shade = Math.random();
    if (shade < 0.5) x.fillStyle = `rgba(70,42,18,${Math.random() * 0.5})`;
    else if (shade < 0.8) x.fillStyle = `rgba(150,105,60,${Math.random() * 0.6})`;
    else x.fillStyle = `rgba(210,170,120,${Math.random() * 0.5})`;
    x.beginPath();
    x.arc(Math.random() * 512, Math.random() * 512, r, 0, Math.PI * 2);
    x.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function buildCoaster() {
  // lathe profile (x = radius, y = height) — coaster with raised rim + recessed well
  const pts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.92, 0.0),
    new THREE.Vector2(1.0, 0.04),
    new THREE.Vector2(1.0, 0.16),
    new THREE.Vector2(0.97, 0.2),
    new THREE.Vector2(0.86, 0.2),
    new THREE.Vector2(0.82, 0.17),
    new THREE.Vector2(0.8, 0.16),
    new THREE.Vector2(0.0, 0.16),
  ];
  const geo = new THREE.LatheGeometry(pts, 128);
  geo.center();
  geo.computeVertexNormals();

  const map = corkTexture();
  const mat = new THREE.MeshStandardMaterial({
    map,
    bumpMap: map,
    bumpScale: 0.02,
    roughness: 0.92,
    metalness: 0.0,
    color: 0xb98a55,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.set(1.7, 1.7, 1.7);
  return mesh;
}

function initThree() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 7);

  coaster = buildCoaster();
  scene.add(coaster);

  // cinematic lighting
  scene.add(new THREE.AmbientLight(0xffedd7, 0.35));

  const key = new THREE.DirectionalLight(0xffedd7, 2.4);
  key.position.set(4, 6, 5);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xdc5000, 2.0);
  rim.position.set(-5, 2, -4);
  scene.add(rim);

  const fill = new THREE.PointLight(0xffedd7, 8, 20);
  fill.position.set(-3, -2, 4);
  scene.add(fill);

  addEventListener("resize", onResize);
  bindDrag();
  animate();
}

function onResize() {
  if (!renderer) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

function bindDrag() {
  const down = (x, y) => { drag.active = true; drag.px = x; drag.py = y; cursor?.classList.add("is-drag"); };
  const move = (x, y) => {
    if (!drag.active) return;
    const dx = x - drag.px, dy = y - drag.py;
    rot.vy = dx * 0.005;
    rot.vx = dy * 0.005;
    rot.ty += dx * 0.005;
    rot.tx += dy * 0.005;
    drag.px = x; drag.py = y;
  };
  const up = () => { drag.active = false; cursor?.classList.remove("is-drag"); };

  addEventListener("mousedown", (e) => down(e.clientX, e.clientY));
  addEventListener("mousemove", (e) => move(e.clientX, e.clientY));
  addEventListener("mouseup", up);
  addEventListener("touchstart", (e) => down(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  addEventListener("touchmove", (e) => move(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  addEventListener("touchend", up);
}

function animate() {
  raf = requestAnimationFrame(animate);
  marquee();
  litWords();

  scroll.progress = clamp(scrollY / (document.body.scrollHeight - innerHeight), 0, 1);

  if (coaster) {
    if (!drag.active) {
      rot.ty += rot.vy;
      rot.tx += rot.vx;
      rot.vy = lerp(rot.vy, 0.004, 0.04); // settle to gentle idle spin
      rot.vx = lerp(rot.vx, 0, 0.06);
    }
    rot.y = lerp(rot.y, rot.ty, 0.08);
    rot.x = lerp(rot.x, clamp(rot.tx, -1.2, 1.2), 0.08);

    coaster.rotation.y = rot.y;
    coaster.rotation.x = rot.x;

    // scroll-driven framing: drift up/back + float
    const t = performance.now() * 0.001;
    coaster.position.y = Math.sin(t) * 0.08 + scroll.progress * 1.2;
    coaster.position.x = scroll.progress * 1.4;
    const s = lerp(1, 0.7, scroll.progress);
    coaster.scale.setScalar(1.7 * s);

    camera.position.z = lerp(7, 8.5, scroll.progress);
  }

  renderer.render(scene, camera);
}

/* ------------------------------------------------------------
   8. BOOT
------------------------------------------------------------ */
try {
  initThree();
} catch (err) {
  console.warn("WebGL unavailable:", err);
}

runPreloader(() => {
  revealHero();
});
