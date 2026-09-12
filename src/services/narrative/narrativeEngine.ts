import type { Operation, OperationResult, DirectionOption } from '../../types/console';
import type { TimelineEvent } from '../../types/timeline';
import type { WorldBundle } from '../../store/types';
import { newId, nowISO } from '../../utils/id';

/**
 * 轻量叙事推演引擎（规则 + 模板，不额外调用 LLM）。
 *
 * 输入：一次操作（Operation）+ 当前世界状态（WorldBundle）
 * 输出：OperationResult（叙事摘要 / 新事件 / 变量变化 / 推荐走向）
 *
 * 设计原则（架构 Open Item O7）：v1 用确定性规则+模板，保证可控、低成本、可解释；
 * 推演摘要再喂给生成 LLM 产出正文，避免"黑盒"。
 */

function entityName(bundle: WorldBundle, id: string | undefined): string {
  if (!id) return '未知目标';
  return bundle.entities[id]?.name ?? '未知目标';
}

function makeEvent(
  worldId: string,
  operationId: string,
  title: string,
  description: string,
  type: TimelineEvent['type'],
  clock: WorldBundle['clock'],
): TimelineEvent {
  return {
    id: newId('ev'),
    worldId,
    title,
    description,
    type,
    causedByOperationId: operationId,
    era: clock.era,
    year: clock.year,
    season: clock.season,
    createdAt: nowISO(),
  };
}

/** 主入口：根据操作类型分派到对应推演器。 */
export function narrate(operation: Operation, bundle: WorldBundle): OperationResult {
  switch (operation.kind) {
    case 'dispatch':
      return narrateDispatch(operation, bundle);
    case 'advanceTime':
      return narrateAdvanceTime(operation, bundle);
    case 'triggerEvent':
      return narrateTriggerEvent(operation, bundle);
    case 'adjustVariable':
      return narrateAdjustVariable(operation, bundle);
    case 'diplomacy':
      return narrateDiplomacy(operation, bundle);
    default:
      return {
        operationId: operation.id,
        narrativeSummary: `执行了操作：${operation.label}`,
        affectedEntityIds: [],
        newEvents: [],
        variableDeltas: {},
        proposedDirections: [],
      };
  }
}

function narrateDispatch(
  operation: Operation,
  bundle: WorldBundle,
): OperationResult {
  const factionId = operation.payload.factionId as string | undefined;
  const action = (operation.payload.action as string) || '行动';
  const targetId = operation.payload.targetId as string | undefined;
  const factionName = entityName(bundle, factionId);
  const targetName = entityName(bundle, targetId);

  const summary = targetId
    ? `${factionName} 奉命执行「${action}」，矛头直指 ${targetName}。`
    : `${factionName} 展开「${action}」，于暗处悄然布局。`;

  const event = makeEvent(
    bundle.world.id,
    operation.id,
    `${factionName}·${action}`,
    summary,
    'operation',
    bundle.clock,
  );

  const variableDeltas: Record<string, number> = {};
  // 调度势力通常消耗国力、提振士气
  const powerVar = Object.values(bundle.variables).find((v) => v.key === 'power');
  const moraleVar = Object.values(bundle.variables).find((v) => v.key === 'morale');
  if (powerVar) variableDeltas[powerVar.id] = -3;
  if (moraleVar) variableDeltas[moraleVar.id] = 2;

  const proposedDirections: DirectionOption[] = [
    {
      id: newId('dir'),
      label: '乘胜追击',
      description: '扩大战果，继续向目标施压。',
      estimatedSummary: `${factionName} 的攻势如潮，目标阵营陷入被动。`,
    },
    {
      id: newId('dir'),
      label: '稳固防线',
      description: '巩固既有成果，转入守势。',
      estimatedSummary: `${factionName} 暂敛锋芒，局势进入微妙僵持。`,
    },
    {
      id: newId('dir'),
      label: '外交斡旋',
      description: '暂停军事行动，寻求第三方调停。',
      estimatedSummary: `战云稍散，${targetName} 趁机喘息，暗流涌动。`,
    },
  ];

  return {
    operationId: operation.id,
    narrativeSummary: summary,
    affectedEntityIds: [factionId, targetId].filter(Boolean) as string[],
    newEvents: [event],
    variableDeltas,
    proposedDirections,
  };
}

function narrateAdvanceTime(
  operation: Operation,
  bundle: WorldBundle,
): OperationResult {
  const years = (operation.payload.years as number) || 1;
  const season = (operation.payload.season as string) || nextSeason(bundle.clock.season);

  const summary = `时光流转，世界推进 ${years} 载，时令转入${season}。`;
  const event = makeEvent(
    bundle.world.id,
    operation.id,
    `时间推进 · ${season}`,
    summary,
    'system',
    { ...bundle.clock, season },
  );

  const variableDeltas: Record<string, number> = {};
  // 时间自然流逝：民心缓慢回升，灵气随季节波动
  const moraleVar = Object.values(bundle.variables).find((v) => v.key === 'morale');
  const spiritVar = Object.values(bundle.variables).find((v) => v.key === 'spirit');
  if (moraleVar) variableDeltas[moraleVar.id] = 2;
  if (spiritVar) variableDeltas[spiritVar.id] = season === '秋' ? 3 : season === '冬' ? -2 : 1;

  const proposedDirections: DirectionOption[] = [
    {
      id: newId('dir'),
      label: '静观其变',
      description: '在平静中积蓄力量。',
      estimatedSummary: '风平浪静之下，暗藏新的变局。',
    },
    {
      id: newId('dir'),
      label: '主动出击',
      description: '趁势推动新一波行动。',
      estimatedSummary: '新的风暴在平稳表象下孕育。',
    },
  ];

  return {
    operationId: operation.id,
    narrativeSummary: summary,
    affectedEntityIds: [],
    newEvents: [event],
    variableDeltas,
    proposedDirections,
  };
}

function narrateTriggerEvent(
  operation: Operation,
  bundle: WorldBundle,
): OperationResult {
  const title = (operation.payload.title as string) || '突发事件';
  const description =
    (operation.payload.description as string) || `${title} 在世界的某个角落发生。`;
  const affected = (operation.payload.affectedEntityIds as string[] | undefined) || [];

  const summary = `事件「${title}」爆发：${description}`;
  const event = makeEvent(
    bundle.world.id,
    operation.id,
    title,
    description,
    'operation',
    bundle.clock,
  );

  const variableDeltas: Record<string, number> = {};
  const powerVar = Object.values(bundle.variables).find((v) => v.key === 'power');
  if (powerVar) variableDeltas[powerVar.id] = -2;

  const affectedNames = affected.map((id) => entityName(bundle, id)).join('、');

  const proposedDirections: DirectionOption[] = [
    {
      id: newId('dir'),
      label: '直面危机',
      description: '让主要角色直接卷入事件。',
      estimatedSummary: `事件的余波裹挟着${affectedNames || '众人'}，命运的齿轮开始转动。`,
    },
    {
      id: newId('dir'),
      label: '旁观酝酿',
      description: '事件作为背景，缓慢发酵。',
      estimatedSummary: `风暴尚在远方，${affectedNames || '世界'} 各自心怀鬼胎。`,
    },
  ];

  return {
    operationId: operation.id,
    narrativeSummary: summary,
    affectedEntityIds: affected,
    newEvents: [event],
    variableDeltas,
    proposedDirections,
  };
}

function narrateAdjustVariable(
  operation: Operation,
  bundle: WorldBundle,
): OperationResult {
  const variableId = operation.payload.variableId as string | undefined;
  const delta = (operation.payload.delta as number) || 0;
  const reason = (operation.payload.reason as string) || '';
  const variable = variableId ? bundle.variables[variableId] : undefined;
  const varName = variable?.name ?? '某项指标';

  const summary = reason
    ? `${varName} 因「${reason}」${delta >= 0 ? '上升' : '下降'} ${Math.abs(delta)}。`
    : `${varName} 变化 ${delta >= 0 ? '+' : ''}${delta}。`;

  const event = makeEvent(
    bundle.world.id,
    operation.id,
    `${varName} 变动`,
    summary,
    'system',
    bundle.clock,
  );

  const variableDeltas: Record<string, number> = {};
  if (variableId) variableDeltas[variableId] = delta;

  const proposedDirections: DirectionOption[] = [
    {
      id: newId('dir'),
      label: '顺势而为',
      description: '让局势沿着变量变化的趋势发展。',
      estimatedSummary: `${varName} 的此消彼长，正在重塑各方格局。`,
    },
  ];

  return {
    operationId: operation.id,
    narrativeSummary: summary,
    affectedEntityIds: [],
    newEvents: [event],
    variableDeltas,
    proposedDirections,
  };
}

function narrateDiplomacy(
  operation: Operation,
  bundle: WorldBundle,
): OperationResult {
  const sourceId = operation.payload.sourceId as string | undefined;
  const targetId = operation.payload.targetId as string | undefined;
  const relationType = (operation.payload.relationType as string) || '中立';
  const sourceName = entityName(bundle, sourceId);
  const targetName = entityName(bundle, targetId);

  const summary = `${sourceName} 与 ${targetName} 的关系转变为「${relationType}」。`;
  const event = makeEvent(
    bundle.world.id,
    operation.id,
    `外交 · ${relationType}`,
    summary,
    'operation',
    bundle.clock,
  );

  return {
    operationId: operation.id,
    narrativeSummary: summary,
    affectedEntityIds: [sourceId, targetId].filter(Boolean) as string[],
    newEvents: [event],
    variableDeltas: {},
    proposedDirections: [
      {
        id: newId('dir'),
        label: '深化同盟',
        description: '在既有关系上进一步绑定。',
        estimatedSummary: `${sourceName} 与 ${targetName} 的纽带愈发紧密。`,
      },
      {
        id: newId('dir'),
        label: '貌合神离',
        description: '表面缓和，暗中提防。',
        estimatedSummary: `联盟的阴影里，猜忌悄然滋生。`,
      },
    ],
  };
}

function nextSeason(current: string): string {
  const order = ['春', '夏', '秋', '冬'];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length] ?? '春';
}
