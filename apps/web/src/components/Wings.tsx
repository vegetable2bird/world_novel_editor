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
 * 翅膀画布 · 琉璃晶莹双翼版
 * 还原 noomo 叙事站气质：琉璃玻璃质感 ——
 * 羽毛为高通明白玉羽面，前沿一线高光、后缘一道折射彩边，
 * 翼尖指状分开，双翅（上小下大）交错扇动。
 * 颜色取自主题 CSS 变量，随色盘自定义即时重染。
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

    // 调色板：随主题重建；lightMode 决定辉光混合方式（浅底不能用 additive，会过曝）
    let pal = {
      accent: [0, 0, 0] as RGB,
      accent2: [0, 0, 0] as RGB,
      bg: [0, 0, 0] as RGB,
      lightMode: true,
    };
    const rebuildPalette = () => {
      const a = toRgb(cssVar('--accent'));
      const a2 = toRgb(cssVar('--accent-2') || cssVar('--accent'));
      const bg = toRgb(cssVar('--bg'));
      pal = { accent: a, accent2: a2, bg, lightMode: luminance(bg) > 0.55 };
    };

    // 羽毛扇形分布；tipSpread 让外缘羽毛间距拉大，形成指状翼尖
    const fan = (
      from: number, to: number, n: number, peak: number, sigma: number,
      offBase: number, tipSpread = 0.72,
    ): Feather[] => {
      const arr: Feather[] = [];
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const ts = Math.pow(t, tipSpread); // 外缘拉开 → 翼尖指状分开
        const angle = from + (to - from) * ts;
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
        { scale: 1.0, shade: 0.1, sweep: 14, feathers: fan(-80, 4, 9, -32, 26, 0.02) },
        { scale: 0.78, shade: 0.45, sweep: 9, feathers: fan(-62, 18, 10, -24, 26, 0.1) },
        { scale: 0.45, shade: 0.8, sweep: 5, feathers: fan(-50, 26, 12, -16, 26, 0.16) },
      ],
    };
    const UPPER: WingSpec = {
      pivotDy: -0.16,
      flapPhase: 1.1,
      flapAmp: 1.35,
      alpha: 0.85,
      layers: [
        { scale: 0.6, shade: 0.3, sweep: 10, feathers: fan(-104, -36, 8, -74, 22, 0.02) },
        { scale: 0.36, shade: 0.7, sweep: 6, feathers: fan(-94, -32, 9, -66, 22, 0.08) },
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

    /**
     * 单根琉璃羽毛。
     * 无描边轮廓：前沿一道白高光、后缘一道主题色折射彩边，
     * 羽面中段一条镜面反光带，端头晶亮。
     */
    const drawFeather = (
      bx: number, by: number, dx: number, dy: number, L: number,
      wHalf: number, alpha: number, shade: number,
    ) => {
      const { accent, accent2, bg, lightMode } = pal;
      const tipX = bx + dx * L - dy * L * 0.06;
      const tipY = by + dy * L + dx * L * 0.06;
      // 前沿 / 后缘控制点
      const leadX = bx + dx * L * 0.42 - dy * wHalf;
      const leadY = by + dy * L * 0.42 + dx * wHalf;
      const trailX = bx + dx * L * 0.58 + dy * wHalf * 0.92;
      const trailY = by + dy * L * 0.58 - dx * wHalf * 0.92;

      // 羽面：基部淡彩 → 中段乳白 → 端头最亮（玻璃透光感）
      const g = ctx.createLinearGradient(bx, by, tipX, tipY);
      g.addColorStop(0, css(mix(accent, bg, lightMode ? 0.6 : 0.4), 0.16 * alpha));
      g.addColorStop(0.4, css(WHITE, (lightMode ? 0.1 : 0.16) * alpha));
      g.addColorStop(0.78, css(WHITE, (lightMode ? 0.26 : 0.4) * alpha));
      g.addColorStop(1, css(WHITE, (lightMode ? 0.5 : 0.62) * alpha));
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(leadX, leadY, tipX, tipY);
      ctx.quadraticCurveTo(trailX, trailY, bx, by);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();

      // 后缘折射彩边（琉璃的彩色边线，随羽层深浅变化）
      const edgeG = ctx.createLinearGradient(bx, by, tipX, tipY);
      edgeG.addColorStop(0, css(accent, 0.3 * alpha));
      edgeG.addColorStop(0.6, css(mix(accent2, WHITE, 0.3 + shade * 0.3), 0.42 * alpha));
      edgeG.addColorStop(1, css(WHITE, 0.5 * alpha));
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(trailX, trailY, tipX, tipY);
      ctx.strokeStyle = edgeG;
      ctx.lineWidth = 1.1;
      ctx.stroke();

      // 前沿白高光（玻璃受光边）
      const rimG = ctx.createLinearGradient(bx, by, tipX, tipY);
      rimG.addColorStop(0, css(WHITE, 0.15 * alpha));
      rimG.addColorStop(0.5, css(WHITE, 0.7 * alpha));
      rimG.addColorStop(1, css(WHITE, 0.2 * alpha));
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(leadX, leadY, tipX, tipY);
      ctx.strokeStyle = rimG;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // 镜面反光带：羽面中段一道宽而柔的亮带
      const mx = bx + dx * L * 0.4 - dy * wHalf * 0.25;
      const my = by + dy * L * 0.4 + dx * wHalf * 0.25;
      const streak = ctx.createRadialGradient(mx, my, 0, mx, my, L * 0.34);
      streak.addColorStop(0, css(WHITE, (lightMode ? 0.3 : 0.42) * alpha));
      streak.addColorStop(1, css(WHITE, 0));
      ctx.fillStyle = streak;
      ctx.beginPath();
      ctx.arc(mx, my, L * 0.34, 0, Math.PI * 2);
      ctx.fill();

      // 端头晶亮
      const tipG = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, L * 0.08);
      tipG.addColorStop(0, css(WHITE, 0.85 * alpha));
      tipG.addColorStop(1, css(WHITE, 0));
      ctx.fillStyle = tipG;
      ctx.beginPath();
      ctx.arc(tipX, tipY, L * 0.08, 0, Math.PI * 2);
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
          const wHalf = L * (0.13 + 0.05 * (1 - f.len));
          drawFeather(bx, by, dx, dy, L, wHalf, spec.alpha * globalAlpha, layer.shade);
        }
      }

      // 肩部柔光
      const { accent2, lightMode } = pal;
      const gr = ctx.createRadialGradient(px, py, 0, px, py, u * 0.2);
      gr.addColorStop(0, css(accent2, (lightMode ? 0.1 : 0.16) * spec.alpha * globalAlpha));
      gr.addColorStop(1, css(accent2, 0));
      ctx.fillStyle = gr;
      ctx.fillRect(px - u * 0.2, py - u * 0.2, u * 0.4, u * 0.4);
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
      core.addColorStop(0, css(accent2, (lightMode ? 0.07 : 0.14) * pulse));
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
