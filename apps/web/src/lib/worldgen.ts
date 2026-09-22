/**
 * worldgen —— 万象随机地图生成器（v17 轻量版）
 * 种子化值噪声高度场 → 单次等值线描出各洲轮廓 → GeoJSON（registerMap 给 ECharts）
 * 全部确定性：同 seed + 同参数 ⇒ 同地图，因此落库只存参数不存几何。
 * 只画陆地洲块（浅色区块风），水域/植被等分层地势已移除，改用文字描述。
 */

export interface GenParams {
  seed: number;
  /** 海平面 0.3–0.6 */
  sea: number;
  /** 碎片化（噪声频率）0.5–3.0，越大越破碎 */
  freq: number;
  /** @deprecated v17 起不再参与生成，仅为兼容旧存档保留 */
  mount?: number;
  /** @deprecated v17 起不再参与生成，仅为兼容旧存档保留 */
  forest?: number;
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
      // 边缘轻微下压，避免陆地顶满边界
      const ex = Math.min(x / GW, 1 - x / GW);
      const ey = Math.min(y / GH, 1 - y / GH);
      const edge = clamp01(Math.min(ex, ey) * 6);
      g[y * GW + x] = clamp01((base * 1.04 + 0.03) * (0.55 + 0.45 * edge));
    }
  }
  return g;
}

/* ---------- 移动正方形等值线（只跑一次：海平面） ---------- */
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

/** 环面积（带符号，仅用于判别尺寸） */
function ringArea(r: Pt[]) {
  let s = 0;
  for (let i = 0; i < r.length - 1; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
  return Math.abs(s) / 2;
}

/** 射线法：点是否在环内 */
function pointInRing(pt: Pt, ring: Pt[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/* ---------- 主入口 ---------- */
export function generate(p: GenParams): GenResult {
  const h = buildHeight(p);
  const padW = GW + 2;
  const padH = GH + 2;
  const pad = new Float32Array(padW * padH).fill(-1);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) pad[(y + 1) * padW + (x + 1)] = h[y * GW + x];

  /* 洲：陆地连通域（在 pad 栅格上直接 BFS，顺便拿 contId 给轮廓归属） */
  const contId = new Int32Array(padW * padH).fill(-1);
  const raw: { cells: number; sx: number; sy: number }[] = [];
  const DIRS = [1, -1, padW, -padW];
  for (let i = 0; i < padW * padH; i++) {
    if (pad[i] < p.sea || contId[i] !== -1) continue;
    const id = raw.length;
    const stack = [i];
    contId[i] = id;
    let cells = 0, sx = 0, sy = 0;
    while (stack.length) {
      const cur = stack.pop()!;
      const cx = cur % padW;
      const cy = (cur / padW) | 0;
      cells++; sx += cx; sy += cy;
      for (const d of DIRS) {
        const ni = cur + d;
        if (ni < 0 || ni >= padW * padH) continue;
        if ((d === 1 && cx === padW - 1) || (d === -1 && cx === 0)) continue;
        if (pad[ni] >= p.sea && contId[ni] === -1) {
          contId[ni] = id;
          stack.push(ni);
        }
      }
    }
    raw.push({ cells, sx, sy });
  }

  // 过滤碎屿并按面积排序
  const order = raw
    .map((r, id) => ({ id, ...r }))
    .filter((r) => r.cells >= 10)
    .sort((a, b) => b.cells - a.cells);
  const remap = new Map<number, number>();
  order.forEach((r, idx) => remap.set(r.id, idx));

  const continents: ContinentInfo[] = order.map((r) => ({
    centroid: [+(r.sx / r.cells - 1).toFixed(1), +(GH - (r.sy / r.cells - 1)).toFixed(1)],
    cells: r.cells,
  }));

  /* 等值线 → 每洲一个 MultiPolygon（含湖洞） */
  const loops = contour(pad, padW, padH, p.sea);
  const probe = (r: Pt[]): Pt => {
    let sx = 0, sy = 0;
    for (const q of r) { sx += q[0]; sy += q[1]; }
    return [sx / r.length, sy / r.length];
  };

  interface Ring { loop: Pt[]; probe: Pt; cont: number }
  const outers: Ring[] = [];
  const holes: Ring[] = [];
  for (const loop of loops) {
    if (ringArea(loop) < 0.4) continue; // 碎屑
    const pb = probe(loop);
    const cx = Math.min(padW - 1, Math.max(0, Math.floor(pb[0])));
    const cy = Math.min(padH - 1, Math.max(0, Math.floor(pb[1])));
    const cid = contId[cy * padW + cx];
    if (cid === -1 || !remap.has(cid)) {
      holes.push({ loop, probe: pb, cont: -1 }); // 湖中洞（不在任何洲的陆上）
    } else if (pad[cy * padW + cx] >= p.sea) {
      outers.push({ loop, probe: pb, cont: remap.get(cid)! });
    } else {
      holes.push({ loop, probe: pb, cont: remap.get(cid)! });
    }
  }

  const features: unknown[] = [];
  for (let idx = 0; idx < continents.length; idx++) {
    const mine = outers.filter((o) => o.cont === idx);
    if (!mine.length) continue;
    const polys: number[][][][] = [];
    for (const o of mine) {
      const inner = holes
        .filter((hh) => (hh.cont === idx || hh.cont === -1) && pointInRing(hh.probe, o.loop))
        .map((hh) => hh.loop.map(toGeo));
      polys.push([o.loop.map(toGeo), ...inner]);
    }
    features.push({
      type: 'Feature',
      properties: { name: 'c' + idx },
      geometry: { type: 'MultiPolygon', coordinates: polys },
    });
  }

  return { geo: { type: 'FeatureCollection', features }, continents };
}

/* ---------- 洲名 ---------- */
const NAME_POOL = ['苍岚', '曜金', '碧落', '玄霄', '赤野', '云梦', '青丘', '白露', '丹枫', '寒汀', '沉璧', '扶桑'];
export function defaultRegionNames(n: number): string[] {
  return Array.from({ length: n }, (_, i) => NAME_POOL[i % NAME_POOL.length] + '洲');
}
