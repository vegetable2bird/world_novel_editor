/**
 * worldgen —— 万象随机地图生成器
 * 种子化值噪声高度场 → 移动正方形等值线 → GeoJSON（可直接 registerMap 给 ECharts）
 * 全部确定性：同 seed + 同参数 ⇒ 同地图，因此落库只存参数不存几何。
 */

export interface GenParams {
  seed: number;
  /** 海平面 0.3–0.6 */
  sea: number;
  /** 碎片化（噪声频率）0.5–3.0，越大越破碎 */
  freq: number;
  /** 山脉强度 0–1 */
  mount: number;
  /** 森林覆盖 0–1 */
  forest: number;
}

export interface ContinentInfo {
  centroid: [number, number];
  cells: number;
}

export interface GenResult {
  geo: { type: 'FeatureCollection'; features: unknown[] };
  continents: ContinentInfo[];
}

export const GW = 110;
export const GH = 74;

/* ---------- PRNG ---------- */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(ix: number, iy: number, seed: number) {
  let h = seed + ix * 374761393 + iy * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

function vnoise(x: number, y: number, seed: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

function fbm(x: number, y: number, seed: number, oct = 4) {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    v += amp * vnoise(x * f, y * f, seed + i * 131);
    amp *= 0.5;
    f *= 2.1;
  }
  return v / 0.9375;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ---------- 高度场 ---------- */
function buildHeight(p: GenParams): Float32Array {
  const g = new Float32Array(GW * GH);
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const nx = (x / GW) * p.freq * 3;
      const ny = (y / GH) * p.freq * 3;
      const base = fbm(nx, ny, p.seed);
      const rg = 1 - Math.abs(2 * fbm(nx * 1.9 + 31.7, ny * 1.9 + 11.3, p.seed + 911) - 1);
      // 边缘轻微下压，避免陆地顶满边界
      const ex = Math.min(x / GW, 1 - x / GW);
      const ey = Math.min(y / GH, 1 - y / GH);
      const edge = clamp01(Math.min(ex, ey) * 6);
      g[y * GW + x] = clamp01((base * 0.72 + rg * rg * p.mount * 0.62 - 0.08) * (0.55 + 0.45 * edge));
    }
  }
  return g;
}

/* ---------- 移动正方形等值线 ---------- */
type Pt = [number, number];

function contour(grid: Float32Array, w: number, h: number, t: number): Pt[][] {
  const segs: [Pt, Pt][] = [];
  const val = (x: number, y: number) => grid[y * w + x];
  const lerp = (x1: number, y1: number, x2: number, y2: number) => {
    const v1 = val(x1, y1);
    const v2 = val(x2, y2);
    const k = (t - v1) / (v2 - v1 || 1e-9);
    return [x1 + (x2 - x1) * k, y1 + (y2 - y1) * k] as Pt;
  };
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const a = val(x, y) >= t ? 8 : 0; // 左上
      const b = val(x + 1, y) >= t ? 4 : 0; // 右上
      const c = val(x + 1, y + 1) >= t ? 2 : 0; // 右下
      const d = val(x, y + 1) >= t ? 1 : 0; // 左下
      const cs = a | b | c | d;
      if (cs === 0 || cs === 15) continue;
      const top = lerp(x, y, x + 1, y);
      const right = lerp(x + 1, y, x + 1, y + 1);
      const bottom = lerp(x, y + 1, x + 1, y + 1);
      const left = lerp(x, y, x, y + 1);
      const add = (p1: Pt, p2: Pt) => segs.push([p1, p2]);
      switch (cs) {
        case 1: case 14: add(left, bottom); break;
        case 2: case 13: add(bottom, right); break;
        case 3: case 12: add(left, right); break;
        case 4: case 11: add(top, right); break;
        case 6: case 9: add(top, bottom); break;
        case 7: case 8: add(left, top); break;
        case 5: add(left, top); add(bottom, right); break;
        case 10: add(left, bottom); add(top, right); break;
      }
    }
  }
  // 链接成环
  const key = (p: Pt) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
  const byStart = new Map<string, [Pt, Pt][]>();
  for (const s of segs) {
    const k = key(s[0]);
    if (!byStart.has(k)) byStart.set(k, []);
    byStart.get(k)!.push(s);
  }
  const loops: Pt[][] = [];
  while (byStart.size) {
    const firstK = byStart.keys().next().value!;
    const first = byStart.get(firstK)!.pop()!;
    if (byStart.get(firstK)!.length === 0) byStart.delete(firstK);
    const ring: Pt[] = [first[0], first[1]];
    let guard = segs.length + 10;
    while (guard-- > 0) {
      const k = key(ring[ring.length - 1]);
      const list = byStart.get(k);
      if (!list || list.length === 0) break;
      const seg = list.pop()!;
      if (list.length === 0) byStart.delete(k);
      ring.push(seg[1]);
      if (key(seg[1]) === key(ring[0])) break;
    }
    if (ring.length >= 4) loops.push(ring);
  }
  return loops;
}

/** 网格坐标 → GeoJSON 坐标（y 翻转） */
function toGeo(p: Pt): [number, number] {
  return [+(p[0] - 1).toFixed(3), +(GH - (p[1] - 1)).toFixed(3)];
}

function feature(name: string, loops: Pt[][]): unknown | null {
  const polys: number[][][][] = [];
  // 简单按面积过滤碎屑
  const area = (r: Pt[]) => {
    let s = 0;
    for (let i = 0; i < r.length - 1; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
    return Math.abs(s) / 2;
  };
  const outers = loops.filter((r) => area(r) > 0.35);
  if (!outers.length) return null;
  for (const r of outers) {
    polys.push([r.map(toGeo)]);
  }
  return { type: 'Feature', properties: { name }, geometry: { type: 'MultiPolygon', coordinates: polys } };
}

/* ---------- 主入口 ---------- */
export function generate(p: GenParams): GenResult {
  const h = buildHeight(p);
  const padW = GW + 2;
  const padH = GH + 2;
  const mkPad = (src: (x: number, y: number) => number) => {
    const g = new Float32Array(padW * padH).fill(-1);
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) g[(y + 1) * padW + (x + 1)] = src(x, y);
    return g;
  };

  const tDeep = 0;
  const tSea = p.sea - 0.14;
  const tLand = p.sea;
  const tBeach = p.sea + 0.012;
  const tRock = 0.6;
  const tSnow = 0.8;
  const ft = 1 - p.forest * 0.55;

  const forestNoise = (x: number, y: number) => fbm((x / GW) * p.freq * 5 + 77, (y / GH) * p.freq * 5 + 41, p.seed + 4242, 3);

  const grids: [string, Float32Array, number][] = [
    ['deep', mkPad((x, y) => h[y * GW + x]), tDeep],
    ['sea', mkPad((x, y) => h[y * GW + x]), tSea],
    ['beach', mkPad((x, y) => h[y * GW + x]), tLand],
    ['grass', mkPad((x, y) => h[y * GW + x]), tBeach],
    ['forest', mkPad((x, y) => (h[y * GW + x] >= p.sea && forestNoise(x, y) >= ft ? 1 : -1)), 0],
    ['rock', mkPad((x, y) => h[y * GW + x]), tRock],
    ['snow', mkPad((x, y) => h[y * GW + x]), tSnow],
  ];

  const features: unknown[] = [];
  for (const [name, g, t] of grids) {
    const f = feature(name, contour(g, padW, padH, t));
    if (f) features.push(f);
  }

  // 洲：陆地连通域
  const land = new Uint8Array(GW * GH);
  for (let i = 0; i < GW * GH; i++) land[i] = h[i] >= p.sea ? 1 : 0;
  const seen = new Uint8Array(GW * GH);
  const continents: ContinentInfo[] = [];
  const DIRS = [1, -1, GW, -GW];
  for (let i = 0; i < GW * GH; i++) {
    if (!land[i] || seen[i]) continue;
    const stack = [i];
    seen[i] = 1;
    let cells = 0;
    let sx = 0;
    let sy = 0;
    while (stack.length) {
      const cur = stack.pop()!;
      const cx = cur % GW;
      const cy = (cur / GW) | 0;
      cells++;
      sx += cx;
      sy += cy;
      for (const d of DIRS) {
        const ni = cur + d;
        if (ni < 0 || ni >= GW * GH) continue;
        if ((d === 1 && cx === GW - 1) || (d === -1 && cx === 0)) continue;
        if (land[ni] && !seen[ni]) {
          seen[ni] = 1;
          stack.push(ni);
        }
      }
    }
    if (cells >= 14) continents.push({ centroid: [sx / cells, GH - sy / cells], cells });
  }
  continents.sort((a, b) => b.cells - a.cells);

  return { geo: { type: 'FeatureCollection', features }, continents };
}

/* ---------- 洲名 ---------- */
const NAME_POOL = ['苍岚', '曜金', '碧落', '玄霄', '赤野', '云梦', '青丘', '白露', '丹枫', '寒汀', '沉璧', '扶桑'];
export function defaultRegionNames(n: number): string[] {
  return Array.from({ length: n }, (_, i) => NAME_POOL[i % NAME_POOL.length] + '洲');
}
