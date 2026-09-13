/**
 * 跨书联动引擎（v2 P4）。
 *
 * 纯函数，输入 WorldBundle，输出跨书一致性报告。不依赖 store、不调 LLM，
 * 结果确定性可重现，便于单元测试与 UI 直接消费。
 *
 * 关联轴：CharacterInstance.registryId（P3 引入的跨书关联字段）。
 *
 * 当前覆盖两类最易在「多书同世界观」下出错的跨书不一致：
 *  1. 角色名不一致：某卷化身名与总库名不同（可能手误或本卷有意为之，给 info 级提醒）。
 *  2. 角色状态冲突：同一角色在卷 A 标记为「登场(active)」、在卷 B 标记为「暂离场(offstage)」，
 *     跨书状态可能自相矛盾（warning）。
 */

import type { WorldBundle } from '../../store/types';
import type { CharacterInstance } from '../../types/character';
import type {
  CharacterBookAppearance,
  CharacterContinuityRow,
  ConflictOccurrence,
  CrossBookConflict,
  CrossBookReport,
} from '../../types/crossBook';

const STATUS_LABELS: Record<CharacterInstance['status'], string> = {
  active: '登场',
  minor: '配角',
  offstage: '暂离场',
};

/** 取某角色卡的最新一条心情（无则 undefined） */
function latestMoodOf(
  bundle: WorldBundle,
  instanceId: string,
): string | undefined {
  let latest: { mood: string; createdAt: string } | undefined;
  for (const e of Object.values(bundle.moodEntries)) {
    if (e.characterInstanceId !== instanceId) continue;
    if (!latest || e.createdAt > latest.createdAt) {
      latest = { mood: e.mood, createdAt: e.createdAt };
    }
  }
  return latest?.mood;
}

/** 取 world.books 的 id->name 映射 */
function bookNameMap(bundle: WorldBundle): Map<string, string> {
  return new Map(Object.entries(bundle.books).map(([id, b]) => [id, b.name]));
}

/** 按 registryId 聚合所有带关联的角色卡（跳过无 registryId 的原创角色） */
function groupInstancesByRegistry(
  bundle: WorldBundle,
): Map<string, CharacterInstance[]> {
  const byRegistry = new Map<string, CharacterInstance[]>();
  for (const inst of Object.values(bundle.characterInstances)) {
    if (!inst.registryId) continue;
    const arr = byRegistry.get(inst.registryId) ?? [];
    arr.push(inst);
    byRegistry.set(inst.registryId, arr);
  }
  return byRegistry;
}

/**
 * 跨书冲突检测：返回所有命中冲突的条目（确定性顺序：先按类型，再按总库名）。
 */
export function detectCrossBookConflicts(
  bundle: WorldBundle,
): CrossBookConflict[] {
  const conflicts: CrossBookConflict[] = [];
  const worldId = bundle.world.id;
  const bookNames = bookNameMap(bundle);
  const byRegistry = groupInstancesByRegistry(bundle);

  for (const [registryId, insts] of byRegistry) {
    const reg = bundle.characterRegistry[registryId];
    if (!reg) continue; // 孤立化身（总库已删）：无对照基准，跳过

    // 1) 角色名不一致：化身名与总库名不同，且非 fallback「未命名角色」、非空
    const mismatched = insts.filter(
      (i) =>
        i.name.trim() !== '' &&
        i.name !== '未命名角色' &&
        i.name.trim() !== reg.name.trim(),
    );
    if (mismatched.length > 0) {
      const occurrences: ConflictOccurrence[] = mismatched.map((i) => ({
        bookId: i.bookId,
        bookName: bookNames.get(i.bookId) ?? i.bookId,
        value: i.name,
      }));
      conflicts.push({
        id: `character_name:${registryId}`,
        type: 'character_name',
        severity: 'info',
        worldId,
        subjectKey: registryId,
        subjectLabel: reg.name,
        description: `角色「${reg.name}」有 ${mismatched.length} 处化身名与总库不一致。`,
        occurrences,
        hint: '建议将各卷化身名统一为总库名，或确认本卷改名是有意为之。',
      });
    }

    // 2) 角色状态冲突：同时出现「登场(active)」与「暂离场(offstage)」
    const statuses = new Set(insts.map((i) => i.status));
    if (statuses.has('active') && statuses.has('offstage')) {
      const occurrences: ConflictOccurrence[] = insts.map((i) => ({
        bookId: i.bookId,
        bookName: bookNames.get(i.bookId) ?? i.bookId,
        value: STATUS_LABELS[i.status],
      }));
      conflicts.push({
        id: `character_status:${registryId}`,
        type: 'character_status',
        severity: 'warning',
        worldId,
        subjectKey: registryId,
        subjectLabel: reg.name,
        description: `角色「${reg.name}」同时有卷标记为「登场」与「暂离场」，跨书状态可能矛盾。`,
        occurrences,
        hint: '请确认角色在不同卷中的出场状态是否自洽（如某卷已退场，另一卷是否应同步）。',
      });
    }
  }

  conflicts.sort((a, b) =>
    a.type === b.type
      ? a.subjectLabel.localeCompare(b.subjectLabel)
      : a.type.localeCompare(b.type),
  );
  return conflicts;
}

/**
 * 跨书角色联动矩阵：按总库角色聚合其在各卷的出演信息。
 * 仅包含「有带关联化身」的总库角色；孤立化身（总库已删）跳过。
 */
export function buildCharacterContinuity(
  bundle: WorldBundle,
): CharacterContinuityRow[] {
  const bookNames = bookNameMap(bundle);
  const byRegistry = groupInstancesByRegistry(bundle);
  const conflictedSet = new Set(
    detectCrossBookConflicts(bundle).map((c) => c.subjectKey),
  );

  const rows: CharacterContinuityRow[] = [];
  for (const [registryId, insts] of byRegistry) {
    const reg = bundle.characterRegistry[registryId];
    if (!reg) continue;

    const appearances: CharacterBookAppearance[] = insts
      .map((inst) => ({
        bookId: inst.bookId,
        bookName: bookNames.get(inst.bookId) ?? inst.bookId,
        instanceId: inst.id,
        status: inst.status,
        latestMood: latestMoodOf(bundle, inst.id),
      }))
      .sort((a, b) => a.bookName.localeCompare(b.bookName));

    rows.push({
      registryId,
      name: reg.name,
      archetype: reg.archetype,
      appearances,
      conflicted: conflictedSet.has(registryId),
    });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * 组装世界级跨书联动报告：冲突列表 + 联动矩阵 + 统计。
 */
export function buildCrossBookReport(bundle: WorldBundle): CrossBookReport {
  const rows = buildCharacterContinuity(bundle);
  const conflicts = detectCrossBookConflicts(bundle);
  return {
    rows,
    conflicts,
    bookCount: Object.keys(bundle.books).length,
    characterCount: Object.keys(bundle.characterRegistry).length,
    crossBookCharacterCount: rows.filter((r) => r.appearances.length >= 2).length,
  };
}
