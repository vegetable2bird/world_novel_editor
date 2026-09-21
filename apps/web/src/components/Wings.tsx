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

type WingSpec = {
  pivotDy: number; // 枢轴纵向偏移（比例）
  flapPhase: number; // 扇动相位差
  flapAmp: number; // 扇动幅度
  alpha: number; // 整体透明度
  layers: Layer[];
};

const WHITE: RGB = [255, 255, 255];

/**
 * 翅膀画布 · 晶莹双翼版
 * 上下两对翅膀（上翅小巧上扬 / 下翅宽大舒展），羽毛为玻璃质感：
 * 半透明白玉羽面 + 主题色描边 + 羽脊高光，扇动时如水晶羽翼。
 * 颜色取自主题 CSS 变量（--accent / --accent-2），随色盘自定义即时重染。
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
      return [109, 79, 208];
    };
    const mix = (a: RGB, b: RGB, t: number): RGB => [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];
    const css = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    const luminance = (c: RGB) => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;

    // 调色板：随主题重建；lightMode 决定辉光混合方式（浅底不能用 additive，会发白过曝）
    let pal = {
      accent: [0, 0, 0] as RGB,
      accent2: [0, 0, 0] as RGB,
      deep: [0, 0, 0] as RGB,
      bg: [0, 0, 0] as RGB,
      lightMode: true,
    };
    const rebuildPalette = () => {
      const a = toRgb(cssVar('--accent'));
      const a2 = toRgb(cssVar('--accent-2') || cssVar('--accent'));
      const bg = toRgb(cssVar('--bg'));
      pal = {
        accent: a,
        accent2: a2,
        deep: mix(a, bg, 0.45),
        bg,
        lightMode: luminance(bg) > 0.55,
      };
    };

    // 羽毛扇形分布
    const fan = (from: number, to: number, n: number, peak: number, sigma: number, offBase: number): Feather[] => {
      const arr: Feather[] = [];
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const angle = from + (to - from) * t;
        const bell = Math.exp(-((angle - peak) ** 2) / (2 * sigma * sigma));
        arr.push({
          angle,
          len: 0.42 + 0.58 * bell,
          off: offBase + 0.05 * t,
          phase: Math.random() * Math.PI * 2,
        });
      }
      return arr;
    };

    // 双翅规格：下翅（大）+ 上翅（小、上扬）
    const LOWER: WingSpec = {
      pivotDy: 0,
      flapPhase: 0,
      flapAmp: 1,
      alpha: 1,
      layers: [
        { scale: 1.0, shade: 0.1, sweep: 14, feathers: fan(-80, 6, 9, -30, 26, 0.02) },
        { scale: 0.78, shade: 0.45, sweep: 9, feathers: fan(-64, 20, 11, -24, 26, 0.1) },
        { scale: 0.45, shade: 0.8, sweep: 5, feathers: fan(-52, 28, 13, -16, 26, 0.16) },
      ],
    };
    const UPPER: WingSpec = {
      pivotDy: -0.16,
      flapPhase: 1.1,
      flapAmp: 1.35,
      alpha: 0.82,
      layers: [
        { scale: 0.6, shade: 0.3, sweep: 10, feathers: fan(-102, -34, 8, -72, 22, 0.02) },
        { scale: 0.36, shade: 0.7, sweep: 6, feathers: fan(-92, -30, 10, -66, 22, 0.08) },
      ],
    };

    let W = 0;
    let H = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth || window.innerWidth;
      H = canvas.clientHeight || window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // 浮尘微粒
    type P = { x: number; y: number; r: number; vy: number; vx: number; tw: number; ph: number };
    let parts: P[] = [];
    const initParts = () => {
      const n = compact ? 22 : 56;
      parts = Array.from({ length: n }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.6 + Math.random() * 1.6,
        vy: -(0.06 + Math.random() * 0.24),
        vx: (Math.random() - 0.5) * 0.1,
        tw: 0.5 + Math.random() * 1.5,
        ph: Math.random() * Math.PI * 2,
      }));
    };

    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /** 单根玻璃质感羽毛 */
    const drawFeather = (
      bx: number, by: number, dx: number, dy: number, L: number,
      wHalf: number, alpha: number, shade: number,
    ) => {
      const tx = bx + dx * L - dy * L * 0.05;
      const ty = by + dy * L + dx * L * 0.05;
      const { accent, accent2, deep, lightMode } = pal;
      const edge = mix(accent2, WHITE, 0.25 + shade * 0.35); // 描边色：浅紫→白
      const faceTop = lightMode ? mix(accent2, WHITE, 0.55 + shade * 0.25) : mix(deep, accent2, 0.5);

      // 羽面：基部淡彩 → 端部白玉
      const g = ctx.createLinearGradient(bx, by, tx, ty);
      g.addColorStop(0, css(mix(accent, pal.bg, lightMode ? 0.55 : 0.35), 0.2 * alpha));
      g.addColorStop(0.5, css(faceTop, (lightMode ? 0.3 : 0.5) * alpha));
      g.addColorStop(1, css(WHITE, (lightMode ? 0.5 : 0.65) * alpha));
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + dx * L * 0.38 - dy * wHalf, by + dy * L * 0.38 + dx * wHalf, tx, ty);
      ctx.quadraticCurveTo(bx + dx * L * 0.62 + dy * wHalf * 0.62, by + dy * L * 0.62 - dx * wHalf * 0.62, bx, by);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();

      // 描边（玻璃轮廓）
      ctx.strokeStyle = css(edge, (lightMode ? 0.55 : 0.7) * alpha);
      ctx.lineWidth = 1;
      ctx.stroke();

      // 羽脊高光：基→端一道亮线 + 端头光点
      const sg = ctx.createLinearGradient(bx, by, tx, ty);
      sg.addColorStop(0, css(WHITE, 0));
      sg.addColorStop(0.6, css(WHITE, (lightMode ? 0.5 : 0.65) * alpha));
      sg.addColorStop(1, css(WHITE, 0.85 * alpha));
      ctx.beginPath();
      ctx.moveTo(bx + dx * L * 0.08, by + dy * L * 0.08);
      ctx.quadraticCurveTo(bx + dx * L * 0.5 - dy * wHalf * 0.12, by + dy * L * 0.5 + dx * wHalf * 0.12, tx, ty);
      ctx.strokeStyle = sg;
      ctx.lineWidth = Math.max(1, L * 0.012);
      ctx.stroke();

      // 端头晶莹光点
      const tipG = ctx.createRadialGradient(tx, ty, 0, tx, ty, L * 0.07);
      tipG.addColorStop(0, css(WHITE, 0.75 * alpha));
      tipG.addColorStop(1, css(WHITE, 0));
      ctx.fillStyle = tipG;
      ctx.beginPath();
      ctx.arc(tx, ty, L * 0.07, 0, Math.PI * 2);
      ctx.fill();
    };

    /** 单侧单翅 */
    const drawWingOnce = (side: 1 | -1, spec: WingSpec, t: number, u: number, cx: number, cy: number, globalAlpha: number) => {
      const flapBase = Math.sin(t * 0.55 + spec.flapPhase) * (compact ? 0.04 : 0.065) * spec.flapAmp;
      const breathe = 1 + Math.sin(t * 0.55 + 1.2 + spec.flapPhase) * 0.012;
      const px = cx + side * u * 0.012;
      const py = cy + spec.pivotDy * u;

      for (let li = spec.layers.length - 1; li >= 0; li--) {
        const layer = spec.layers[li];
        const layerFlap = flapBase * (0.55 + li * 0.28) + Math.sin(t * 0.55 + spec.flapPhase - li * 0.42) * 0.016;

        for (const f of layer.feathers) {
          const sway = Math.sin(t * 1.15 + f.phase) * 0.014;
          const deg = f.angle + layer.sweep * (1 - f.len) + layerFlap * 57.3 + sway * 57.3;
          const rad = (deg * Math.PI) / 180;
          const dx = Math.cos(rad);
          const dy = Math.sin(rad);
          const L = f.len * layer.scale * u * 0.5 * breathe;
          const bx = px + dx * f.off * u * 0.1;
          const by = py + dy * f.off * u * 0.1;
          const wHalf = L * (0.14 + 0.05 * (1 - f.len));
          drawFeather(bx, by, dx, dy, L, wHalf, spec.alpha * globalAlpha, layer.shade);
        }
      }

      // 肩部柔光
      const { accent2, lightMode } = pal;
      const gr = ctx.createRadialGradient(px, py, 0, px, py, u * 0.22);
      gr.addColorStop(0, css(accent2, (lightMode ? 0.12 : 0.18) * spec.alpha * globalAlpha));
      gr.addColorStop(1, css(accent2, 0));
      ctx.fillStyle = gr;
      ctx.fillRect(px - u * 0.22, py - u * 0.22, u * 0.44, u * 0.44);
    };

    /** 单侧双翅：先画上翅（后层），再画下翅（前层） */
    const drawSide = (side: 1 | -1, t: number, u: number, cx: number, cy: number, alpha: number) => {
      drawWingOnce(side, UPPER, t, u, cx, cy, alpha);
      drawWingOnce(side, LOWER, t, u, cx, cy, alpha);
    };

    let raf = 0;
    const frame = (now: number) => {
      const t = now / 1000;
      ctx.clearRect(0, 0, W, H);

      const u = compact ? Math.min(W, H * 3.2) : Math.min(W, H);
      const cx = W / 2;
      const cy = compact ? H * 0.66 : H * 0.42;
      const alpha = compact ? 0.62 : 0.95;
      const { accent2, lightMode } = pal;

      // 中心柔光（浅底用普通混合，避免 additive 过曝）
      if (!lightMode) ctx.globalCompositeOperation = 'lighter';
      const pulse = 0.85 + 0.15 * Math.sin(t * 0.55);
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, u * 0.46);
      core.addColorStop(0, css(accent2, (lightMode ? 0.08 : 0.15) * pulse));
      core.addColorStop(1, css(accent2, 0));
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';

      drawSide(-1, t, u, cx, cy, alpha);
      drawSide(1, t, u, cx, cy, alpha);

      // 浮尘（晶莹光点）
      for (const p of parts) {
        p.x += p.vx + Math.sin(t * 0.6 + p.ph) * 0.08;
        p.y += p.vy;
        if (p.y < -6 || p.x < -6 || p.x > W + 6) {
          p.x = Math.random() * W;
          p.y = H + 6;
        }
        const a = (0.2 + 0.45 * Math.abs(Math.sin(t * p.tw + p.ph))) * alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = css(pal.lightMode ? mix(accent2, WHITE, 0.4) : accent2, a);
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    };

    const drawStill = () => {
      ctx.clearRect(0, 0, W, H);
      const u = compact ? Math.min(W, H * 3.2) : Math.min(W, H);
      drawSide(-1, 0.6, u, W / 2, compact ? H * 0.66 : H * 0.42, compact ? 0.62 : 0.95);
      drawSide(1, 0.6, u, W / 2, compact ? H * 0.66 : H * 0.42, compact ? 0.62 : 0.95);
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
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme', 'style'] });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      mo.disconnect();
    };
  }, [compact]);

  return <canvas ref={ref} className="wings-canvas" aria-hidden="true" />;
}
