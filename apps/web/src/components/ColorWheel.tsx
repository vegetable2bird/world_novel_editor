import { useEffect, useRef, useState } from 'react';

type HSL = [number, number, number];

const hexToHsl = (hex: string): HSL => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let s = 0;
  let hh = 0;
  if (d > 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) hh = ((g - b) / d) % 6;
    else if (max === g) hh = (b - r) / d + 2;
    else hh = (r - g) / d + 4;
    hh *= 60;
    if (hh < 0) hh += 360;
  }
  return [Math.round(hh), Math.round(s * 100), Math.round(l * 100)];
};

const hslToHex = ([h, s, l]: HSL): string => {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number] = [0, 0, 0];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return '#' + to(rgb[0]) + to(rgb[1]) + to(rgb[2]);
};

const SIZE = 156;
const R = SIZE / 2 - 8;

/** HSL 色盘：角度=色相，半径=饱和度，下方滑杆调明度。实时预览回调。 */
export function ColorWheel({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const [hsl, setHsl] = useState<HSL>(() => {
    const [h, s, l] = hexToHsl(value);
    return [h, Math.max(35, s), Math.min(72, Math.max(28, l))];
  });

  // 外部值变化（如恢复默认）时同步
  useEffect(() => {
    const [h, s, l] = hexToHsl(value);
    setHsl([h, Math.max(35, s), Math.min(72, Math.max(28, l))]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // 绘制色盘
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const img = ctx.createImageData(SIZE * dpr, SIZE * dpr);
    const buf = new Uint32Array(img.data.buffer);
    const L = 58; // 固定中等明度绘制盘面，实际明度由滑杆决定
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const i = y * SIZE + x;
        if (dist > R + 1) {
          buf[i] = 0;
          continue;
        }
        const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
        const sat = Math.min(100, (dist / R) * 100);
        buf[i] = (255 << 24) | parseInt(hslToHex([Math.round(hue), Math.round(sat), L]).slice(1), 16);
      }
    }
    ctx.putImageData(img, 0, 0);
    ctx.scale(1 / 1, 1 / 1);

    // 当前选点标记
    const [h, s] = hsl;
    const rad = (h * Math.PI) / 180;
    const rr = (Math.min(100, s) / 100) * R;
    const px = cx + Math.cos(rad) * rr;
    const py = cy + Math.sin(rad) * rr;
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(px, py, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = value;
    ctx.fill();
  }, [hsl, value]);

  const pick = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dx = e.clientX - rect.left - SIZE / 2;
    const dy = e.clientY - rect.top - SIZE / 2;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), R);
    const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const sat = Math.max(35, Math.round((dist / R) * 100));
    const next: HSL = [Math.round(hue), sat, hsl[2]];
    setHsl(next);
    onChange(hslToHex(next));
  };

  return (
    <div className="cw">
      <div className="cw-wheel">
        <canvas
          ref={canvasRef}
          style={{ width: SIZE, height: SIZE }}
          onPointerDown={(e) => {
            dragging.current = true;
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            pick(e);
          }}
          onPointerMove={(e) => dragging.current && pick(e)}
          onPointerUp={() => (dragging.current = false)}
        />
      </div>
      <div className="cw-row">
        <span className="cw-hex">{value}</span>
        <input
          type="range"
          min={28}
          max={72}
          value={hsl[2]}
          onChange={(e) => {
            const next: HSL = [hsl[0], hsl[1], Number(e.target.value)];
            setHsl(next);
            onChange(hslToHex(next));
          }}
        />
        <span className="cw-chip" style={{ background: value }} />
      </div>
    </div>
  );
}
