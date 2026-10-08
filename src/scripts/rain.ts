// Lluvia de fondo: un único canvas fijo y persistente entre páginas.
// - Se redimensiona sin reiniciar las gotas (solo se reparten en el nuevo ancho).
// - Tres capas de profundidad, ráfagas de viento con inercia y salpicaduras al caer.
// - En escritorio el cursor lleva un paraguas invisible: la lluvia choca con él y resbala.
// - Se pausa con la pestaña oculta y respeta prefers-reduced-motion.

type Drop = { x: number; y: number; layer: number; speed: number; length: number; seed: number };
type Splash = { x: number; y: number; age: number; life: number; size: number; up: boolean; onLogo?: boolean };

const LAYERS = [
  { speed: 0.55, length: 0.55, alpha: 0.2, width: 0.8, share: 0.4 },
  { speed: 0.85, length: 0.85, alpha: 0.32, width: 1.1, share: 0.4 },
  { speed: 1.3, length: 1.3, alpha: 0.5, width: 1.5, share: 0.2 },
];
const BASE_FALL = 760; // px/s de la capa media
const CURSOR_R = 64; // radio del paraguas del cursor

// Un paraguas es una media elipse (la cúpula) con una zona seca debajo (centro, radios, medio ancho y alto secos).
type Umbrella = { cx: number; cy: number; rx: number; ry: number; dryHalf: number; dryDepth: number };

// `canvas` queda detrás del contenido (gotas); `front` va por delante y solo pinta las salpicaduras,
// para que se vean sobre el logo y el resto de la página.
export function startRain(canvas: HTMLCanvasElement, front: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  const fctx = front.getContext('2d');
  if (!ctx || !fctx) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  let w = 0;
  let h = 0;
  const drops: Drop[] = [];
  const splashes: Splash[] = [];
  let wind = 0;
  let time = Math.random() * 1000;
  let last = 0;
  let raf = 0;
  const mouse = { x: -1000, y: -1000, active: false };
  const logos: Umbrella[] = [];
  let measureAt = 0;

  const targetCount = () => Math.round(Math.min(420, Math.max(90, (w * h) / 7000)));

  const spawn = (initial: boolean): Drop => {
    const r = Math.random();
    const layer = r < LAYERS[0].share ? 0 : r < LAYERS[0].share + LAYERS[1].share ? 1 : 2;
    const l = LAYERS[layer];
    return {
      x: Math.random() * (w + 200) - 100,
      y: initial ? Math.random() * h : -Math.random() * 80 - 20,
      layer,
      speed: l.speed * (0.9 + Math.random() * 0.2),
      length: l.length * (0.8 + Math.random() * 0.4),
      seed: Math.random() * 1000,
    };
  };

  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth;
    h = window.innerHeight;
    for (const [c, cx] of [[canvas, ctx], [front, fctx]] as const) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const n = targetCount();
    if (drops.length > n) drops.length = n;
    while (drops.length < n) drops.push(spawn(true));
  };

  // Viento: suma de senos lentos + ráfagas ocasionales, suavizado con inercia.
  const updateWind = (dt: number) => {
    time += dt;
    const breeze = Math.sin(time * 0.11) * 60 + Math.sin(time * 0.043 + 1.7) * 80;
    const gust = Math.max(0, Math.sin(time * 0.29 + 0.6) + Math.sin(time * 0.113 + 2.2) * 0.5 - 0.85) * 220;
    wind += (breeze - 90 + gust - wind) * Math.min(1, dt * 0.8);
  };

  // Los logos marcados con [data-rain-obstacle] también paran la lluvia.
  // Se miden unas pocas veces por segundo: la página cambia al navegar, redimensionar o hacer scroll.
  const measureLogos = (now: number) => {
    if (now - measureAt < 100) return;
    measureAt = now;
    logos.length = 0;
    document.querySelectorAll('[data-rain-obstacle]').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.bottom < 0 || r.top > h) return;
      // La cúpula del logo ocupa todo el ancho y llega hasta ~44% de su alto; el mango queda seco.
      logos.push({
        cx: r.left + r.width / 2,
        cy: r.top + r.height * 0.44,
        rx: r.width / 2,
        ry: r.height * 0.39,
        dryHalf: r.width * 0.4,
        dryDepth: r.height * 0.56,
      });
    });
  };

  // Devuelve el paraguas que intercepta la gota, o null.
  const hits = (u: Umbrella, d: Drop) => {
    const dx = d.x - u.cx;
    const dy = d.y - u.cy;
    if (dy < 0) {
      const nx = dx / u.rx;
      const ny = dy / u.ry;
      return nx * nx + ny * ny < 1 ? 'dome' : null;
    }
    return dy < u.dryDepth && Math.abs(dx) < u.dryHalf ? 'dry' : null;
  };

  const step = (dt: number) => {
    updateWind(dt);
    measureLogos(performance.now());
    const cursor: Umbrella | null = mouse.active
      ? { cx: mouse.x, cy: mouse.y, rx: CURSOR_R, ry: CURSOR_R, dryHalf: CURSOR_R * 0.9, dryDepth: CURSOR_R * 1.8 }
      : null;
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      const vy = BASE_FALL * d.speed;
      const vx = wind * d.speed * 0.9 + Math.sin(time * 0.9 + d.seed) * 6;
      d.x += vx * dt;
      d.y += vy * dt;

      let hit: 'dome' | 'dry' | null = cursor ? hits(cursor, d) : null;
      let onLogo = false;
      for (let j = 0; !hit && j < logos.length; j++) {
        hit = hits(logos[j], d);
        onLogo = hit !== null;
      }
      if (hit) {
        if (hit === 'dome' && (d.layer > 0 || onLogo) && splashes.length < 80) {
          splashes.push({ x: d.x, y: d.y, age: 0, life: onLogo ? 0.4 : 0.28, size: (onLogo ? 4 : 3) + d.layer * 1.5, up: true, onLogo });
        }
        Object.assign(d, spawn(false));
        continue;
      }

      if (d.y > h + 20 || d.x < -150 || d.x > w + 150) {
        // Las gotas cercanas salpican al llegar abajo.
        if (d.y > h && d.layer > 0 && Math.random() < 0.55 && splashes.length < 80) {
          splashes.push({ x: d.x, y: h - 1 - Math.random() * 3, age: 0, life: 0.35, size: 4 + d.layer * 3, up: false });
        }
        Object.assign(d, spawn(false));
      }
    }
    for (let i = splashes.length - 1; i >= 0; i--) {
      splashes[i].age += dt;
      if (splashes[i].age >= splashes[i].life) splashes.splice(i, 1);
    }
  };

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    fctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    for (let layer = 0; layer < LAYERS.length; layer++) {
      const l = LAYERS[layer];
      ctx.lineWidth = l.width;
      ctx.strokeStyle = `rgba(214, 224, 255, ${l.alpha})`;
      ctx.beginPath();
      for (const d of drops) {
        if (d.layer !== layer) continue;
        const vx = wind * d.speed * 0.9;
        const vy = BASE_FALL * d.speed;
        const m = Math.hypot(vx, vy);
        const len = (14 + 22 * d.length) * d.speed;
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - (vx / m) * len, d.y - (vy / m) * len);
      }
      ctx.stroke();
    }
    for (const s of splashes) {
      const t = s.age / s.life;
      const r = s.size * (0.3 + t);
      const arc = () => {
        fctx.beginPath();
        if (s.up) fctx.arc(s.x, s.y, r, Math.PI, 2 * Math.PI);
        else fctx.ellipse(s.x, s.y, r * 1.6, r * 0.45, 0, Math.PI, 2 * Math.PI);
        fctx.stroke();
      };
      if (s.onLogo) {
        // Sobre la tela amarilla el azul pálido no se lee: un trazo oscuro por debajo y otro claro encima.
        fctx.lineWidth = 2.6;
        fctx.strokeStyle = `rgba(60, 40, 0, ${0.45 * (1 - t)})`;
        arc();
        fctx.lineWidth = 1.2;
        fctx.strokeStyle = `rgba(235, 242, 255, ${0.95 * (1 - t)})`;
        arc();
      } else {
        fctx.lineWidth = 1;
        fctx.strokeStyle = `rgba(214, 224, 255, ${0.4 * (1 - t)})`;
        arc();
      }
    }
  };

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    step(dt);
    draw();
    raf = requestAnimationFrame(frame);
  };

  const start = () => {
    if (raf || document.hidden || reduced.matches) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      stop();
      ctx.clearRect(0, 0, w, h);
      fctx.clearRect(0, 0, w, h);
    } else start();
  });
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !finePointer.matches) return;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });
  document.documentElement.addEventListener('pointerleave', () => (mouse.active = false));

  resize();
  if (reduced.matches) {
    // Un fotograma estático para quien no quiere movimiento.
    updateWind(0);
    draw();
  } else start();
}
