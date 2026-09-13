import { describe, it, expect } from 'vitest';
import { emptyBundle } from '../store/types';
import type { World } from '../types/world';
import type { Book } from '../types/book';
import type { CharacterRegistryEntry, CharacterInstance } from '../types/character';
import {
  buildCharacterContinuity,
  buildCrossBookReport,
  detectCrossBookConflicts,
} from '../services/crossBook/continuity';

function mkWorld(): World {
  return { id: 'w', name: '界', createdAt: 't', updatedAt: 't' };
}

function mkBook(id: string, name: string): Book {
  return { id, worldId: 'w', name, description: '', order: 0, createdAt: 't', updatedAt: 't' };
}

function mkReg(id: string, name: string): CharacterRegistryEntry {
  return {
    id,
    worldId: 'w',
    name,
    archetype: '原型',
    tags: [],
    inContext: true,
    createdAt: 't',
    updatedAt: 't',
  };
}

function mkInst(
  id: string,
  bookId: string,
  registryId: string,
  name: string,
  status: CharacterInstance['status'],
): CharacterInstance {
  return {
    id,
    worldId: 'w',
    bookId,
    registryId,
    name,
    portrait: {},
    status,
    createdAt: 't',
    updatedAt: 't',
  };
}

describe('跨书联动引擎（v2 P4）', () => {
  it('无角色时冲突与矩阵均为空', () => {
    const b = emptyBundle(mkWorld());
    expect(detectCrossBookConflicts(b)).toEqual([]);
    expect(buildCharacterContinuity(b)).toEqual([]);
    const report = buildCrossBookReport(b);
    expect(report.conflicts).toEqual([]);
    expect(report.rows).toEqual([]);
    expect(report.crossBookCharacterCount).toBe(0);
  });

  it('同卷同名、状态相容时不产生冲突', () => {
    const b = emptyBundle(mkWorld());
    b.books['bk1'] = mkBook('bk1', '主线');
    b.characterRegistry['r1'] = mkReg('r1', '叶凡');
    b.characterInstances['ci1'] = mkInst('ci1', 'bk1', 'r1', '叶凡', 'active');
    expect(detectCrossBookConflicts(b)).toEqual([]);
    const rows = buildCharacterContinuity(b);
    expect(rows).toHaveLength(1);
    expect(rows[0].appearances).toHaveLength(1);
    expect(rows[0].conflicted).toBe(false);
  });

  it('多卷同名且状态相容仍不算跨书冲突（仅跨书出演计数）', () => {
    const b = emptyBundle(mkWorld());
    b.books['bk1'] = mkBook('bk1', '主线');
    b.books['bk2'] = mkBook('bk2', '外传');
    b.characterRegistry['r1'] = mkReg('r1', '叶凡');
    b.characterInstances['ci1'] = mkInst('ci1', 'bk1', 'r1', '叶凡', 'active');
    b.characterInstances['ci2'] = mkInst('ci2', 'bk2', 'r1', '叶凡', 'minor');
    expect(detectCrossBookConflicts(b)).toEqual([]);
    const report = buildCrossBookReport(b);
    expect(report.crossBookCharacterCount).toBe(1);
    expect(report.rows[0].appearances).toHaveLength(2);
  });

  it('检测角色名不一致（化身名与总库不同）', () => {
    const b = emptyBundle(mkWorld());
    b.books['bk1'] = mkBook('bk1', '主线');
    b.characterRegistry['r1'] = mkReg('r1', '叶凡');
    b.characterInstances['ci1'] = mkInst('ci1', 'bk1', 'r1', '叶小凡', 'active');
    const conflicts = detectCrossBookConflicts(b);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe('character_name');
    expect(conflicts[0].severity).toBe('info');
    expect(conflicts[0].subjectLabel).toBe('叶凡');
    expect(conflicts[0].occurrences[0].value).toBe('叶小凡');
    expect(conflicts[0].occurrences[0].bookName).toBe('主线');
  });

  it('检测角色状态冲突（active 与 offstage 并存）', () => {
    const b = emptyBundle(mkWorld());
    b.books['bk1'] = mkBook('bk1', '主线');
    b.books['bk2'] = mkBook('bk2', '外传');
    b.characterRegistry['r1'] = mkReg('r1', '叶凡');
    b.characterInstances['ci1'] = mkInst('ci1', 'bk1', 'r1', '叶凡', 'active');
    b.characterInstances['ci2'] = mkInst('ci2', 'bk2', 'r1', '叶凡', 'offstage');
    const conflicts = detectCrossBookConflicts(b);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe('character_status');
    expect(conflicts[0].severity).toBe('warning');
    // 矩阵行应标记为 conflicted
    expect(buildCharacterContinuity(b).find((r) => r.registryId === 'r1')!.conflicted).toBe(true);
  });

  it('fallback 名「未命名角色」不触发名不一致冲突', () => {
    const b = emptyBundle(mkWorld());
    b.books['bk1'] = mkBook('bk1', '主线');
    b.characterRegistry['r1'] = mkReg('r1', '叶凡');
    b.characterInstances['ci1'] = mkInst('ci1', 'bk1', 'r1', '未命名角色', 'active');
    expect(detectCrossBookConflicts(b)).toEqual([]);
  });

  it('聚合最新心情到联动矩阵', () => {
    const b = emptyBundle(mkWorld());
    b.books['bk1'] = mkBook('bk1', '主线');
    b.characterRegistry['r1'] = mkReg('r1', '叶凡');
    b.characterInstances['ci1'] = mkInst('ci1', 'bk1', 'r1', '叶凡', 'active');
    b.moodEntries['m1'] = {
      id: 'm1', worldId: 'w', characterInstanceId: 'ci1', clockLabel: 't',
      mood: '雀跃', createdAt: '2020',
    };
    b.moodEntries['m2'] = {
      id: 'm2', worldId: 'w', characterInstanceId: 'ci1', clockLabel: 't',
      mood: '落寞', createdAt: '2024',
    };
    const rows = buildCharacterContinuity(b);
    expect(rows[0].appearances[0].latestMood).toBe('落寞');
  });

  it('孤立化身（总库已删）不进入矩阵', () => {
    const b = emptyBundle(mkWorld());
    b.books['bk1'] = mkBook('bk1', '主线');
    // 仅角色卡、无对应总库条目
    b.characterInstances['ci1'] = mkInst('ci1', 'bk1', 'ghost', '叶凡', 'active');
    expect(buildCharacterContinuity(b)).toEqual([]);
    const report = buildCrossBookReport(b);
    expect(report.rows).toEqual([]);
  });
});
