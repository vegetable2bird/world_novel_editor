import { useEffect, useRef } from 'react';

type RGB = [number, number, number];

/**
 * 琉璃凤凰主视觉：AI 生成的透明底水晶凤凰 PNG，
 * Canvas 加持身：呼吸浮动、背光光晕脉动、流光扫过羽面、晶莹浮尘。
 * 光色取自主题 CSS 变量，随色盘自定义即时重染。
 */
export function Phoenix({ compact = false }: { compact?: boolean }) {
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

    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      const u = compact ? Math.min(W, H * 3) : Math.min(W, H);
      const cx = W / 2;
      const cy = compact ? H * 0.56 : H * 0.4;
      const { accent, accent2 } = pal;

      // 呼吸参数
      const breath = Math.sin(t * 0.55);
      const scale = 1 + breath * 0.008;
      const bobY = breath * u * 0.006;
      // 流光位置：一道高光带周期性扫过全身
      const sweep = ((t * 0.11) % 1.6) - 0.3; // -0.3 ~ 1.3

      // 背光光晕（太阳）
      const sunR = u * (compact ? 0.3 : 0.34) * (1 + breath * 0.03);
      const sun = ctx.createRadialGradient(cx, cy, 0, cx, cy, sunR);
      sun.addColorStop(0, css(WHITE, 0.85));
      sun.addColorStop(0.25, css(mix(WHITE, accent2, 0.25), 0.5));
      sun.addColorStop(0.6, css(mix(WHITE, accent2, 0.45), 0.16));
      sun.addColorStop(1, css(accent2, 0));
      ctx.fillStyle = sun;
      ctx.fillRect(cx - sunR, cy - sunR, sunR * 2, sunR * 2);

      if (loaded) {
        // 凤凰主体（等比缩放，完整入画）
        const iw = img.width;
        const ih = img.height;
        const drawW = Math.min(W * (compact ? 0.86 : 0.92), u * 1.55) * scale;
        const drawH = (drawW * ih) / iw;
        const dx = cx - drawW / 2;
        const dy = cy - drawH * 0.52 + bobY;

        ctx.drawImage(img, dx, dy, drawW, drawH);

        // 流光扫过：斜向亮带，仅落在凤凰不透明区域
        if (!reduced && sweep > -0.05 && sweep < 1.05) {
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          const bandX = dx + drawW * sweep;
          const band = ctx.createLinearGradient(bandX - drawW * 0.1, 0, bandX + drawW * 0.1, 0);
          band.addColorStop(0, css(WHITE, 0));
          band.addColorStop(0.5, css(WHITE, 0.5));
          band.addColorStop(1, css(WHITE, 0));
          ctx.fillStyle = band;
          ctx.fillRect(bandX - drawW * 0.1, dy, drawW * 0.2, drawH);
          ctx.restore();
        }
      }

      // 晶莹浮尘
      for (const p of parts) {
        p.x += p.vx + Math.sin(t * 0.6 + p.ph) * 0.08;
        p.y += p.vy;
        if (p.y < -6 || p.x < -6 || p.x > W + 6) {
          p.x = Math.random() * W;
          p.y = H + 6;
        }
        const a = 0.18 + 0.4 * Math.abs(Math.sin(t * p.tw + p.ph));
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
    let start = performance.now();
    const frame = (now: number) => {
      draw((now - start) / 1000);
      raf = requestAnimationFrame(frame);
    };

    rebuildPalette();
    resize();
    initParts();
    if (reduced) {
      draw(0.6);
    } else {
      raf = requestAnimationFrame(frame);
    }

    const onResize = () => {
      resize();
      initParts();
      if (reduced) draw(0.6);
    };
    const onTheme = () => {
      rebuildPalette();
      if (reduced) draw(0.6);
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
