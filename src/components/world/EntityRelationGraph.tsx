import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, Typography, Stack, TextField, MenuItem, Alert } from '@mui/material';
import { useWorkStore } from '../../store/workStore';
import { useCurrentWorldId } from '../../hooks/useWorldState';
import {
  ENTITY_TYPE_LABELS,
  RELATION_TYPE_OPTIONS,
} from '../../constants/worldTemplates';
import type { EntityType } from '../../types/world';

const TYPE_COLOR: Record<EntityType, string> = {
  geography: '#2e7d32',
  faction: '#c62828',
  race: '#8e24aa',
  character: '#1565c0',
  timeline: '#ef6c00',
  rule: '#00838f',
};

interface Props {
  /** 点击节点时回传实体 id（用于与左侧世界树联动选中）。 */
  onSelectEntity?: (id: string) => void;
}

/**
 * 关系图（React Flow）：可视化拖拽编排实体关系。
 * - 拖拽节点圆点连线 -> 新增关系（经 worldSlice.addRelation，并写 TimelineEvent）
 * - 选中连线按 Delete -> 删除关系
 * - 拖拽节点 -> 更新 graphPositions（持久化）
 * 关系变更严格过 store，确保状态唯一真相。
 */
export default function EntityRelationGraph({
  onSelectEntity,
}: Props): JSX.Element {
  const worldId = useCurrentWorldId();
  const entities = useWorkStore((s) =>
    worldId ? s.worlds[worldId]?.entities : undefined,
  );
  const relations = useWorkStore((s) =>
    worldId ? s.worlds[worldId]?.relations : undefined,
  );
  const positions = useWorkStore((s) =>
    worldId ? s.worlds[worldId]?.graphPositions : undefined,
  );
  const addRelation = useWorkStore((s) => s.addRelation);
  const removeRelation = useWorkStore((s) => s.removeRelation);
  const setEntityPosition = useWorkStore((s) => s.setEntityPosition);
  const logEvent = useWorkStore((s) => s.logEvent);

  const [relType, setRelType] = useState<string>(RELATION_TYPE_OPTIONS[0]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const nodesRef = useRef<Node[]>(nodes);
  nodesRef.current = nodes;

  const entityKey = entities ? Object.keys(entities).join(',') : '';
  const relationKey = relations ? Object.keys(relations).join(',') : '';

  // 实体/关系集合或位置变化 -> 重建图节点与边（位置优先取 store，其次本地，再次网格）
  useEffect(() => {
    if (!entities || !relations || !worldId) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const list = Object.values(entities);
    const newNodes: Node[] = list.map((e, i) => {
      const existing = nodesRef.current.find((n) => n.id === e.id);
      const pos =
        positions?.[e.id] ?? existing?.position ?? {
          x: 80 + (i % 5) * 200,
          y: 80 + Math.floor(i / 5) * 130,
        };
      return {
        id: e.id,
        position: pos,
        data: { label: e.name },
        style: {
          borderColor: TYPE_COLOR[e.type],
          borderWidth: 2,
          borderRadius: 8,
          background: '#fff',
          padding: '4px 10px',
          fontSize: 12,
          width: 130,
          textAlign: 'center' as const,
        },
      };
    });
    const newEdges: Edge[] = Object.values(relations)
      .filter((r) => entities[r.sourceId] && entities[r.targetId])
      .map((r) => ({
        id: r.id,
        source: r.sourceId,
        target: r.targetId,
        label: r.type,
        markerEnd: r.directed ? { type: MarkerType.ArrowClosed } : undefined,
        style: { stroke: '#9e9e9e', strokeWidth: 1.5 },
      }));
    setNodes(newNodes);
    setEdges(newEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityKey, relationKey, positions, worldId, setNodes, setEdges]);

  const onConnect = useCallback(
    (conn: Connection) => {
      if (!worldId || !conn.source || !conn.target) return;
      if (conn.source === conn.target) return;
      addRelation(worldId, {
        sourceId: conn.source,
        targetId: conn.target,
        type: relType,
        directed: true,
      });
      const sName = entities?.[conn.source]?.name ?? conn.source;
      const tName = entities?.[conn.target]?.name ?? conn.target;
      logEvent(worldId, {
        title: `关系变更 · ${relType}`,
        description: `${sName} —[${relType}]→ ${tName}`,
        type: 'manual',
      });
    },
    [worldId, relType, addRelation, logEvent, entities],
  );

  const onNodeDragStop = useCallback(
    (_e: unknown, node: Node) => {
      if (!worldId) return;
      setEntityPosition(worldId, node.id, node.position);
    },
    [worldId, setEntityPosition],
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      if (!worldId) return;
      for (const e of deleted) removeRelation(worldId, e.id);
    },
    [worldId, removeRelation],
  );

  const onNodeClick = useCallback(
    (_e: unknown, node: Node) => {
      onSelectEntity?.(node.id);
    },
    [onSelectEntity],
  );

  if (!worldId) {
    return <Alert severity="info">请先创建或选择一个世界。</Alert>;
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{ p: 1, flexWrap: 'wrap', gap: 1 }}
      >
        <Typography variant="caption" color="text.secondary">
          拖拽节点边缘圆点连线建立关系；选中连线后按 Delete 删除；拖拽节点可调整布局。
        </Typography>
        <TextField
          select
          size="small"
          label="新关系类型"
          value={relType}
          onChange={(e) => setRelType(e.target.value)}
          sx={{ width: 150 }}
        >
          {RELATION_TYPE_OPTIONS.map((o) => (
            <MenuItem key={o} value={o}>
              {o}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onEdgesDelete={onEdgesDelete}
          onNodeClick={onNodeClick}
          fitView
          deleteKeyCode={['Delete', 'Backspace']}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </Box>
    </Box>
  );
}
