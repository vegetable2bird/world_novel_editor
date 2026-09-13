import type { WorldBundle } from '../../store/types';
import { newId } from '../../utils/id';

/**
 * 叙事推演引擎（Plot Suggestion Engine）。
 *
 * 基于"世界状态 + 作品进度 + 近期章节/事件/伏笔/操作走向"给出若干叙事分支建议，
 * 供作者在操作台圈定后驱动 AI 生成。
 *
 * 设计原则（延续架构 Open Item O7）：采用确定性规则 + 模板，不额外调用 LLM，
 * 保证低成本、可解释、可复现；推演结果再喂给生成 LLM 产出正文，避免"黑盒"。
 */

/** 分支来源（决定排序优先级与文案口吻） */
export type PlotSeed =
  | 'direction'
  | 'foreshadow'
  | 'event'
  | 'variable'
  | 'progress';

/** 一条叙事分支建议 */
export interface PlotBranch {
  id: string;
  /** 章节标题建议 */
  title: string;
  /** 一句话梗概 / 大纲 */
  outline: string;
  /** 为何推荐这条走向（可解释性） */
  rationale: string;
  /** 来源类别 */
  seed: PlotSeed;
  /** 建议落点：第几章 */
  suggestedIndex: number;
}

export interface SuggestPlotOptions {
  /** 最多返回几条建议，默认 4 */
  count?: number;
}

/** 推荐分支的优先级（数值越小越靠前） */
const SEED_PRIORITY: Record<PlotSeed, number> = {
  direction: 0,
  foreshadow: 1,
  event: 2,
  variable: 3,
  progress: 4,
};

/**
 * 生成叙事分支建议。
 * @param bundle 当前世界数据聚合
 * @param bookId 目标作品（卷）id；为 undefined 时退化为"整世界"视角
 * @param opts.count 期望返回条数（默认 4）
 */
export function suggestPlotBranches(
  bundle: WorldBundle,
  bookId: string | undefined,
  opts?: SuggestPlotOptions,
): PlotBranch[] {
  const count = opts?.count ?? 4;
  const book = bookId ? bundle.books[bookId] : undefined;
  const chaptersInBook = Object.values(bundle.chapters)
    .filter((c) => c.bookId === book?.id)
    .sort((a, b) => a.index - b.index);
  const writtenCount = chaptersInBook.length;
  const nextIndex =
    writtenCount > 0
      ? Math.max(...chaptersInBook.map((c) => c.index)) + 1
      : 1;

  const candidates: PlotBranch[] = [];

  // 1) 上一步操作推演的候选走向
  const directions = bundle.lastOperationResult?.proposedDirections ?? [];
  for (const d of directions) {
    candidates.push({
      id: newId('plot'),
      title: `走向·${d.label}`,
      outline: d.estimatedSummary || d.description,
      rationale: '承接上一步操作推演推荐的后续走向。',
      seed: 'direction',
      suggestedIndex: nextIndex,
    });
  }

  // 2) 待回收伏笔
  const activeFs = Object.values(bundle.foreshadows).filter(
    (f) => f.status !== 'resolved',
  );
  for (const f of activeFs) {
    candidates.push({
      id: newId('plot'),
      title: `回收伏笔·${f.title}`,
      outline: f.note
        ? `围绕「${f.title}」展开：${f.note}`
        : `推进并回收伏笔「${f.title}」。`,
      rationale: '该伏笔仍处于活跃状态，适宜在本章回收或推进。',
      seed: 'foreshadow',
      suggestedIndex: nextIndex,
    });
  }

  // 3) 近期事件余波
  const recentEvents = Object.values(bundle.timelineEvents)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 2);
  for (const ev of recentEvents) {
    candidates.push({
      id: newId('plot'),
      title: `余波·${ev.title}`,
      outline: `承接「${ev.title}」的后续影响：${ev.description}`,
      rationale: '由近期世界事件自然衍生的叙事方向。',
      seed: 'event',
      suggestedIndex: nextIndex,
    });
  }

  // 4) 世界状态变量趋势
  const vars = Object.values(bundle.variables);
  if (vars.length > 0) {
    let extreme = vars[0];
    let extremeScore = -Infinity;
    for (const v of vars) {
      const min = v.min ?? v.value - 1;
      const max = v.max ?? v.value + 1;
      const range = max - min;
      const score = range > 0 ? Math.abs((v.value - min) / range - 0.5) : 0;
      if (score > extremeScore) {
        extremeScore = score;
        extreme = v;
      }
    }
    const mid = ((extreme.max ?? extreme.value + 1) + (extreme.min ?? extreme.value - 1)) / 2;
    const trend = extreme.value >= mid ? '逼近高位' : '跌至低位';
    candidates.push({
      id: newId('plot'),
      title: `局势·${extreme.name}${trend}`,
      outline: `世界状态中「${extreme.name}」${trend}（当前 ${extreme.value}${extreme.unit ?? ''}），由其牵引出新的矛盾或转机。`,
      rationale: '基于世界状态变量的极值趋势推演。',
      seed: 'variable',
      suggestedIndex: nextIndex,
    });
  }

  // 5) 作品进度（开篇 / 中段 / 收束）
  if (writtenCount === 0) {
    candidates.push({
      id: newId('plot'),
      title: '开篇·立锚',
      outline: `作为《${book?.name ?? '本作'}》首章，建立世界锚点与核心冲突的引子。`,
      rationale: '作品尚无一章，建议以开篇立纲。',
      seed: 'progress',
      suggestedIndex: 1,
    });
  } else if (writtenCount >= 6) {
    candidates.push({
      id: newId('plot'),
      title: '收束·汇流',
      outline: `已撰写 ${writtenCount} 章，宜让多条线索在此汇流、推向转折或收束。`,
      rationale: '作品已至中后段，建议安排转折或收束。',
      seed: 'progress',
      suggestedIndex: nextIndex,
    });
  } else if (writtenCount >= 3) {
    candidates.push({
      id: newId('plot'),
      title: '中段·深化',
      outline: `已撰写 ${writtenCount} 章，宜深化人物动机与世界矛盾，避免平铺。`,
      rationale: '作品进入中段，建议深化冲突。',
      seed: 'progress',
      suggestedIndex: nextIndex,
    });
  }

  // 去重（同标题只保留首条）+ 保序
  const seen = new Set<string>();
  const deduped = candidates.filter((c) => {
    if (seen.has(c.title)) return false;
    seen.add(c.title);
    return true;
  });

  // 按来源优先级排序，再按建议落点
  deduped.sort(
    (a, b) =>
      SEED_PRIORITY[a.seed] - SEED_PRIORITY[b.seed] ||
      a.suggestedIndex - b.suggestedIndex,
  );

  return deduped.slice(0, Math.max(1, count));
}
