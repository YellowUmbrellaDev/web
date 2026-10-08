// Lluvia de fondo: un único canvas fijo y persistente entre páginas.
// - Se redimensiona sin reiniciar las gotas (solo se reparten en el nuevo ancho).
// - Tres capas de profundidad, ráfagas de viento con inercia y salpicaduras al caer.
// - En escritorio el cursor lleva un paraguas invisible: la lluvia choca con él y resbala.
// - Se pausa con la pestaña oculta y respeta prefers-reduced-motion.

type Drop = { x: number; y: number; layer: number; speed: number; length: number; seed: number };
type Splash = { x: number; y: number; age: number; life: number; size: number; up: boolean };

const LAYERS = [
  { speed: 0.55, length: 0.55, alpha: 0.2, width: 0.8, share: 0.4 },
  { speed: 0.85, length: 0.85, alpha: 0.32, width: 1.1, share: 0.4 },
  { speed: 1.3, length: 1.3, alpha: 0.5, width: 1.5, share: 0.2 },
];
const BASE_FALL = 760; // px/s de la capa media
const UMBRELLA_R = 64; // radio del paraguas del cursor

export function startRain(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

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
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

  const step = (dt: number) => {
    updateWind(dt);
    const mx = mouse.x;
    const my = mouse.y;
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      const vy = BASE_FALL * d.speed;
      const vx = wind * d.speed * 0.9 + Math.sin(time * 0.9 + d.seed) * 6;
      d.x += vx * dt;
      d.y += vy * dt;

      if (mouse.active) {
        // Cúpula del paraguas: semicírculo superior; debajo queda un hueco seco.
        const dx = d.x - mx;
        const dy = d.y - my;
        const inDome = dy < 0 && dx * dx + dy * dy < UMBRELLA_R * UMBRELLA_R;
        const inShadow = dy >= 0 && dy < UMBRELLA_R * 1.8 && Math.abs(dx) < UMBRELLA_R * 0.9;
        if (inDome || inShadow) {
          if (inDome && d.layer > 0) splashes.push({ x: d.x, y: d.y, age: 0, life: 0.28, size: 3 + d.layer * 1.5, up: true });
          Object.assign(d, spawn(false));
          continue;
        }
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
    ctx.lineWidth = 1;
    for (const s of splashes) {
      const t = s.age / s.life;
      const r = s.size * (0.3 + t);
      ctx.strokeStyle = `rgba(214, 224, 255, ${0.4 * (1 - t)})`;
      ctx.beginPath();
      if (s.up) {
        ctx.arc(s.x, s.y, r, Math.PI, 2 * Math.PI);
      } else {
        ctx.ellipse(s.x, s.y, r * 1.6, r * 0.45, 0, Math.PI, 2 * Math.PI);
      }
      ctx.stroke();
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
