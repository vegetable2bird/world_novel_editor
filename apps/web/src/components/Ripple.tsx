import { useEffect, useRef } from 'react';

/**
 * 鼠标水波：经典波高场物理（双缓冲 + 阻尼），低分辨率计算后放大渲染。
 * 鼠标划过泛起扩散交叠的波光，偶尔自动落下一滴「雨」。
 */
export function Ripple() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const RW = 320;
    const RH = 180;
    canvas.width = RW;
    canvas.height = RH;

    let cur = new Float32Array(RW * RH);
    let prev = new Float32Array(RW * RH);
    const img = ctx.createImageData(RW, RH);

    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    /** 在归一化坐标 (nx, ny) 处扰动水面 */
    const disturb = (nx: number, ny: number, strength: number, radius: number) => {
      const cx = Math.floor(nx * RW);
      const cy = Math.floor(ny * RH);
      for (let j = -radius; j <= radius; j++) {
        for (let i = -radius; i <= radius; i++) {
          if (i * i + j * j > radius * radius) continue;
          const xx = cx + i;
          const yy = cy + j;
          if (xx > 1 && xx < RW - 1 && yy > 1 && yy < RH - 1) prev[yy * RW + xx] += strength;
        }
      }
    };

    const toNorm = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    };
    const onMove = (e: PointerEvent) => {
      const { x, y } = toNorm(e);
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      disturb(x, y, 1.4, 3);
    };
    const onDown = (e: PointerEvent) => {
      const { x, y } = toNorm(e);
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      disturb(x, y, 6, 5);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerdown', onDown);

    let raf = 0;
    let lastDrop = 0;
    const frame = (now: number) => {
      // 波传播（邻域平均 - 当前值，乘阻尼）
      for (let y = 1; y < RH - 1; y++) {
        const row = y * RW;
        for (let x = 1; x < RW - 1; x++) {
          const i = row + x;
          const v = (prev[i - 1] + prev[i + 1] + prev[i - RW] + prev[i + RW]) / 2 - cur[i];
          cur[i] = v * 0.986;
        }
      }
      const tmp = prev;
      prev = cur;
      cur = tmp;

      // 渲染为白色波光（坡度越大越亮）
      const d = img.data;
      for (let y = 1; y < RH - 1; y++) {
        const row = y * RW;
        for (let x = 1; x < RW - 1; x++) {
          const i = row + x;
          const gx = prev[i - 1] - prev[i + 1];
          const gy = prev[i - RW] - prev[i + RW];
          const a = Math.min(90, (Math.abs(gx) + Math.abs(gy)) * 15);
          const p = i * 4;
          d[p] = 255;
          d[p + 1] = 255;
          d[p + 2] = 255;
          d[p + 3] = a;
        }
      }
      ctx.putImageData(img, 0, 0);

      // 偶发一滴「雨」让水面自己活起来
      if (now - lastDrop > 1500) {
        lastDrop = now;
        disturb(0.15 + Math.random() * 0.7, 0.15 + Math.random() * 0.7, 2.2, 3);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
    };
  }, []);

  return <canvas ref={ref} className="ripple-canvas" aria-hidden="true" />;
}
