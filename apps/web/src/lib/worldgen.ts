/**
 * worldgen —— 万象随机地图生成器（v18 区域平铺版）
 * 抖动网格布点 + Voronoi 半平面裁剪 → 无缝相邻的区域拼图（GeoJSON）
 * 全部确定性：同 seed + 同参数 ⇒ 同地图，因此落库只存参数不存几何。
 */

export interface GenParams {
  seed: number;
  /** 区域数量 4–28 */
  regions: number;
  /** 不规则度 0–1（布点抖动） */
  jitter: number;
  /** @deprecated v18 起不再参与生成，仅为兼容旧存档保留 */
  sea?: number;
  /** @deprecated v18 起不再参与生成，仅为兼容旧存档保留 */
  freq?: number;
  /** @deprecated v17 及更早的字段，保留兼容 */
  mount?: number;
  /** @deprecated v17 及更早的字段，保留兼容 */
  forest?: number;
}

export interface RegionInfo {
  centroid: [number, number];
}

export interface GenResult {
  geo: { type: 'FeatureCollection'; features: unknown[] };
  regions: RegionInfo[];
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

type Pt = [number, number];

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/* ---------- 布点：抖动网格（覆盖均匀 + 可控随机） ---------- */
function scatterSites(n: number, jitter: number, rng: () => number): Pt[] {
  const cols = Math.ceil(Math.sqrt((n * GW) / GH));
  const rows = Math.ceil(n / cols);
  const cw = GW / cols;
  const ch = GH / rows;
  const cells: Pt[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push([
        (c + 0.5) * cw + (rng() - 0.5) * cw * 1.35 * jitter,
        (r + 0.5) * ch + (rng() - 0.5) * ch * 1.35 * jitter,
      ]);
    }
  }
  // Fisher–Yates 洗牌后取前 n 个（网格数 ≥ n）
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells.slice(0, n).map((p) => [clamp(p[0], 1, GW - 1), clamp(p[1], 1, GH - 1)]);
}

/* ---------- 半平面裁剪（Sutherland–Hodgman） ---------- */
function clipHalfPlane(poly: Pt[], s: Pt, t: Pt): Pt[] {
  // 保留 |p-s|² <= |p-t|² 的一侧：2p·(t-s) <= |t|²-|s|²
  const dx = t[0] - s[0];
  const dy = t[1] - s[1];
  const c = t[0] * t[0] + t[1] * t[1] - s[0] * s[0] - s[1] * s[1];
  const f = (p: Pt) => 2 * (p[0] * dx + p[1] * dy) - c; // <= 0 保留
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const fa = f(a);
    const fb = f(b);
    if (fa <= 0) out.push(a);
    if ((fa <= 0) !== (fb <= 0)) {
      const k = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
    }
  }
  return out;
}

function polygonArea(poly: Pt[]) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(s) / 2;
}

/** 网格坐标 → GeoJSON 坐标（y 翻转） */
function toGeo(p: Pt): [number, number] {
  return [+p[0].toFixed(3), +(GH - p[1]).toFixed(3)];
}

/* ---------- 主入口 ---------- */
export function generate(p: GenParams): GenResult {
  const rng = mulberry32(p.seed);
  const n = clamp(Math.round(p.regions) || 12, 4, 28);
  const jitter = clamp(p.jitter, 0, 1);
  const sites = scatterSites(n, jitter, rng);

  const rect: Pt[] = [
    [0, 0],
    [GW, 0],
    [GW, GH],
    [0, GH],
  ];

  const features: unknown[] = [];
  const regions: RegionInfo[] = [];
  for (let i = 0; i < sites.length; i++) {
    let poly = rect;
    for (let j = 0; j < sites.length && poly.length; j++) {
      if (j === i) continue;
      poly = clipHalfPlane(poly, sites[i], sites[j]);
    }
    if (poly.length < 3 || polygonArea(poly) < 1.5) continue;
    // 闭合环（GeoJSON 要求首尾同点）
    const ring = [...poly.map(toGeo), toGeo(poly[0])];
    const name = 'r' + regions.length;
    features.push({
      type: 'Feature',
      properties: { name },
      geometry: { type: 'Polygon', coordinates: [ring] },
    });
    let sx = 0, sy = 0;
    for (const q of poly) { sx += q[0]; sy += q[1]; }
    regions.push({ centroid: [sx / poly.length, GH - sy / poly.length] });
  }

  return { geo: { type: 'FeatureCollection', features }, regions };
}

/* ---------- 区域名 ---------- */
const NAME_POOL = [
  '苍岚', '曜金', '碧落', '玄霄', '赤野', '云梦', '青丘', '白露',
  '丹枫', '寒汀', '沉璧', '扶桑', '栖霞', '临渊', '望舒', '北辰',
  '南离', '西岐', '天墟', '沧澜', '霁月', '流火', '未央', '长乐',
  '桃源', '昆仑', '蓬莱', '琅嬛',
];
export function defaultRegionNames(n: number): string[] {
  return Array.from({ length: n }, (_, i) => NAME_POOL[i % NAME_POOL.length] + '洲');
}

/** 兼容旧版参数：缺省补默认 */
export function normalizeParams(p: Partial<GenParams> | undefined): GenParams {
  return { seed: 42, regions: 12, jitter: 0.6, ...p };
}
