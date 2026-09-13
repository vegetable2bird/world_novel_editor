import type { WorldBundle } from '../../store/types';
import {
  ENTITY_TYPE_LABELS,
  ENTITY_TYPE_ORDER,
} from '../../constants/worldTemplates';
import { truncateToWords } from '../../utils/text';

/**
 * 上下文组装器（Context Assembler）。
 *
 * 职责：从世界状态中筛选"与本章相关"的设定，组装为 contextBlock（三段式 段1）。
 * v1 采用"相关性打分 + 截断"策略（不做向量检索，P1 升级）：
 *   - inContext=true 的实体权重最高（Lorebook 开关）；
 *   - 活跃伏笔次之；
 *   - 近期事件作为时间线定位；
 * 超过字数预算时按预算截断。
 */
export interface AssembleContextOptions {
  maxWords?: number;
  /** 目标作品（卷）id；提供时并入该作品「出场角色」摘要，使生成聚焦本卷人物 */
  bookId?: string;
}

export function assembleContext(
  bundle: WorldBundle,
  opts?: AssembleContextOptions,
): string {
  const maxWords = opts?.maxWords ?? 2500;
  const sections: string[] = [];

  // 1) 实体：inContext 优先，按类型分组
  const inCtx = Object.values(bundle.entities).filter((e) => e.inContext);
  const outCtx = Object.values(bundle.entities).filter((e) => !e.inContext);
  const lines: string[] = [];
  for (const type of ENTITY_TYPE_ORDER) {
    const group = inCtx.filter((e) => e.type === type);
    if (group.length === 0) continue;
    lines.push(`【${ENTITY_TYPE_LABELS[type]}】`);
    for (const e of group) {
      const fields = Object.entries(e.fields)
        .filter(([, v]) => v !== '' && v != null)
        .map(([k, v]) => `${k}: ${v}`)
        .join('；');
      lines.push(`- ${e.name}${e.summary ? `（${e.summary}）` : ''}${fields ? `｜${fields}` : ''}`);
    }
  }
  if (lines.length) {
    sections.push('## 核心实体（纳入上下文）\n' + lines.join('\n'));
  }

  if (outCtx.length > 0) {
    const names = outCtx
      .map((e) => `${e.name}(${ENTITY_TYPE_LABELS[e.type]})`)
      .join('、');
    sections.push(`## 背景实体（未纳入上下文）\n${names}`);
  }

  // 2) 关系
  if (Object.keys(bundle.relations).length > 0) {
    const relLines = Object.values(bundle.relations).map((r) => {
      const s = bundle.entities[r.sourceId]?.name ?? r.sourceId;
      const t = bundle.entities[r.targetId]?.name ?? r.targetId;
      return `- ${s} —[${r.type}]→ ${t}`;
    });
    sections.push('## 关系脉络\n' + relLines.join('\n'));
  }

  // 3) 伏笔（活跃优先）
  const activeFs = Object.values(bundle.foreshadows).filter(
    (f) => f.status !== 'resolved',
  );
  if (activeFs.length > 0) {
    const fsLines = activeFs
      .map(
        (f) =>
          `- ${f.title}（${f.status}）${f.note ? `：${f.note}` : ''}`,
      )
      .join('\n');
    sections.push('## 待回收伏笔\n' + fsLines);
  }

  // 4) 近期事件（最多 8 条）
  const recent = Object.values(bundle.timelineEvents)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);
  if (recent.length > 0) {
    const evLines = recent
      .map(
        (e) =>
          `- [${e.era ?? ''}${e.year ?? ''}·${e.season ?? ''}] ${e.title}：${e.description}`,
      )
      .join('\n');
    sections.push('## 近期事件\n' + evLines);
  }

  // 5) 当前世界状态变量
  const vars = Object.values(bundle.variables);
  if (vars.length > 0) {
    const vLines = vars
      .map((v) => `- ${v.name}：${v.value}${v.unit ? v.unit : ''}`)
      .join('\n');
    sections.push('## 世界状态变量\n' + vLines);
  }

  // 6) 本卷出场角色（提供 bookId 时）：画像 + 当前心情，帮助 AI 把握人物状态
  const charSection = buildCastSection(bundle, opts?.bookId);
  if (charSection) {
    sections.push(charSection);
  }

  const text = sections.join('\n\n');
  return truncateToWords(text, maxWords);
}

/**
 * 组装「本卷出场角色」段落：列出指定作品（卷）内所有角色卡，
 * 含其画像要点与当前心情基调，供 AI 生成时把握人物塑造。
 */
export function buildCastSection(
  bundle: WorldBundle,
  bookId?: string,
): string | null {
  if (!bookId) return null;
  const cast = Object.values(bundle.characterInstances).filter(
    (c) => c.bookId === bookId,
  );
  if (cast.length === 0) return null;

  // 预计算跨书出演：registryId -> 除本卷外的出演卷名集合（用于联动附注）
  const bookNames = new Map(Object.entries(bundle.books).map(([id, b]) => [id, b.name]));
  const crossBooksByRegistry = new Map<string, Set<string>>();
  for (const c of Object.values(bundle.characterInstances)) {
    if (!c.registryId || c.bookId === bookId) continue;
    const s = crossBooksByRegistry.get(c.registryId) ?? new Set<string>();
    s.add(bookNames.get(c.bookId) ?? c.bookId);
    crossBooksByRegistry.set(c.registryId, s);
  }

  const lines = cast.map((c) => {
    const portrait = Object.entries(c.portrait ?? {})
      .filter(([, v]) => v !== '' && v != null)
      .map(([k, v]) => `${k}: ${v}`)
      .join('；');
    const mood = c.currentMood ? `｜当前心情：${c.currentMood}` : '';
    // 跨书出演附注：提醒 AI 该角色还在其他卷出场，需保持人物跨书一致
    let cross = '';
    const others = c.registryId ? crossBooksByRegistry.get(c.registryId) : undefined;
    if (others && others.size > 0) {
      cross = `｜跨书出演：${[...others].join('、')}`;
    }
    return `- ${c.name}（${c.status}）${portrait ? `｜${portrait}` : ''}${mood}${cross}`;
  });
  return `## 本卷出场角色\n${lines.join('\n')}`;
}
