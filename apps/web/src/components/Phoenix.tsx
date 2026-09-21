import { useEffect, useRef } from 'react';

type RGB = [number, number, number];

/**
 * 琉璃凤凰主视觉：AI 生成的透明底水晶凤凰 PNG，Canvas 加持身：
 * - 翱翔漂移（缓慢八字游弋）+ 扇翅呼吸 + 背光光晕脉动 + 流光扫羽 + 晶莹浮尘
 * - variant 形态：full 全幅主视觉 / emblem 标题上方的小徽记（去饱和、克制） /
 *   glow（noBird）仅光晕与浮尘，无鸟 —— 高级留白模式
 * - flyAway：登录成功后天翔飞起、放大淡出（页面过场）
 * - compact：Dashboard 横幅形态，挂载时自左侧滑翔入场
 * 光色取自主题 CSS 变量，随色盘自定义即时重染。
 */
export function Phoenix({
  compact = false,
  flyAway = false,
  emblem = false,
  noBird = false,
}: {
  compact?: boolean;
  flyAway?: boolean;
  emblem?: boolean;
  noBird?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const flyRef = useRef(0); // 飞行动画起始时间戳（0=未开始）
  const flyFlag = useRef(flyAway);
  flyFlag.current = flyAway;

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
    const WHITE: RGB = [255, 255, 255];

    let pal = { accent: [0, 0, 0] as RGB, accent2: [0, 0, 0] as RGB };
    const rebuildPalette = () => {
      pal = {
        accent: toRgb(cssVar('--accent')),
        accent2: toRgb(cssVar('--accent-2') || cssVar('--accent')),
      };
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

    // 凤凰图
    const img = new Image();
    let loaded = false;
    img.onload = () => (loaded = true);
    img.src = '/phoenix.png';

    // 浮尘
    type P = { x: number; y: number; r: number; vy: number; vx: number; tw: number; ph: number };
    let parts: P[] = [];
    const initParts = () => {
      const n = compact ? 16 : 46;
      parts = Array.from({ length: n }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.7 + Math.random() * 1.8,
        vy: -(0.05 + Math.random() * 0.2),
        vx: (Math.random() - 0.5) * 0.1,
        tw: 0.5 + Math.random() * 1.4,
        ph: Math.random() * Math.PI * 2,
      }));
    };

    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, W, H);
      const u = compact ? Math.min(W, H * 3) : Math.min(W, H);
      // 形态决定构图位置
      const cx0 = W / 2;
      const cy0 = noBird ? H * 0.32 : emblem ? H * (W < 700 ? 0.16 : 0.21) : compact ? H * 0.56 : H * 0.4;
      const { accent, accent2 } = pal;

      // 飞走过场进度 0..1（1.15s，smoothstep）
      if (flyFlag.current && !flyRef.current) flyRef.current = t;
      const fp = flyRef.current ? Math.min(1, (t - flyRef.current) / 1.15) : 0;
      const fly = fp * fp * (3 - 2 * fp);

      // 横幅滑翔入场进度
      let enter = 1;
      if (compact) {
        const ep = Math.min(1, t / 1.5);
        enter = ep * ep * (3 - 2 * ep);
      }

      // 翱翔漂移 + 扇翅（徽记更克制）
      const driftAmp = emblem ? 0.35 : 1;
      const soarX = (Math.sin(t * 0.22) * W * 0.02 * driftAmp - (1 - enter) * W * 0.34) * (1 - fly);
      const soarY = (Math.cos(t * 0.17) * H * 0.012 * driftAmp - fly * H * 0.42) + Math.sin(t * 0.55) * u * 0.006;
      const flap = Math.sin(t * 2.0) * (emblem ? 0.01 : 0.018) * (1 - fly); // 扇翅
      const breath = Math.sin(t * 0.55);
      const rot = Math.sin(t * 0.22) * (emblem ? 0.012 : 0.022) - fly * 0.28;
      const alpha = (1 - fly) * (0.35 + 0.65 * enter) * (emblem ? 0.82 : 1);
      const scaleUp = (1 + fly * 0.85) * (1 + breath * 0.006);
      const cx = cx0 + soarX;
      const cy = cy0 + soarY;

      // 背光光晕（太阳；徽记收敛、无光鸟模式为主光源）
      const sunBase = noBird ? 0.3 : emblem ? 0.2 : compact ? 0.3 : 0.34;
      const sunR = u * sunBase * (1 + breath * 0.03) * (1 + fly * 0.5);
      const sun = ctx.createRadialGradient(cx, cy, 0, cx, cy, sunR);
      sun.addColorStop(0, css(WHITE, 0.85 * alpha));
      sun.addColorStop(0.25, css(mix(WHITE, accent2, 0.25), 0.5 * alpha));
      sun.addColorStop(0.6, css(mix(WHITE, accent2, 0.45), 0.16 * alpha));
      sun.addColorStop(1, css(accent2, 0));
      ctx.fillStyle = sun;
      ctx.fillRect(cx - sunR, cy - sunR, sunR * 2, sunR * 2);

      if (loaded && alpha > 0.01 && !noBird) {
        const iw = img.width;
        const ih = img.height;
        // 徽记：小而克制，去饱和融入排版
        const drawW = (emblem ? Math.min(W * 0.34, 340) : Math.min(W * (compact ? 0.86 : 0.92), u * 1.55)) * scaleUp;
        const drawH = drawW * (ih / iw) * (1 + flap); // 扇翅：纵向呼吸
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        if (emblem) ctx.filter = 'saturate(0.55) brightness(1.04)';
        ctx.globalAlpha = Math.min(1, alpha);
        ctx.drawImage(img, -drawW / 2, -drawH * 0.52, drawW, drawH);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;

        // 流光扫过：斜向亮带，仅落在凤凰不透明区域
        const sweep = ((t * 0.11) % 1.6) - 0.3;
        if (!reduced && sweep > -0.05 && sweep < 1.05 && fly === 0) {
          ctx.globalCompositeOperation = 'source-atop';
          const bandX = -drawW / 2 + drawW * sweep;
          const band = ctx.createLinearGradient(bandX - drawW * 0.1, 0, bandX + drawW * 0.1, 0);
          band.addColorStop(0, css(WHITE, 0));
          band.addColorStop(0.5, css(WHITE, 0.5));
          band.addColorStop(1, css(WHITE, 0));
          ctx.fillStyle = band;
          ctx.fillRect(bandX - drawW * 0.1, -drawH, drawW * 0.2, drawH * 2);
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.restore();
      }

      // 晶莹浮尘
      for (const p of parts) {
        p.x += p.vx + Math.sin(t * 0.6 + p.ph) * 0.08;
        p.y += p.vy - fly * 1.2;
        if (p.y < -6 || p.x < -6 || p.x > W + 6) {
          p.x = Math.random() * W;
          p.y = H + 6;
        }
        const a = (0.18 + 0.4 * Math.abs(Math.sin(t * p.tw + p.ph))) * alpha;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        g.addColorStop(0, css(mix(WHITE, accent2, 0.3), a));
        g.addColorStop(1, css(accent2, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    let raf = 0;
    const frame = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(frame);
    };

    rebuildPalette();
    resize();
    initParts();
    if (reduced) {
      draw(start + 600);
    } else {
      raf = requestAnimationFrame(frame);
    }

    const onResize = () => {
      resize();
      initParts();
      if (reduced) draw(start + 600);
    };
    const onTheme = () => {
      rebuildPalette();
      if (reduced) draw(start + 600);
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
