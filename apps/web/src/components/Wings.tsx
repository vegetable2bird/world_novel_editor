import { useEffect, useRef } from 'react';

type RGB = [number, number, number];

type Feather = {
  angle: number; // 扇形角（度，右翅基准，绕肩部枢轴）
  len: number; // 相对长度 0..1
  off: number; // 基部沿翅膀方向的偏移 0..1
  phase: number; // 微动相位
};

type Layer = {
  scale: number; // 长度缩放
  shade: number; // 0 深 ~ 1 浅
  sweep: number; // 向后掠的角度（度）
  feathers: Feather[];
};

/**
 * 翅膀画布（受 noomo 叙事站启发）：
 * 程序化分层羽毛 + 呼吸式扇动 + 金色辉光 + 浮尘微粒。
 * 颜色取自主题 CSS 变量（--accent / --accent-2），随主题切换即时重染。
 */
export function Wings({ compact = false }: { compact?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const root = document.documentElement;

    const cssVar = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const hexToRgb = (h: string): RGB => {
      h = h.replace('#', '');
      if (h.length === 3) h = h.split('').map((x) => x + x).join('');
      const n = parseInt(h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const toRgb = (v: string): RGB => {
      v = (v || '').trim();
      if (v[0] === '#') return hexToRgb(v);
      const m = v.match(/rgba?\(([^)]+)\)/);
      if (m) {
        const p = m[1].split(',').map(parseFloat);
        return [p[0], p[1], p[2]];
      }
      return [212, 175, 55];
    };
    const mix = (a: RGB, b: RGB, t: number): RGB => [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];
    const css = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    const WHITE: RGB = [255, 246, 224];

    // 调色板：随主题重建
    let pal = { deep: [0, 0, 0] as RGB, mid: [0, 0, 0] as RGB, light: [0, 0, 0] as RGB, glow: [0, 0, 0] as RGB, bg: [0, 0, 0] as RGB };
    const rebuildPalette = () => {
      const a = toRgb(cssVar('--accent'));
      const a2 = toRgb(cssVar('--accent-2') || cssVar('--accent'));
      const bg = toRgb(cssVar('--bg'));
      pal = {
        deep: mix(a, bg, 0.62),
        mid: mix(a, a2, 0.35),
        light: mix(a2, WHITE, 0.42),
        glow: mix(a2, WHITE, 0.25),
        bg,
      };
    };

    // 三层羽毛：初级飞羽（长、后掠）/ 次级 / 覆羽（短、贴肩）
    const fan = (from: number, to: number, n: number, peak: number, sigma: number, maxLen: number, offBase: number): Feather[] => {
      const arr: Feather[] = [];
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const angle = from + (to - from) * t;
        const bell = Math.exp(-((angle - peak) ** 2) / (2 * sigma * sigma));
        arr.push({
          angle,
          len: maxLen * (0.42 + 0.58 * bell),
          off: offBase + 0.05 * t,
          phase: Math.random() * Math.PI * 2,
        });
      }
      return arr;
    };
    const LAYERS: Layer[] = [
      { scale: 1.0, shade: 0.12, sweep: 14, feathers: fan(-80, 6, 9, -30, 26, 1.0, 0.02) },
      { scale: 0.78, shade: 0.45, sweep: 9, feathers: fan(-64, 20, 11, -24, 26, 1.0, 0.1) },
      { scale: 0.45, shade: 0.8, sweep: 5, feathers: fan(-52, 28, 13, -16, 26, 1.0, 0.16) },
    ];

    let W = 0;
    let H = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // 浮尘微粒
    type P = { x: number; y: number; r: number; vy: number; vx: number; tw: number; ph: number };
    let parts: P[] = [];
    const initParts = () => {
      const n = compact ? 26 : 64;
      parts = Array.from({ length: n }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.6 + Math.random() * 1.7,
        vy: -(0.08 + Math.random() * 0.3),
        vx: (Math.random() - 0.5) * 0.12,
        tw: 0.5 + Math.random() * 1.5,
        ph: Math.random() * Math.PI * 2,
      }));
    };

    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /** 画单侧翅膀（side=1 右，-1 左） */
    const drawWing = (side: 1 | -1, t: number, u: number, cx: number, cy: number, alpha: number) => {
      // 呼吸式扇动：整翅绕肩部慢速摆动，后层带相位差，如羽翼舒展
      const flap = Math.sin(t * 0.55) * (compact ? 0.045 : 0.075);
      const breathe = 1 + Math.sin(t * 0.55 + 1.2) * 0.012;

      for (let li = LAYERS.length - 1; li >= 0; li--) {
        const layer = LAYERS[li];
        const layerFlap = flap * (0.55 + li * 0.28) + Math.sin(t * 0.55 - li * 0.42) * 0.018;
        const c = mix(mix(pal.deep, pal.mid, layer.shade), pal.light, layer.shade * 0.35);

        for (const f of layer.feathers) {
          const sway = Math.sin(t * 1.15 + f.phase) * 0.014;
          const deg = f.angle + layer.sweep * (1 - f.len) + layerFlap * 57.3 + sway * 57.3;
          const rad = (deg * Math.PI) / 180;
          const dx = Math.cos(rad);
          const dy = Math.sin(rad);
          const L = f.len * layer.scale * u * 0.52 * breathe;
          const bx = cx + dx * f.off * u * 0.1;
          const by = cy + dy * f.off * u * 0.1;
          const tx = bx + dx * L - dy * L * 0.06 * (f.len > 0.7 ? 1 : 0.3);
          const ty = by + dy * L + dx * L * 0.06 * (f.len > 0.7 ? 1 : 0.3);
          const wHalf = L * (0.14 + 0.05 * (1 - f.len));

          // 羽面渐变：基部深 → 端部亮
          const g = ctx.createLinearGradient(bx, by, tx, ty);
          g.addColorStop(0, css(mix(c, pal.bg, 0.35), 0.92 * alpha));
          g.addColorStop(0.55, css(c, 0.85 * alpha));
          g.addColorStop(1, css(mix(c, pal.light, 0.55), 0.7 * alpha));

          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.quadraticCurveTo(bx + dx * L * 0.38 - dy * wHalf, by + dy * L * 0.38 + dx * wHalf, tx, ty);
          ctx.quadraticCurveTo(bx + dx * L * 0.62 + dy * wHalf * 0.62, by + dy * L * 0.62 - dx * wHalf * 0.62, bx, by);
          ctx.closePath();
          ctx.fillStyle = g;
          ctx.fill();
        }
      }

      // 肩部辉光
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, u * 0.34);
      gr.addColorStop(0, css(pal.glow, 0.16 * alpha));
      gr.addColorStop(1, css(pal.glow, 0));
      ctx.fillStyle = gr;
      ctx.fillRect(cx - u * 0.34, cy - u * 0.34, u * 0.68, u * 0.68);
    };

    let raf = 0;
    let start = performance.now();
    const frame = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, W, H);

      const u = compact ? Math.min(W, H * 3.2) : Math.min(W, H);
      const cx = W / 2;
      const cy = compact ? H * 0.62 : H * 0.4;
      const alpha = compact ? 0.6 : 0.9;

      // 中心光晕
      ctx.globalCompositeOperation = 'lighter';
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, u * 0.5);
      core.addColorStop(0, css(pal.glow, (compact ? 0.1 : 0.16) * (0.85 + 0.15 * Math.sin(t * 0.55))));
      core.addColorStop(1, css(pal.glow, 0));
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, W, H);

      drawWing(-1, t, u, cx, cy, alpha);
      drawWing(1, t, u, cx, cy, alpha);

      // 浮尘
      for (const p of parts) {
        p.x += p.vx + Math.sin(t * 0.6 + p.ph) * 0.08;
        p.y += p.vy;
        if (p.y < -6 || p.x < -6 || p.x > W + 6) {
          p.x = Math.random() * W;
          p.y = H + 6;
        }
        const a = (0.25 + 0.55 * Math.abs(Math.sin(t * p.tw + p.ph))) * alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = css(pal.light, a);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      raf = requestAnimationFrame(frame);
    };

    const drawStill = () => {
      ctx.clearRect(0, 0, W, H);
      const u = compact ? Math.min(W, H * 3.2) : Math.min(W, H);
      const cx = W / 2;
      const cy = compact ? H * 0.62 : H * 0.4;
      drawWing(-1, 0.6, u, cx, cy, compact ? 0.6 : 0.9);
      drawWing(1, 0.6, u, cx, cy, compact ? 0.6 : 0.9);
    };

    rebuildPalette();
    resize();
    initParts();
    if (reduced) {
      drawStill();
    } else {
      raf = requestAnimationFrame(frame);
    }

    const onResize = () => {
      resize();
      initParts();
      if (reduced) drawStill();
    };
    const onTheme = () => {
      rebuildPalette();
      if (reduced) drawStill();
    };
    window.addEventListener('resize', onResize);
    const mo = new MutationObserver(onTheme);
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      mo.disconnect();
    };
  }, [compact]);

  return <canvas ref={ref} className="wings-canvas" aria-hidden="true" />;
}
