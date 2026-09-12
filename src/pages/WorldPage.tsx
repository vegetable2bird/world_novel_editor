import { useState } from 'react';
import { Box, Tabs, Tab, Paper, Alert } from '@mui/material';
import WorldTree from '../components/world/WorldTree';
import EntityDetailPanel from '../components/world/EntityDetailPanel';
import EntityForm from '../components/world/EntityForm';
import EntityRelationGraph from '../components/world/EntityRelationGraph';
import { useCurrentWorld, useCurrentWorldId } from '../hooks/useWorldState';

/**
 * 世界观页面：左侧世界树 + 右侧（实体详情/编辑 与 关系图谱）双视图。
 * 所有数据均经 useWorkStore 读写，状态唯一真相。
 */
export default function WorldPage(): JSX.Element {
  const worldId = useCurrentWorldId();
  const world = useCurrentWorld();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<'detail' | 'graph'>('detail');

  if (!worldId || !world) {
    return (
      <Alert severity="info">请从右上角「新建世界」开始你的创作。</Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 96px)' }}>
      <Paper
        variant="outlined"
        sx={{ width: 260, flexShrink: 0, mr: 2, overflow: 'hidden' }}
      >
        <WorldTree
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            setEditing(false);
          }}
        />
      </Paper>

      <Paper
        variant="outlined"
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="实体详情 / 编辑" value="detail" />
          <Tab label="关系图谱" value="graph" />
        </Tabs>
        <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {tab === 'detail' ? (
            selectedId ? (
              editing ? (
                <EntityForm
                  entityId={selectedId}
                  onDeleted={() => {
                    setSelectedId(null);
                    setEditing(false);
                  }}
                  onCancel={() => setEditing(false)}
                  onSaved={() => setEditing(false)}
                />
              ) : (
                <EntityDetailPanel
                  entityId={selectedId}
                  onEdit={() => setEditing(true)}
                />
              )
            ) : (
              <Alert severity="info" sx={{ m: 2 }}>
                在左侧选择实体查看详情，或点击 + 新建实体。
              </Alert>
            )
          ) : (
            <EntityRelationGraph
              onSelectEntity={(id) => {
                setSelectedId(id);
                setTab('detail');
                setEditing(false);
              }}
            />
          )}
        </Box>
      </Paper>
    </Box>
  );
}
