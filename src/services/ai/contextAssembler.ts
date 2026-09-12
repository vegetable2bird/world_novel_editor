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

  const text = sections.join('\n\n');
  return truncateToWords(text, maxWords);
}
